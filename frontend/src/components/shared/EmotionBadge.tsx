import React from 'react';

const EMOTION_COLORS: Record<string, string> = {
  fear: 'bg-[#FDF2F0] text-[#B91C1C] border-[#FCA5A5]',
  joy: 'bg-[#FEF9ED] text-[#B45309] border-[#FCD34D]',
  neutral: 'bg-[#F5F5F4] text-[#57534E] border-[#D6D3D1]',
  disgust: 'bg-[#F0FDF4] text-[#15803D] border-[#86EFAC]',
  sadness: 'bg-[#EFF6FF] text-[#1D4ED8] border-[#93C5FD]',
  anger: 'bg-[#FFF1EC] text-[#C2410C] border-[#FDBA74]',
  surprise: 'bg-[#FAF5FF] text-[#7E22CE] border-[#D8B4FE]',
  positive: 'bg-[#ECFDF5] text-[#047857] border-[#6EE7B7]',
  negative: 'bg-[#FFF1F2] text-[#BE123C] border-[#FDA4AF]',
};

export default function EmotionBadge({ emotion, className = '' }: { emotion: string; className?: string }) {
  const normalized = emotion.toLowerCase();
  const colorClass = EMOTION_COLORS[normalized] || 'bg-[#FAF7F2] text-[#78716C] border-[#E8AEA0]';

  return (
    <span className={`px-2.5 py-0.5 rounded-md text-[11px] font-mono tracking-wide font-medium border ${colorClass} ${className}`}>
      {emotion}
    </span>
  );
}
