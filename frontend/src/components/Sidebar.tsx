
import React from 'react';
import CompanyLogo from '@/components/CompanyLogo';
import { sidebarActiveClass, sidebarInactiveClass } from '@/lib/dashboard-theme';

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

const Sidebar: React.FC<SidebarProps> = ({ activeTab, onTabChange, menuItems }) => {
  return (
    <aside className="h-full w-full bg-white flex flex-col">
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto scrollbar-hidden min-h-0">
        {menuItems.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onTabChange(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-md text-left text-sm font-medium transition-all duration-150 ${
                isActive ? sidebarActiveClass : sidebarInactiveClass
              }`}
            >
              <span className={`shrink-0 [&_svg]:h-5 [&_svg]:w-5 ${isActive ? 'text-white' : 'text-gray-400'}`}>
                {item.icon}
              </span>
              <span className="truncate">{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="p-3 border-t border-gray-200 flex-shrink-0">
        <div className="rounded-md border border-gray-200 bg-gray-50/80 px-3 py-2.5">
          <CompanyLogo imageClassName="h-7 w-auto max-w-full object-contain mb-1.5 mx-auto" />
          <p className="text-[10px] leading-snug text-gray-500 text-center">
            Innotronix Labs and Trading Pvt Ltd.
            <br />
            All Rights Reserved.
          </p>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
