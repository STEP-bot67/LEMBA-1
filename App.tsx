import React, { useState, useEffect, useRef } from 'react';
import { Ear, Play, Check, RotateCcw, Trophy, Star, Volume2, Mic, ArrowRight, Loader2, BookOpen, MessageCircleQuestion, X } from 'lucide-react';
import { Button } from './components/Button';
import { ProgressBar } from './components/ProgressBar';
import { decodeAudioData, playAudioBuffer } from './services/audioUtils';
import { generateStorySession, generateSpeech } from './services/gemini';
import { StorySession, Difficulty, GameState, QuizResult } from './types';

// Audio Context Singleton
let audioContext: AudioContext | null = null;

const getAudioContext = () => {
  if (!audioContext) {
    audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
  }
  return audioContext;
};

const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>(GameState.MENU);
  const [difficulty, setDifficulty] = useState<Difficulty>(Difficulty.EASY);
  const [session, setSession] = useState<StorySession | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [userInput, setUserInput] = useState('');
  const [quizResults, setQuizResults] = useState<QuizResult[]>([]);
  const [isLoadingAudio, setIsLoadingAudio] = useState(false);
  const [score, setScore] = useState(0);
  
  // Ref for the input field
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input when entering QUIZ state or moving to next question
  useEffect(() => {
    if (gameState === GameState.QUIZ) {
      inputRef.current?.focus();
    }
  }, [gameState, currentQuestionIndex]);

  const startGame = async (level: Difficulty) => {
    setDifficulty(level);
    setGameState(GameState.LOADING);
    
    // Initialize AudioContext
    const ctx = getAudioContext();
    if (ctx.state === 'suspended') {
      await ctx.resume();
    }

    try {
      const newSession = await generateStorySession(level);
      setSession(newSession);
      setScore(0);
      setQuizResults([]);
      setCurrentQuestionIndex(0);
      setUserInput('');
      setGameState(GameState.READING);
      
      // Auto-read story title maybe? Or just wait for user.
    } catch (e) {
      console.error(e);
      setGameState(GameState.ERROR);
    }
  };

  const playText = async (text: string) => {
    if (isLoadingAudio) return;
    
    setIsLoadingAudio(true);
    const base64Audio = await generateSpeech(text);
    setIsLoadingAudio(false);

    if (base64Audio) {
      const ctx = getAudioContext();
      const buffer = await decodeAudioData(base64Audio, ctx);
      playAudioBuffer(buffer, ctx);
    }
  };

  const handleStartQuiz = () => {
    setGameState(GameState.QUIZ);
    // Auto play the first question
    if (session && session.questions.length > 0) {
      playText(session.questions[0].text);
    }
  };

  const handleSubmitAnswer = async () => {
    if (!session || !userInput.trim()) return;

    const currentQ = session.questions[currentQuestionIndex];
    
    // Simple normalization for comparison
    const normalize = (s: string) => s.toLowerCase().trim().replace(/[.,!?;:]/g, '');
    const target = normalize(currentQ.answer);
    const user = normalize(userInput);

    // Check if user answer is contained in target or target is contained in user answer
    const isCorrect = user === target || (user.length > 2 && target.includes(user)) || (target.length > 2 && user.includes(target));

    // Record result
    const result: QuizResult = {
      questionId: currentQ.id,
      questionText: currentQ.text,
      userAnswer: userInput,
      correctAnswer: currentQ.answer,
      isCorrect
    };

    setQuizResults(prev => [...prev, result]);
    if (isCorrect) setScore(s => s + 1);

    // Proceed to next question or finish
    if (currentQuestionIndex < session.questions.length - 1) {
      const nextIndex = currentQuestionIndex + 1;
      setCurrentQuestionIndex(nextIndex);
      setUserInput('');
      // Auto-play next question
      await playText(session.questions[nextIndex].text);
    } else {
      setGameState(GameState.SUMMARY);
    }
  };

  const handleReturnToMenu = () => {
    setGameState(GameState.MENU);
    setSession(null);
  };

  // --- RENDERERS ---

  const renderMenu = () => (
    <div className="flex flex-col items-center justify-center min-h-screen p-6 max-w-2xl mx-auto text-center space-y-12">
      <div className="space-y-4">
        <div className="inline-block p-6 bg-white rounded-full shadow-xl mb-4 transform -rotate-6">
          <BookOpen className="w-20 h-20 text-indigo-500" />
        </div>
        <h1 className="text-6xl font-black text-indigo-900 tracking-tight">LEMBA 1</h1>
        <p className="text-xl text-slate-600 font-medium">Read stories, look at pictures, and answer questions!</p>
      </div>

      <div className="grid gap-4 w-full max-w-md">
        <Button size="xl" onClick={() => startGame(Difficulty.EASY)} className="w-full">
          <Star className="w-6 h-6 fill-current" /> Easy Story
        </Button>
        <Button size="xl" variant="secondary" onClick={() => startGame(Difficulty.MEDIUM)} className="w-full">
          <Trophy className="w-6 h-6" /> Medium Story
        </Button>
        <Button size="xl" variant="outline" onClick={() => startGame(Difficulty.HARD)} className="w-full">
           Hard Story
        </Button>
      </div>
      
      <div className="absolute top-0 left-0 w-64 h-64 bg-yellow-300 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob"></div>
      <div className="absolute top-0 right-0 w-64 h-64 bg-purple-300 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-2000"></div>
    </div>
  );

  const renderLoading = () => (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50">
      <div className="animate-spin text-amber-500 mb-6">
        <Loader2 className="w-20 h-20" />
      </div>
      <h2 className="text-3xl font-bold text-indigo-900 mb-2">Creating your story...</h2>
      <p className="text-slate-500 font-medium">Writing words and drawing pictures!</p>
    </div>
  );

  const renderReading = () => {
    if (!session) return null;

    return (
      <div className="min-h-screen flex flex-col items-center p-6 bg-slate-50">
        <div className="w-full max-w-3xl bg-white rounded-3xl shadow-2xl overflow-hidden border-b-8 border-slate-200 animate-in slide-in-from-bottom-8 duration-700">
          
          {/* Image Header */}
          <div className="relative w-full h-72 bg-slate-200 flex items-center justify-center overflow-hidden">
            {session.imageBase64 ? (
              <img 
                src={`data:image/png;base64,${session.imageBase64}`} 
                alt="Story illustration" 
                className="w-full h-full object-cover hover:scale-105 transition-transform duration-1000"
              />
            ) : (
              <div className="text-slate-400 font-bold flex flex-col items-center">
                 <BookOpen className="w-12 h-12 mb-2 opacity-50" />
                 <span>No image available</span>
              </div>
            )}
            <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm px-4 py-2 rounded-full shadow-sm text-indigo-900 font-bold text-sm">
               {difficulty} Level
            </div>
          </div>

          <div className="p-8">
            <div className="flex justify-between items-start mb-6">
              <h2 className="text-3xl font-black text-slate-800">{session.title}</h2>
              <button 
                onClick={() => playText(session.content)}
                disabled={isLoadingAudio}
                className="bg-amber-100 hover:bg-amber-200 text-amber-700 p-3 rounded-full transition-colors flex-shrink-0"
                aria-label="Read story aloud"
              >
                {isLoadingAudio ? <Loader2 className="w-6 h-6 animate-spin" /> : <Volume2 className="w-6 h-6" />}
              </button>
            </div>

            <div className="prose prose-lg max-w-none mb-8">
              <p className="text-xl leading-relaxed text-slate-700 font-medium whitespace-pre-line">
                {session.content}
              </p>
            </div>

            <div className="flex justify-center pt-4">
              <Button size="xl" onClick={handleStartQuiz} className="w-full max-w-md animate-pulse">
                I'm Ready for Questions! <ArrowRight className="w-6 h-6" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderQuiz = () => {
    if (!session) return null;
    const currentQ = session.questions[currentQuestionIndex];
    const isLastQuestion = currentQuestionIndex === session.questions.length - 1;

    return (
      <div className="min-h-screen bg-slate-50 p-4 md:p-6 pb-20">
        <div className="max-w-6xl mx-auto space-y-8">
          
          {/* Header Bar */}
          <div className="flex justify-between items-center bg-white rounded-2xl p-4 shadow-sm border-b-4 border-slate-100">
             <div className="flex items-center gap-3">
               <div className="bg-indigo-100 p-2 rounded-xl text-indigo-600">
                 <BookOpen size={24} />
               </div>
               <span className="font-black text-slate-700 hidden sm:inline text-lg">{session.title}</span>
             </div>
             
             <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 bg-amber-100 px-3 py-1.5 rounded-full text-amber-800 font-bold">
                  <Star className="w-5 h-5 fill-amber-500 text-amber-500" /> 
                  <span>{score}</span>
                </div>
                <button onClick={handleReturnToMenu} className="text-slate-400 hover:text-slate-600 font-bold px-2">
                  Exit
                </button>
             </div>
          </div>

          <div className="grid md:grid-cols-2 gap-8 items-start">
            
            {/* LEFT/TOP: Story Context (Always visible) */}
            <div className="bg-white rounded-3xl shadow-xl overflow-hidden border-b-8 border-slate-200 md:sticky md:top-6 transition-all duration-500 order-1">
              {/* Image */}
              <div className="relative h-64 bg-indigo-50 group cursor-pointer" onClick={() => playText(session.content)}>
                 {session.imageBase64 ? (
                   <img 
                    src={`data:image/png;base64,${session.imageBase64}`} 
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                    alt="Story"
                   />
                 ) : (
                   <div className="flex items-center justify-center h-full text-indigo-200">
                     <BookOpen size={48} />
                   </div>
                 )}
                 <button 
                  onClick={(e) => { e.stopPropagation(); playText(session.content); }}
                  className="absolute bottom-4 right-4 bg-white/90 hover:bg-white text-indigo-600 p-3 rounded-full shadow-lg backdrop-blur-sm transition-all hover:scale-110 active:scale-90"
                  title="Read story"
                 >
                   {isLoadingAudio ? <Loader2 className="animate-spin" /> : <Volume2 />}
                 </button>
              </div>
              
              {/* Text */}
              <div className="p-6 max-h-[400px] overflow-y-auto custom-scrollbar">
                 <p className="text-xl leading-relaxed text-slate-700 font-medium font-fredoka">
                   {session.content}
                 </p>
              </div>
            </div>

            {/* RIGHT/BOTTOM: Question Interaction */}
            <div className="flex flex-col gap-6 order-2">
               <div className="bg-white rounded-3xl shadow-xl p-6 md:p-8 border-b-8 border-indigo-500/20 relative overflow-hidden">
                  
                  {/* Progress Strip */}
                  <div className="absolute top-0 left-0 right-0 h-3 bg-slate-100">
                    <div 
                      className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-500"
                      style={{ width: `${((currentQuestionIndex + 1) / session.questions.length) * 100}%` }}
                    />
                  </div>

                  <div className="mt-4 mb-2 flex justify-between text-xs font-bold text-slate-400 uppercase tracking-wider">
                    <span>Question {currentQuestionIndex + 1}</span>
                    <span>{session.questions.length} Total</span>
                  </div>

                  {/* Question Bubble */}
                  <div className="bg-indigo-50 rounded-2xl p-8 border-2 border-indigo-100 relative mt-8 text-center">
                    <button 
                      onClick={() => playText(currentQ.text)}
                      className="absolute -top-6 left-1/2 -translate-x-1/2 bg-indigo-500 hover:bg-indigo-600 text-white p-4 rounded-full shadow-md border-4 border-white transition-transform active:scale-95"
                      aria-label="Listen to question"
                    >
                      <Ear size={28} />
                    </button>
                    <h3 className="text-2xl md:text-3xl font-black text-indigo-900 mt-4 leading-tight">
                      {currentQ.text}
                    </h3>
                  </div>

                  {/* Answer Input */}
                  <div className="mt-8 space-y-4">
                     <input
                      ref={inputRef}
                      type="text"
                      value={userInput}
                      onChange={(e) => setUserInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSubmitAnswer()}
                      placeholder="Type your answer..."
                      className="w-full text-center text-2xl font-bold p-5 rounded-xl border-4 outline-none transition-all shadow-inner border-slate-200 focus:border-indigo-400 focus:bg-indigo-50/30 text-indigo-900 placeholder-slate-300"
                      autoComplete="off"
                    />
                  </div>

                  {/* Action Button */}
                  <div className="mt-6">
                    <Button 
                      size="xl" 
                      onClick={handleSubmitAnswer} 
                      className="w-full shadow-xl"
                      disabled={!userInput.trim()}
                    >
                      {isLastQuestion ? "Finish Quiz" : "Next Question"} <ArrowRight className="ml-2" />
                    </Button>
                  </div>

               </div>
            </div>

          </div>
        </div>
      </div>
    );
  };

  const renderSummary = () => {
    if (!session) return null;
    const percentage = Math.round((score / session.questions.length) * 100);
    
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 p-6">
         <div className="bg-white p-12 rounded-3xl shadow-2xl text-center max-w-2xl w-full border-b-8 border-slate-200">
            <div className="mb-8 relative inline-block">
              <Trophy className="w-32 h-32 text-amber-400 mx-auto drop-shadow-lg" />
              {percentage === 100 && (
                <>
                  <Star className="w-12 h-12 text-yellow-300 absolute -top-2 -right-2 animate-pulse fill-current" />
                  <Star className="w-8 h-8 text-yellow-300 absolute top-12 -left-4 animate-pulse fill-current" />
                </>
              )}
            </div>
            
            <h2 className="text-4xl font-black text-slate-800 mb-2">
              {percentage === 100 ? "Perfect Score!" : "Well Done!"}
            </h2>
            <p className="text-slate-500 text-xl mb-8">You finished the story!</p>
            
            <div className="grid grid-cols-2 gap-4 mb-10">
              <div className="bg-indigo-50 p-4 rounded-2xl">
                 <div className="text-3xl font-black text-indigo-600">{score}/{session.questions.length}</div>
                 <div className="text-indigo-400 font-bold text-sm uppercase">Score</div>
              </div>
               <div className="bg-amber-50 p-4 rounded-2xl">
                 <div className="text-3xl font-black text-amber-600">{percentage}%</div>
                 <div className="text-amber-400 font-bold text-sm uppercase">Accuracy</div>
              </div>
            </div>

            {/* Corrections Section */}
            <div className="w-full bg-slate-50 rounded-2xl overflow-hidden mb-10 border border-slate-200">
              <div className="bg-slate-100 p-4 border-b border-slate-200">
                <h3 className="text-lg font-black text-slate-700 text-left">Review Answers</h3>
              </div>
              <div className="divide-y divide-slate-200 text-left">
                {quizResults.map((result, idx) => (
                  <div key={idx} className="p-4 flex gap-4 items-start bg-white">
                      <div className={`mt-1 flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center border-2 ${result.isCorrect ? 'bg-green-50 border-green-200 text-green-600' : 'bg-red-50 border-red-200 text-red-600'}`}>
                        {result.isCorrect ? <Check size={16} strokeWidth={3} /> : <X size={16} strokeWidth={3} />}
                      </div>
                      <div className="flex-1 space-y-1">
                        <p className="font-bold text-slate-800 text-lg">{result.questionText}</p>
                        <div className="flex flex-col sm:flex-row sm:items-center sm:gap-4 gap-2 text-base">
                            <div className="flex items-center gap-2">
                              <span className="text-slate-500 text-sm uppercase font-bold">You said:</span>
                              <span className={`font-semibold ${result.isCorrect ? 'text-green-700' : 'text-red-600 line-through decoration-2'}`}>{result.userAnswer}</span>
                            </div>
                            {!result.isCorrect && (
                              <div className="flex items-center gap-2 bg-green-50 px-3 py-1 rounded-lg border border-green-200">
                                <span className="text-green-600 text-sm uppercase font-bold">Correct:</span>
                                <span className="font-bold text-green-800">{result.correctAnswer}</span>
                              </div>
                            )}
                        </div>
                      </div>
                  </div>
                ))}
              </div>
            </div>

            <Button size="xl" onClick={handleReturnToMenu} className="w-full">
              <RotateCcw className="w-6 h-6" /> Read Another Story
            </Button>
         </div>
      </div>
    );
  };

  return (
    <>
      {gameState === GameState.MENU && renderMenu()}
      {gameState === GameState.LOADING && renderLoading()}
      {gameState === GameState.READING && renderReading()}
      {gameState === GameState.QUIZ && renderQuiz()}
      {gameState === GameState.SUMMARY && renderSummary()}
      {gameState === GameState.ERROR && (
        <div className="min-h-screen flex flex-col items-center justify-center p-10 text-center">
          <h2 className="text-slate-800 font-black text-3xl mb-4">Oh no!</h2>
          <p className="text-slate-500 mb-8">We couldn't make a story right now. Please try again.</p>
          <Button onClick={handleReturnToMenu}>Go Back</Button>
        </div>
      )}
    </>
  );
};

export default App;