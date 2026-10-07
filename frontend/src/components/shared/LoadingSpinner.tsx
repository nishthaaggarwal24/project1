import React from 'react';

export default function LoadingSpinner({ message = 'Loading...' }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center p-8 space-y-3">
      <div className="w-8 h-8 border-2 border-[#E8AEA0] border-t-[#DE6B48] rounded-full animate-spin"></div>
      <p className="text-xs font-mono tracking-wider text-[#78716C] animate-pulse uppercase">{message}</p>
    </div>
  );
}
