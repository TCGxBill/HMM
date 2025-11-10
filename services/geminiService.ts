import { GoogleGenAI } from "@google/genai";
import type { Chat } from '@google/genai';
import type { MutableRefObject } from 'react';
import { Team, Task } from '../types';

const CHAT_MODEL_NAME = "gemini-2.5-flash";
const ANALYSIS_MODEL_NAME = "gemini-2.5-pro";

let ai: GoogleGenAI | null = null;

const getAiInstance = (): GoogleGenAI => {
  if (!ai) {
    if (!import.meta.env.VITE_API_KEY) {
      throw new Error("VITE_API_KEY environment variable not set");
    }
    ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_API_KEY });
  }
  return ai;
};

const initializeChat = (chatSessionRef: MutableRefObject<Chat | null>) => {
  const genAI = getAiInstance();
  chatSessionRef.current = genAI.chats.create({
    model: CHAT_MODEL_NAME,
    config: {
        systemInstruction: "You are a helpful assistant for a programming competition. Your name is Codey. You should be friendly and provide concise answers related to programming concepts, machine learning models, Python libraries like PyTorch or TensorFlow, and general competition strategies. Do not provide direct solutions to the tasks.",
    },
  });
};

export const getBotResponse = async (
  chatSessionRef: MutableRefObject<Chat | null>,
  message: string
): Promise<string> => {
  try {
    if (!chatSessionRef.current) {
      initializeChat(chatSessionRef);
    }
    
    if(!chatSessionRef.current) {
        throw new Error("Chat session could not be initialized.");
    }

    const result = await chatSessionRef.current.sendMessage({ message: message });
    return result.text;
  } catch (error) {
    console.error("Error getting bot response:", error);
    // Invalidate session on error in case it's a session-related issue
    chatSessionRef.current = null; 
    return "There was an error communicating with the AI. Please try sending your message again.";
  }
};

export const getAnalysisForTeam = async (team: Team, tasks: Task[]): Promise<string> => {
    try {
        const genAI = getAiInstance();

        const taskMap = tasks.reduce((acc, task) => {
            acc[task.id] = task.name;
            return acc;
        }, {} as { [key: string]: string });

        const submissionsSummary = team.submissions.map(sub => {
            const taskName = taskMap[sub.taskId] || sub.taskId;
            return `- Task: ${taskName}, Score: ${sub.score?.toFixed(1) ?? 'N/A'}, Attempts: ${sub.attempts}, Best Score for this Task: ${sub.isBestScore ? 'Yes' : 'No'}`;
        }).join('\n');

        const prompt = `
            You are an expert programming contest coach providing analysis for a team in a programming competition.
            The team's performance data is provided below. Analyze their performance and provide structured, insightful feedback in Markdown format.
            Be encouraging but also provide concrete, actionable advice.

            **Team Data:**
            - Name: ${team.name}
            - Current Rank: ${team.rank}
            - Total Score: ${team.totalScore.toFixed(1)}
            - Problems Solved: ${team.solved}

            **Submissions Details:**
            ${submissionsSummary}

            **Your Task:**
            Generate a performance analysis in Markdown with the following sections:
            1.  **Overall Summary:** A brief, high-level overview of their performance.
            2.  **Key Strengths:** What did they do well? (e.g., strong performance on specific tasks, efficiency).
            3.  **Areas for Improvement:** Where can they improve? (e.g., tasks with low scores or high attempts, potential gaps in knowledge).
            4.  **Strategic Advice:** Concrete suggestions for the remainder of the contest (e.g., which problems to focus on, debugging strategies, time management).

            Keep the analysis concise and easy to read. Use Markdown for formatting (e.g., **bold** for emphasis).
        `;

        const response = await genAI.models.generateContent({
            model: ANALYSIS_MODEL_NAME,
            contents: prompt,
        });

        return response.text;
    } catch (error) {
        console.error("Error getting team analysis:", error);
        return "### Analysis Error\n\nThere was an error generating the performance analysis. This could be due to a network issue or an API error. Please try again in a moment.";
    }
};