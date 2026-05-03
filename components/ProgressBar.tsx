import React from 'react';

interface ProgressBarProps {
  current: number;
  total: number;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({ current, total }) => {
  const percentage = Math.min(100, (current / total) * 100);

  return (
    <div className="w-full max-w-md mx-auto mb-8">
      <div className="flex justify-between mb-2 text-slate-500 font-bold text-sm">
        <span>Start</span>
        <span>Goal!</span>
      </div>
      <div className="h-6 bg-slate-200 rounded-full overflow-hidden border-4 border-white shadow-sm relative">
        <div 
          className="h-full bg-gradient-to-r from-amber-400 to-orange-400 rounded-full transition-all duration-500 ease-out"
          style={{ width: `${percentage}%` }}
        />
        {/* Striped pattern overlay */}
        <div 
          className="absolute inset-0 opacity-20" 
          style={{
            backgroundImage: 'linear-gradient(45deg,rgba(255,255,255,.15) 25%,transparent 25%,transparent 50%,rgba(255,255,255,.15) 50%,rgba(255,255,255,.15) 75%,transparent 75%,transparent)',
            backgroundSize: '1rem 1rem'
          }} 
        />
      </div>
    </div>
  );
};