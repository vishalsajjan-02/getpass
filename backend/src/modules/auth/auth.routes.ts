import { Router } from 'express';
import * as AuthController from './controller';
import { authenticate } from '../../middleware/auth.middleware';

const router = Router();

router.post('/login', AuthController.login);
router.post('/guest-login', AuthController.guestLogin);
router.get('/me', authenticate, AuthController.getMe);

export default router;
