
export interface SubmissionAttempt {
  score: number;
  timestamp: number; // e.g., Date.now()
}

export interface Submission {
  taskId: string;
  score: number | null;
  attempts: number;
  isBestScore: boolean;
  history: SubmissionAttempt[];
  recentlyUpdated?: boolean; // For UI flash effect
}

export interface Team {
  id: string;
  rank: number;
  name: string;
  solved: number;
  totalScore: number;
  submissions: Submission[];
  lastSolveTimestamp?: number; // Timestamp for tie-breaking
  // This will hold the original API user ID for updates
  apiUserId?: string; 
}

export interface Task {
  id: string;
  name: string;
  keyVisibility: 'public' | 'private';
  keyUploaded: boolean;
}

export interface ChatMessage {
  sender: 'user' | 'bot';
  text: string;
}

export interface User {
  id: string;
  username: string;
  email: string;
  password?: string; // Optional because we don't store it in the context after login
  role: 'admin' | 'contestant';
  teamName: string;
  // Properties from student API record
  bestScore?: number;
  submissions?: any[]; // Allow for old and new submission types during transition
}

export type ToastType = 'success' | 'error' | 'info';

export interface ToastMessage {
  id: number;
  message: string;
  type: ToastType;
}

export type ContestStatus = 'Not Started' | 'Live' | 'Finished';