import { Router } from 'express';
import authRoutes from '../modules/auth/auth.routes';
import userRoutes from '../modules/user/user.routes';
import gatepassRoutes from '../modules/gatepass/gatepass.routes';
import userInOutTimeRoutes from '../modules/userInOutTime/user-in-out-time.routes';
import leaveRoutes from '../modules/leave/leave.routes';
import companyHolidayRoutes from '../modules/companyHoliday/company-holiday.routes';

const router = Router();

router.get('/health', (_req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/gatepasses', gatepassRoutes);
router.use('/user-in-out-time', userInOutTimeRoutes);
router.use('/leaves', leaveRoutes);
router.use('/company-holidays', companyHolidayRoutes);

export default router;
