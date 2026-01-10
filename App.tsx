
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { generateQuestion, getHostCommentary } from './geminiService';
import { GameState, Language, Question, PRIZES } from './types';
import { PrizeLadder } from './components/PrizeLadder';
import { Lifelines } from './components/Lifelines';
import { HostPresenter } from './components/HostPresenter';
import { Trophy, RotateCcw, Loader2, CheckCircle2, XCircle, Volume2, VolumeX, Sparkles, Languages } from 'lucide-react';

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
    lastMessage: 'Bem-vindo ao Show do Idioma! Selecione o idioma que deseja dominar.',
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
      setGameState(prev => ({ ...prev, isLoading: false, lastMessage: "Erro ao gerar questão. Tente novamente." }));
    }
  }, []);

  const startGame = (lang: Language) => {
    setGameStarted(true);
    if (bgMusicRef.current) bgMusicRef.current.play().catch(e => console.debug("Audio interact", e));
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
      <div className="min-h-screen flex items-center justify-center p-6 bg-gradient-stage">
        <div className="max-w-4xl w-full bg-slate-900/90 rounded-[2.5rem] p-8 md:p-16 border-4 border-yellow-500 glow-gold text-center relative flex flex-col items-center">
          <div className="absolute top-8 right-8">
            <button onClick={() => setIsMuted(!isMuted)} className="p-3 bg-slate-800 rounded-full text-slate-400 hover:text-white transition-all hover:scale-110 active:scale-90">
              {isMuted ? <VolumeX size={24} /> : <Volume2 size={24} />}
            </button>
          </div>
          
          <div className="mb-8 p-6 bg-yellow-500/10 rounded-full border-2 border-yellow-500/30">
            <Languages className="w-16 h-16 text-yellow-500" />
          </div>

          <h1 className="text-6xl md:text-8xl font-black text-transparent bg-clip-text bg-gradient-to-b from-yellow-300 to-yellow-600 mb-6 uppercase italic leading-none tracking-tighter">
            Show do Idioma
          </h1>
          <p className="text-blue-300 text-xl mb-12 font-bold italic opacity-80 uppercase tracking-widest">
            "Sua jornada para o milhão linguístico começa aqui"
          </p>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-12 w-full max-w-2xl">
            {(['Inglês', 'Espanhol', 'Francês', 'Alemão', 'Italiano', 'Português (PT)'] as Language[]).map(lang => (
              <button 
                key={lang} 
                onClick={() => startGame(lang)} 
                onMouseEnter={() => playSFX(AUDIO_URLS.hover, 0.1)}
                className="group relative bg-blue-900/40 hover:bg-blue-600 border-2 border-blue-500/50 hover:border-blue-400 py-5 px-4 rounded-2xl text-base font-black transition-all hover:-translate-y-1 hover:shadow-xl active:scale-95"
              >
                <span className="relative z-10">{lang}</span>
                <div className="absolute inset-0 bg-blue-400/10 opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl"></div>
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 text-slate-500 text-xs uppercase tracking-[0.4em] font-black">
            <Sparkles size={12} className="text-yellow-500" />
            <span>AI Powered Education</span>
            <Sparkles size={12} className="text-yellow-500" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 md:p-8 bg-gradient-stage">
      <div className="w-full max-w-7xl flex flex-col lg:flex-row gap-8 items-stretch justify-center">
        
        <div className="flex-1 w-full flex flex-col gap-6">
          {/* Header */}
          <div className="flex justify-between items-center bg-slate-900/80 p-5 rounded-3xl border border-blue-500/30 backdrop-blur-md shadow-lg">
            <div className="flex items-center gap-4">
              <div className="bg-yellow-500 text-slate-950 w-12 h-12 flex items-center justify-center rounded-xl font-black text-2xl shadow-lg">
                {gameState.currentLevel + 1}
              </div>
              <div>
                <div className="text-[10px] text-blue-400 font-black uppercase tracking-widest">Prêmio em Jogo</div>
                <div className="text-2xl font-black text-yellow-500 leading-none">{PRIZES[gameState.currentLevel]}</div>
              </div>
            </div>
            <div className="flex items-center gap-6">
              <div className="text-right hidden md:block">
                <div className="text-[10px] text-blue-400 font-black uppercase tracking-widest">Idioma</div>
                <div className="text-lg font-bold text-white">{gameState.language}</div>
              </div>
              <button onClick={() => setIsMuted(!isMuted)} className="p-3 bg-slate-800 rounded-full text-slate-400 hover:text-white transition-all active:scale-90">
                {isMuted ? <VolumeX size={24} /> : <Volume2 size={24} />}
              </button>
            </div>
          </div>

          <div className="flex flex-col lg:flex-row gap-8 items-center lg:items-start flex-1">
            
            {/* Apresentador - Agora lateral ou central dependendo do estado */}
            <div className="w-full lg:w-1/3 flex justify-center pt-8">
              <HostPresenter 
                message={gameState.lastMessage} 
                isCorrect={feedback === 'correct' ? true : feedback === 'incorrect' ? false : null}
                isLoading={gameState.isLoading}
              />
            </div>

            {/* Área do Quiz */}
            <div className="relative flex-1 w-full bg-slate-900/90 rounded-[2.5rem] p-8 md:p-10 border-2 border-blue-500/30 shadow-2xl flex flex-col items-center overflow-hidden min-h-[500px]">
              {gameState.isLoading ? (
                <div className="flex-1 flex flex-col items-center justify-center gap-6 py-20 w-full">
                  <div className="relative">
                    <Loader2 className="w-20 h-20 text-blue-500 animate-spin" />
                    <Sparkles className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-6 text-yellow-500 animate-pulse" />
                  </div>
                  <div className="text-center">
                    <p className="text-blue-300 font-black text-xl uppercase tracking-tighter animate-pulse">Consultando Redes Neurais...</p>
                    <p className="text-slate-500 text-xs mt-2 font-bold uppercase tracking-widest">Preparando desafio de nível {gameState.currentLevel + 1}</p>
                  </div>
                </div>
              ) : gameState.isGameOver ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center py-10 animate-in fade-in zoom-in w-full">
                  <div className={`p-8 rounded-full mb-8 ${gameState.isWinner ? 'bg-yellow-500/20 border-4 border-yellow-500 glow-gold' : 'bg-red-500/20 border-4 border-red-500'}`}>
                    {gameState.isWinner ? <Trophy className="w-24 h-24 text-yellow-500" /> : <XCircle className="w-24 h-24 text-red-500" />}
                  </div>
                  <h2 className="text-5xl md:text-6xl font-black mb-6 uppercase italic text-white tracking-tighter">
                    {gameState.isWinner ? "O NOVO MILIONÁRIO!" : "VOCÊ PAROU AQUI!"}
                  </h2>
                  
                  <div className="bg-slate-800/40 p-8 rounded-[2rem] border-2 border-slate-700/50 mb-10 w-full max-w-md backdrop-blur-sm">
                    <p className="text-xs text-slate-500 uppercase font-black tracking-widest mb-2">Prêmio Conquistado</p>
                    <p className="text-5xl font-black text-yellow-500 tracking-tighter">{PRIZES[Math.max(0, gameState.currentLevel - 1)]}</p>
                  </div>
                  
                  <button 
                    onClick={() => setGameStarted(false)} 
                    className="bg-blue-600 hover:bg-blue-500 text-white font-black py-5 px-16 rounded-full flex items-center gap-4 shadow-xl hover:scale-105 transition-all active:scale-95 group"
                  >
                    <RotateCcw size={24} className="group-hover:rotate-[-45deg] transition-transform" />
                    <span className="uppercase tracking-widest">Tentar de Novo</span>
                  </button>
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center w-full max-w-4xl">
                  <div className="text-center w-full mb-10">
                    <h3 className="text-2xl md:text-3xl font-black text-white leading-[1.15] min-h-[80px] flex items-center justify-center tracking-tight">
                      {gameState.currentQuestion?.text}
                    </h3>
                  </div>
                  
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
                            ${isSelected && !feedback ? 'border-yellow-400 bg-yellow-400/20 ring-4 ring-yellow-400/20 shadow-2xl scale-[1.02]' : ''}
                            ${showCorrect ? 'border-green-500 bg-green-500/20 shadow-[0_0_20px_rgba(34,197,94,0.3)]' : ''}
                            ${showIncorrect ? 'border-red-500 bg-red-500/20' : ''}
                            ${!isSelected && !feedback ? 'border-blue-500/20 bg-slate-800/40 hover:border-blue-500/60 hover:bg-slate-700/60' : ''}`}
                        >
                          <div className="flex items-center gap-4">
                            <span className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-black border transition-all ${isSelected ? 'bg-yellow-500 text-slate-900 border-yellow-300' : 'bg-blue-600/20 text-blue-300 border-blue-400/20 group-hover:bg-blue-500 group-hover:text-white'}`}>
                              {['A','B','C','D'][idx]}
                            </span>
                            <span className="text-base md:text-lg text-slate-100 tracking-tight">{option}</span>
                            {showCorrect && <CheckCircle2 className="w-6 h-6 text-green-500 ml-auto animate-in zoom-in duration-300" />}
                            {showIncorrect && <XCircle className="w-6 h-6 text-red-500 ml-auto animate-in zoom-in duration-300" />}
                          </div>
                          {showStudentsPoll && !isHidden && (
                            <div className="mt-3 h-2 w-full bg-slate-800 rounded-full overflow-hidden relative border border-white/5">
                              <div className="h-full bg-gradient-to-r from-purple-600 to-blue-500 transition-all duration-1000 ease-out" style={{ width: `${showStudentsPoll[idx]}%` }} />
                              <div className="absolute right-2 top-[-1rem] text-[8px] text-blue-300 font-black uppercase tracking-tighter">{showStudentsPoll[idx]}%</div>
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                  
                  {feedback === 'correct' && (
                    <div className="mt-8 p-6 bg-green-500/10 border-2 border-green-500/20 rounded-2xl text-green-100 text-sm animate-in slide-in-from-bottom-6 duration-700 w-full shadow-lg backdrop-blur-sm">
                      <div className="flex items-center gap-3 mb-2">
                        <Sparkles className="text-green-400" size={18} />
                        <span className="font-black text-green-400 uppercase tracking-[0.2em] text-[10px]">Ponto Gramatical</span> 
                      </div>
                      <p className="font-medium leading-relaxed italic">{gameState.currentQuestion?.explanation}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
          
          {/* Lifelines */}
          {!gameState.isGameOver && !gameState.isLoading && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-1000 delay-500">
              <Lifelines 
                available={gameState.lifelines} 
                onSkip={useSkip} 
                onCards={useCards} 
                onStudents={useStudents} 
                disabled={!!feedback} 
              />
            </div>
          )}
        </div>

        {/* Escada Lateral */}
        <PrizeLadder currentLevel={gameState.currentLevel} />
      </div>
      
      <footer className="mt-12 text-slate-600 font-black text-[10px] uppercase tracking-[0.5em] flex items-center gap-4 opacity-50">
        <span>Show do Idioma &copy; 2024</span>
        <div className="w-1.5 h-1.5 bg-slate-700 rounded-full"></div>
        <span>Powered by Gemini 3.0</span>
      </footer>
    </div>
  );
};

export default App;
