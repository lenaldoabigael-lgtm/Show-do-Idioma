
import React from 'react';
import { Users, LayoutGrid, ArrowRight } from 'lucide-react';

interface LifelinesProps {
  available: {
    skip: number;
    cards: boolean;
    students: boolean;
  };
  onSkip: () => void;
  onCards: () => void;
  onStudents: () => void;
  disabled: boolean;
}

export const Lifelines: React.FC<LifelinesProps> = ({ available, onSkip, onCards, onStudents, disabled }) => {
  return (
    <div className="flex gap-4 justify-center my-6">
      <button
        onClick={onSkip}
        disabled={disabled || available.skip === 0}
        className={`flex flex-col items-center p-3 rounded-lg border-2 transition-all group ${
          available.skip > 0 
            ? 'border-blue-500 bg-blue-500/10 hover:bg-blue-500/30 hover:scale-105' 
            : 'border-slate-700 opacity-40 grayscale cursor-not-allowed'
        }`}
      >
        <ArrowRight className="w-8 h-8 mb-1" />
        <span className="text-[10px] font-bold uppercase tracking-wider">Pular ({available.skip})</span>
      </button>

      <button
        onClick={onCards}
        disabled={disabled || !available.cards}
        className={`flex flex-col items-center p-3 rounded-lg border-2 transition-all group ${
          available.cards 
            ? 'border-yellow-500 bg-yellow-500/10 hover:bg-yellow-500/30 hover:scale-105' 
            : 'border-slate-700 opacity-40 grayscale cursor-not-allowed'
        }`}
      >
        <LayoutGrid className="w-8 h-8 mb-1" />
        <span className="text-[10px] font-bold uppercase tracking-wider">Cartas</span>
      </button>

      <button
        onClick={onStudents}
        disabled={disabled || !available.students}
        className={`flex flex-col items-center p-3 rounded-lg border-2 transition-all group ${
          available.students 
            ? 'border-purple-500 bg-purple-500/10 hover:bg-purple-500/30 hover:scale-105' 
            : 'border-slate-700 opacity-40 grayscale cursor-not-allowed'
        }`}
      >
        <Users className="w-8 h-8 mb-1" />
        <span className="text-[10px] font-bold uppercase tracking-wider">Convidados</span>
      </button>
    </div>
  );
};
