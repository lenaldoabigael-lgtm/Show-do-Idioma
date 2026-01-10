
import React from 'react';
import { MessageSquare } from 'lucide-react';

interface HostPresenterProps {
  message: string;
  isCorrect?: boolean | null;
  isLoading?: boolean;
}

export const HostPresenter: React.FC<HostPresenterProps> = ({ message, isCorrect, isLoading }) => {
  return (
    <div className="flex flex-col items-center mb-8 relative">
      {/* Speech Bubble */}
      <div className="relative mb-6 animate-in fade-in zoom-in duration-500">
        <div className="bg-white text-slate-900 p-6 rounded-3xl shadow-2xl border-4 border-blue-500 max-w-md relative z-10">
          <p className="text-lg font-bold leading-tight italic">
            {isLoading ? "Deixe-me ver..." : message}
          </p>
          <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-8 h-8 bg-white border-r-4 border-b-4 border-blue-500 rotate-45"></div>
        </div>
      </div>

      {/* Host Avatar (Simple SVG Representation) */}
      <div className="relative w-40 h-40 flex items-center justify-center">
        <svg viewBox="0 0 200 200" className={`w-full h-full transition-transform duration-500 ${isCorrect === true ? 'scale-110' : isCorrect === false ? 'rotate-12' : ''}`}>
          {/* Suit/Body */}
          <path d="M40,190 Q100,160 160,190 L160,200 L40,200 Z" fill="#1e3a8a" />
          <path d="M70,190 L100,165 L130,190" fill="#fff" />
          <path d="M95,165 L100,190 L105,165" fill="#ef4444" />
          
          {/* Head */}
          <circle cx="100" cy="90" r="50" fill="#fef3c7" />
          
          {/* Hair */}
          <path d="M50,90 Q50,40 100,40 Q150,40 150,90" fill="#4b5563" />
          
          {/* Eyes */}
          <circle cx="85" cy="85" r="4" fill="#1e293b" />
          <circle cx="115" cy="85" r="4" fill="#1e293b" />
          
          {/* Glasses */}
          <circle cx="85" cy="85" r="12" fill="none" stroke="#1e293b" strokeWidth="2" />
          <circle cx="115" cy="85" r="12" fill="none" stroke="#1e293b" strokeWidth="2" />
          <line x1="97" y1="85" x2="103" y2="85" stroke="#1e293b" strokeWidth="2" />
          
          {/* Mouth */}
          <path 
            d={isCorrect === true ? "M85,115 Q100,135 115,115" : isCorrect === false ? "M85,125 Q100,115 115,125" : "M85,120 Q100,125 115,120"} 
            fill="none" 
            stroke="#1e293b" 
            strokeWidth="3" 
            strokeLinecap="round" 
          />
        </svg>
        
        {/* Glow behind head */}
        <div className="absolute inset-0 bg-blue-500/20 blur-3xl -z-10 rounded-full animate-pulse"></div>
      </div>
    </div>
  );
};
