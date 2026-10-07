import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

export default function ErrorBanner({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="bg-[#FFF1F2] border border-[#FDA4AF] rounded-xl p-4 flex items-center justify-between text-[#BE123C]">
      <div className="flex items-center space-x-3 text-sm">
        <AlertCircle className="w-5 h-5 text-[#E11D48] flex-shrink-0" />
        <span className="font-medium">{message}</span>
      </div>
      {onRetry && (
        <button
          onClick={onRetry}
          className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border border-[#FDA4AF] bg-white text-xs font-semibold text-[#BE123C] hover:bg-[#FFF1F2] transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Retry</span>
        </button>
      )}
    </div>
  );
}
