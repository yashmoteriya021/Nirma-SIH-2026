import { calculateEMI } from '../services/emi.service.js';
import { successResponse } from '../utils/apiResponse.js';
import asyncHandler from '../utils/asyncHandler.js';

/**
 * POST /api/calculator/emi
 * Body: { principal, annual_rate_pct, tenure_years, moratorium_months? }
 * Returns: { emi, total_interest, total_payment, effective_principal, moratorium_interest?, note? }
 */
export const emiCalculator = asyncHandler(async (req, res) => {
  const { principal, annual_rate_pct, tenure_years, moratorium_months } = req.body;

  const result = calculateEMI({
    principal: Number(principal),
    annual_rate_pct: Number(annual_rate_pct),
    tenure_years: Number(tenure_years),
    moratorium_months: moratorium_months ? Number(moratorium_months) : 0,
  });

  return successResponse(res, result, 'EMI calculated successfully');
});
