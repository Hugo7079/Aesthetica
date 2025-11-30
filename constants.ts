
import { UserStats, Badge } from "./types";

const getTodayDate = () => new Date().toISOString().split('T')[0];

export const LEVEL_THRESHOLDS = [
  { level: 1, xp: 0, title: "美感學徒" },
  { level: 2, xp: 500, title: "初級觀察者" },
  { level: 3, xp: 1500, title: "藝術鑑賞家" },
  { level: 4, xp: 3500, title: "資深評論員" },
  { level: 5, xp: 6000, title: "美學大師" },
  { level: 6, xp: 10000, title: "視覺哲學家" },
];

// Expanded Badge List
export const ALL_BADGES: Badge[] = [
  // Consistency
  { id: 'first_step', name: "初試啼聲", description: "完成你的第一個美感訓練任務", iconType: "sprout" },
  { id: 'streak_3', name: "堅持不懈", description: "連續 3 天進行訓練", iconType: "flame" },
  { id: 'streak_7', name: "美感習慣", description: "連續 7 天進行訓練", iconType: "zap" },
  { id: 'streak_30', name: "美學生活", description: "連續 30 天不間斷的堅持", iconType: "crown" },
  
  // Time & Speed
  { id: 'early_bird', name: "晨型美學", description: "在早上 6:00 - 9:00 間完成訓練", iconType: "sun" },
  { id: 'night_owl', name: "深夜靈感", description: "在晚上 22:00 - 02:00 間完成訓練", iconType: "moon" },
  { id: 'speed_demon', name: "直覺反應", description: "在 5 秒內正確回答選擇題", iconType: "timer" },

  // Skill & Performance
  { id: 'perfect_10', name: "神射手", description: "在單日快問快答中全部完成且高分", iconType: "crosshair" },
  { id: 'analyst', name: "深度思考", description: "完成一次每週深度講評", iconType: "microscope" },
  { id: 'sharpshooter', name: "精準眼光", description: "連續 5 次獲得 100 分評價", iconType: "star" },
  { id: 'resilient', name: "愈挫愈勇", description: "在不及格後立即獲得 90 分以上", iconType: "heart" },

  // Breadth
  { id: 'explorer', name: "探索者", description: "嘗試過 3 種不同的美感類別", iconType: "mountain" },
  { id: 'polymath', name: "全能視角", description: "完成過所有類別的挑戰", iconType: "palette" },
  { id: 'veteran', name: "身經百戰", description: "累計完成 100 個訓練任務", iconType: "book" },
];

export const INITIAL_STATS: UserStats = {
  username: "美感學徒", // Default name
  avatar: null, // Default avatar
  lastStreakDate: '', // Initial empty streak date
  streak: 0,
  totalTasks: 0,
  averageScore: 0,
  xp: 0,
  level: 1,
  badges: [],
  scoresHistory: [],
  dailyProgress: {
    lastDate: getTodayDate(),
    mcqCount: 0,
    observationDone: false,
    lastWeeklyAnalysisDate: '',
  }
};

/**
 * Dynamic Greeting Engine
 */
export const getDynamicGreeting = (stats: UserStats): string => {
  const now = new Date();
  const hour = now.getHours();
  const today = getTodayDate();
  const lastDate = stats.dailyProgress.lastDate;
  
  // Use username in greeting occasionally
  const name = stats.username || "你";

  const diffTime = Math.abs(new Date(today).getTime() - new Date(lastDate).getTime());
  const daysSinceLastLogin = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 

  // 1. Guilt Trip / Provocation
  if (daysSinceLastLogin > 7) {
    return `${name}，我還以為你已經放棄了對美的追求。`;
  }
  if (daysSinceLastLogin > 2 && daysSinceLastLogin <= 7) {
    return `美感是會生鏽的，${name}。你消失太久了。`;
  }

  // 2. High Streak Praise
  if (stats.streak >= 7) {
    return `你的眼光越來越銳利了，${name}。保持下去。`;
  }
  
  // 3. Time of Day Context
  if (hour < 5) {
    return "深夜的靈感最迷人，但也要注意休息。";
  }
  if (hour < 11) {
    return `早安，${name}。準備好用美感開啟這一天了嗎？`;
  }
  if (hour < 14) {
    return `午安，${name}。在忙碌中，也別忘了觀察四周。`;
  }
  if (hour < 18) {
    return "午後的光影最適合練習觀察。";
  }
  
  return `歡迎回來，${name}。今天想訓練什麼？`;
};
