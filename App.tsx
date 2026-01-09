
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { generateQuestion, getHostCommentary } from './geminiService';
import { GameState, Language, Question, PRIZES } from './types';
import { PrizeLadder } from './components/PrizeLadder';
import { Lifelines } from './components/Lifelines';
import { Trophy, RotateCcw, Play, Loader2, CheckCircle2, XCircle, Volume2, VolumeX, Mic2 } from 'lucide-react';

const AUDIO_URLS = {
  background: 'https://assets.mixkit.co/music/preview/mixkit-mysterious-prowl-1105.mp3', 
  correct: 'https://assets.mixkit.co/sfx/preview/mixkit-winning-chimes-2015.mp3', 
  incorrect: 'https://assets.mixkit.co/sfx/preview/mixkit-falling-game-over-1942.mp3', 
  lifeline: 'https://assets.mixkit.co/sfx/preview/mixkit-magic-notification-ring-2359.mp3',
  hover: 'https://assets.mixkit.co/sfx/preview/mixkit-interface-hint-notification-911.mp3',
  select: 'https://assets.mixkit.co/sfx/preview/mixkit-modern-click-box-check-1120.mp3',
};

type HostMood = 'idle' | 'talking' | 'happy' | 'sad' | 'thinking';

const HostPresenter: React.FC<{ mood: HostMood }> = ({ mood }) => {
  return (
    <div className={`relative w-24 h-24 md:w-32 md:h-32 flex-shrink-0 host-shadow transition-all duration-700
      ${mood === 'happy' ? 'animate-jump' : mood === 'sad' ? 'animate-droop' : 'animate-float'}
    `}>
      <svg viewBox="0 0 100 100" className={`w-full h-full transition-transform duration-500 ${mood === 'talking' ? 'animate-tilt' : ''}`}>
        <ellipse cx="50" cy="95" rx="30" ry="5" fill="black" opacity="0.2" />
        <path d="M20,100 Q50,70 80,100" fill="#1e293b" />
        <path d="M50,75 L40,100 L60,100 Z" fill="#ffffff" /> 
        <path d="M50,80 L45,90 L50,95 L55,90 Z" fill="#ef4444" /> 
        <circle cx="50" cy="45" r="30" fill="#ffdbac" stroke="#d2b48c" strokeWidth="0.5" />
        <path d="M20,45 Q20,15 50,15 Q80,15 80,45" fill="#4a3728" />
        {mood === 'happy' && (
          <g opacity="0.4">
            <circle cx="35" cy="55" r="4" fill="#fb7185" />
            <circle cx="65" cy="55" r="4" fill="#fb7185" />
          </g>
        )}
        <g className={`transition-transform duration-300 ${mood === 'thinking' ? 'animate-eyes-think' : ''}`}>
          {mood === 'happy' ? (
            <path d="M32,38 Q40,32 48,38 M52,38 Q60,32 68,38" fill="none" stroke="#4a3728" strokeWidth="2" strokeLinecap="round" />
          ) : mood === 'sad' ? (
            <path d="M32,35 Q40,40 48,35 M52,35 Q60,40 68,35" fill="none" stroke="#4a3728" strokeWidth="2" strokeLinecap="round" />
          ) : (
            <path d="M32,36 H48 M52,36 H68" fill="none" stroke="#4a3728" strokeWidth="1.5" strokeLinecap="round" />
          )}
          <g className="animate-blink">
            <circle cx="40" cy="45" r="3" fill="#334155" />
            <circle cx="60" cy="45" r="3" fill="#334155" />
          </g>
        </g>
        <path d="M30,45 H70 M40,45 C40,40 30,40 30,45 M60,45 C60,40 70,40 70,45" fill="none" stroke="#334155" strokeWidth="1.5" opacity="0.6" />
        {mood === 'talking' || mood === 'thinking' ? (
          <ellipse cx="50" cy="62" rx="6" ry="4" fill="#64748b" className="animate-mouth" />
        ) : mood === 'happy' ? (
          <path d="M38,60 Q50,78 62,60" fill="none" stroke="#ef4444" strokeWidth="3" strokeLinecap="round" />
        ) : mood === 'sad' ? (
          <path d="M40,70 Q50,58 60,70" fill="none" stroke="#334155" strokeWidth="2.5" strokeLinecap="round" />
        ) : (
          <path d="M42,65 Q50,68 58,65" fill="none" stroke="#334155" strokeWidth="2" strokeLinecap="round" />
        )}
        <g transform="translate(78, 72) rotate(-5)">
          <rect x="0" y="0" width="4" height="22" fill="#475569" rx="2" />
          <circle cx="2" cy="0" r="6" fill="#1e293b" />
          <path d="M-1,-2 H5" stroke="#94a3b8" strokeWidth="1" />
        </g>
      </svg>
      {mood === 'thinking' && (
        <div className="absolute -top-6 -right-2 flex gap-1.5">
          <div className="w-2.5 h-2.5 bg-blue-400 rounded-full animate-bounce shadow-sm" style={{ animationDelay: '0s' }}></div>
          <div className="w-2.5 h-2.5 bg-blue-400 rounded-full animate-bounce shadow-sm" style={{ animationDelay: '0.2s' }}></div>
          <div className="w-2.5 h-2.5 bg-blue-400 rounded-full animate-bounce shadow-sm" style={{ animationDelay: '0.4s' }}></div>
        </div>
      )}
    </div>
  );
};

const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>({
    currentQuestion: null,
    currentLevel: 0,
    score: 0,
    isGameOver: false,
    isWinner: false,
    language: 'Inglês',
    lifelines: { skip: 3, cards: true, students: true },
    isLoading: false,
    lastMessage: 'Bem-vindo ao Show do Idioma! Escolha um idioma para começar.',
  });

  const [gameStarted, setGameStarted] = useState(false);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<'correct' | 'incorrect' | null>(null);
  const [hiddenOptions, setHiddenOptions] = useState<number[]>([]);
  const [showStudentsPoll, setShowStudentsPoll] = useState<number[] | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [hostMood, setHostMood] = useState<HostMood>('idle');

  const bgMusicRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    bgMusicRef.current = new Audio(AUDIO_URLS.background);
    bgMusicRef.current.loop = true;
    bgMusicRef.current.volume = 0.2;
    return () => { if (bgMusicRef.current) bgMusicRef.current.pause(); };
  }, []);

  useEffect(() => { if (bgMusicRef.current) bgMusicRef.current.muted = isMuted; }, [isMuted]);

  const playSFX = (url: string, volume: number = 0.5) => {
    if (isMuted) return;
    const audio = new Audio(url);
    audio.volume = volume;
    audio.play().catch(e => console.debug("SFX play blocked", e));
  };

  const setHostTalking = (duration: number = 3000) => {
    setHostMood('talking');
    setTimeout(() => { setHostMood(prev => (prev === 'talking' ? 'idle' : prev)); }, duration);
  };

  const loadNextQuestion = useCallback(async (lang: Language, level: number) => {
    setGameState(prev => ({ ...prev, isLoading: true }));
    setHostMood('thinking');
    try {
      const question = await generateQuestion(lang, level);
      const msg = await getHostCommentary(level === 0 ? 'intro' : 'correct');
      setGameState(prev => ({ ...prev, currentQuestion: question, isLoading: false, lastMessage: msg }));
      setSelectedOption(null);
      setFeedback(null);
      setHiddenOptions([]);
      setShowStudentsPoll(null);
      setHostTalking(4500);
    } catch (error) {
      setGameState(prev => ({ ...prev, isLoading: false, lastMessage: "Erro técnico! Tente novamente." }));
      setHostMood('sad');
    }
  }, []);

  const startGame = (lang: Language) => {
    setGameStarted(true);
    if (bgMusicRef.current) bgMusicRef.current.play().catch(e => console.debug("Audio play blocked", e));
    setGameState(prev => ({ 
      ...prev, language: lang, currentLevel: 0, score: 0, isGameOver: false, isWinner: false, 
      lifelines: { skip: 3, cards: true, students: true } 
    }));
    loadNextQuestion(lang, 0);
  };

  const handleAnswer = async (index: number) => {
    if (feedback || gameState.isLoading || !gameState.currentQuestion) return;
    playSFX(AUDIO_URLS.select, 0.4);
    setSelectedOption(index);
    setHostMood('talking');
    const isCorrect = index === gameState.currentQuestion.correctIndex;

    setTimeout(async () => {
      if (isCorrect) {
        setFeedback('correct');
        setHostMood('happy');
        playSFX(AUDIO_URLS.correct, 0.6);
        const nextLevel = gameState.currentLevel + 1;
        if (nextLevel >= PRIZES.length) {
          if (bgMusicRef.current) bgMusicRef.current.pause();
          setGameState(prev => ({ ...prev, isWinner: true, isGameOver: true, lastMessage: "MILIONÁRIO!" }));
        } else {
          setTimeout(() => {
            setGameState(prev => ({ ...prev, currentLevel: nextLevel }));
            loadNextQuestion(gameState.language, nextLevel);
          }, 2500);
        }
      } else {
        setFeedback('incorrect');
        setHostMood('sad');
        playSFX(AUDIO_URLS.incorrect, 0.6);
        const msg = await getHostCommentary('incorrect');
        setGameState(prev => ({ ...prev, isGameOver: true, lastMessage: msg }));
      }
    }, 1500);
  };

  const useSkip = () => { if (gameState.lifelines.skip > 0 && !feedback) { playSFX(AUDIO_URLS.lifeline, 0.5); setHostTalking(2000); setGameState(prev => ({ ...prev, lifelines: { ...prev.lifelines, skip: prev.lifelines.skip - 1 } })); loadNextQuestion(gameState.language, gameState.currentLevel); } };
  const useCards = () => { if (gameState.lifelines.cards && gameState.currentQuestion && !feedback) { playSFX(AUDIO_URLS.lifeline, 0.5); setHostTalking(2000); const correct = gameState.currentQuestion.correctIndex; const wrong = [0, 1, 2, 3].filter(i => i !== correct).sort(() => Math.random() - 0.5); setHiddenOptions(wrong.slice(0, 2)); setGameState(prev => ({ ...prev, lifelines: { ...prev.lifelines, cards: false } })); } };
  const useStudents = () => { if (gameState.lifelines.students && gameState.currentQuestion && !feedback) { playSFX(AUDIO_URLS.lifeline, 0.5); setHostTalking(2000); const poll = [0,0,0,0]; let rem = 100; const cor = gameState.currentQuestion.correctIndex; const v = Math.floor(Math.random() * 30) + 50; poll[cor] = v; rem -= v; [0,1,2,3].filter(i => i !== cor).forEach((idx, i) => { if (i === 2) poll[idx] = rem; else { const val = Math.floor(Math.random() * rem); poll[idx] = val; rem -= val; } }); setShowStudentsPoll(poll); setGameState(prev => ({ ...prev, lifelines: { ...prev.lifelines, students: false } })); } };

  if (!gameStarted) {
    return (
      <div className="min-h-screen bg-gradient-stage flex items-center justify-center p-6">
        <div className="max-w-3xl w-full bg-slate-900/90 rounded-3xl p-10 border-4 border-yellow-500 glow-gold text-center relative flex flex-col items-center">
          <div className="absolute top-4 right-4">
            <button onClick={() => setIsMuted(!isMuted)} className="p-2 bg-slate-800 rounded-full text-slate-400 hover:text-white">
              {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
            </button>
          </div>
          <div className="mb-6"><HostPresenter mood="talking" /></div>
          <h1 className="text-5xl md:text-7xl font-black text-transparent bg-clip-text bg-gradient-to-b from-yellow-300 to-yellow-600 mb-4 uppercase italic">Show do Idioma</h1>
          <p className="text-blue-300 text-lg mb-10 font-semibold italic">"Pronto para ser um poliglota milionário?"</p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-10 w-full">
            {(['Inglês', 'Espanhol', 'Francês', 'Alemão', 'Italiano', 'Português (PT)'] as Language[]).map(lang => (
              <button key={lang} onClick={() => startGame(lang)} className="bg-blue-900/40 hover:bg-blue-600 border-2 border-blue-500/50 py-4 px-2 rounded-xl text-sm font-bold transition-all hover:-translate-y-1">{lang}</button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-stage flex flex-col items-center justify-center p-4 md:p-8">
      <div className="w-full max-w-6xl flex flex-col lg:flex-row gap-8 items-start justify-center">
        <div className="flex-1 w-full flex flex-col gap-6">
          <div className="flex justify-between items-center bg-slate-900/80 p-4 rounded-2xl border border-blue-500/30">
            <div className="flex items-center gap-3">
              <div className="bg-yellow-500 text-slate-950 p-2 rounded-lg font-black text-xl">{gameState.currentLevel + 1}</div>
              <div><div className="text-[10px] text-blue-400 font-bold uppercase">Prêmio Atual</div><div className="text-xl font-black text-yellow-500">{PRIZES[gameState.currentLevel]}</div></div>
            </div>
            <button onClick={() => setIsMuted(!isMuted)} className="p-2 bg-slate-800 rounded-full">{isMuted ? <VolumeX size={24} /> : <Volume2 size={24} />}</button>
          </div>
          <div className="relative min-h-[500px] bg-slate-900/90 rounded-3xl p-6 md:p-8 border-2 border-blue-500/50 shadow-2xl flex flex-col items-center">
            <div className="w-full flex flex-col md:flex-row items-center gap-6 mb-8">
              <HostPresenter mood={gameState.isLoading ? 'thinking' : hostMood} />
              <div className="relative flex-1 w-full bg-blue-900/20 p-5 rounded-2xl border border-blue-500/20">
                <div className="text-sm md:text-base italic text-blue-100">"{gameState.lastMessage}"</div>
              </div>
            </div>
            {gameState.isLoading ? (
              <div className="flex-1 flex flex-col items-center justify-center gap-4 py-10"><Loader2 className="w-16 h-16 text-blue-500 animate-spin" /><p className="text-blue-300 font-bold animate-pulse">Consultando as cartas...</p></div>
            ) : gameState.isGameOver ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center py-6 animate-in fade-in zoom-in w-full">
                {gameState.isWinner ? <Trophy className="w-24 h-24 text-yellow-500 mb-6" /> : <XCircle className="w-24 h-24 text-red-500 mb-6" />}
                <h2 className="text-4xl font-black mb-4 uppercase italic text-white">{gameState.isWinner ? "MILIONÁRIO!" : "FIM DE JOGO!"}</h2>
                <div className="bg-slate-800/50 p-6 rounded-2xl mb-8 w-full max-w-sm">
                  <p className="text-3xl font-black text-yellow-500">{PRIZES[Math.max(0, gameState.currentLevel - 1)]}</p>
                </div>
                <button onClick={() => setGameStarted(false)} className="bg-blue-600 hover:bg-blue-500 text-white font-black py-4 px-12 rounded-full flex items-center gap-3 shadow-lg hover:scale-105 transition-transform"><RotateCcw size={20} /> NOVO JOGO</button>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center w-full max-w-3xl">
                <h3 className="text-xl md:text-2xl font-bold text-white text-center mb-8 min-h-[60px]">{gameState.currentQuestion?.text}</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
                  {gameState.currentQuestion?.options.map((option, idx) => {
                    const isSelected = selectedOption === idx;
                    const isHidden = hiddenOptions.includes(idx);
                    const isCorrect = gameState.currentQuestion?.correctIndex === idx;
                    const showCorrect = (feedback === 'correct' && isSelected) || (feedback === 'incorrect' && isCorrect);
                    const showIncorrect = feedback === 'incorrect' && isSelected;
                    return (
                      <button key={idx} disabled={!!feedback || gameState.isLoading || isHidden} onClick={() => handleAnswer(idx)}
                        className={`group relative p-4 rounded-2xl border-2 text-left font-bold transition-all duration-300 option-card-hover ${isHidden ? 'opacity-0' : 'opacity-100'}
                          ${isSelected && !feedback ? 'border-yellow-400 bg-yellow-400/20' : ''}
                          ${showCorrect ? 'border-green-500 bg-green-500/20' : ''}
                          ${showIncorrect ? 'border-red-500 bg-red-500/20' : ''}
                          ${!isSelected && !feedback ? 'border-blue-500/30 bg-slate-800/40 hover:border-blue-400' : ''}`}>
                        <div className="flex items-center gap-4">
                          <span className="w-8 h-8 rounded-full bg-blue-600/30 flex items-center justify-center text-sm font-black border border-blue-400/30">{['A','B','C','D'][idx]}</span>
                          <span className="text-base text-slate-100">{option}</span>
                        </div>
                        {showStudentsPoll && !isHidden && <div className="mt-2 h-1.5 w-full bg-slate-700 rounded-full overflow-hidden"><div className="h-full bg-purple-500" style={{ width: `${showStudentsPoll[idx]}%` }} /></div>}
                      </button>
                    );
                  })}
                </div>
                {feedback === 'correct' && <div className="mt-8 p-4 bg-green-500/10 border border-green-500/30 rounded-xl text-green-200 text-sm animate-in slide-in-from-bottom-2"><span className="font-black text-green-400 uppercase">Dica:</span> {gameState.currentQuestion?.explanation}</div>}
              </div>
            )}
          </div>
          {!gameState.isGameOver && !gameState.isLoading && <Lifelines available={gameState.lifelines} onSkip={useSkip} onCards={useCards} onStudents={useStudents} disabled={!!feedback} />}
        </div>
        <PrizeLadder currentLevel={gameState.currentLevel} />
      </div>
      <footer className="mt-12 text-slate-500 font-bold text-xs uppercase tracking-widest">Show do Idioma &copy; 2024 • Tecnologia Gemini AI</footer>
    </div>
  );
};

export default App;
