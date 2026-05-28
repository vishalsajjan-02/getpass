import { Router } from 'express';
import authRoutes from '../modules/auth/auth.routes';
import userRoutes from '../modules/user/user.routes';
import gatepassRoutes from '../modules/gatepass/gatepass.routes';
import userInOutTimeRoutes from '../modules/userInOutTime/user-in-out-time.routes';

const router = Router();

router.get('/health', (_req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/gatepasses', gatepassRoutes);
router.use('/user-in-out-time', userInOutTimeRoutes);

export default router;
