import { Router } from 'express';
import * as GatepassController from './controller';
import { authenticate } from '../../middleware/auth.middleware';
import { requireRole } from '../../middleware/role.middleware';

const router = Router();

router.use(authenticate);

router.get('/reasons', GatepassController.getReasons);
router.get('/', GatepassController.getAll);
router.get('/today', GatepassController.getToday);
router.get('/search', GatepassController.search);
router.get('/stats', GatepassController.getStats);
router.get('/analytics/lunch/daily', requireRole('admin'), GatepassController.getDailyLunchReport);
router.get('/analytics/lunch/range', requireRole('admin'), GatepassController.getLunchAnalyticsRangeReport);
router.get('/analytics/lunch/monthly', requireRole('admin'), GatepassController.getMonthlyLunchReport);
router.get('/analytics/lunch/yearly', requireRole('admin'), GatepassController.getYearlyLunchReport);
router.get('/analytics/lunch/live-status', requireRole('admin'), GatepassController.getLiveEmployeeStatuses);
router.get('/analytics/lunch/details/:userId', requireRole('admin'), GatepassController.getLunchEmployeeDetailReport);
router.get('/:id', GatepassController.getOne);

router.post('/', requireRole('employee', 'guest', 'admin', 'manager'), GatepassController.create);
router.put('/:id/status', requireRole('admin', 'manager', 'gatekeeper', 'employee', 'guest'), GatepassController.updateStatus);
router.delete('/:id', requireRole('admin', 'manager', 'employee', 'guest'), GatepassController.remove);

export default router;
