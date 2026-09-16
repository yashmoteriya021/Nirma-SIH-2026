import ChannelPartner from '../models/ChannelPartner.js';
import { successResponse, errorResponse } from '../utils/apiResponse.js';
import asyncHandler from '../utils/asyncHandler.js';

/**
 * GET /api/partners?type=SCA&scheme_id=mcf_01
 * List partners with optional filters.
 */
export const getPartners = asyncHandler(async (req, res) => {
  const { type, scheme_id } = req.query;
  const filter = {};

  if (type) {
    filter.partner_type = type;
  }
  if (scheme_id) {
    filter.supported_schemes = scheme_id;
  }

  const partners = await ChannelPartner.find(filter).sort({ partner_id: 1 });

  return successResponse(res, { partners, count: partners.length }, 'Partners retrieved');
});

/**
 * GET /api/partners/nearby?lat=23.02&lng=72.57&radius_km=10&scheme_id=mcf_01
 * Geospatial search using MongoDB $geoNear aggregation.
 * Automatically excludes partners with NPA > 7% or exhausted funds.
 */
export const getNearbyPartners = asyncHandler(async (req, res) => {
  const { lat, lng, radius_km = 10, scheme_id } = req.query;

  if (!lat || !lng) {
    return errorResponse(res, 'MISSING_COORDINATES', 'Latitude (lat) and longitude (lng) are required.', 400);
  }

  const geoQuery = {
    fund_status: 'available',
    npa_rate: { $lte: 7 },
  };

  if (scheme_id) {
    geoQuery.supported_schemes = scheme_id;
  }

  const partners = await ChannelPartner.aggregate([
    {
      $geoNear: {
        near: { type: 'Point', coordinates: [Number(lng), Number(lat)] },
        distanceField: 'distance_km',
        spherical: true,
        maxDistance: Number(radius_km) * 1000,
        distanceMultiplier: 0.001,
        query: geoQuery,
      },
    },
    { $sort: { distance_km: 1 } },
    { $limit: 20 },
  ]);

  // Round distances for cleaner output
  const formatted = partners.map(p => ({
    ...p,
    distance_km: Math.round(p.distance_km * 100) / 100,
  }));

  return successResponse(res, {
    partners: formatted,
    count: formatted.length,
    search_params: {
      lat: Number(lat),
      lng: Number(lng),
      radius_km: Number(radius_km),
      scheme_id: scheme_id || null,
    },
  }, 'Nearby partners retrieved');
});

/**
 * GET /api/partners/:partner_id
 * Get a single partner by partner_id.
 */
export const getPartnerById = asyncHandler(async (req, res) => {
  const { partner_id } = req.params;

  const partner = await ChannelPartner.findOne({ partner_id });
  if (!partner) {
    return errorResponse(res, 'PARTNER_NOT_FOUND', `Partner '${partner_id}' not found.`, 404);
  }

  return successResponse(res, { partner }, 'Partner retrieved');
});
