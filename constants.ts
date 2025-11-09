import { Team, Task } from './types';

export const mockTasks: Task[] = Array.from({ length: 8 }, (_, i) => ({
  id: `T${i + 1}`,
  name: `Task ${String.fromCharCode(65 + i)}`,
  keyVisibility: 'private',
  keyUploaded: false,
}));

// This mock data is now only a fallback if the API fails.
export const mockTeams: Team[] = [
  {
    id: "1",
    rank: 1,
    name: "NLP Wizards",
    solved: 5,
    totalScore: 425.5,
    // FIX: Added missing 'history' property to all submissions to satisfy the Submission type.
    submissions: [
      { taskId: "T1", score: 95.5, attempts: 1, isBestScore: true, history: [] },
      { taskId: "T2", score: 88.0, attempts: 2, isBestScore: false, history: [] },
      { taskId: "T3", score: 92.0, attempts: 1, isBestScore: true, history: [] },
      { taskId: "T4", score: 75.0, attempts: 3, isBestScore: false, history: [] },
      { taskId: "T5", score: 75.0, attempts: 1, isBestScore: false, history: [] },
      { taskId: "T6", score: null, attempts: 0, isBestScore: false, history: [] },
      { taskId: "T7", score: null, attempts: 0, isBestScore: false, history: [] },
      { taskId: "T8", score: null, attempts: 0, isBestScore: false, history: [] },
    ],
  },
  {
    id: "2",
    rank: 2,
    name: "Syntax Strikers",
    solved: 5,
    totalScore: 410.8,
    // FIX: Added missing 'history' property to all submissions to satisfy the Submission type.
    submissions: [
      { taskId: "T1", score: 92.3, attempts: 2, isBestScore: false, history: [] },
      { taskId: "T2", score: 91.5, attempts: 1, isBestScore: true, history: [] },
      { taskId: "T3", score: 85.0, attempts: 1, isBestScore: false, history: [] },
      { taskId: "T4", score: 82.0, attempts: 2, isBestScore: true, history: [] },
      { taskId: "T5", score: 60.0, attempts: 4, isBestScore: false, history: [] },
      { taskId: "T6", score: null, attempts: 2, isBestScore: false, history: [] },
      { taskId: "T7", score: null, attempts: 0, isBestScore: false, history: [] },
      { taskId: "T8", score: null, attempts: 0, isBestScore: false, history: [] },
    ],
  },
    {
    id: "3",
    rank: 3,
    name: "Lexical Legends",
    solved: 4,
    totalScore: 345.0,
    // FIX: Added missing 'history' property to all submissions to satisfy the Submission type.
    submissions: [
      { taskId: "T1", score: 89.0, attempts: 1, isBestScore: false, history: [] },
      { taskId: "T2", score: 85.5, attempts: 2, isBestScore: false, history: [] },
      { taskId: "T3", score: 88.5, attempts: 3, isBestScore: false, history: [] },
      { taskId: "T4", score: 82.0, attempts: 1, isBestScore: true, history: [] },
      { taskId: "T5", score: null, attempts: 1, isBestScore: false, history: [] },
      { taskId: "T6", score: null, attempts: 0, isBestScore: false, history: [] },
      { taskId: "T7", score: null, attempts: 0, isBestScore: false, history: [] },
      { taskId: "T8", score: null, attempts: 0, isBestScore: false, history: [] },
    ],
  },
];