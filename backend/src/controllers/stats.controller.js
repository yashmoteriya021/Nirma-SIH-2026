import Application from '../models/Application.js';
import ChannelPartner from '../models/ChannelPartner.js';
import Scheme from '../models/Scheme.js';
import { successResponse } from '../utils/apiResponse.js';
import asyncHandler from '../utils/asyncHandler.js';

/**
 * GET /api/stats
 * Aggregate counts for the home page "impact" band.
 * Returns: { total_applications, active_partners, active_schemes, disbursed_applications }
 */
export const getStats = asyncHandler(async (req, res) => {
  const [
    totalApplications,
    disbursedApplications,
    activePartners,
    activeSchemes,
  ] = await Promise.all([
    Application.countDocuments(),
    Application.countDocuments({ status: 'disbursed' }),
    ChannelPartner.countDocuments({ fund_status: 'available', npa_rate: { $lte: 7 } }),
    Scheme.countDocuments({ is_active: true }),
  ]);

  return successResponse(res, {
    total_applications: totalApplications,
    disbursed_applications: disbursedApplications,
    active_partners: activePartners,
    active_schemes: activeSchemes,
  }, 'Platform statistics retrieved');
});
