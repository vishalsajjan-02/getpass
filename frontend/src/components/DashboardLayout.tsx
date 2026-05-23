import React, { useState } from 'react';
import Sidebar from '@/components/Sidebar';
import DashboardTopBar from '@/components/DashboardTopBar';

interface DashboardLayoutProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  menuItems: Array<{
    id: string;
    label: string;
    icon: React.ReactNode;
  }>;
  colorScheme?: 'blue' | 'green' | 'orange';
  children: React.ReactNode;
  pageHeader?: React.ReactNode;
  /** Renders below the page header; stays fixed while main content scrolls. */
  pageToolbar?: React.ReactNode;
}

/**
 * Wireframe:
 * ┌────────────────────────────────────────────┐
 * │ Gatepass System          user info Sign out│
 * ├──────────────┬─────────────────────────────┤
 * │  (nav)       │  page header                │
 * │              ├─────────────────────────────┤
 * │ Company logo │  main content               │
 * └──────────────┴─────────────────────────────┘
 */
const DashboardLayout: React.FC<DashboardLayoutProps> = ({
  activeTab,
  onTabChange,
  menuItems,
  colorScheme = 'orange',
  children,
  pageHeader,
  pageToolbar,
}) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleTabChange = (tab: string) => {
    onTabChange(tab);
    setSidebarOpen(false);
  };

  const sidebarProps = {
    activeTab,
    onTabChange: handleTabChange,
    menuItems,
    colorScheme,
  };

  return (
    <div className="h-screen w-full flex flex-col overflow-hidden bg-white">
      <DashboardTopBar
        showMenuButton
        onMenuClick={() => setSidebarOpen((open) => !open)}
      />

      <div className="flex flex-1 min-h-0 w-full">
        <div className="hidden md:flex shrink-0 w-[256px] h-full border-r border-gray-200">
          <Sidebar {...sidebarProps} />
        </div>

        <div className="flex-1 flex flex-col min-w-0 min-h-0 bg-[#f8f9fb]">
          {(pageHeader || pageToolbar) && (
            <div className="shrink-0 z-20 border-b border-gray-200/80 bg-[#f8f9fb] px-4 pb-4 pt-2 md:px-5 md:pb-4 md:pt-2.5">
              <div className="mx-auto w-full max-w-[1600px]">
                {pageHeader}
                {pageToolbar ? <div className={pageHeader ? 'mt-4' : undefined}>{pageToolbar}</div> : null}
              </div>
            </div>
          )}

          <div className="flex-1 min-h-0 overflow-y-auto scrollbar-hidden">
            <div
              className={`mx-auto w-full max-w-[1600px] px-4 pb-4 md:px-5 md:pb-5 ${
                pageHeader || pageToolbar ? '' : 'pt-2 md:pt-2.5'
              }`}
            >
              <div className="space-y-4">{children}</div>
            </div>
          </div>
        </div>
      </div>

      {sidebarOpen && (
        <div
          className="md:hidden fixed inset-0 top-14 z-40 bg-black/40"
          onClick={() => setSidebarOpen(false)}
          aria-hidden
        />
      )}
      <div
        className={`md:hidden fixed top-14 left-0 bottom-0 z-50 w-[256px] border-r border-gray-200 bg-white shadow-xl transition-transform duration-300 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full pointer-events-none'
        }`}
      >
        <Sidebar {...sidebarProps} />
      </div>
    </div>
  );
};

export default DashboardLayout;
