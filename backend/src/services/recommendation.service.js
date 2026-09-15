import Scheme from '../models/Scheme.js';

/**
 * @deprecated Legacy 3-rule recommender kept for backward compatibility.
 * The explainable matching engine now lives in the Python ML service and is
 * exposed via POST /api/ai/match (see ai.controller.js).
 *
 * Recommendation Engine — server is the source of truth.
 *
 * Rules (evaluated top-to-bottom, first match wins):
 *   1. annual_income > 500000       → not eligible
 *   2. category === 'education'     → recommend edu_01
 *   3. category === 'business':
 *      a. project_cost <= 140000    → recommend mcf_01
 *      b. project_cost <= 5000000   → recommend term_01
 *      c. project_cost > 5000000   → no automatic match (manual review)
 *
 * @param {Object} params
 * @param {string} params.category     - 'business' or 'education'
 * @param {number} params.project_cost - Estimated project/course cost
 * @param {number} params.annual_income - Applicant's annual income
 * @returns {Object} { eligible, scheme?, message }
 */
export const recommendScheme = async ({ category, project_cost, annual_income }) => {
  // Rule 1: Income eligibility check
  if (annual_income > 500000) {
    return {
      eligible: false,
      scheme: null,
      message: 'Annual income exceeds ₹5,00,000. Unfortunately, you are not eligible for concessional schemes under NSFDC/NBCFDC. Please check with your nearest bank for standard loan products.',
    };
  }

  let schemeId = null;

  // Rule 2: Education category
  if (category === 'education') {
    schemeId = 'edu_01';
  }
  // Rule 3: Business category
  else if (category === 'business') {
    if (project_cost <= 140000) {
      schemeId = 'mcf_01';        // Micro Credit Finance
    } else if (project_cost <= 5000000) {
      schemeId = 'term_01';       // Term Loan
    } else {
      return {
        eligible: true,
        scheme: null,
        message: 'Your project cost exceeds ₹50,00,000 (the Term Loan ceiling). This case has been flagged for manual review. Please contact your nearest SCA office for assistance.',
      };
    }
  }

  // Fetch the matched scheme from DB
  const scheme = await Scheme.findOne({ scheme_id: schemeId, is_active: true });

  if (!scheme) {
    return {
      eligible: true,
      scheme: null,
      message: 'A matching scheme was identified but is currently unavailable. Please try again later.',
    };
  }

  return {
    eligible: true,
    scheme,
    message: `Based on your inputs, we recommend the "${scheme.name}" scheme.`,
  };
};
