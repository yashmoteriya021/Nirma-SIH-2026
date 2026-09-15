/**
 * EMI Calculator Service — standard reducing-balance formula.
 */

/**
 * @param {Object} params
 * @param {number} params.principal         - Loan principal (₹)
 * @param {number} params.annual_rate_pct   - Annual interest rate (e.g. 7.0 for 7%)
 * @param {number} params.tenure_years      - Loan tenure in years
 * @param {number} [params.moratorium_months=0] - Moratorium period in months
 * @returns {Object}
 */
export const calculateEMI = ({ principal, annual_rate_pct, tenure_years, moratorium_months = 0 }) => {
  const r = (annual_rate_pct / 12) / 100;  // monthly rate
  const n = tenure_years * 12;             // total EMI months

  let effectivePrincipal = principal;
  let moratoriumInterest = 0;

  if (moratorium_months > 0 && r > 0) {
    moratoriumInterest = principal * r * moratorium_months;
    effectivePrincipal = principal + moratoriumInterest;
  }

  let emi;
  if (r === 0 || n === 0) {
    emi = n > 0 ? effectivePrincipal / n : 0;
  } else {
    const compoundFactor = Math.pow(1 + r, n);
    emi = effectivePrincipal * r * compoundFactor / (compoundFactor - 1);
  }

  const totalPayment = emi * n;
  const totalInterest = totalPayment - principal;

  const result = {
    emi: Math.round(emi * 100) / 100,
    total_interest: Math.round(totalInterest * 100) / 100,
    total_payment: Math.round(totalPayment * 100) / 100,
    effective_principal: Math.round(effectivePrincipal * 100) / 100,
  };

  if (moratorium_months > 0) {
    result.moratorium_interest = Math.round(moratoriumInterest * 100) / 100;
    result.note = `Interest of ₹${result.moratorium_interest.toLocaleString('en-IN')} accrued during the ${moratorium_months}-month moratorium has been added to the principal.`;
  }

  return result;
};

/**
 * Calculate Personalized EMI based on Scheme limits and User Profile
 */
export const calculatePersonalizedEMI = (scheme, requestedLoan, tenureMonths, userProfile = {}) => {
  const { annual_income, project_cost } = userProfile;
  const reasons = [];
  
  // 1. Determine Maximum Eligible Loan
  let maxEligibleLoan = scheme.maxAmount;
  reasons.push(`Scheme allows a maximum loan of ₹${scheme.maxAmount.toLocaleString('en-IN')}.`);
  
  if (project_cost && scheme.fundingPercent) {
    const costLimit = (project_cost * scheme.fundingPercent) / 100;
    if (costLimit < maxEligibleLoan) {
      maxEligibleLoan = costLimit;
      reasons.push(`Loan capped at ${scheme.fundingPercent}% of your estimated project cost (₹${costLimit.toLocaleString('en-IN')}).`);
    }
  }
  
  // 2. Validate Income Limit
  let isEligible = true;
  if (annual_income && scheme.incomeLimit && annual_income > scheme.incomeLimit) {
    isEligible = false;
    reasons.push(`Your annual income (₹${annual_income.toLocaleString('en-IN')}) exceeds the scheme's limit of ₹${scheme.incomeLimit.toLocaleString('en-IN')}.`);
    maxEligibleLoan = 0;
  }
  
  // 3. Bound Requested Loan and Tenure
  const finalLoanAmount = Math.min(Math.max(0, requestedLoan), maxEligibleLoan);
  if (requestedLoan > maxEligibleLoan && isEligible) {
    reasons.push(`Your requested loan (₹${requestedLoan.toLocaleString('en-IN')}) exceeds your maximum eligible amount (₹${maxEligibleLoan.toLocaleString('en-IN')}). Calculation adjusted to maximum eligible.`);
  }

  const finalTenureMonths = Math.min(tenureMonths, scheme.tenureMonths);
  if (tenureMonths > scheme.tenureMonths) {
    reasons.push(`Requested tenure exceeds scheme maximum of ${scheme.tenureMonths} months. Adjusted to ${scheme.tenureMonths}.`);
  }

  // Interest Rate
  const interestRate = scheme.interestRate.min || 0;
  const moratoriumMonths = Array.isArray(scheme.moratoriumMonths) ? (scheme.moratoriumMonths[0] || 0) : 0;
  
  // 4. Calculate EMI
  const emiResult = calculateEMI({
    principal: finalLoanAmount,
    annual_rate_pct: interestRate,
    tenure_years: finalTenureMonths / 12,
    moratorium_months: moratoriumMonths
  });
  
  // 5. Affordability Analysis
  let affordability = null;
  if (annual_income && emiResult.emi > 0) {
    const monthlyIncome = annual_income / 12;
    const emiToIncomeRatio = (emiResult.emi / monthlyIncome) * 100;
    
    let status = 'Comfortable';
    if (emiToIncomeRatio > 60) status = 'Likely Unaffordable';
    else if (emiToIncomeRatio >= 40) status = 'High Repayment Burden';
    
    affordability = {
      monthly_income: Math.round(monthlyIncome),
      ratio_pct: Math.round(emiToIncomeRatio * 100) / 100,
      status
    };
  }
  
  return {
    is_eligible: isEligible,
    requested_loan: requestedLoan,
    max_eligible_loan: maxEligibleLoan,
    applied_loan_amount: finalLoanAmount,
    applicable_interest_rate: interestRate,
    tenure_months: finalTenureMonths,
    moratorium_months: moratoriumMonths,
    emi_result: emiResult,
    affordability,
    reasons
  };
};
