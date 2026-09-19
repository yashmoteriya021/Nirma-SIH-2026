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
    scheme_id, scheme_details, requested_loan, tenure_months, user_profile // New params
  } = req.body;

  if (scheme_details) {
    // Scheme shape from the ML pipeline's /match response (module 3), used
    // directly so AI-recommended schemes don't need a matching Mongo record.
    const scheme = {
      maxAmount: scheme_details.loan_ceiling,
      fundingPercent: scheme_details.loan_percentage,
      incomeLimit: scheme_details.income_limit ?? null,
      tenureMonths: scheme_details.repayment_years ? scheme_details.repayment_years * 12 : (tenure_months || 60),
      interestRate: { min: scheme_details.effective_rate ?? scheme_details.interest_rate },
      moratoriumMonths: [scheme_details.moratorium_months || 0],
    };

    const result = calculatePersonalizedEMI(
      scheme,
      Number(requested_loan || principal || 0),
      Number(tenure_months || scheme.tenureMonths),
      user_profile || {}
    );

    return successResponse(res, result, 'Personalized EMI calculated successfully');
  } else if (scheme_id) {
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
