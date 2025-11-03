
export interface Submission {
  taskId: string;
  score: number | null;
  attempts: number;
  isBestScore: boolean;
  recentlyUpdated?: boolean; // For UI flash effect
}

export interface Team {
  id: number;
  rank: number;
  name: string;
  solved: number;
  totalScore: number;
  submissions: Submission[];
}

export interface Task {
  id: string;
  name: string;
}

export interface ChatMessage {
  sender: 'user' | 'bot';
  text: string;
}

export interface User {
  username: string;
  role: 'admin' | 'contestant';
  teamId: number | null;
}

export type ToastType = 'success' | 'error' | 'info';

export interface ToastMessage {
  id: number;
  message: string;
  type: ToastType;
}

export type ContestStatus = 'Not Started' | 'Live' | 'Finished';