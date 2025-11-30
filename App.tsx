
import React, { useState, useEffect, useRef } from 'react';
import { 
  Layout, Award, Brain, History as HistoryIcon, Zap, CheckCircle, 
  ArrowRight, BookOpen, PenTool, Trophy, Star, Sprout, 
  Flame, Crosshair, Microscope, Crown, User, ImageOff,
  Camera, Edit2, Save, X, Sun, Moon, Timer, Palette, Mountain, Heart, Filter, Key
} from 'lucide-react';
import { AssessmentResult, Challenge, UserStats, UserHistoryItem, TaskType, Badge, BadgeIconType, Category } from './types';
import DailyChallenge from './components/DailyChallenge';
import ProgressChart from './components/ProgressChart';
import Logo from './components/Logo';
import { INITIAL_STATS, LEVEL_THRESHOLDS, ALL_BADGES, getDynamicGreeting } from './constants';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'history' | 'profile'>('dashboard');
  const [activeTask, setActiveTask] = useState<TaskType | null>(null);
  const [showLevelUp, setShowLevelUp] = useState<{old: number, new: number} | null>(null);
  const [greeting, setGreeting] = useState('');
  
  // API Key State
  const [apiKey, setApiKey] = useState<string>(() => {
    return localStorage.getItem('gemini_api_key') || process.env.API_KEY || '';
  });
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);
  const [tempApiKey, setTempApiKey] = useState('');

  // History Filter State
  const [historyFilter, setHistoryFilter] = useState<'ALL' | 'ERRORS' | 'MCQ' | 'OBSERVATION'>('ALL');
  
  // Profile Edit State
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editName, setEditName] = useState('');
  
  // API Key Edit State (In Profile)
  const [isEditingKey, setIsEditingKey] = useState(false);
  const [newKeyInput, setNewKeyInput] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [stats, setStats] = useState<UserStats>(() => {
    try {
      const saved = localStorage.getItem('aesthetica_stats');
      if (saved) {
        const parsed = JSON.parse(saved);
        return { 
          ...INITIAL_STATS, 
          ...parsed, 
          dailyProgress: { ...INITIAL_STATS.dailyProgress, ...parsed.dailyProgress },
          badges: parsed.badges || [],
          // Migration for old users who lack lastStreakDate
          lastStreakDate: parsed.lastStreakDate || ''
        };
      }
    } catch (e) {
      console.error("Error loading stats", e);
    }
    return INITIAL_STATS;
  });
  
  const [history, setHistory] = useState<UserHistoryItem[]>(() => {
    try {
      const saved = localStorage.getItem('aesthetica_history');
      return saved ? JSON.parse(saved) : [];
    } catch(e) {
      return [];
    }
  });

  // Check API Key on load
  useEffect(() => {
    if (!apiKey) {
      setShowApiKeyModal(true);
    }
  }, [apiKey]);

  // Check for daily task reset
  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    if (stats.dailyProgress.lastDate !== today) {
      setStats(prev => ({
        ...prev,
        dailyProgress: {
          lastDate: today,
          mcqCount: 0,
          observationDone: false,
          lastWeeklyAnalysisDate: prev.dailyProgress.lastWeeklyAnalysisDate
        }
      }));
    }
    setGreeting(getDynamicGreeting(stats));
  }, [stats.dailyProgress.lastDate, stats.username]); 

  // Safe Storage Effect
  useEffect(() => {
    try {
      localStorage.setItem('aesthetica_stats', JSON.stringify(stats));
    } catch (e) {
      console.error("Failed to save stats:", e);
    }

    try {
      // Aggressive optimization: Only keep images for last 5 entries
      const optimizedHistory = history.map((item, index) => {
        if (index >= 5 && item.challenge.generatedImageUrl && item.challenge.generatedImageUrl.startsWith('data:')) {
          return {
            ...item,
            challenge: { ...item.challenge, generatedImageUrl: undefined }
          };
        }
        return item;
      });
      localStorage.setItem('aesthetica_history', JSON.stringify(optimizedHistory));
    } catch (e) {
      console.warn("Storage full. Removing all images.");
      try {
        const textOnlyHistory = history.map(item => ({
          ...item,
          challenge: { ...item.challenge, generatedImageUrl: undefined }
        }));
        localStorage.setItem('aesthetica_history', JSON.stringify(textOnlyHistory));
      } catch (criticalError) {
        console.error("Failed to save history", criticalError);
      }
    }
  }, [stats, history]);

  const handleSaveInitialApiKey = () => {
    if (tempApiKey.trim().length > 10) {
      setApiKey(tempApiKey.trim());
      localStorage.setItem('gemini_api_key', tempApiKey.trim());
      setShowApiKeyModal(false);
    } else {
      alert("請輸入有效的 Gemini API Key");
    }
  };

  const handleUpdateApiKey = () => {
    if (newKeyInput.trim().length > 10) {
      setApiKey(newKeyInput.trim());
      localStorage.setItem('gemini_api_key', newKeyInput.trim());
      setIsEditingKey(false);
      setNewKeyInput('');
      alert("API Key 更新成功！");
    } else {
      alert("無效的 Key");
    }
  };

  const handleAvatarUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_SIZE = 150; 
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_SIZE) {
            height *= MAX_SIZE / width;
            width = MAX_SIZE;
          }
        } else {
          if (height > MAX_SIZE) {
            width *= MAX_SIZE / height;
            height = MAX_SIZE;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        
        const dataUrl = canvas.toDataURL('image/jpeg', 0.7); 
        setStats(prev => ({ ...prev, avatar: dataUrl }));
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleSaveProfile = () => {
    if (editName.trim()) {
      setStats(prev => ({ ...prev, username: editName.trim() }));
    }
    setIsEditingProfile(false);
  };

  const calculateXP = (taskType: TaskType, score: number, timeRemaining: number) => {
    let baseXP = 0;
    if (taskType === TaskType.MULTIPLE_CHOICE) baseXP = 50;
    if (taskType === TaskType.OBSERVATION) baseXP = 150;
    if (taskType === TaskType.ANALYSIS) baseXP = 500;

    const qualityMultiplier = score / 100;
    const timeBonus = taskType === TaskType.MULTIPLE_CHOICE ? timeRemaining * 2 : 0;

    return Math.round((baseXP * qualityMultiplier) + timeBonus);
  };

  const checkBadges = (currentStats: UserStats, newHistory: UserHistoryItem[], lastTask?: { type: TaskType, score: number, timeUsed: number }) => {
    const unlockedBadges: Badge[] = [...currentStats.badges];
    const newBadgeIds = new Set(unlockedBadges.map(b => b.id));
    const now = new Date();
    const hour = now.getHours();

    ALL_BADGES.forEach(badge => {
      if (newBadgeIds.has(badge.id)) return;

      let qualified = false;
      const allHistory = newHistory; 

      switch (badge.id) {
        case 'first_step': if (allHistory.length >= 1) qualified = true; break;
        case 'streak_3': if (currentStats.streak >= 3) qualified = true; break;
        case 'streak_7': if (currentStats.streak >= 7) qualified = true; break;
        case 'streak_30': if (currentStats.streak >= 30) qualified = true; break;
        case 'perfect_10': 
          if (currentStats.dailyProgress.mcqCount >= 10 && allHistory.slice(0, 10).every(h => h.challenge.type === TaskType.MULTIPLE_CHOICE && h.assessment.score === 100)) qualified = true; 
          break;
        case 'analyst': if (currentStats.dailyProgress.lastWeeklyAnalysisDate) qualified = true; break;
        case 'early_bird': if (hour >= 6 && hour < 9) qualified = true; break;
        case 'night_owl': if (hour >= 22 || hour < 2) qualified = true; break;
        case 'veteran': if (currentStats.totalTasks >= 100) qualified = true; break;
        case 'sharpshooter':
          if (allHistory.slice(0, 5).length === 5 && allHistory.slice(0, 5).every(h => h.assessment.score === 100)) qualified = true;
          break;
        case 'resilient':
          if (allHistory.length >= 2) {
             const current = allHistory[0];
             const prev = allHistory[1];
             if (prev.assessment.score < 40 && current.assessment.score > 90) qualified = true;
          }
          break;
        case 'explorer':
          const categories = new Set(allHistory.map(h => h.challenge.category));
          if (categories.size >= 3) qualified = true;
          break;
        case 'polymath':
          const allCategories = Object.values(Category);
          const userCategories = new Set(allHistory.map(h => h.challenge.category));
          if (allCategories.every(c => userCategories.has(c))) qualified = true;
          break;
        case 'speed_demon':
          if (lastTask && lastTask.type === TaskType.MULTIPLE_CHOICE && lastTask.score >= 90 && lastTask.timeUsed < 5) qualified = true;
          break;
      }

      if (qualified) {
        unlockedBadges.push({ ...badge, unlockedAt: new Date().toISOString() });
      }
    });

    return unlockedBadges;
  };

  const handleChallengeComplete = async (challenge: Challenge, userAnswer: string, result: AssessmentResult, timeRemaining: number): Promise<boolean> => {
    try {
      const xpEarned = calculateXP(challenge.type, result.score, timeRemaining);
      
      const newItem: UserHistoryItem = {
        id: Date.now().toString(),
        date: new Date().toISOString(),
        challenge,
        userAnswer,
        assessment: result,
        xpGained: xpEarned
      };

      const updatedHistory = [newItem, ...history];
      setHistory(updatedHistory);

      setStats(prev => {
        const newScoresHistory = [...prev.scoresHistory, { date: new Date().toISOString(), score: result.score }];
        const totalScore = newScoresHistory.reduce((acc, curr) => acc + curr.score, 0);
        
        const updatedDaily = { ...prev.dailyProgress };
        if (challenge.type === TaskType.MULTIPLE_CHOICE) updatedDaily.mcqCount += 1;
        if (challenge.type === TaskType.OBSERVATION) updatedDaily.observationDone = true;
        if (challenge.type === TaskType.ANALYSIS) updatedDaily.lastWeeklyAnalysisDate = new Date().toISOString();

        // --- STREAK LOGIC REFACTOR ---
        const todayStr = new Date().toISOString().split('T')[0];
        let newStreak = prev.streak;
        let newLastStreakDate = prev.lastStreakDate;

        if (prev.lastStreakDate === todayStr) {
           // Already counted streak for today, do nothing
        } else {
           // Check if last streak date was yesterday
           const yesterday = new Date();
           yesterday.setDate(yesterday.getDate() - 1);
           const yesterdayStr = yesterday.toISOString().split('T')[0];
           
           if (prev.lastStreakDate === yesterdayStr) {
              newStreak += 1;
           } else if (!prev.lastStreakDate) {
              newStreak = 1; // First time
           } else {
              // Streak broken
              newStreak = 1;
           }
           newLastStreakDate = todayStr;
        }

        const newXP = prev.xp + xpEarned;
        let newLevel = prev.level;
        for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
          if (newXP >= LEVEL_THRESHOLDS[i].xp) {
            newLevel = LEVEL_THRESHOLDS[i].level;
            break;
          }
        }

        if (newLevel > prev.level) {
          setShowLevelUp({ old: prev.level, new: newLevel });
        }

        const tempStats = {
          ...prev,
          lastStreakDate: newLastStreakDate,
          streak: newStreak,
          totalTasks: prev.totalTasks + 1,
          averageScore: newScoresHistory.length > 0 ? Math.round(totalScore / newScoresHistory.length) : 0,
          scoresHistory: newScoresHistory,
          dailyProgress: updatedDaily,
          xp: newXP,
          level: newLevel
        };

        const timeUsed = challenge.type === TaskType.MULTIPLE_CHOICE ? (30 - timeRemaining) : 0;
        tempStats.badges = checkBadges(tempStats, updatedHistory, { type: challenge.type, score: result.score, timeUsed });

        return tempStats;
      });

      if (challenge.type === TaskType.MULTIPLE_CHOICE) {
        if (stats.dailyProgress.mcqCount + 1 >= 10) return false;
        return true;
      }

      return false;
    } catch (error) {
      console.error("Critical error in gamification logic:", error);
      return false; 
    }
  };

  const isWeeklyAvailable = () => {
    if (!stats.dailyProgress.lastWeeklyAnalysisDate) return true;
    const last = new Date(stats.dailyProgress.lastWeeklyAnalysisDate);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - last.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
    return diffDays >= 7;
  };

  const BadgeIcon = ({ type, size = 24 }: { type: BadgeIconType, size?: number }) => {
    switch (type) {
      case 'sprout': return <Sprout size={size} />;
      case 'flame': return <Flame size={size} />;
      case 'zap': return <Zap size={size} />;
      case 'crosshair': return <Crosshair size={size} />;
      case 'microscope': return <Microscope size={size} />;
      case 'crown': return <Crown size={size} />;
      case 'sun': return <Sun size={size} />;
      case 'moon': return <Moon size={size} />;
      case 'timer': return <Timer size={size} />;
      case 'palette': return <Palette size={size} />;
      case 'mountain': return <Mountain size={size} />;
      case 'heart': return <Heart size={size} />;
      case 'star': return <Star size={size} />;
      case 'book': return <BookOpen size={size} />;
      default: return <Award size={size} />;
    }
  };

  const currentLevelInfo = LEVEL_THRESHOLDS.find(l => l.level === stats.level) || LEVEL_THRESHOLDS[0];
  const nextLevelInfo = LEVEL_THRESHOLDS.find(l => l.level === stats.level + 1);

  // Filter History Logic
  const filteredHistory = history.filter(item => {
      if (historyFilter === 'ALL') return true;
      if (historyFilter === 'ERRORS') return item.assessment.score < 60;
      if (historyFilter === 'MCQ') return item.challenge.type === TaskType.MULTIPLE_CHOICE;
      if (historyFilter === 'OBSERVATION') return item.challenge.type === TaskType.OBSERVATION || item.challenge.type === TaskType.ANALYSIS;
      return true;
  });

  const renderDashboard = () => (
    <div className="space-y-8 animate-fade-in">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-8">
        <div className="w-full">
          <div className="flex items-center gap-3 mb-2">
            <h2 className="text-3xl font-serif text-white">{currentLevelInfo.title}</h2>
            <span className="text-xs bg-aesthetic-gold/10 text-aesthetic-gold px-2 py-1 rounded border border-aesthetic-gold/20">
               {stats.username}
            </span>
          </div>
          <p className="text-aesthetic-gold/80 italic font-serif mb-4 min-h-[1.5rem]">{greeting}</p>
          
          <div className="flex flex-col w-full max-w-md">
             <div className="flex justify-between text-xs text-gray-400 mb-1">
                <span>Lvl {stats.level}</span>
                <span>{nextLevelInfo ? `${stats.xp} / ${nextLevelInfo.xp} XP` : 'MAX'}</span>
             </div>
             <div className="w-full h-1 bg-gray-800 rounded-full overflow-hidden">
                <div className="h-full bg-aesthetic-gold transition-all duration-1000" style={{ width: nextLevelInfo ? `${((stats.xp - currentLevelInfo.xp) / (nextLevelInfo.xp - currentLevelInfo.xp)) * 100}%` : '100%' }}></div>
             </div>
          </div>
        </div>
        
        <div className="flex gap-4 w-full md:w-auto">
           <div className="bg-white/5 px-4 py-3 rounded-lg border border-white/10 flex flex-col items-center flex-1 md:flex-none md:min-w-[80px]">
             <div className="flex items-center gap-1 text-aesthetic-gold mb-1">
               <Flame size={16} className={stats.streak > 0 ? "fill-aesthetic-gold" : ""} />
               <span className="text-xl font-serif">{stats.streak}</span>
             </div>
             <span className="text-[10px] text-gray-500 uppercase tracking-widest">連勝</span>
           </div>
           <div className="bg-white/5 px-4 py-3 rounded-lg border border-white/10 flex flex-col items-center flex-1 md:flex-none md:min-w-[80px]">
             <div className="flex items-center gap-1 text-aesthetic-gold mb-1">
               <Award size={16} />
               <span className="text-xl font-serif">{stats.badges.length}</span>
             </div>
             <span className="text-[10px] text-gray-500 uppercase tracking-widest">徽章</span>
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Card 1: MCQ */}
        <div 
          onClick={() => stats.dailyProgress.mcqCount < 10 && setActiveTask(TaskType.MULTIPLE_CHOICE)}
          className={`relative p-6 rounded-xl border transition-all duration-300 group overflow-hidden ${
            stats.dailyProgress.mcqCount >= 10 
            ? 'bg-black/40 border-white/5 opacity-50 cursor-not-allowed' 
            : 'bg-[#1e1e1e] border-white/10 hover:border-aesthetic-gold/50 hover:bg-[#252525] cursor-pointer shadow-lg'
          }`}
        >
          <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition">
            <Zap size={80} />
          </div>
          <div className="flex items-center justify-between mb-4">
             <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-400 border border-blue-500/20">
               <Brain size={20} />
             </div>
             <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Fast Pace</span>
          </div>
          <h3 className="text-xl font-serif text-white mb-2">每日快問快答</h3>
          <p className="text-sm text-gray-400 mb-6">連續挑戰美感判斷，速度越快 XP 越高。</p>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
               <span className="text-2xl font-bold text-white">{stats.dailyProgress.mcqCount}</span>
               <span className="text-sm text-gray-500">/ 10 題</span>
            </div>
            {stats.dailyProgress.mcqCount >= 10 ? (
              <CheckCircle className="text-green-500" size={24} />
            ) : (
              <div className="flex items-center gap-1 text-aesthetic-gold text-sm group-hover:translate-x-1 transition">
                 開始 <ArrowRight size={16} />
              </div>
            )}
          </div>
          <div className="w-full bg-gray-800 h-1 mt-4 rounded-full overflow-hidden">
            <div className="bg-blue-500 h-full transition-all duration-500" style={{ width: `${(stats.dailyProgress.mcqCount / 10) * 100}%` }}></div>
          </div>
        </div>

        {/* Card 2: Observation */}
        <div 
           onClick={() => !stats.dailyProgress.observationDone && setActiveTask(TaskType.OBSERVATION)}
           className={`relative p-6 rounded-xl border transition-all duration-300 group overflow-hidden ${
             stats.dailyProgress.observationDone
             ? 'bg-black/40 border-white/5 opacity-50 cursor-not-allowed' 
             : 'bg-[#1e1e1e] border-white/10 hover:border-aesthetic-gold/50 hover:bg-[#252525] cursor-pointer shadow-lg'
           }`}
        >
          <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition">
            <BookOpen size={80} />
          </div>
          <div className="flex items-center justify-between mb-4">
             <div className="w-10 h-10 rounded-full bg-aesthetic-gold/10 flex items-center justify-center text-aesthetic-gold border border-aesthetic-gold/20">
               <BookOpen size={20} />
             </div>
             <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Focus</span>
          </div>
          <h3 className="text-xl font-serif text-white mb-2">每日觀察練習</h3>
          <p className="text-sm text-gray-400 mb-6">靜下心來描述細節。高經驗值任務。</p>
          <div className="flex items-center justify-between">
             <span className="text-sm text-gray-400">{stats.dailyProgress.observationDone ? '已完成' : '尚未開始'}</span>
             {stats.dailyProgress.observationDone ? (
               <CheckCircle className="text-green-500" size={24} />
             ) : (
               <div className="w-6 h-6 rounded-full border border-aesthetic-gold group-hover:bg-aesthetic-gold/20 transition"></div>
             )}
          </div>
        </div>

        {/* Card 3: Weekly Analysis */}
        <div 
           onClick={() => isWeeklyAvailable() && setActiveTask(TaskType.ANALYSIS)}
           className={`relative p-6 rounded-xl border transition-all duration-300 group overflow-hidden ${
             !isWeeklyAvailable()
             ? 'bg-black/40 border-white/5 opacity-50 cursor-not-allowed' 
             : 'bg-[#1e1e1e] border-white/10 hover:border-purple-500/50 hover:bg-[#252525] cursor-pointer shadow-lg'
           }`}
        >
          <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition">
            <PenTool size={80} />
          </div>
          <div className="flex items-center justify-between mb-4">
             <div className="w-10 h-10 rounded-full bg-purple-500/10 flex items-center justify-center text-purple-400 border border-purple-500/20">
               <PenTool size={20} />
             </div>
             <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Weekly Epic</span>
          </div>
          <h3 className="text-xl font-serif text-white mb-2">每週深度講評</h3>
          <p className="text-sm text-gray-400 mb-6">挑戰極限。最高經驗值與徽章獲取機會。</p>
          <div className="flex items-center justify-between mt-auto">
             <span className="text-sm text-gray-400">
                {isWeeklyAvailable() ? '任務已解鎖' : '下週再來'}
             </span>
             {isWeeklyAvailable() ? (
               <ArrowRight className="text-purple-400 group-hover:translate-x-1 transition" size={20} />
             ) : (
               <CheckCircle className="text-green-500" size={24} />
             )}
          </div>
        </div>
      </div>
      
      <div className="mt-8 border-t border-white/10 pt-8">
        <ProgressChart stats={stats} />
      </div>
    </div>
  );

  const renderProfile = () => {
    // Group Badges
    const badgeGroups = {
        milestones: ALL_BADGES.filter(b => ['first_step', 'streak_3', 'streak_7', 'streak_30', 'veteran'].includes(b.id)),
        skill: ALL_BADGES.filter(b => ['perfect_10', 'sharpshooter', 'resilient', 'speed_demon'].includes(b.id)),
        breadth: ALL_BADGES.filter(b => ['explorer', 'polymath', 'analyst', 'early_bird', 'night_owl'].includes(b.id))
    };

    return (
    <div className="animate-fade-in pb-10">
      <div className="bg-[#1e1e1e] rounded-xl p-8 border border-white/10 text-center mb-8 relative overflow-hidden">
         <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-aesthetic-gold to-transparent opacity-50"></div>
         
         <div className="relative mx-auto w-28 h-28 mb-4 group">
            <div className="w-full h-full rounded-full overflow-hidden border-2 border-aesthetic-gold/50 shadow-[0_0_30px_rgba(212,175,55,0.15)] bg-black">
              {stats.avatar ? (
                <img src={stats.avatar} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-800 to-black">
                   <User size={48} className="text-gray-500" />
                </div>
              )}
            </div>
            
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="absolute bottom-0 right-0 bg-aesthetic-gold text-black p-2 rounded-full hover:scale-110 transition shadow-lg"
            >
              <Camera size={16} />
            </button>
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              accept="image/*" 
              onChange={handleAvatarUpload} 
            />
         </div>

         {isEditingProfile ? (
           <div className="flex items-center justify-center gap-2 mb-2">
             <input 
               autoFocus
               type="text" 
               className="bg-black/50 border border-aesthetic-gold/50 rounded px-3 py-1 text-white text-center font-serif text-xl focus:outline-none focus:ring-1 focus:ring-aesthetic-gold"
               value={editName}
               placeholder={stats.username}
               onChange={(e) => setEditName(e.target.value)}
             />
             <button onClick={handleSaveProfile} className="text-green-500 hover:text-green-400"><Save size={20}/></button>
             <button onClick={() => setIsEditingProfile(false)} className="text-red-500 hover:text-red-400"><X size={20}/></button>
           </div>
         ) : (
           <div className="flex items-center justify-center gap-2 mb-2 group">
              <h2 className="text-2xl font-serif text-white">{stats.username}</h2>
              <button onClick={() => { setEditName(stats.username); setIsEditingProfile(true); }} className="text-gray-600 hover:text-aesthetic-gold transition opacity-0 group-hover:opacity-100">
                <Edit2 size={16} />
              </button>
           </div>
         )}
         
         <p className="text-gray-400 text-sm mb-6 mt-1 flex items-center justify-center gap-2">
            <span className="bg-white/5 px-2 py-0.5 rounded text-xs border border-white/10">{currentLevelInfo.title}</span>
            <span className="text-gray-500">•</span>
            <span>加入於 {stats.dailyProgress.lastDate.split('-')[0]}</span>
         </p>

         <div className="max-w-md mx-auto bg-black/40 rounded-full h-4 relative overflow-hidden">
            <div className="absolute top-0 left-0 h-full bg-aesthetic-gold transition-all duration-1000" 
                 style={{ width: nextLevelInfo ? `${((stats.xp - currentLevelInfo.xp) / (nextLevelInfo.xp - currentLevelInfo.xp)) * 100}%` : '100%' }}>
            </div>
         </div>
         <div className="flex justify-between max-w-md mx-auto mt-2 text-xs text-gray-500">
           <span>{currentLevelInfo.xp} XP</span>
           <span>{nextLevelInfo ? `${nextLevelInfo.xp} XP` : 'MAX'}</span>
         </div>
      </div>

      {/* API Key Management */}
      <div className="bg-[#1e1e1e] rounded-xl p-6 border border-white/10 mb-8">
        <h3 className="text-lg font-serif text-white mb-4 flex items-center gap-2">
            <Key className="text-aesthetic-gold" size={20} />
            API Key 設定
        </h3>
        {isEditingKey ? (
            <div className="flex flex-col gap-3">
                <input 
                    type="password"
                    value={newKeyInput}
                    onChange={(e) => setNewKeyInput(e.target.value)}
                    placeholder="貼上你的 Gemini API Key"
                    className="bg-black/40 border border-white/20 rounded-lg p-3 text-white focus:border-aesthetic-gold outline-none"
                />
                <div className="flex gap-2 justify-end">
                    <button onClick={() => setIsEditingKey(false)} className="px-4 py-2 text-gray-400 hover:text-white">取消</button>
                    <button onClick={handleUpdateApiKey} className="px-4 py-2 bg-aesthetic-gold text-black font-bold rounded-lg hover:bg-yellow-500">儲存</button>
                </div>
            </div>
        ) : (
            <div className="flex items-center justify-between bg-black/40 p-3 rounded-lg border border-white/5">
                <div className="flex flex-col">
                    <span className="text-gray-400 text-xs uppercase tracking-wide">目前金鑰</span>
                    <span className="text-white font-mono">•••••••••••••••••••••</span>
                </div>
                <button 
                    onClick={() => { setIsEditingKey(true); setNewKeyInput(''); }}
                    className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition"
                >
                    <Edit2 size={16} />
                </button>
            </div>
        )}
      </div>

      <h3 className="text-xl font-serif text-white mb-6 flex items-center gap-2">
        <Award className="text-aesthetic-gold" size={20} />
        成就徽章櫃 ({stats.badges.length}/{ALL_BADGES.length})
      </h3>

      {/* Render Badge Groups */}
      {[
          { title: "🏆 里程碑", badges: badgeGroups.milestones },
          { title: "⚡ 技巧與速度", badges: badgeGroups.skill },
          { title: "🧠 廣度與作息", badges: badgeGroups.breadth }
      ].map((group, idx) => (
          <div key={idx} className="mb-6">
            <h4 className="text-sm text-gray-500 font-bold uppercase tracking-wider mb-3 ml-1">{group.title}</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {group.badges.map(badge => {
                const isUnlocked = stats.badges.some(b => b.id === badge.id);
                return (
                    <div key={badge.id} className={`p-4 rounded-xl border flex flex-col items-center text-center transition-all ${
                    isUnlocked 
                    ? 'bg-[#1e1e1e] border-aesthetic-gold/30 shadow-[0_0_10px_rgba(212,175,55,0.1)]' 
                    : 'bg-black/40 border-white/5 opacity-40 grayscale'
                    }`}>
                    <div className={`mb-3 p-3 rounded-full ${isUnlocked ? 'bg-aesthetic-gold/10 text-aesthetic-gold' : 'bg-white/5 text-gray-600'}`}>
                        <BadgeIcon type={badge.iconType} size={28} />
                    </div>
                    <h4 className={`font-bold text-sm mb-1 ${isUnlocked ? 'text-white' : 'text-gray-500'}`}>{badge.name}</h4>
                    <p className="text-[10px] text-gray-500 leading-tight">{badge.description}</p>
                    {isUnlocked && <span className="mt-2 text-[10px] text-aesthetic-gold border border-aesthetic-gold/20 px-2 py-0.5 rounded-full">已解鎖</span>}
                    </div>
                )
                })}
            </div>
          </div>
      ))}
    </div>
  )};

  return (
    <div className="min-h-screen bg-[#121212] text-white selection:bg-aesthetic-gold selection:text-black font-sans pb-20 md:pb-0">
      
      {/* API Key Modal */}
      {showApiKeyModal && (
        <div className="fixed inset-0 z-[150] bg-black/95 flex items-center justify-center p-6 animate-fade-in backdrop-blur-md">
            <div className="w-full max-w-md bg-[#1e1e1e] border border-aesthetic-gold/30 rounded-2xl p-8 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-aesthetic-gold"></div>
                <div className="flex justify-center mb-6">
                    <Logo size={64} />
                </div>
                <h2 className="text-2xl font-serif text-white text-center mb-2">歡迎來到 Aesthetica</h2>
                <p className="text-gray-400 text-center text-sm mb-6">
                    為了啟用 AI 美感導師，請輸入您的 Gemini API Key。<br/>
                    <span className="text-xs opacity-70">您的金鑰僅會儲存於本地瀏覽器中，不會上傳至伺服器。</span>
                </p>
                <div className="space-y-4">
                    <input 
                        type="password"
                        placeholder="請在此貼上 API Key"
                        value={tempApiKey}
                        onChange={(e) => setTempApiKey(e.target.value)}
                        className="w-full bg-black/50 border border-white/20 rounded-xl p-4 text-white text-center focus:border-aesthetic-gold focus:ring-1 focus:ring-aesthetic-gold outline-none transition"
                    />
                    <button 
                        onClick={handleSaveInitialApiKey}
                        className="w-full py-4 bg-aesthetic-gold text-black font-bold rounded-xl hover:bg-yellow-500 transition shadow-[0_0_15px_rgba(212,175,55,0.3)]"
                    >
                        開始旅程
                    </button>
                    <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="block text-center text-xs text-gray-500 hover:text-white underline mt-2">
                        還沒有 API Key？點此獲取
                    </a>
                </div>
            </div>
        </div>
      )}

      {/* Level Up Overlay */}
      {showLevelUp && (
        <div className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center animate-fade-in" onClick={() => setShowLevelUp(null)}>
          <div className="text-center p-8 scale-110">
            <Trophy size={80} className="text-aesthetic-gold mx-auto mb-4 animate-bounce" />
            <h2 className="text-4xl font-serif text-white mb-2">等級提升！</h2>
            <p className="text-xl text-gray-300 mb-6">
              {LEVEL_THRESHOLDS.find(l => l.level === showLevelUp.old)?.title} <ArrowRight className="inline mx-2" size={16}/> 
              <span className="text-aesthetic-gold font-bold">{LEVEL_THRESHOLDS.find(l => l.level === showLevelUp.new)?.title}</span>
            </p>
            <p className="text-sm text-gray-500">點擊任意處繼續</p>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="fixed top-0 w-full bg-[#121212]/95 backdrop-blur-xl border-b border-white/5 z-50">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => {setActiveTab('dashboard'); setActiveTask(null);}}>
            <Logo size={32} />
            <h1 className="text-lg font-serif font-bold tracking-tight">Aesthetica</h1>
          </div>
          
          <div className="flex items-center gap-2">
            <div className="hidden md:flex items-center gap-4 mr-4 text-xs text-gray-400">
               <span className="flex items-center gap-1"><Star size={12} className="text-aesthetic-gold"/> Lvl {stats.level}</span>
               <span className="flex items-center gap-1"><Zap size={12} className="text-blue-400"/> {stats.xp} XP</span>
            </div>
            
            <div 
              onClick={() => setActiveTab('profile')}
              className="w-8 h-8 rounded-full bg-gray-800 border border-white/10 overflow-hidden cursor-pointer hover:border-aesthetic-gold transition"
            >
              {stats.avatar ? (
                <img src={stats.avatar} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <User size={16} className="text-gray-500" />
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="pt-24 px-4 max-w-6xl mx-auto min-h-[calc(100vh-80px)]">
        
        {activeTask ? (
          <DailyChallenge 
            forcedType={activeTask}
            onComplete={handleChallengeComplete} 
            onCancel={() => setActiveTask(null)}
            streak={stats.streak}
            apiKey={apiKey}
          />
        ) : (
          <>
            {activeTab === 'dashboard' && renderDashboard()}
            {activeTab === 'profile' && renderProfile()}
            
            {activeTab === 'history' && (
              <div className="animate-fade-in pb-10">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                    <h2 className="text-2xl font-serif text-white">訓練歷程</h2>
                    
                    {/* Filter Bar */}
                    <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto pb-2 md:pb-0">
                        <Filter size={16} className="text-gray-500 mr-1" />
                        <button onClick={() => setHistoryFilter('ALL')} className={`px-3 py-1 rounded-full text-xs whitespace-nowrap border ${historyFilter === 'ALL' ? 'bg-aesthetic-gold text-black border-aesthetic-gold' : 'text-gray-400 border-white/10'}`}>全部</button>
                        <button onClick={() => setHistoryFilter('ERRORS')} className={`px-3 py-1 rounded-full text-xs whitespace-nowrap border ${historyFilter === 'ERRORS' ? 'bg-red-500/20 text-red-400 border-red-500/50' : 'text-gray-400 border-white/10'}`}>低分/錯題</button>
                        <button onClick={() => setHistoryFilter('MCQ')} className={`px-3 py-1 rounded-full text-xs whitespace-nowrap border ${historyFilter === 'MCQ' ? 'bg-blue-500/20 text-blue-400 border-blue-500/50' : 'text-gray-400 border-white/10'}`}>快問快答</button>
                        <button onClick={() => setHistoryFilter('OBSERVATION')} className={`px-3 py-1 rounded-full text-xs whitespace-nowrap border ${historyFilter === 'OBSERVATION' ? 'bg-green-500/20 text-green-400 border-green-500/50' : 'text-gray-400 border-white/10'}`}>觀察分析</button>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredHistory.length === 0 ? (
                    <div className="col-span-full flex flex-col items-center justify-center py-20 text-gray-500 border border-dashed border-white/10 rounded-xl">
                      <Brain size={48} className="mb-4 opacity-50" />
                      <p>沒有符合條件的訓練紀錄。</p>
                    </div>
                  ) : (
                    filteredHistory.map((item) => (
                      <div key={item.id} className="bg-[#1a1a1a] rounded-xl overflow-hidden border border-white/5 hover:border-aesthetic-gold/50 transition-all hover:shadow-lg hover:shadow-aesthetic-gold/5 group">
                        <div className="h-48 overflow-hidden relative bg-black flex items-center justify-center">
                          {item.challenge.generatedImageUrl ? (
                            <img 
                              src={item.challenge.generatedImageUrl} 
                              alt="History" 
                              className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-all duration-500 group-hover:scale-105"
                            />
                          ) : (
                            <div className="text-gray-700 flex flex-col items-center">
                                <ImageOff size={24} className="mb-1" />
                                <span className="text-[10px]">Image Expired</span>
                            </div>
                          )}
                          <div className={`absolute top-2 right-2 px-3 py-1 rounded-full border z-10 font-bold text-sm backdrop-blur ${item.assessment.score >= 60 ? 'bg-black/80 border-aesthetic-gold/30 text-aesthetic-gold' : 'bg-red-900/80 border-red-500/30 text-red-400'}`}>
                            {item.assessment.score}
                          </div>
                          <div className="absolute bottom-2 right-2 bg-black/60 backdrop-blur px-2 py-0.5 rounded text-[10px] text-blue-300 z-10">
                             +{item.xpGained} XP
                          </div>
                        </div>
                        <div className="p-5">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-[10px] font-bold bg-white/10 px-2 py-0.5 rounded text-gray-400 uppercase tracking-wide">
                              {item.challenge.category}
                            </span>
                            <span className="text-[10px] text-gray-600">
                              {new Date(item.date).toLocaleDateString()}
                            </span>
                          </div>
                          <h4 className="font-serif text-lg leading-tight mb-3 line-clamp-2 min-h-[3rem]">
                            {item.challenge.question}
                          </h4>
                          <p className="text-sm text-gray-400 line-clamp-2 mb-4 h-10">
                            {typeof item.assessment.feedback === 'string' ? item.assessment.feedback : 'No feedback'}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </main>
      
      {/* Mobile Bottom Navigation */}
      {!activeTask && (
        <nav className="md:hidden fixed bottom-0 w-full bg-[#121212]/95 backdrop-blur-xl border-t border-white/10 z-50 safe-area-bottom">
          <div className="flex justify-around items-center h-16">
            <button 
              onClick={() => setActiveTab('dashboard')}
              className={`flex flex-col items-center gap-1 ${activeTab === 'dashboard' ? 'text-aesthetic-gold' : 'text-gray-500'}`}
            >
              <Layout size={20} />
              <span className="text-[10px]">訓練</span>
            </button>
            <button 
              onClick={() => setActiveTab('history')}
              className={`flex flex-col items-center gap-1 ${activeTab === 'history' ? 'text-aesthetic-gold' : 'text-gray-500'}`}
            >
              <HistoryIcon size={20} />
              <span className="text-[10px]">歷程</span>
            </button>
            <button 
              onClick={() => setActiveTab('profile')}
              className={`flex flex-col items-center gap-1 ${activeTab === 'profile' ? 'text-aesthetic-gold' : 'text-gray-500'}`}
            >
              <User size={20} />
              <span className="text-[10px]">我的</span>
            </button>
          </div>
        </nav>
      )}
    </div>
  );
};

export default App;
