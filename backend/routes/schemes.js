import { Router } from 'express';
import { readFile } from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const router = Router();
const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_PATH = join(__dirname, '..', 'data', 'schemes.json');

// Cache the parsed data in memory
let schemesCache = null;

async function loadSchemes() {
  if (!schemesCache) {
    const raw = await readFile(DATA_PATH, 'utf-8');
    schemesCache = JSON.parse(raw);
  }
  return schemesCache;
}

/**
 * GET /api/schemes
 * Returns all schemes. Supports optional query filters:
 *   ?category=Micro+Finance
 *   ?maxAmount=140000  (returns schemes with maxAmount <= value)
 *   ?incomeLimit=300000 (returns schemes where income is within limit)
 */
router.get('/', async (req, res, next) => {
  try {
    const data = await loadSchemes();
    let schemes = [...data.schemes];

    // Filter by category
    if (req.query.category) {
      const cat = req.query.category.toLowerCase();
      schemes = schemes.filter(s =>
        s.category.en.toLowerCase() === cat || s.category.hi === req.query.category
      );
    }

    // Filter by max amount
    if (req.query.maxAmount) {
      const max = parseInt(req.query.maxAmount, 10);
      schemes = schemes.filter(s => s.maxAmount <= max);
    }

    // Filter by income eligibility
    if (req.query.incomeLimit) {
      const income = parseInt(req.query.incomeLimit, 10);
      schemes = schemes.filter(s => income <= s.incomeLimit);
    }

    res.json({
      success: true,
      count: schemes.length,
      data: schemes,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/schemes/:id
 * Returns a single scheme by ID (e.g., micro-finance, term-loan, education-loan)
 */
router.get('/:id', async (req, res, next) => {
  try {
    const data = await loadSchemes();
    const scheme = data.schemes.find(s => s.id === req.params.id);

    if (!scheme) {
      const error = new Error(`Scheme not found: ${req.params.id}`);
      error.status = 404;
      throw error;
    }

    res.json({
      success: true,
      data: scheme,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/schemes/recommend
 * Rule-based scheme recommender.
 * Body: { purpose: 'small'|'large'|'education', estimatedCost: number, annualIncome: number }
 */
router.post('/recommend', async (req, res, next) => {
  try {
    const { purpose, estimatedCost, annualIncome } = req.body;

    if (!purpose || annualIncome === undefined) {
      const error = new Error('Missing required fields: purpose, annualIncome');
      error.status = 400;
      throw error;
    }

    const income = parseInt(annualIncome, 10);
    const cost = parseInt(estimatedCost, 10) || 0;

    // Rule 1: Income check
    if (income > 500000) {
      return res.json({
        success: true,
        eligible: false,
        message: 'Annual income exceeds the ₹5,00,000 limit for these schemes.',
      });
    }

    const data = await loadSchemes();
    let recommended = null;

    // Rule 2: Education
    if (purpose === 'education') {
      recommended = data.schemes.find(s => s.id === 'education-loan');
    }
    // Rule 3: Exceeds max term loan
    else if (cost > 5000000) {
      return res.json({
        success: true,
        eligible: false,
        message: 'Estimated cost exceeds the maximum available under current schemes (₹50 lakh).',
      });
    }
    // Rule 4: Micro Finance
    else if (cost <= 140000) {
      recommended = data.schemes.find(s => s.id === 'micro-finance');
    }
    // Rule 5: Term Loan
    else {
      recommended = data.schemes.find(s => s.id === 'term-loan');
    }

    res.json({
      success: true,
      eligible: true,
      data: recommended,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
