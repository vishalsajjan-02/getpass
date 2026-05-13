
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  color: 'blue' | 'orange' | 'green' | 'red' | 'purple' | 'indigo';
  trend?: {
    value: string;
    isPositive: boolean;
  };
  onClick?: () => void;
}

const MetricCard: React.FC<MetricCardProps> = ({ 
  title, 
  value, 
  subtitle, 
  icon, 
  color, 
  trend,
  onClick
}) => {
  const colorClasses = {
    blue: 'bg-gradient-to-br from-blue-50 to-blue-100 text-blue-600 border-blue-200',
    orange: 'bg-gradient-to-br from-orange-50 to-orange-100 text-orange-600 border-orange-200',
    green: 'bg-gradient-to-br from-green-50 to-green-100 text-green-600 border-green-200',
    red: 'bg-gradient-to-br from-red-50 to-red-100 text-red-600 border-red-200',
    purple: 'bg-gradient-to-br from-purple-50 to-purple-100 text-purple-600 border-purple-200',
    indigo: 'bg-gradient-to-br from-indigo-50 to-indigo-100 text-indigo-600 border-indigo-200'
  };

  const cardGradients = {
    blue: 'hover:shadow-blue-100',
    orange: 'hover:shadow-orange-100',
    green: 'hover:shadow-green-100',
    red: 'hover:shadow-red-100',
    purple: 'hover:shadow-purple-100',
    indigo: 'hover:shadow-indigo-100'
  };

  return (
    <Card
      className={`group border-0 bg-gradient-to-br from-white to-gray-50 transition-all duration-300 hover:-translate-y-1 hover:from-white hover:to-gray-100 hover:shadow-xl ${cardGradients[color]} ${
        onClick ? 'cursor-pointer' : ''
      }`}
      onClick={onClick}
      onKeyDown={(event) => {
        if (!onClick) return;
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onClick();
        }
      }}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="space-y-2 flex-1">
            <div className={`w-11 h-11 rounded-lg ${colorClasses[color]} border flex items-center justify-center transition-all duration-300 group-hover:scale-105 group-hover:rotate-3`}>
              <div className="scale-110">
                {icon}
              </div>
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{value}</p>
              <p className="text-sm font-semibold text-gray-700 leading-tight">{title}</p>
              {subtitle && (
                <p className="text-[11px] text-gray-500 mt-0.5 leading-tight">{subtitle}</p>
              )}
            </div>
          </div>
          {trend && (
            <div className={`text-xs font-bold px-2 py-0.5 rounded-full ${
              trend.isPositive 
                ? 'text-emerald-700 bg-emerald-100' 
                : 'text-red-700 bg-red-100'
            }`}>
              <span className="text-xs">{trend.isPositive ? '↗' : '↘'}</span>
              {trend.value}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default MetricCard;
