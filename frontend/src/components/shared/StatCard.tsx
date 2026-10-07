import React, { ReactNode } from 'react';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: ReactNode;
}

export default function StatCard({ title, value, subtitle, icon }: StatCardProps) {
  return (
    <div className="glass-card p-6 flex flex-col justify-between">
      <div className="flex items-start justify-between mb-2">
        <h3 className="text-gray-400 text-sm font-medium">{title}</h3>
        {icon && <div className="text-dream-purple">{icon}</div>}
      </div>
      <div>
        <div className="text-2xl font-bold text-white">{value}</div>
        {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
      </div>
    </div>
  );
}
