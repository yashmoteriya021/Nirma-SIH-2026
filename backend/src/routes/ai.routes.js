import { Router } from 'express';
import {
  health,
  schemes,
  profile,
  intent,
  resetIntent,
  match,
  partners,
  chat,
  tts,
} from '../controllers/ai.controller.js';

const router = Router();

router.get('/health', health);
router.get('/schemes', schemes);
router.post('/profile', profile);
router.post('/intent', intent);
router.delete('/intent/:session_id', resetIntent);
router.post('/match', match);
router.post('/partners', partners);
/** Unified single-call: intent-turn → auto-match → recommendations */
router.post('/chat', chat);
router.post('/speech/tts', tts);

export default router;
