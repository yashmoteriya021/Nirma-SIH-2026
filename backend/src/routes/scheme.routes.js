import { Router } from 'express';
import { getSchemes, getSchemeById, searchSchemes, recommend } from '../controllers/scheme.controller.js';
import { recommendValidation } from '../middleware/validate.middleware.js';

const router = Router();

// Search must come before :scheme_id to avoid treating "search" as a param
router.get('/search', searchSchemes);

// Recommendation engine
router.post('/recommend', recommendValidation, recommend);

// List all schemes (with optional filters)
router.get('/', getSchemes);

// Get single scheme by scheme_id
router.get('/:scheme_id', getSchemeById);

export default router;
