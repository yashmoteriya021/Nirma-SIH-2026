import { Router } from 'express';
import { getPartners, getNearbyPartners, getPartnerById } from '../controllers/partner.controller.js';
import { nearbyPartnersValidation } from '../middleware/validate.middleware.js';

const router = Router();

// Nearby partner search (geospatial) — must come before :partner_id
router.get('/nearby', nearbyPartnersValidation, getNearbyPartners);

// List all partners (with optional filters)
router.get('/', getPartners);

// Get single partner by partner_id
router.get('/:partner_id', getPartnerById);

export default router;
