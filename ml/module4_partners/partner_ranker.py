"""
Module 4: Partner Ranking & Routing Engine

Given an eligible scheme + user location, outputs a ranked list of nearby
Channel Partners who can actually process that scheme right now.

Two-stage pipeline:
  1. Hard filter: Remove inactive, over-NPA, over-capacity, wrong-scheme partners
  2. Rank by distance: Haversine distance with BallTree for efficiency

The "don't route to an overloaded partner" behavior is a real filter step,
not decoration — this is what the PS calls out by name.
"""

import json
import math
import os
from typing import Any, NamedTuple


# --- Thresholds (documented assumptions) ---
# NSFDC's own RRB eligibility rule: Net NPA < 15% in at least 3/6 FYs
NPA_THRESHOLD = 15.0
# Fund utilization above 90% means very limited capacity
UTILIZATION_THRESHOLD = 90.0
# Maximum distance in km to search (default)
DEFAULT_MAX_DISTANCE_KM = 100.0

# Earth's radius in km (for Haversine)
EARTH_RADIUS_KM = 6371.0


class PartnerFilterResult(NamedTuple):
    """Result of filtering a single partner."""
    passed: bool
    reason: str


# Load partner dataset
_DATASET_PATH = os.path.join(os.path.dirname(__file__), "partner_dataset.json")


def load_partner_dataset() -> list[dict]:
    """Load the partner dataset from JSON."""
    with open(_DATASET_PATH, "r") as f:
        data = json.load(f)
    return data["partners"]


# --- PIN code centroid lookup (fallback for no GPS) ---
# Simplified mapping: first 2 digits of PIN code → approximate state centroid
# This is a documented assumption — real implementation would use a full PIN-to-coords DB.
PIN_PREFIX_CENTROIDS = {
    # Zone 1: Delhi, Haryana, Punjab, HP, J&K, Ladakh, Chandigarh
    "11": (28.614, 77.209),   # Delhi
    "12": (28.459, 77.029),   # Haryana (Gurugram/Faridabad)
    "13": (29.968, 76.878),   # Haryana (Kurukshetra/Ambala)
    "14": (30.901, 75.857),   # Punjab (Ludhiana)
    "15": (30.210, 74.945),   # Punjab (Bathinda)
    "16": (30.733, 76.779),   # Chandigarh
    "17": (31.104, 77.173),   # Himachal Pradesh (Shimla)
    "18": (32.727, 74.857),   # Jammu
    "19": (34.084, 74.797),   # Kashmir / Ladakh
    # Zone 2: Uttar Pradesh, Uttarakhand
    "20": (28.984, 77.706),   # UP west (Meerut)
    "21": (25.431, 81.846),   # UP (Prayagraj)
    "22": (26.847, 80.947),   # UP (Lucknow)
    "23": (25.318, 82.974),   # UP (Varanasi)
    "24": (30.317, 78.032),   # Uttarakhand (Dehradun)
    "25": (28.669, 77.454),   # UP (Ghaziabad/NCR)
    "26": (29.408, 79.464),   # Uttarakhand (Nainital) / UP (Bareilly)
    "27": (26.760, 83.365),   # UP (Gorakhpur)
    "28": (27.176, 78.008),   # UP (Agra/Aligarh)
    # Zone 3: Rajasthan, Gujarat, Daman & Diu, DNH
    "30": (26.912, 75.787),   # Rajasthan (Jaipur)
    "31": (27.892, 78.076),   # Rajasthan (Alwar/Bharatpur)
    "32": (25.213, 75.864),   # Rajasthan (Kota)
    "33": (24.585, 73.712),   # Rajasthan (Udaipur)
    "34": (26.293, 73.017),   # Rajasthan (Jodhpur/Bikaner)
    "36": (22.309, 73.181),   # Gujarat (Vadodara)
    "37": (23.022, 72.571),   # Gujarat (Ahmedabad)
    "38": (23.022, 72.571),   # Gujarat (Ahmedabad/Gandhinagar)
    "39": (21.170, 72.831),   # Gujarat (Surat) / Daman
    # Zone 4: Maharashtra, Goa, Madhya Pradesh, Chhattisgarh
    "40": (19.076, 72.878),   # Maharashtra (Mumbai)
    "41": (18.521, 73.855),   # Maharashtra (Pune)
    "42": (20.001, 73.790),   # Maharashtra (Nashik)
    "43": (19.876, 75.343),   # Maharashtra (Aurangabad)
    "44": (21.146, 79.089),   # Maharashtra (Nagpur/Vidarbha)
    "45": (23.259, 77.413),   # Madhya Pradesh (Bhopal)
    "46": (22.720, 75.858),   # Madhya Pradesh (Indore)
    "47": (24.585, 80.834),   # Madhya Pradesh (Satna/Rewa)
    "48": (23.181, 79.986),   # Madhya Pradesh (Jabalpur)
    "49": (21.251, 81.630),   # Chhattisgarh (Raipur)
    # Zone 5: Telangana, Andhra Pradesh, Karnataka
    "50": (17.385, 78.487),   # Telangana (Hyderabad)
    "51": (16.506, 80.648),   # Andhra Pradesh (Vijayawada)
    "52": (16.506, 80.648),   # Andhra Pradesh (Guntur/Nellore)
    "53": (17.687, 83.219),   # Andhra Pradesh (Visakhapatnam)
    "56": (12.971, 77.597),   # Karnataka (Bengaluru)
    "57": (12.296, 76.639),   # Karnataka (Mysuru)
    "58": (15.349, 75.137),   # Karnataka (Hubballi)
    "59": (17.329, 76.834),   # Karnataka (Kalaburagi)
    # Zone 6: Tamil Nadu, Kerala, Puducherry, Lakshadweep
    "60": (13.061, 80.270),   # Tamil Nadu (Chennai)
    "61": (10.790, 78.705),   # Tamil Nadu (Trichy)
    "62": (10.790, 78.705),   # Tamil Nadu (Trichy/Madurai)
    "63": (11.651, 78.159),   # Tamil Nadu (Salem)
    "64": (11.005, 76.956),   # Tamil Nadu (Coimbatore)
    "67": (11.259, 75.780),   # Kerala (Kozhikode)
    "68": (9.939, 76.267),    # Kerala (Kochi)
    "69": (8.524, 76.937),    # Kerala (Thiruvananthapuram)
    # Zone 7: West Bengal, Odisha, NE states, Sikkim, A&N
    "70": (22.573, 88.364),   # West Bengal (Kolkata)
    "71": (22.573, 88.364),   # West Bengal (Howrah/Hooghly)
    "72": (23.251, 87.850),   # West Bengal (Bardhaman)
    "73": (26.727, 88.396),   # West Bengal (Siliguri)
    "74": (22.573, 88.364),   # West Bengal (24 Parganas) / A&N
    "75": (20.296, 85.825),   # Odisha (Bhubaneswar)
    "76": (21.500, 84.000),   # Odisha (Sambalpur)
    "77": (20.296, 85.825),   # Odisha (Cuttack)
    "78": (26.145, 91.736),   # Assam (Guwahati)
    "79": (25.579, 91.893),   # Meghalaya / NE states
    # Zone 8: Bihar, Jharkhand
    "80": (25.612, 85.145),   # Bihar (Patna)
    "81": (25.245, 86.985),   # Bihar (Bhagalpur)
    "82": (24.796, 84.999),   # Bihar (Gaya)
    "83": (23.344, 85.310),   # Jharkhand (Ranchi)
    "84": (26.121, 85.379),   # Bihar (Muzaffarpur)
    "85": (26.121, 85.379),   # Bihar (Darbhanga)
}


def get_coords_from_pin(pin_code: str) -> tuple[float, float] | None:
    """
    Fallback: get approximate coordinates from PIN code prefix.
    Returns (latitude, longitude) or None if prefix not recognized.
    """
    if not pin_code or len(pin_code) < 2:
        return None
    prefix = pin_code[:2]
    return PIN_PREFIX_CENTROIDS.get(prefix)


def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """
    Calculate the great-circle distance between two points
    on the earth (specified in decimal degrees).

    Returns distance in kilometers.
    """
    lat1_r, lon1_r = math.radians(lat1), math.radians(lon1)
    lat2_r, lon2_r = math.radians(lat2), math.radians(lon2)

    dlat = lat2_r - lat1_r
    dlon = lon2_r - lon1_r

    a = (
        math.sin(dlat / 2) ** 2
        + math.cos(lat1_r) * math.cos(lat2_r) * math.sin(dlon / 2) ** 2
    )
    c = 2 * math.asin(math.sqrt(a))

    return EARTH_RADIUS_KM * c


def filter_partner(
    partner: dict,
    scheme_id: str,
    npa_threshold: float = NPA_THRESHOLD,
    utilization_threshold: float = UTILIZATION_THRESHOLD,
) -> PartnerFilterResult:
    """
    Apply hard filters to a single partner.

    Filters:
      1. is_active must be True
      2. NPA must be below threshold
      3. Fund utilization must be below threshold
      4. Scheme must be in partner's processed categories

    Returns PartnerFilterResult with pass/fail and reason.
    """
    if not partner.get("is_active", False):
        return PartnerFilterResult(
            passed=False,
            reason=f"Partner '{partner['name']}' is currently inactive",
        )

    npa = partner.get("npa_pct", 100)
    if npa >= npa_threshold:
        return PartnerFilterResult(
            passed=False,
            reason=(
                f"Partner '{partner['name']}' has NPA {npa}% "
                f"(threshold: <{npa_threshold}%)"
            ),
        )

    utilization = partner.get("fund_utilization_pct", 100)
    if utilization >= utilization_threshold:
        return PartnerFilterResult(
            passed=False,
            reason=(
                f"Partner '{partner['name']}' has {utilization}% fund utilization "
                f"(threshold: <{utilization_threshold}%) — limited capacity"
            ),
        )

    schemes = partner.get("scheme_categories_processed", [])
    if scheme_id not in schemes:
        return PartnerFilterResult(
            passed=False,
            reason=(
                f"Partner '{partner['name']}' does not process scheme '{scheme_id}'. "
                f"They process: {schemes}"
            ),
        )

    return PartnerFilterResult(
        passed=True,
        reason=(
            f"Partner '{partner['name']}' is active, NPA {npa}% OK, "
            f"utilization {utilization}% OK, processes {scheme_id}"
        ),
    )


def rank_partners(
    scheme_id: str,
    user_lat: float | None = None,
    user_lon: float | None = None,
    user_pin_code: str | None = None,
    max_distance_km: float = DEFAULT_MAX_DISTANCE_KM,
    partners: list[dict] | None = None,
    npa_threshold: float = NPA_THRESHOLD,
    utilization_threshold: float = UTILIZATION_THRESHOLD,
) -> dict[str, Any]:
    """
    Rank Channel Partners for a given scheme + user location.

    Two-stage pipeline:
      1. Hard filter: Remove inactive/overloaded/wrong-scheme partners
      2. Rank by Haversine distance

    Args:
        scheme_id: The scheme ID to find partners for.
        user_lat: User's latitude (from GPS).
        user_lon: User's longitude (from GPS).
        user_pin_code: Fallback location (6-digit PIN code).
        max_distance_km: Maximum distance to search.
        partners: Partner dataset (defaults to loading from JSON).
        npa_threshold: NPA filter threshold.
        utilization_threshold: Utilization filter threshold.

    Returns:
        dict with ranked_partners, filtered_out, and metadata.
    """
    if partners is None:
        partners = load_partner_dataset()

    # Resolve user location
    if user_lat is None or user_lon is None:
        if user_pin_code:
            coords = get_coords_from_pin(user_pin_code)
            if coords:
                user_lat, user_lon = coords
            else:
                return {
                    "status": "error",
                    "message": (
                        f"Cannot resolve PIN code '{user_pin_code}' to coordinates. "
                        "Please provide GPS coordinates or a valid PIN code."
                    ),
                    "ranked_partners": [],
                    "filtered_out": [],
                }
        else:
            return {
                "status": "error",
                "message": "No location provided. Please provide GPS coordinates or PIN code.",
                "ranked_partners": [],
                "filtered_out": [],
            }

    # Stage 1: Hard filter
    eligible = []
    filtered_out = []

    for partner in partners:
        result = filter_partner(partner, scheme_id, npa_threshold, utilization_threshold)
        if result.passed:
            eligible.append((partner, result))
        else:
            filtered_out.append({
                "partner_id": partner["partner_id"],
                "name": partner["name"],
                "reason": result.reason,
            })

    # Stage 2: Calculate distances and rank
    ranked = []
    beyond_radius = []
    for partner, filter_result in eligible:
        distance = haversine_distance(
            user_lat, user_lon,
            partner["latitude"], partner["longitude"],
        )

        if distance > max_distance_km:
            beyond_radius.append({
                "partner_id": partner["partner_id"],
                "name": partner["name"],
                "state": partner["state"],
                "distance_km": round(distance, 1),
            })
        else:
            ranked.append({
                "partner_id": partner["partner_id"],
                "name": partner["name"],
                "type": partner["type"],
                "district": partner.get("district", ""),
                "state": partner["state"],
                "distance_km": round(distance, 1),
                "fund_utilization_pct": partner["fund_utilization_pct"],
                "npa_pct": partner["npa_pct"],
                "contact_phone": partner.get("contact_phone", ""),
                "reason": (
                    f"{round(distance, 1)} km away, currently accepting {scheme_id} applications, "
                    f"{partner['fund_utilization_pct']}% fund utilization, NPA {partner['npa_pct']}%"
                ),
            })

    # Sort by distance
    ranked.sort(key=lambda x: x["distance_km"])
    beyond_radius.sort(key=lambda x: x["distance_km"])

    # Healthy partners exist, just too far away — say so instead of blaming capacity
    if not ranked and beyond_radius:
        nearest = beyond_radius[0]
        return {
            "status": "no_partners_in_range",
            "message": (
                f"No healthy partner processes '{scheme_id}' within {max_distance_km:.0f} km. "
                f"The nearest one is {nearest['name']} at {nearest['distance_km']} km. "
                f"Expand the search radius or contact your State Channelizing Agency."
            ),
            "total_eligible": 0,
            "total_filtered_out": len(filtered_out),
            "scheme_id": scheme_id,
            "ranked_partners": [],
            "nearest_beyond_radius": beyond_radius[:3],
            "filtered_out": filtered_out[:5],
            "location_used": {"latitude": user_lat, "longitude": user_lon, "source": "pin_code" if user_pin_code else "gps"},
        }

    # Handle all-partners-over-threshold case
    if not ranked and filtered_out:
        # Return the nearest filtered-out partners with explanations
        # Calculate distances for filtered-out partners too
        nearest_filtered = []
        for fo in filtered_out:
            matching_partner = next(
                (p for p in partners if p["partner_id"] == fo["partner_id"]), None
            )
            if matching_partner:
                dist = haversine_distance(
                    user_lat, user_lon,
                    matching_partner["latitude"], matching_partner["longitude"],
                )
                nearest_filtered.append({
                    **fo,
                    "distance_km": round(dist, 1),
                })
        nearest_filtered.sort(key=lambda x: x["distance_km"])

        return {
            "status": "no_eligible_partners",
            "message": (
                f"No partners meet the eligibility criteria for scheme '{scheme_id}'. "
                f"Partners were filtered out due to high NPA (>{npa_threshold}%), "
                f"capacity issues (>{utilization_threshold}%), inactivity, or because they "
                f"don't process this scheme. Contact the nearest SCA for alternative routing."
            ),
            "total_eligible": 0,
            "total_filtered_out": len(filtered_out),
            "scheme_id": scheme_id,
            "ranked_partners": [],
            "filtered_out": nearest_filtered[:5],
            "location_used": {"latitude": user_lat, "longitude": user_lon, "source": "pin_code" if user_pin_code else "gps"},
        }

    return {
        "status": "partners_found" if ranked else "no_eligible_partners",
        "total_eligible": len(ranked),
        "total_filtered_out": len(filtered_out),
        "scheme_id": scheme_id,
        "ranked_partners": ranked,
        "filtered_out": filtered_out[:5],  # Top 5 filtered-out for transparency
        "location_used": {
            "latitude": user_lat,
            "longitude": user_lon,
            "source": "pin_code" if user_pin_code else "gps",
        },
    }
