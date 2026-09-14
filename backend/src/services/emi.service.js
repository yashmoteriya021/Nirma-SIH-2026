/**
 * EMI Calculator Service — standard reducing-balance formula.
 *
 * If moratorium_months is provided, interest accrues during the moratorium
 * period and is added to the principal before the EMI schedule begins.
 *
 * Formula:
 *   r = (annual_rate_pct / 12) / 100   (monthly interest rate as decimal)
 *   n = tenure_years * 12              (total EMI-paying months)
 *   EMI = P × r × (1 + r)^n / ((1 + r)^n − 1)
 */

/**
 * @param {Object} params
 * @param {number} params.principal         - Loan principal (₹)
 * @param {number} params.annual_rate_pct   - Annual interest rate (e.g. 7.0 for 7%)
 * @param {number} params.tenure_years      - Loan tenure in years
 * @param {number} [params.moratorium_months=0] - Moratorium period in months
 * @returns {Object} { emi, total_interest, total_payment, effective_principal, moratorium_interest, note }
 */
export const calculateEMI = ({ principal, annual_rate_pct, tenure_years, moratorium_months = 0 }) => {
  const r = (annual_rate_pct / 12) / 100;  // monthly rate
  const n = tenure_years * 12;             // total EMI months

  let effectivePrincipal = principal;
  let moratoriumInterest = 0;

  // During moratorium, simple interest accrues and adds to principal
  if (moratorium_months > 0 && r > 0) {
    moratoriumInterest = principal * r * moratorium_months;
    effectivePrincipal = principal + moratoriumInterest;
  }

  let emi;
  if (r === 0) {
    // Zero interest edge case
    emi = effectivePrincipal / n;
  } else {
    const compoundFactor = Math.pow(1 + r, n);
    emi = effectivePrincipal * r * compoundFactor / (compoundFactor - 1);
  }

  const totalPayment = emi * n;
  const totalInterest = totalPayment - principal; // total interest includes moratorium interest

  const result = {
    emi: Math.round(emi * 100) / 100,
    total_interest: Math.round(totalInterest * 100) / 100,
    total_payment: Math.round(totalPayment * 100) / 100,
    effective_principal: Math.round(effectivePrincipal * 100) / 100,
  };

  if (moratorium_months > 0) {
    result.moratorium_interest = Math.round(moratoriumInterest * 100) / 100;
    result.note = `Interest of ₹${result.moratorium_interest.toLocaleString('en-IN')} accrued during the ${moratorium_months}-month moratorium has been added to the principal. EMI is calculated on the effective principal of ₹${result.effective_principal.toLocaleString('en-IN')}.`;
  }

  return result;
};
