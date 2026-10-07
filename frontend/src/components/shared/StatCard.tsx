import React, { ReactNode } from 'react';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: ReactNode;
}

export default function StatCard({ title, value, subtitle, icon }: StatCardProps) {
  return (
    <div className="glass-card p-6 flex flex-col justify-between relative overflow-hidden group">
      {/* Corner plus icon from reference */}
      <span className="corner-plus text-[#DE6B48]/70 group-hover:text-[#DE6B48] transition-colors">+</span>
      
      <div className="flex items-start justify-between mb-4">
        <span className="text-[11px] font-mono tracking-wider uppercase text-[#78716C]">
          {title}
        </span>
        {icon && <div className="text-[#DE6B48] p-1.5 rounded-lg bg-[#FAF7F2] border border-[#E8AEA0]/60">{icon}</div>}
      </div>
      
      <div>
        <div className="text-3xl font-bold font-editorial text-[#1F2421] tracking-tight">
          {value}
        </div>
        {subtitle && (
          <p className="text-xs text-[#78716C] mt-1.5 flex items-center gap-1.5">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#DE6B48]/60" />
            {subtitle}
          </p>
        )}
      </div>
    </div>
  );
}
