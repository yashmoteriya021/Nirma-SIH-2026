import { calculateEMI, calculatePersonalizedEMI } from '../services/emi.service.js';
import { successResponse, errorResponse } from '../utils/apiResponse.js';
import asyncHandler from '../utils/asyncHandler.js';
import Scheme from '../models/Scheme.js';

/**
 * POST /api/calculator/emi
 * Accepts generic inputs OR scheme_id and user context
 */
export const emiCalculator = asyncHandler(async (req, res) => {
  const { 
    principal, annual_rate_pct, tenure_years, moratorium_months, // Old params
    scheme_id, requested_loan, tenure_months, user_profile // New params
  } = req.body;

  if (scheme_id) {
    const scheme = await Scheme.findOne({ id: scheme_id });
    if (!scheme) {
      return errorResponse(res, 'Scheme not found', 404);
    }
    
    const result = calculatePersonalizedEMI(
      scheme,
      Number(requested_loan || principal || 0),
      Number(tenure_months || (tenure_years ? tenure_years * 12 : scheme.tenureMonths)),
      user_profile || {}
    );
    
    return successResponse(res, result, 'Personalized EMI calculated successfully');
  } else {
    // Backward compatibility for generic calculation
    const result = calculateEMI({
      principal: Number(principal),
      annual_rate_pct: Number(annual_rate_pct),
      tenure_years: Number(tenure_years),
      moratorium_months: moratorium_months ? Number(moratorium_months) : 0,
    });
    
    return successResponse(res, result, 'EMI calculated successfully');
  }
});
