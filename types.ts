
export enum TaskType {
  MULTIPLE_CHOICE = 'MULTIPLE_CHOICE', // Select the best fit
  OBSERVATION = 'OBSERVATION', // Describe what you see
  ANALYSIS = 'ANALYSIS', // Deep dive essay
}

export enum Category {
  COMPOSITION = '構圖',
  COLOR_THEORY = '色彩學',
  FASHION = '時尚穿搭',
  NATURE = '自然景觀',
  EMOTION = '情感氛圍',
  DESIGN = '平面設計',
  CINEMATOGRAPHY = '電影運鏡'
}

export interface Challenge {
  id: string;
  category: Category;
  type: TaskType;
  question: string;
  options?: string[]; // For multiple choice
  optionScores?: number[]; // Weighted scores for each option [100, 50, 20, 0]
  correctOptionIndex?: number; // For multiple choice (AI's opinion)
  imagePrompt: string; // The prompt used to generate the visual
  generatedImageUrl?: string; // The base64 or url of the image
  contextDescription: string; // Internal context for the AI teacher
}

export interface AssessmentResult {
  score: number; // 0-100
  feedback: string;
  strengths: string[];
  improvements: string[];
  correctOptionIndex?: number; // Only for MCQ to show the right answer
}

export interface UserHistoryItem {
  id: string;
  date: string;
  challenge: Challenge;
  userAnswer: string;
  assessment: AssessmentResult;
  xpGained: number;
}

export interface DailyProgress {
  lastDate: string; // YYYY-MM-DD
  mcqCount: number; // Max 10
  observationDone: boolean; // Max 1
  lastWeeklyAnalysisDate: string; // ISO string
}

// Added more icons for new badges
export type BadgeIconType = 'sprout' | 'flame' | 'zap' | 'crosshair' | 'microscope' | 'crown' | 'sun' | 'moon' | 'timer' | 'palette' | 'mountain' | 'book' | 'heart' | 'star';

// Expanded Badge IDs
export type BadgeId = 
  | 'first_step' 
  | 'streak_3' 
  | 'streak_7' 
  | 'streak_30'
  | 'perfect_10' 
  | 'analyst' 
  | 'early_bird'     // Morning login
  | 'night_owl'      // Late night login
  | 'speed_demon'    // Answer MCQ in < 5s
  | 'explorer'       // Try 3 different categories
  | 'polymath'       // Try all categories
  | 'resilient'      // Get <40 then >90 next time
  | 'veteran'        // Total 100 tasks
  | 'sharpshooter';  // 5 perfect scores in a row

export interface Badge {
  id: BadgeId;
  name: string;
  description: string;
  iconType: BadgeIconType;
  unlockedAt?: string; // ISO Date
}

export interface UserStats {
  username: string; // New: Personalized Name
  avatar: string | null; // New: Base64 string of user avatar (small size)
  lastStreakDate: string; // New: Specifically track streak updates separately from daily reset
  streak: number;
  totalTasks: number;
  averageScore: number;
  xp: number;
  level: number;
  badges: Badge[];
  scoresHistory: { date: string; score: number }[];
  dailyProgress: DailyProgress;
}

// Global declaration for Speech Recognition
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}
