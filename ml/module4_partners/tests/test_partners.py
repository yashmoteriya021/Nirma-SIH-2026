"""
Tests for Module 4: Partner Ranking & Routing Engine

Test cases cover:
  1. Happy path: finding active, in-capacity partners nearby
  2. Hard filter: inactive partner removed
  3. Hard filter: high NPA partner removed
  4. Hard filter: high fund utilization partner removed
  5. Hard filter: partner that doesn't process the scheme removed
  6. PIN code fallback (no GPS)
  7. No partners within radius (edge case handling)
"""

import pytest

from module4_partners.partner_ranker import (
    haversine_distance,
    filter_partner,
    rank_partners,
    get_coords_from_pin,
)


class TestPartnerFilters:
    """Test the hard-filtering logic for partners."""

    def test_inactive_partner_filtered(self):
        """TC1: Inactive partner should be filtered out."""
        partner = {
            "name": "Test Partner",
            "is_active": False,
            "npa_pct": 5.0,
            "fund_utilization_pct": 50,
            "scheme_categories_processed": ["SCHEME_A"],
        }
        result = filter_partner(partner, "SCHEME_A")
        assert result.passed is False
        assert "inactive" in result.reason.lower()

    def test_high_npa_partner_filtered(self):
        """TC2: Partner with NPA >= 15% should be filtered out."""
        partner = {
            "name": "Test Partner",
            "is_active": True,
            "npa_pct": 16.5,
            "fund_utilization_pct": 50,
            "scheme_categories_processed": ["SCHEME_A"],
        }
        result = filter_partner(partner, "SCHEME_A", npa_threshold=15.0)
        assert result.passed is False
        assert "npa" in result.reason.lower()

    def test_high_utilization_partner_filtered(self):
        """TC3: Partner with utilization >= 90% should be filtered out."""
        partner = {
            "name": "Test Partner",
            "is_active": True,
            "npa_pct": 5.0,
            "fund_utilization_pct": 95,
            "scheme_categories_processed": ["SCHEME_A"],
        }
        result = filter_partner(partner, "SCHEME_A", utilization_threshold=90.0)
        assert result.passed is False
        assert "utilization" in result.reason.lower()

    def test_wrong_scheme_partner_filtered(self):
        """TC4: Partner that doesn't process the requested scheme should be filtered out."""
        partner = {
            "name": "Test Partner",
            "is_active": True,
            "npa_pct": 5.0,
            "fund_utilization_pct": 50,
            "scheme_categories_processed": ["SCHEME_B"],
        }
        result = filter_partner(partner, "SCHEME_A")
        assert result.passed is False
        assert "process" in result.reason.lower()

    def test_valid_partner_passes(self):
        """TC5: Active, healthy partner processing the scheme should pass."""
        partner = {
            "name": "Test Partner",
            "is_active": True,
            "npa_pct": 5.0,
            "fund_utilization_pct": 50,
            "scheme_categories_processed": ["SCHEME_A"],
        }
        result = filter_partner(partner, "SCHEME_A")
        assert result.passed is True


class TestRankingAndRouting:
    """Test the full ranking and routing pipeline."""

    @pytest.fixture
    def sample_partners(self):
        return [
            {
                "partner_id": "P1",
                "name": "Valid Partner Near",
                "type": "SCA",
                "state": "UP",
                "latitude": 26.85,
                "longitude": 80.95,
                "is_active": True,
                "npa_pct": 5.0,
                "fund_utilization_pct": 50,
                "scheme_categories_processed": ["TEST_SCHEME"],
            },
            {
                "partner_id": "P2",
                "name": "Valid Partner Far",
                "type": "PSB",
                "state": "UP",
                "latitude": 25.43,
                "longitude": 81.84,
                "is_active": True,
                "npa_pct": 5.0,
                "fund_utilization_pct": 50,
                "scheme_categories_processed": ["TEST_SCHEME"],
            },
            {
                "partner_id": "P3",
                "name": "High NPA Partner Near",
                "type": "RRB",
                "state": "UP",
                "latitude": 26.86,
                "longitude": 80.96,
                "is_active": True,
                "npa_pct": 18.0,
                "fund_utilization_pct": 50,
                "scheme_categories_processed": ["TEST_SCHEME"],
            },
            {
                "partner_id": "P4",
                "name": "Wrong Scheme Partner Near",
                "type": "NBFC_MFI",
                "state": "UP",
                "latitude": 26.84,
                "longitude": 80.94,
                "is_active": True,
                "npa_pct": 5.0,
                "fund_utilization_pct": 50,
                "scheme_categories_processed": ["OTHER_SCHEME"],
            },
        ]

    def test_ranking_by_distance(self, sample_partners):
        """TC6: Valid partners should be ranked by distance."""
        # User is in Lucknow (near P1, far from P2)
        user_lat, user_lon = 26.847, 80.947

        result = rank_partners(
            "TEST_SCHEME",
            user_lat=user_lat,
            user_lon=user_lon,
            partners=sample_partners,
            max_distance_km=200,
        )

        assert result["status"] == "partners_found"
        assert result["total_eligible"] == 2
        assert result["total_filtered_out"] == 2

        # Check ranking order
        assert result["ranked_partners"][0]["partner_id"] == "P1"
        assert result["ranked_partners"][1]["partner_id"] == "P2"

        # Check distances are calculated
        assert result["ranked_partners"][0]["distance_km"] < result["ranked_partners"][1]["distance_km"]

    def test_max_distance_cutoff(self, sample_partners):
        """TC7: Partners beyond max_distance_km should be excluded."""
        user_lat, user_lon = 26.847, 80.947

        # Set a small max distance so P2 (far) is excluded
        result = rank_partners(
            "TEST_SCHEME",
            user_lat=user_lat,
            user_lon=user_lon,
            partners=sample_partners,
            max_distance_km=50,
        )

        assert result["status"] == "partners_found"
        assert result["total_eligible"] == 1
        assert result["ranked_partners"][0]["partner_id"] == "P1"

    def test_pin_code_fallback(self, sample_partners):
        """TC8: PIN code fallback should provide approximate coordinates."""
        # Provide NO GPS coords, just a Lucknow PIN code
        result = rank_partners(
            "TEST_SCHEME",
            user_pin_code="226001",
            partners=sample_partners,
            max_distance_km=200,
        )

        assert result["status"] == "partners_found"
        assert result["location_used"]["source"] == "pin_code"
        assert result["total_eligible"] == 2

    def test_all_filtered_out(self):
        """TC9: When all nearby partners fail filters, provide helpful near-miss explanations."""
        partners = [
            {
                "partner_id": "P1",
                "name": "High NPA",
                "type": "RRB",
                "state": "UP",
                "latitude": 26.85,
                "longitude": 80.95,
                "is_active": True,
                "npa_pct": 20.0,
                "fund_utilization_pct": 50,
                "scheme_categories_processed": ["TEST_SCHEME"],
            }
        ]

        result = rank_partners(
            "TEST_SCHEME",
            user_lat=26.847,
            user_lon=80.947,
            partners=partners,
        )

        assert result["status"] == "no_eligible_partners"
        assert len(result["ranked_partners"]) == 0
        assert len(result["filtered_out"]) == 1
        # Should include distance even for filtered-out partners so user knows how far they are
        assert "distance_km" in result["filtered_out"][0]
        assert "NPA" in result["filtered_out"][0]["reason"]


class TestHelpers:
    """Test helper functions."""

    def test_haversine_distance(self):
        """Test distance calculation between known points."""
        # New Delhi
        lat1, lon1 = 28.6139, 77.2090
        # Mumbai
        lat2, lon2 = 19.0760, 72.8777

        # Distance should be ~1148 km
        dist = haversine_distance(lat1, lon1, lat2, lon2)
        assert 1140 < dist < 1160

    def test_pin_code_lookup(self):
        """Test PIN code to centroid fallback."""
        assert get_coords_from_pin("226001") == (26.847, 80.947)  # UP
        assert get_coords_from_pin("400001") == (19.076, 72.878)  # Mumbai
        assert get_coords_from_pin(None) is None
        assert get_coords_from_pin("999999") is None  # Unknown prefix
