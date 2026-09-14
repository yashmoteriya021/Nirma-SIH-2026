import { Router } from 'express';
import { emiCalculator } from '../controllers/calculator.controller.js';
import { emiValidation } from '../middleware/validate.middleware.js';

const router = Router();

router.post('/emi', emiValidation, emiCalculator);

export default router;
