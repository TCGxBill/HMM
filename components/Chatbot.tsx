import React, { useState, useRef, useEffect, useCallback } from 'react';
import { getBotResponse } from '../services/geminiService';
import { useTranslation } from '../context/LanguageContext';
import { ChatMessage } from '../types';
import { ChatIcon, CloseIcon, SendIcon } from './Icons';
import type { Chat } from '@google/genai';

export const Chatbot: React.FC = () => {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    { sender: 'bot', text: t('chatbotWelcome') }
  ]);
  const [userInput, setUserInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const chatSessionRef = useRef<Chat | null>(null);

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages]);
  
  // Reset welcome message if language changes
  useEffect(() => {
    setMessages([{ sender: 'bot', text: t('chatbotWelcome') }]);
    chatSessionRef.current = null; // Invalidate chat session to re-initialize with new system prompt if needed
  }, [t]);

  const handleSendMessage = useCallback(async () => {
    if (userInput.trim() === '' || isLoading) return;

    const userMessage: ChatMessage = { sender: 'user', text: userInput };
    setMessages(prev => [...prev, userMessage]);
    setUserInput('');
    setIsLoading(true);

    try {
      const response = await getBotResponse(chatSessionRef, userInput);
      const botMessage: ChatMessage = { sender: 'bot', text: response };
      setMessages(prev => [...prev, botMessage]);
    } catch (error) {
      console.error("Gemini API error:", error);
      const errorMessage: ChatMessage = { sender: 'bot', text: t('error.getBotResponse') };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  }, [userInput, isLoading, t]);

  const toggleChat = () => setIsOpen(prev => !prev);

  return (
    <>
      <button
        onClick={toggleChat}
        className="fixed bottom-6 right-6 bg-contest-primary text-white p-4 rounded-full shadow-lg hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-opacity-50 transition-transform transform hover:scale-110"
        aria-label="Toggle Chat"
      >
        {isOpen ? <CloseIcon className="h-6 w-6" /> : <ChatIcon className="h-6 w-6" />}
      </button>

      {isOpen && (
        <div className="fixed bottom-24 right-6 w-full max-w-sm h-[60vh] bg-contest-dark-light rounded-xl shadow-2xl flex flex-col transition-all duration-300 ease-in-out">
          <div className="bg-gray-900/50 p-4 text-white font-bold rounded-t-xl">
            {t('chatbotTitle')}
          </div>
          <div ref={chatContainerRef} className="flex-1 p-4 overflow-y-auto space-y-4">
            {messages.map((msg, index) => (
              <div key={index} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] p-3 rounded-lg ${msg.sender === 'user' ? 'bg-contest-primary text-white' : 'bg-contest-gray text-white'}`}>
                  <p className="text-sm">{msg.text}</p>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                  <div className="max-w-[80%] p-3 rounded-lg bg-contest-gray text-white">
                      <div className="flex items-center space-x-2">
                          <div className="w-2 h-2 bg-white rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                          <div className="w-2 h-2 bg-white rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                          <div className="w-2 h-2 bg-white rounded-full animate-bounce"></div>
                      </div>
                  </div>
              </div>
            )}
          </div>
          <div className="p-4 border-t border-contest-gray">
            <div className="flex items-center space-x-2">
              <input
                type="text"
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                placeholder={t('chatbotPlaceholder')}
                className="flex-1 bg-contest-dark border border-contest-gray rounded-full px-4 py-2 text-white placeholder-contest-light-gray focus:outline-none focus:ring-2 focus:ring-contest-primary"
                disabled={isLoading}
              />
              <button
                onClick={handleSendMessage}
                disabled={isLoading || userInput.trim() === ''}
                className="bg-contest-primary text-white p-2 rounded-full hover:bg-indigo-500 disabled:bg-contest-gray disabled:cursor-not-allowed transition-colors"
                aria-label="Send Message"
              >
                <SendIcon className="h-5 w-5"/>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
