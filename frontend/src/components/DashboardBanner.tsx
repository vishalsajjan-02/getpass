import React from 'react';
import { pageBannerClass } from '@/lib/dashboard-theme';

interface DashboardBannerProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  icon?: React.ReactNode;
}

const DashboardBanner: React.FC<DashboardBannerProps> = ({
  title,
  description,
  actions,
  icon,
}) => (
  <div className={`${pageBannerClass} px-4 py-2 md:px-5 md:py-2.5`}>
    <div className="flex items-center justify-between gap-3">
      <div className="min-w-0 flex-1">
        <h2 className="text-lg md:text-xl font-bold leading-none">{title}</h2>
        {description && (
          <p className="text-white/85 text-xs md:text-sm mt-1 leading-snug">{description}</p>
        )}
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {icon && (
          <div className="hidden sm:flex h-8 w-8 items-center justify-center rounded-md bg-white/15 [&_svg]:h-4 [&_svg]:w-4">
            {icon}
          </div>
        )}
        {actions}
      </div>
    </div>
  </div>
);

export default DashboardBanner;
