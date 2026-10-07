import React from 'react';

export default function LoadingSpinner({ message = 'Loading...' }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center p-8 space-y-4">
      <div className="w-10 h-10 border-4 border-dream-purple border-t-transparent rounded-full animate-spin"></div>
      <p className="text-gray-400 animate-pulse">{message}</p>
    </div>
  );
}
