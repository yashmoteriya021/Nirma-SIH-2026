import { Router } from 'express';
import { readFile } from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const router = Router();
const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_PATH = join(__dirname, '..', 'data', 'partners.json');

let partnersCache = null;

async function loadPartners() {
  if (!partnersCache) {
    const raw = await readFile(DATA_PATH, 'utf-8');
    partnersCache = JSON.parse(raw);
  }
  return partnersCache;
}

/**
 * Haversine formula — returns distance in km between two lat/lng points.
 */
function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

/**
 * GET /api/partners
 * Returns all partners. Supports query filters:
 *   ?scheme=micro-finance      (filter by supported scheme)
 *   ?type=SCA                  (filter by partner type)
 *   ?status=accepting          (filter by status)
 *   ?city=Lucknow              (filter by city name, case-insensitive)
 *   ?lat=23.03&lng=72.58       (sort by distance from location)
 */
router.get('/', async (req, res, next) => {
  try {
    const data = await loadPartners();
    let partners = [...data.partners];

    // Filter by scheme
    if (req.query.scheme) {
      partners = partners.filter(p =>
        p.schemesSupported.includes(req.query.scheme)
      );
    }

    // Filter by type
    if (req.query.type) {
      partners = partners.filter(p =>
        p.type.toLowerCase() === req.query.type.toLowerCase()
      );
    }

    // Filter by status
    if (req.query.status) {
      partners = partners.filter(p => p.status === req.query.status);
    }

    // Filter by city
    if (req.query.city) {
      const city = req.query.city.toLowerCase();
      partners = partners.filter(p =>
        p.city.en.toLowerCase().includes(city) ||
        p.city.hi.includes(req.query.city) ||
        p.state.en.toLowerCase().includes(city) ||
        p.state.hi.includes(req.query.city)
      );
    }

    // Sort by distance if lat/lng provided
    if (req.query.lat && req.query.lng) {
      const userLat = parseFloat(req.query.lat);
      const userLng = parseFloat(req.query.lng);
      partners = partners.map(p => ({
        ...p,
        distance: haversineDistance(userLat, userLng, p.lat, p.lng),
      })).sort((a, b) => a.distance - b.distance);
    }

    res.json({
      success: true,
      count: partners.length,
      data: partners,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/partners/:id
 * Returns a single partner by ID.
 */
router.get('/:id', async (req, res, next) => {
  try {
    const data = await loadPartners();
    const partner = data.partners.find(p => p.id === req.params.id);

    if (!partner) {
      const error = new Error(`Partner not found: ${req.params.id}`);
      error.status = 404;
      throw error;
    }

    res.json({
      success: true,
      data: partner,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
