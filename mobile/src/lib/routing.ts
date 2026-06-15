import type { UserRole } from '../types';

export const roleHomePath = (role: UserRole): string => {
  switch (role) {
    case 'admin':
    case 'manager':
      return '/manager';
    case 'gatekeeper':
      return '/gatekeeper';
    case 'employee':
      return '/employee';
    case 'guest':
      return '/guest';
    default:
      return '/employee';
  }
};
