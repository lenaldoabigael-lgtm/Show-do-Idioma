
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Analytics } from '@vercel/analytics/react';
import { generateQuestion, getHostCommentary } from './geminiService';
import { GameState, Language, Question, PRIZES } from './types';
import { PrizeLadder } from './components/PrizeLadder';
import { Lifelines } from './components/Lifelines';
import { Trophy, RotateCcw, Loader2, CheckCircle2, XCircle, Volume2, VolumeX, Sparkles, Info } from 'lucide-react';

const AUDIO_URLS = {
  background: 'https://assets.mixkit.co/music/preview/mixkit-mysterious-prowl-1105.mp3', 
  correct: 'https://assets.mixkit.co/sfx/preview/mixkit-winning-chimes-2015.mp3', 
  incorrect: 'https://assets.mixkit.co/sfx/preview/mixkit-falling-game-over-1942.mp3', 
  lifeline: 'https://assets.mixkit.co/sfx/preview/mixkit-magic-notification-ring-2359.mp3',
  hover: 'https://assets.mixkit.co/sfx/preview/mixkit-interface-hint-notification-911.mp3',
  select: 'https://assets.mixkit.co/sfx/preview/mixkit-modern-click-box-check-1120.mp3',
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

  const loadNextQuestion = useCallback(async (lang: Language, level: number) => {
    setGameState(prev => ({ ...prev, isLoading: true }));
    try {
      const question = await generateQuestion(lang, level);
      const msg = await getHostCommentary(level === 0 ? 'intro' : 'correct');
      setGameState(prev => ({ ...prev, currentQuestion: question, isLoading: false, lastMessage: msg }));
      setSelectedOption(null);
      setFeedback(null);
      setHiddenOptions([]);
      setShowStudentsPoll(null);
    } catch (error) {
      setGameState(prev => ({ ...prev, isLoading: false, lastMessage: "Erro técnico ao carregar a questão. Tente novamente." }));
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
    const isCorrect = index === gameState.currentQuestion.correctIndex;

    setTimeout(async () => {
      if (isCorrect) {
        setFeedback('correct');
        playSFX(AUDIO_URLS.correct, 0.6);
        const nextLevel = gameState.currentLevel + 1;
        if (nextLevel >= PRIZES.length) {
          if (bgMusicRef.current) bgMusicRef.current.pause();
          setGameState(prev => ({ ...prev, isWinner: true, isGameOver: true, lastMessage: "PARABÉNS! VOCÊ É O NOVO MILIONÁRIO DOS IDIOMAS!" }));
        } else {
          setTimeout(() => {
            setGameState(prev => ({ ...prev, currentLevel: nextLevel }));
            loadNextQuestion(gameState.language, nextLevel);
          }, 2500);
        }
      } else {
        setFeedback('incorrect');
        playSFX(AUDIO_URLS.incorrect, 0.6);
        const msg = await getHostCommentary('incorrect');
        setGameState(prev => ({ ...prev, isGameOver: true, lastMessage: msg }));
      }
    }, 1500);
  };

  const useSkip = () => { if (gameState.lifelines.skip > 0 && !feedback) { playSFX(AUDIO_URLS.lifeline, 0.5); setGameState(prev => ({ ...prev, lifelines: { ...prev.lifelines, skip: prev.lifelines.skip - 1 } })); loadNextQuestion(gameState.language, gameState.currentLevel); } };
  const useCards = () => { if (gameState.lifelines.cards && gameState.currentQuestion && !feedback) { playSFX(AUDIO_URLS.lifeline, 0.5); const correct = gameState.currentQuestion.correctIndex; const wrong = [0, 1, 2, 3].filter(i => i !== correct).sort(() => Math.random() - 0.5); setHiddenOptions(wrong.slice(0, 2)); setGameState(prev => ({ ...prev, lifelines: { ...prev.lifelines, cards: false } })); } };
  const useStudents = () => { if (gameState.lifelines.students && gameState.currentQuestion && !feedback) { playSFX(AUDIO_URLS.lifeline, 0.5); const poll = [0,0,0,0]; let rem = 100; const cor = gameState.currentQuestion.correctIndex; const v = Math.floor(Math.random() * 30) + 50; poll[cor] = v; rem -= v; [0,1,2,3].filter(i => i !== cor).forEach((idx, i) => { if (i === 2) poll[idx] = rem; else { const val = Math.floor(Math.random() * rem); poll[idx] = val; rem -= val; } }); setShowStudentsPoll(poll); setGameState(prev => ({ ...prev, lifelines: { ...prev.lifelines, students: false } })); } };

  if (!gameStarted) {
    return (
      <>
        <Analytics />
        <div className="min-h-screen flex items-center justify-center p-6">
        <div className="max-w-3xl w-full bg-slate-900/90 rounded-3xl p-10 border-4 border-yellow-500 glow-gold text-center relative flex flex-col items-center">
          <div className="absolute top-4 right-4">
            <button onClick={() => setIsMuted(!isMuted)} className="p-2 bg-slate-800 rounded-full text-slate-400 hover:text-white transition-colors">
              {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
            </button>
          </div>
          <div className="mb-6 bg-yellow-500/10 p-6 rounded-full border border-yellow-500/20">
            <Sparkles className="w-16 h-16 text-yellow-500" />
          </div>
          <h1 className="text-5xl md:text-7xl font-black text-transparent bg-clip-text bg-gradient-to-b from-yellow-300 to-yellow-600 mb-4 uppercase italic">Show do Idioma</h1>
          <p className="text-blue-300 text-lg mb-10 font-semibold italic">"Pronto para ser um poliglota milionário?"</p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-10 w-full">
            {(['Inglês', 'Espanhol', 'Francês', 'Alemão', 'Italiano', 'Português (PT)'] as Language[]).map(lang => (
              <button 
                key={lang} 
                onClick={() => startGame(lang)} 
                onMouseEnter={() => playSFX(AUDIO_URLS.hover, 0.1)}
                className="bg-blue-900/40 hover:bg-blue-600 border-2 border-blue-500/50 py-4 px-2 rounded-xl text-sm font-bold transition-all hover:-translate-y-1"
              >
                {lang}
              </button>
            ))}
          </div>
          <div className="text-slate-500 text-[10px] uppercase tracking-widest font-bold">Powered by Gemini AI • Real-time Education</div>
        </div>
      </div>
    </>
    );
  }

  return (
    <>
      <Analytics />
      <div className="min-h-screen flex flex-col items-center justify-center p-4 md:p-8">
      <div className="w-full max-w-6xl flex flex-col lg:flex-row gap-8 items-start justify-center">
        <div className="flex-1 w-full flex flex-col gap-6">
          {/* Header Barra de Progresso */}
          <div className="flex justify-between items-center bg-slate-900/80 p-4 rounded-2xl border border-blue-500/30 backdrop-blur-sm">
            <div className="flex items-center gap-3">
              <div className="bg-yellow-500 text-slate-950 p-2 rounded-lg font-black text-xl">{gameState.currentLevel + 1}</div>
              <div>
                <div className="text-[10px] text-blue-400 font-bold uppercase">Nível Atual</div>
                <div className="text-xl font-black text-yellow-500">{PRIZES[gameState.currentLevel]}</div>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm font-bold text-blue-200 hidden md:inline">{gameState.language}</span>
              <button onClick={() => setIsMuted(!isMuted)} className="p-2 bg-slate-800 rounded-full text-slate-400 hover:text-white transition-colors">
                {isMuted ? <VolumeX size={24} /> : <Volume2 size={24} />}
              </button>
            </div>
          </div>

          {/* Área Principal da Pergunta */}
          <div className="relative min-h-[500px] bg-slate-900/90 rounded-3xl p-6 md:p-10 border-2 border-blue-500/50 shadow-2xl flex flex-col items-center">
            
            {/* Mensagem da IA */}
            {!gameState.isGameOver && (
              <div className="w-full flex items-start gap-3 mb-10 bg-blue-900/20 p-4 rounded-2xl border border-blue-500/20 animate-in fade-in slide-in-from-top-2 duration-700">
                <Info className="text-blue-400 flex-shrink-0 mt-1" size={18} />
                <p className="text-sm md:text-base italic text-blue-100 leading-relaxed">
                  {gameState.lastMessage}
                </p>
              </div>
            )}

            {gameState.isLoading ? (
              <div className="flex-1 flex flex-col items-center justify-center gap-4 py-10">
                <Loader2 className="w-16 h-16 text-blue-500 animate-spin" />
                <p className="text-blue-300 font-bold animate-pulse text-lg">Gerando nova questão...</p>
              </div>
            ) : gameState.isGameOver ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center py-6 animate-in fade-in zoom-in w-full">
                {gameState.isWinner ? <Trophy className="w-24 h-24 text-yellow-500 mb-6 drop-shadow-[0_0_15px_rgba(234,179,8,0.5)]" /> : <XCircle className="w-24 h-24 text-red-500 mb-6" />}
                <h2 className="text-4xl font-black mb-4 uppercase italic text-white">{gameState.isWinner ? "MILIONÁRIO!" : "FIM DE JOGO!"}</h2>
                <p className="text-slate-300 mb-8 max-w-md italic">"{gameState.lastMessage}"</p>
                <div className="bg-slate-800/50 p-6 rounded-2xl border border-slate-700 mb-8 w-full max-w-sm">
                  <p className="text-xs text-slate-400 uppercase font-bold mb-1">Prêmio Final</p>
                  <p className="text-3xl font-black text-yellow-500">{PRIZES[Math.max(0, gameState.currentLevel - 1)]}</p>
                </div>
                <button 
                  onClick={() => setGameStarted(false)} 
                  className="bg-blue-600 hover:bg-blue-500 text-white font-black py-4 px-12 rounded-full flex items-center gap-3 shadow-lg hover:scale-105 transition-all active:scale-95"
                >
                  <RotateCcw size={20} /> NOVO JOGO
                </button>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center w-full max-w-3xl">
                <h3 className="text-2xl md:text-3xl font-bold text-white text-center mb-10 min-h-[80px] leading-tight">
                  {gameState.currentQuestion?.text}
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
                  {gameState.currentQuestion?.options.map((option, idx) => {
                    const isSelected = selectedOption === idx;
                    const isHidden = hiddenOptions.includes(idx);
                    const isCorrect = gameState.currentQuestion?.correctIndex === idx;
                    const showCorrect = (feedback === 'correct' && isSelected) || (feedback === 'incorrect' && isCorrect);
                    const showIncorrect = feedback === 'incorrect' && isSelected;

                    return (
                      <button 
                        key={idx} 
                        disabled={!!feedback || gameState.isLoading || isHidden} 
                        onClick={() => handleAnswer(idx)}
                        onMouseEnter={() => !feedback && !isHidden && playSFX(AUDIO_URLS.hover, 0.1)}
                        className={`group relative p-5 rounded-2xl border-2 text-left font-bold transition-all duration-300 option-card-hover ${isHidden ? 'opacity-0 pointer-events-none' : 'opacity-100'}
                          ${isSelected && !feedback ? 'border-yellow-400 bg-yellow-400/20 ring-2 ring-yellow-400/50' : ''}
                          ${showCorrect ? 'border-green-500 bg-green-500/20' : ''}
                          ${showIncorrect ? 'border-red-500 bg-red-500/20' : ''}
                          ${!isSelected && !feedback ? 'border-blue-500/30 bg-slate-800/40 hover:border-blue-400 hover:bg-slate-700/60' : ''}`}
                      >
                        <div className="flex items-center gap-4">
                          <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-black border transition-colors ${isSelected ? 'bg-yellow-500 text-slate-900' : 'bg-blue-600/30 text-blue-200 border-blue-400/30'}`}>
                            {['A','B','C','D'][idx]}
                          </span>
                          <span className="text-base md:text-lg text-slate-100">{option}</span>
                          {showCorrect && <CheckCircle2 className="w-6 h-6 text-green-500 ml-auto animate-in zoom-in" />}
                          {showIncorrect && <XCircle className="w-6 h-6 text-red-500 ml-auto animate-in zoom-in" />}
                        </div>
                        {showStudentsPoll && !isHidden && (
                          <div className="mt-3 h-2 w-full bg-slate-700 rounded-full overflow-hidden relative">
                            <div className="h-full bg-purple-500 transition-all duration-1000" style={{ width: `${showStudentsPoll[idx]}%` }} />
                            <div className="absolute right-0 top-[-16px] text-[10px] text-purple-300 font-black">{showStudentsPoll[idx]}%</div>
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
                
                {feedback === 'correct' && (
                  <div className="mt-10 p-5 bg-green-500/10 border border-green-500/30 rounded-2xl text-green-200 text-sm animate-in slide-in-from-bottom-2 duration-500 w-full">
                    <span className="font-black text-green-400 uppercase tracking-tighter mr-2">Explicação:</span> 
                    {gameState.currentQuestion?.explanation}
                  </div>
                )}
              </div>
            )}
          </div>
          
          {/* Lifelines */}
          {!gameState.isGameOver && !gameState.isLoading && (
            <Lifelines 
              available={gameState.lifelines} 
              onSkip={useSkip} 
              onCards={useCards} 
              onStudents={useStudents} 
              disabled={!!feedback} 
            />
          )}
        </div>

        {/* Escada de Prêmios */}
        <PrizeLadder currentLevel={gameState.currentLevel} />
      </div>
      
      <footer className="mt-12 text-slate-500 font-bold text-[10px] uppercase tracking-[0.3em] flex items-center gap-4">
        <span>Show do Idioma &copy; 2024</span>
        <span className="w-1 h-1 bg-slate-800 rounded-full"></span>
        <span>Tecnologia Gemini AI</span>
      </footer>
    </div>
  </>
  );
};

export default App;
