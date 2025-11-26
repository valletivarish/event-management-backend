import express from 'express';
import { getLogs } from '../controllers/logController.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

router.get('/', authenticate, requireAdmin, getLogs);

export default router;

