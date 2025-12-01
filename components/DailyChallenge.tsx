
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Send, RefreshCw, CheckCircle, Info, ArrowLeft, Image as ImageIcon, Timer, ArrowRight, XCircle, Flame, AlertCircle, Mic, MicOff } from 'lucide-react';
import { Challenge, TaskType, AssessmentResult, Category } from '../types';
import { generateChallengeMetadata, generateChallengeImage, evaluateSubmission } from '../services/geminiService';
import LoadingArt from './LoadingArt';

interface Props {
  forcedType: TaskType;
  // onComplete now returns a promise to allow the parent to process XP before we decide to continue
  onComplete: (challenge: Challenge, answer: string, result: AssessmentResult, timeRemaining: number) => Promise<boolean>; 
  onCancel: () => void;
  streak: number;
  apiKey: string;
  categoryPool: Category[];
}

const TIMER_DURATION = 30; // 30 seconds for MCQs

const DailyChallenge: React.FC<Props> = ({ forcedType, onComplete, onCancel, streak, apiKey, categoryPool }) => {
  const [loading, setLoading] = useState(false);
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [userAnswer, setUserAnswer] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<AssessmentResult | null>(null);
  
  // Voice Input
  const [isListening, setIsListening] = useState(false);
  
  // Timer state
  const [timeLeft, setTimeLeft] = useState(TIMER_DURATION);
  const [timerActive, setTimerActive] = useState(false);
  const timerRef = useRef<any>(null);

  // Initialize a new challenge
  const startNewChallenge = useCallback(async () => {
    // Reset states
    setChallenge(null);
    setResult(null);
    setUserAnswer('');
    setTimeLeft(TIMER_DURATION);
    setTimerActive(false);
    setLoading(true);

    try {
      const meta = await generateChallengeMetadata(apiKey, forcedType, categoryPool);
      const imageUrl = await generateChallengeImage(apiKey, meta.imagePrompt);
      
      setChallenge({
        ...meta,
        generatedImageUrl: imageUrl,
      });
      
      // Start timer only for MCQs
      if (forcedType === TaskType.MULTIPLE_CHOICE) {
        setTimerActive(true);
      }

    } catch (err) {
      console.error(err);
      alert("題目生成失敗，請檢查 API Key 或網路連線");
      onCancel();
    } finally {
      setLoading(false);
    }
  }, [forcedType, onCancel, apiKey]);

  useEffect(() => {
    startNewChallenge();
    return () => stopTimer();
  }, []);

  // Timer logic
  useEffect(() => {
    if (timerActive && timeLeft > 0) {
      timerRef.current = setTimeout(() => setTimeLeft(prev => prev - 1), 1000);
    } else if (timeLeft === 0 && timerActive) {
      // Time's up! Punish user.
      handleTimeUp();
    }
    return () => clearTimeout(timerRef.current!);
  }, [timeLeft, timerActive]);

  const stopTimer = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setTimerActive(false);
  };

  const handleTimeUp = () => {
    setTimerActive(false);
    // Force submit with empty answer or current answer
    handleSubmit(true); 
  };

  const startListening = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert("您的瀏覽器不支援語音輸入功能。");
      return;
    }
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = 'zh-TW';
    recognition.continuous = false;
    recognition.interimResults = false;
    
    setIsListening(true);
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setUserAnswer(prev => prev + (prev ? ' ' : '') + transcript);
      setIsListening(false);
    };
    
    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);
    
    recognition.start();
  };

  const handleOptionSelect = (opt: string, index: number) => {
    if (result) return; // Already answered
    setUserAnswer(opt);
  };

  const handleSubmit = async (isTimeUp = false) => {
    if (!challenge) return;
    if (!userAnswer && !isTimeUp) return; // Allow empty submit if time up
    
    stopTimer();
    setIsSubmitting(true);
    try {
      let evaluation: AssessmentResult;
      
      if (isTimeUp && !userAnswer && forcedType === TaskType.MULTIPLE_CHOICE) {
         // Time up and no answer selected -> 0 score
         evaluation = {
             score: 0,
             feedback: "時間到！直覺反應太慢囉。",
             strengths: [],
             improvements: ["加快決策速度"],
             correctOptionIndex: challenge.correctOptionIndex
         };
      } else {
         evaluation = await evaluateSubmission(apiKey, challenge, userAnswer);
      }
      setResult(evaluation);
    } catch (e) {
      console.error(e);
      alert("評分失敗，請檢查 API Key 或網絡");
      if (!isTimeUp) setTimerActive(true); 
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleNextOrFinish = async () => {
    if (challenge && result) {
      // Call parent to save data, await it
      const canContinue = await onComplete(challenge, userAnswer, result, timeLeft);
      
      if (canContinue && forcedType === TaskType.MULTIPLE_CHOICE) {
        startNewChallenge();
      } else {
        onCancel(); 
      }
    }
  };

  if (loading || !challenge) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] w-full">
        <LoadingArt message={
          forcedType === TaskType.MULTIPLE_CHOICE ? "準備下一道挑戰..." :
          forcedType === TaskType.OBSERVATION ? "尋找觀察素材中..." : "構建深度分析題目..."
        } />
        <p className="mt-4 text-gray-500 text-sm animate-pulse">AI 正在為您客製化生成...</p>
      </div>
    );
  }

  const timerColor = timeLeft > 10 ? 'text-green-500' : timeLeft > 5 ? 'text-yellow-500' : 'text-red-500';
  const correctIdx = result?.correctOptionIndex !== undefined ? result.correctOptionIndex : challenge.correctOptionIndex;

  return (
    <div className="w-full max-w-5xl mx-auto animate-fade-in pb-20">
      {/* Header Bar */}
      <div className="flex items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
            <button onClick={onCancel} className="p-2 hover:bg-white/10 rounded-full transition text-gray-400">
            <ArrowLeft size={24} />
            </button>
            <div className="flex flex-col">
                <div className="flex items-center gap-2">
                    <span className="bg-aesthetic-gold text-black text-xs font-bold px-2 py-1 rounded">
                        {challenge.category}
                    </span>
                    {forcedType === TaskType.MULTIPLE_CHOICE && !result && (
                        <div className={`flex items-center gap-1 font-mono text-xl font-bold ${timerColor} ${timeLeft < 6 ? 'animate-ping' : ''}`}>
                            <Timer size={18} />
                            {timeLeft}s
                        </div>
                    )}
                </div>
            </div>
        </div>
        
        <div className="flex items-center gap-2 text-aesthetic-gold bg-aesthetic-gold/5 px-3 py-1 rounded-full border border-aesthetic-gold/20">
            <Flame size={16} className={streak > 0 ? "fill-aesthetic-gold" : "text-gray-600"} />
            <span className="text-xs font-bold uppercase tracking-wider">Streak</span>
            <span className="font-serif font-bold">{streak}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Visual Column */}
        <div className="flex flex-col gap-4">
          <div className="relative w-full aspect-[4/5] md:aspect-square bg-black rounded-xl overflow-hidden shadow-2xl border border-white/10 group">
            {challenge.generatedImageUrl ? (
              <img 
                src={challenge.generatedImageUrl} 
                alt="Challenge Subject" 
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gray-900 text-gray-500">
                <ImageIcon size={48} className="mb-2 opacity-50"/>
                影像載入失敗
              </div>
            )}
            
            {/* Result Overlay for MCQ */}
            {result && forcedType === TaskType.MULTIPLE_CHOICE && (
                <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center animate-fade-in z-10 p-4">
                    <div className="text-center w-full">
                        {result.score >= 100 ? (
                            <div className="text-aesthetic-gold mb-2 transform scale-125 flex justify-center"><CheckCircle size={64} /></div>
                        ) : result.score > 0 ? (
                            <div className="text-blue-400 mb-2 transform scale-125 flex justify-center"><Info size={64} /></div>
                        ) : (
                            <div className="text-red-500 mb-2 transform scale-125 flex justify-center"><XCircle size={64} /></div>
                        )}
                        <h2 className="text-4xl font-serif text-white mb-1">{result.score} 分</h2>
                        {result.score > 0 && result.score < 100 && <p className="text-xs text-blue-300 mb-3">(獲得部分加權分數)</p>}
                        
                        <p className="text-gray-300 mx-auto text-sm leading-relaxed mb-6 max-w-sm border-t border-white/10 pt-4 mt-2">
                          {typeof result.feedback === 'string' ? result.feedback : "分析完成"}
                        </p>
                        
                        <button
                            onClick={handleNextOrFinish}
                            className="w-full max-w-xs mx-auto py-3 rounded-xl bg-aesthetic-gold text-black font-bold flex items-center justify-center gap-2 transition-all hover:bg-yellow-500 hover:scale-105 shadow-lg"
                        >
                            <ArrowRight size={20} />
                            下一題
                        </button>
                    </div>
                </div>
            )}
          </div>
        </div>

        {/* Interaction Column */}
        <div className="flex flex-col justify-between min-h-[400px]">
          <div>
            <h2 className="text-2xl md:text-3xl font-serif text-white mb-6 leading-relaxed">
              {challenge.question}
            </h2>

            {!result ? (
              <div className="space-y-4">
                {challenge.type === TaskType.MULTIPLE_CHOICE && challenge.options ? (
                  <div className="grid grid-cols-1 gap-3">
                    {challenge.options.map((opt, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleOptionSelect(opt, idx)}
                        disabled={timeLeft === 0}
                        className={`p-5 text-left rounded-xl border transition-all duration-300 flex items-center group relative overflow-hidden ${
                          userAnswer === opt 
                            ? 'border-aesthetic-gold bg-aesthetic-gold/20 text-white shadow-[0_0_15px_rgba(212,175,55,0.2)]' 
                            : 'border-white/10 bg-white/5 hover:bg-white/10 text-gray-300'
                        }`}
                      >
                         <div className="absolute left-0 top-0 h-full w-1 bg-aesthetic-gold transform -translate-x-full group-hover:translate-x-0 transition-transform duration-300"></div>
                        <span className={`w-8 h-8 flex items-center justify-center rounded-full border mr-4 text-xs font-serif transition-colors ${
                            userAnswer === opt ? 'border-aesthetic-gold text-aesthetic-gold' : 'border-white/20 text-gray-500'
                        }`}>
                          {String.fromCharCode(65 + idx)}
                        </span>
                        <span className="text-lg">{opt}</span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="relative">
                    <textarea
                        className="w-full h-64 bg-black/30 border border-white/20 rounded-xl p-5 text-white text-lg focus:border-aesthetic-gold focus:ring-1 focus:ring-aesthetic-gold outline-none resize-none transition leading-relaxed placeholder-gray-600"
                        placeholder={challenge.type === TaskType.ANALYSIS ? "請從構圖、光影、色彩等角度進行深度剖析..." : "請描述你看到的..."}
                        value={userAnswer}
                        onChange={(e) => setUserAnswer(e.target.value)}
                    />
                    <button 
                        onClick={startListening}
                        className={`absolute bottom-4 right-4 p-3 rounded-full transition-all ${isListening ? 'bg-red-500 animate-pulse text-white' : 'bg-white/10 text-gray-400 hover:text-white hover:bg-white/20'}`}
                    >
                        {isListening ? <MicOff size={20} /> : <Mic size={20} />}
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="animate-fade-in space-y-4">
                {/* Result State - Non-MCQ (Observation/Analysis) */}
                {challenge.type !== TaskType.MULTIPLE_CHOICE && (
                    <div className="p-6 bg-gradient-to-br from-[#222] to-black border-l-4 border-aesthetic-gold rounded-r-xl relative overflow-hidden shadow-lg">
                        <div className="flex items-start justify-between">
                            <div>
                            <h3 className="text-aesthetic-gold font-serif text-lg mb-1">評分結果</h3>
                            <div className="flex items-end gap-2 mb-4">
                                <span className="text-6xl font-serif text-white">{result.score}</span>
                                <span className="text-gray-500 text-sm mb-2">/ 100</span>
                            </div>
                            </div>
                            {result.score >= 80 && <CheckCircle size={40} className="text-green-500" />}
                        </div>
                        
                        <p className="text-gray-300 leading-relaxed mb-4">
                            {result.feedback}
                        </p>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6 pt-4 border-t border-white/10">
                            <div>
                            <h4 className="text-green-400 text-xs font-bold uppercase mb-2 tracking-wider flex items-center gap-1"><CheckCircle size={12}/> 做得好的地方</h4>
                            <ul className="text-sm text-gray-400 space-y-1">
                                {result.strengths && result.strengths.length > 0 ? (
                                    result.strengths.map((s, i) => <li key={i} className="flex items-start gap-2"><span className="text-green-500 mt-1">•</span>{s}</li>)
                                ) : (
                                    <li className="text-gray-600 italic">無特別註記</li>
                                )}
                            </ul>
                            </div>
                            <div>
                            <h4 className="text-aesthetic-accent text-xs font-bold uppercase mb-2 tracking-wider flex items-center gap-1"><AlertCircle size={12}/> 建議改進</h4>
                            <ul className="text-sm text-gray-400 space-y-1">
                                {result.improvements && result.improvements.length > 0 ? (
                                    result.improvements.map((s, i) => <li key={i} className="flex items-start gap-2"><span className="text-aesthetic-accent mt-1">•</span>{s}</li>)
                                ) : (
                                    <li className="text-gray-600 italic">無特別註記</li>
                                )}
                            </ul>
                            </div>
                        </div>
                    </div>
                )}
              </div>
            )}
          </div>

          <div className="mt-8 z-20 relative">
            {!result ? (
              <button
                onClick={() => handleSubmit()}
                disabled={isSubmitting || !userAnswer}
                className={`w-full py-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all text-lg ${
                  !userAnswer 
                    ? 'bg-gray-800 text-gray-600 cursor-not-allowed' 
                    : 'bg-aesthetic-gold text-black hover:bg-yellow-500 shadow-[0_0_20px_rgba(212,175,55,0.3)] hover:scale-[1.01]'
                }`}
              >
                {isSubmitting ? 'AI 老師正在評分...' : (
                  <>
                    <Send size={20} />
                    提交答案
                  </>
                )}
              </button>
            ) : (
                forcedType !== TaskType.MULTIPLE_CHOICE && (
                <button
                    onClick={handleNextOrFinish}
                    className="w-full py-4 rounded-xl bg-white text-black font-bold flex items-center justify-center gap-2 transition-all hover:bg-gray-200 text-lg shadow-lg"
                >
                    <RefreshCw size={20} />
                    完成訓練
                </button>
                )
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DailyChallenge;
