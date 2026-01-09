
export type Language = 'Inglês' | 'Espanhol' | 'Francês' | 'Alemão' | 'Italiano' | 'Português (PT)';

export interface Question {
  text: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  difficulty: 'fácil' | 'médio' | 'difícil' | 'expert';
}

export interface GameState {
  currentQuestion: Question | null;
  currentLevel: number;
  score: number;
  isGameOver: boolean;
  isWinner: boolean;
  language: Language;
  lifelines: {
    skip: number;
    cards: boolean;
    students: boolean;
  };
  isLoading: boolean;
  lastMessage: string;
}

export const PRIZES = [
  "R$ 1.000", "R$ 2.000", "R$ 3.000", "R$ 4.000", "R$ 5.000",
  "R$ 10.000", "R$ 20.000", "R$ 30.000", "R$ 40.000", "R$ 50.000",
  "R$ 100.000", "R$ 200.000", "R$ 300.000", "R$ 400.000", "R$ 500.000",
  "R$ 1 MILHÃO"
];
