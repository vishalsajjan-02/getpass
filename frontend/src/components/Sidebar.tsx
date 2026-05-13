
import React from 'react';
import { useMockAuth } from '../contexts/MockAuthContext';
import { Button } from '@/components/ui/button';
import { useIsMobile } from '@/hooks/use-mobile';

interface SidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  menuItems: Array<{
    id: string;
    label: string;
    icon: React.ReactNode;
  }>;
  colorScheme?: 'blue' | 'green' | 'orange';
}

const Sidebar: React.FC<SidebarProps> = ({ activeTab, onTabChange, menuItems, colorScheme = 'blue' }) => {
  const { user, logout } = useMockAuth();
  const isMobile = useIsMobile();
  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const getColorClasses = (scheme: string) => {
    switch (scheme) {
      case 'green':
        return {
          header: 'bg-gradient-to-r from-green-600 to-emerald-600',
          activeButton: 'bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-lg transform scale-105',
          hoverButton: 'text-gray-600 hover:bg-gradient-to-r hover:from-gray-100 hover:to-gray-200 hover:text-gray-800 hover:scale-102',
          avatar: 'bg-gradient-to-br from-green-500 to-emerald-600'
        };
      case 'orange':
        return {
          header: 'bg-gradient-to-r from-orange-400 via-orange-500 to-rose-500',
          activeButton: 'bg-gradient-to-r from-orange-400 to-orange-500 text-white shadow-lg transform scale-105',
          hoverButton: 'text-gray-600 hover:bg-gradient-to-r hover:from-gray-100 hover:to-gray-200 hover:text-gray-800 hover:scale-102',
          avatar: 'bg-gradient-to-br from-orange-400 to-orange-500'
        };
      default: // blue
        return {
          header: 'bg-gradient-to-r from-blue-600 to-indigo-600',
          activeButton: 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-lg transform scale-105',
          hoverButton: 'text-gray-600 hover:bg-gradient-to-r hover:from-gray-100 hover:to-gray-200 hover:text-gray-800 hover:scale-102',
          avatar: 'bg-gradient-to-br from-blue-500 to-indigo-600'
        };
    }
  };

  const colors = getColorClasses(colorScheme);

  return (
    <div className={`${isMobile ? 'w-64' : 'w-64'} bg-gradient-to-b from-white to-gray-50 border-r border-gray-200 flex flex-col h-screen shadow-lg transition-all duration-300`}>
      {/* Header */}
      <div className={`p-4 md:p-6 border-b border-gray-200 ${colors.header} text-white flex-shrink-0`}>
        <h1 className="text-lg md:text-xl font-bold">Gatepass System</h1>
        <p className="text-xs md:text-sm opacity-90 capitalize">{user?.role} Dashboard</p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 md:p-4 space-y-2 overflow-y-auto scrollbar-hidden">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onTabChange(item.id)}
            className={`w-full flex items-center space-x-3 px-3 md:px-4 py-2 md:py-3 rounded-xl text-left transition-all duration-200 group text-sm md:text-base ${
              activeTab === item.id
                ? colors.activeButton
                : colors.hoverButton
            }`}
          >
            <div className={`transition-transform duration-200 ${activeTab === item.id ? 'scale-110' : 'group-hover:scale-110'}`}>
              {item.icon}
            </div>
            <span className="font-medium">{item.label}</span>
          </button>
        ))}
      </nav>

      {/* Footer with User Profile and Logout */}
      <div className="p-3 md:p-4 border-t border-gray-200 bg-gradient-to-r from-gray-50 to-white flex-shrink-0 space-y-3">
        {/* User Profile */}
        <div className="flex items-center space-x-3 p-2 md:p-3 rounded-xl bg-white shadow-sm border">
          <div className={`w-8 h-8 md:w-10 md:h-10 ${colors.avatar} rounded-full flex items-center justify-center shadow-md overflow-hidden flex-shrink-0`}>
            <span className="text-white font-bold text-xs md:text-sm">
              {user?.name?.charAt(0) || 'U'}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs md:text-sm font-semibold text-gray-800 truncate">{user?.name || 'Unknown User'}</p>
            <p className="text-xs text-gray-500 truncate">{user?.email || 'No email'}</p>
            {user?.department && (
              <p className="text-xs text-gray-400 truncate">{user.department}</p>
            )}
          </div>
        </div>

        {/* Logout Button */}
        <Button
          onClick={handleLogout}
          variant="outline"
          size="sm"
          className="w-full hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-all duration-200 text-xs md:text-sm"
        >
          <svg className="w-3 h-3 md:w-4 md:h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          Sign Out
        </Button>
      </div>
    </div>
  );
};

export default Sidebar;
