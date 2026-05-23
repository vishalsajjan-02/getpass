import React from 'react';
import { LogOut, Menu } from 'lucide-react';
import { useMockAuth } from '@/contexts/MockAuthContext';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { portalTitleClass } from '@/lib/dashboard-theme';

const formatRoleLabel = (role?: string): string => {
  if (!role) return '';
  return role.charAt(0).toUpperCase() + role.slice(1);
};

interface DashboardTopBarProps {
  onMenuClick?: () => void;
  showMenuButton?: boolean;
}

const DashboardTopBar: React.FC<DashboardTopBarProps> = ({ onMenuClick, showMenuButton }) => {
  const { user, logout } = useMockAuth();

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const userLine = [user?.name || 'Unknown User', user?.role ? formatRoleLabel(user.role) : '']
    .filter(Boolean)
    .join(', ');

  const initials = user?.name
    ?.split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || 'U';

  return (
    <header className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-4 md:px-6 shrink-0 w-full">
      <div className="flex items-center gap-2 min-w-0">
        {showMenuButton && onMenuClick && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onMenuClick}
            className="md:hidden shrink-0 h-9 w-9 text-gray-600"
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </Button>
        )}
        <h1 className={`${portalTitleClass} text-lg md:text-xl truncate`}>Gatepass System</h1>
      </div>

      <div className="flex items-center gap-2 md:gap-3 shrink-0">
        <span className="text-sm text-gray-700 font-medium truncate max-w-[160px] sm:max-w-[220px] md:max-w-none hidden sm:block">
          {userLine}
        </span>

        <Avatar className="h-9 w-9 border border-orange-200 shrink-0">
          <AvatarFallback className="bg-gradient-to-br from-orange-400 to-rose-500 text-white text-xs font-semibold">
            {initials}
          </AvatarFallback>
        </Avatar>

        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={handleLogout}
          className="h-9 w-9 text-gray-500 hover:text-red-600 hover:bg-red-50 shrink-0"
          title="Sign out"
          aria-label="Sign out"
        >
          <LogOut className="h-5 w-5" />
        </Button>
      </div>
    </header>
  );
};

export default DashboardTopBar;
