import { Team, Task } from './types';

export const mockTasks: Task[] = Array.from({ length: 8 }, (_, i) => ({
  id: `T${i + 1}`,
  name: `Task ${String.fromCharCode(65 + i)}`,
}));

export const mockTeams: Team[] = [
  {
    id: 1,
    rank: 1,
    name: "NLP Wizards",
    solved: 5,
    totalScore: 425.5,
    submissions: [
      { taskId: "T1", score: 95.5, attempts: 1, isBestScore: true },
      { taskId: "T2", score: 88.0, attempts: 2, isBestScore: false },
      { taskId: "T3", score: 92.0, attempts: 1, isBestScore: true },
      { taskId: "T4", score: 75.0, attempts: 3, isBestScore: false },
      { taskId: "T5", score: 75.0, attempts: 1, isBestScore: false },
      { taskId: "T6", score: null, attempts: 0, isBestScore: false },
      { taskId: "T7", score: null, attempts: 0, isBestScore: false },
      { taskId: "T8", score: null, attempts: 0, isBestScore: false },
    ],
  },
  {
    id: 2,
    rank: 2,
    name: "Syntax Strikers",
    solved: 5,
    totalScore: 410.8,
    submissions: [
      { taskId: "T1", score: 92.3, attempts: 2, isBestScore: false },
      { taskId: "T2", score: 91.5, attempts: 1, isBestScore: true },
      { taskId: "T3", score: 85.0, attempts: 1, isBestScore: false },
      { taskId: "T4", score: 82.0, attempts: 2, isBestScore: true },
      { taskId: "T5", score: 60.0, attempts: 4, isBestScore: false },
      { taskId: "T6", score: null, attempts: 2, isBestScore: false },
      { taskId: "T7", score: null, attempts: 0, isBestScore: false },
      { taskId: "T8", score: null, attempts: 0, isBestScore: false },
    ],
  },
    {
    id: 3,
    rank: 3,
    name: "Lexical Legends",
    solved: 4,
    totalScore: 345.0,
    submissions: [
      { taskId: "T1", score: 89.0, attempts: 1, isBestScore: false },
      { taskId: "T2", score: 85.5, attempts: 2, isBestScore: false },
      { taskId: "T3", score: 88.5, attempts: 3, isBestScore: false },
      { taskId: "T4", score: 82.0, attempts: 1, isBestScore: true },
      { taskId: "T5", score: null, attempts: 1, isBestScore: false },
      { taskId: "T6", score: null, attempts: 0, isBestScore: false },
      { taskId: "T7", score: null, attempts: 0, isBestScore: false },
      { taskId: "T8", score: null, attempts: 0, isBestScore: false },
    ],
  },
];