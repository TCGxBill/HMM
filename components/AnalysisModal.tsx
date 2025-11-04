import React, { useState, useEffect } from 'react';
import { Team } from '../types';
import { getAnalysisForTeam } from '../services/geminiService';
import { useContest } from '../context/ContestContext';
import { useTranslation } from '../context/LanguageContext';
import { CloseIcon, SparkleIcon } from './Icons';

const renderMarkdown = (text: string) => {
    // A simple markdown renderer for bold and newlines
    return text
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\n/g, '<br />');
};

interface AnalysisModalProps {
  team: Team | null;
  onClose: () => void;
}

export const AnalysisModal: React.FC<AnalysisModalProps> = ({ team, onClose }) => {
  const { tasks } = useContest();
  const { t } = useTranslation();
  const [isLoading, setIsLoading] = useState(false);
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (team) {
      const fetchAnalysis = async () => {
        setIsLoading(true);
        setAnalysis(null);
        setError(null);
        try {
          const result = await getAnalysisForTeam(team, tasks);
          setAnalysis(result);
        } catch (err) {
          setError(t('error.getAnalysis'));
          console.error(err);
        } finally {
          setIsLoading(false);
        }
      };
      fetchAnalysis();
    }
  }, [team, tasks, t]);

  if (!team) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex justify-center items-center z-50 font-sans" onClick={onClose}>
      <div className="bg-contest-dark-light rounded-xl shadow-2xl p-6 w-full max-w-2xl mx-4 max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4 pb-4 border-b border-contest-gray flex-shrink-0">
          <h2 className="text-2xl font-bold text-white flex items-center space-x-3">
            <SparkleIcon className="w-6 h-6 text-contest-secondary" />
            <span>{t('analysisTitle', { teamName: team.name })}</span>
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <CloseIcon className="w-6 h-6" />
          </button>
        </div>
        <div className="overflow-y-auto pr-2 text-gray-300 leading-relaxed">
          {isLoading && (
            <div className="flex flex-col items-center justify-center space-y-4 py-16">
                <div className="w-12 h-12 border-4 border-contest-primary border-t-transparent rounded-full animate-spin"></div>
                <p className="text-gray-300">{t('geminiAnalyzing')}</p>
            </div>
          )}
          {error && <p className="text-contest-red text-center">{error}</p>}
          {analysis && (
            <div className="prose prose-invert" dangerouslySetInnerHTML={{ __html: renderMarkdown(analysis) }}></div>
          )}
        </div>
        <div className="mt-4 pt-4 border-t border-contest-gray text-center text-xs text-gray-500 flex-shrink-0">
            {t('poweredByGemini')}
        </div>
      </div>
    </div>
  );
};
