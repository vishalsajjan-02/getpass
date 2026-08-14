import { softDeleteById } from '../../../utils/soft-delete';

export const deleteCompanyHoliday = async (id: string): Promise<{ id: string }> => {
  if (!id) throw new Error('id is required');

  const deleted = await softDeleteById('company_holidays', id);
  if (!deleted) throw new Error('Holiday not found or already deleted');
  return { id };
};
