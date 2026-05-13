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
router.get('/:id', GatepassController.getOne);

router.post('/', requireRole('employee', 'guest', 'admin', 'manager'), GatepassController.create);
router.put('/:id/status', requireRole('admin', 'manager', 'gatekeeper'), GatepassController.updateStatus);
router.delete('/:id', requireRole('admin', 'manager'), GatepassController.remove);

export default router;
