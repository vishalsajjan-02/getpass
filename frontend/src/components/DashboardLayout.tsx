import React, { useState } from 'react';
import { LogOut } from 'lucide-react';
import Sidebar from '@/components/Sidebar';
import DashboardTopBar from '@/components/DashboardTopBar';
import { useMockAuth } from '@/contexts/MockAuthContext';
import { Button } from '@/components/ui/button';

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
  /** Hide left nav (e.g. gatekeeper uses in-page section buttons instead). */
  hideSidebar?: boolean;
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
  hideSidebar = false,
}) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { logout } = useMockAuth();

  const handleTabChange = (tab: string) => {
    onTabChange(tab);
    setSidebarOpen(false);
  };

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const sidebarProps = {
    activeTab,
    onTabChange: handleTabChange,
    menuItems,
    colorScheme,
  };

  return (
    <div className="h-screen w-full flex flex-col overflow-hidden bg-white">
      {!hideSidebar ? (
        <DashboardTopBar
          showMenuButton
          onMenuClick={() => setSidebarOpen((open) => !open)}
        />
      ) : null}

      <div className="flex flex-1 min-h-0 w-full">
        {!hideSidebar ? (
          <div className="hidden md:flex shrink-0 w-[256px] h-full border-r border-gray-200">
            <Sidebar {...sidebarProps} />
          </div>
        ) : null}

        <div className="flex-1 flex flex-col min-w-0 min-h-0 bg-[#f8f9fb]">
          {(pageHeader || pageToolbar) && (
            <div className="shrink-0 z-20 border-b border-gray-200/80 bg-[#f8f9fb] px-4 pb-2 pt-2 md:px-5 md:pb-2 md:pt-2.5">
              <div className="mx-auto w-full max-w-[1600px]">
                {pageHeader}
                {pageToolbar ? <div className={pageHeader ? 'mt-2' : undefined}>{pageToolbar}</div> : null}
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

          {hideSidebar ? (
            <div className="pointer-events-none fixed bottom-4 right-4 z-30">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleLogout}
                className="pointer-events-auto h-8 rounded-full border-red-200 bg-white px-3 text-xs font-medium text-red-600 shadow-md hover:bg-red-50 hover:text-red-700"
              >
                <LogOut className="mr-1.5 h-3.5 w-3.5" />
                Logout
              </Button>
            </div>
          ) : null}
        </div>
      </div>

      {!hideSidebar ? (
        <>
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
        </>
      ) : null}
    </div>
  );
};

export default DashboardLayout;
