import { Router } from 'express';
import { getSchemes, getSchemeById, searchSchemes } from '../controllers/scheme.controller.js';

const router = Router();

// Search must come before :scheme_id to avoid treating "search" as a param
router.get('/search', searchSchemes);



// List all schemes (with optional filters)
router.get('/', getSchemes);

// Get single scheme by scheme_id
router.get('/:scheme_id', getSchemeById);

export default router;
