import { GoogleGenAI } from "@google/genai";
import type { Chat } from '@google/genai';
import type { MutableRefObject } from 'react';

const MODEL_NAME = "gemini-2.5-flash";

let ai: GoogleGenAI | null = null;

const getAiInstance = (): GoogleGenAI => {
  if (!ai) {
    if (!process.env.API_KEY) {
      throw new Error("API_KEY environment variable not set");
    }
    ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  }
  return ai;
};

const initializeChat = (chatSessionRef: MutableRefObject<Chat | null>) => {
  const genAI = getAiInstance();
  chatSessionRef.current = genAI.chats.create({
    model: MODEL_NAME,
    config: {
        systemInstruction: "You are a helpful assistant for a Natural Language Processing (NLP) competition. Your name is Codey. You should be friendly and provide concise answers related to NLP concepts, machine learning models, Python libraries like PyTorch or TensorFlow, and general competition strategies. Do not provide direct solutions to the tasks.",
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