import { Router } from 'express';
import * as UserController from './controller';
import { authenticate } from '../../middleware/auth.middleware';
import { requireRole } from '../../middleware/role.middleware';
import { faceUpload } from '../../utils/uploads';

const router = Router();

router.use(authenticate);

router.get('/roles', requireRole('admin', 'manager'), UserController.getRoles);
router.get('/managers', requireRole('admin', 'manager'), UserController.getManagers);
router.get('/departments', requireRole('admin', 'manager'), UserController.getDepartments);
router.get('/', requireRole('admin', 'manager'), UserController.getAll);
router.post('/bulk-import', requireRole('admin', 'manager'), UserController.bulkImport);
router.post('/', requireRole('admin', 'manager'), UserController.create);
router.put(
  '/:id/punch-permission',
  requireRole('admin'),
  UserController.setPunchPermission,
);
router.post(
  '/:id/face',
  requireRole('admin'),
  faceUpload.single('face'),
  UserController.registerFace,
);
router.delete('/:id/face', requireRole('admin'), UserController.clearFace);
router.get('/:id', UserController.getOne);
router.put('/:id', UserController.update);
router.delete('/:id', requireRole('admin', 'manager'), UserController.remove);

export default router;
