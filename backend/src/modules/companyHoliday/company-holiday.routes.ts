import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import { requireRole } from '../../middleware/role.middleware';
import { getCompanyHolidaysHandler } from './controller/get-company-holidays.controller';
import { createCompanyHolidayHandler } from './controller/create-company-holiday.controller';
import { updateCompanyHolidayHandler } from './controller/update-company-holiday.controller';
import { deleteCompanyHolidayHandler } from './controller/delete-company-holiday.controller';

const router = Router();

router.use(authenticate);

router.get('/', requireRole('admin', 'manager', 'gatekeeper'), getCompanyHolidaysHandler);
router.post('/', requireRole('admin'), createCompanyHolidayHandler);
router.put('/:id', requireRole('admin'), updateCompanyHolidayHandler);
router.delete('/:id', requireRole('admin'), deleteCompanyHolidayHandler);

export default router;
