
import React from 'react';
import { PRIZES } from '../types';

interface PrizeLadderProps {
  currentLevel: number;
}

export const PrizeLadder: React.FC<PrizeLadderProps> = ({ currentLevel }) => {
  return (
    <div className="hidden lg:flex flex-col-reverse gap-1 bg-slate-900/80 p-4 rounded-xl border border-blue-500/30 backdrop-blur-sm w-48 shrink-0 overflow-y-auto max-h-[80vh]">
      {PRIZES.map((prize, index) => (
        <div 
          key={prize}
          className={`flex justify-between items-center px-3 py-1 rounded text-xs font-bold transition-all duration-300 ${
            index === currentLevel 
              ? 'bg-yellow-500 text-slate-950 scale-105 shadow-[0_0_15px_rgba(234,179,8,0.5)]' 
              : index < currentLevel 
                ? 'text-blue-400 opacity-60' 
                : 'text-slate-400'
          }`}
        >
          <span className="w-6">{index + 1}</span>
          <span>{prize}</span>
        </div>
      ))}
    </div>
  );
};
