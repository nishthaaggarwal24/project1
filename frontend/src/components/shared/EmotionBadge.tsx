import React from 'react';

const EMOTION_COLORS: Record<string, string> = {
  fear: 'bg-red-500/20 text-red-400 border-red-500/30',
  joy: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  neutral: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
  disgust: 'bg-green-600/20 text-green-400 border-green-600/30',
  sadness: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  anger: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  surprise: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  positive: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  negative: 'bg-rose-500/20 text-rose-400 border-rose-500/30',
};

export default function EmotionBadge({ emotion, className = '' }: { emotion: string; className?: string }) {
  const normalized = emotion.toLowerCase();
  const colorClass = EMOTION_COLORS[normalized] || 'bg-gray-700 text-gray-300 border-gray-600';

  return (
    <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${colorClass} ${className}`}>
      {emotion}
    </span>
  );
}
