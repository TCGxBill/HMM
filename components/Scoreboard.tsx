import React from 'react';
import { useContest } from '../context/ContestContext';
import { useTranslation } from '../context/LanguageContext';
import { Team, Submission } from '../types';
import { SparkleIcon } from './Icons';

interface ScoreboardProps {
  onTeamSelect: (team: Team) => void;
  onAnalyzeTeam: (team: Team) => void;
}

export const Scoreboard: React.FC<ScoreboardProps> = ({ onTeamSelect, onAnalyzeTeam }) => {
  const { teams, tasks } = useContest();
  const { t } = useTranslation();

  // FIX: Changed teamId from number to string to match the Team.id type.
  const getSubmissionStatus = (submission: Submission | undefined, teamId: string, taskId: string) => {
    const key = `${teamId}-${taskId}`;

    if (!submission) {
      return <td key={key} className="py-3 px-4 text-center align-middle">-</td>;
    }
    
    const flashClass = submission.recentlyUpdated ? 'animate-flash' : '';
    
    if (submission.score !== null) {
      let bgColor = 'bg-green-500/30';
      if(submission.isBestScore) bgColor = 'bg-green-500/80';
      
      return (
        <td key={key} className={`py-3 px-4 text-center align-middle font-semibold text-white transition-colors duration-500 ${bgColor} ${flashClass}`}>
          <div className="flex flex-col">
            <span>{submission.score.toFixed(1)}</span>
            <span className="text-xs text-gray-300">({submission.attempts})</span>
          </div>
        </td>
      );
    }
    
    if (submission.attempts > 0) {
      return (
        <td key={key} className={`py-3 px-4 text-center align-middle font-semibold text-white bg-red-500/50 ${flashClass}`}>
          <div className="flex flex-col">
            <span>-</span>
            <span className="text-xs text-gray-300">({submission.attempts})</span>
          </div>
        </td>
      );
    }
    
    return <td key={key} className="py-3 px-4 text-center align-middle">-</td>;
  };

  const handleAnalyzeClick = (e: React.MouseEvent, team: Team) => {
    e.stopPropagation(); // Prevent opening the detail modal
    onAnalyzeTeam(team);
  };
  
  const getRankBadge = (rank: number) => {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return `#${rank}`;
  };
  
  const getRankRowClass = (rank: number) => {
    const baseClass = "border-b border-contest-gray hover:bg-contest-gray/50 cursor-pointer transition-all duration-200";
    if (rank === 1) return `${baseClass} bg-contest-gold/10 border-l-4 border-contest-gold`;
    if (rank === 2) return `${baseClass} bg-contest-silver/10 border-l-4 border-contest-silver`;
    if (rank === 3) return `${baseClass} bg-contest-bronze/10 border-l-4 border-contest-bronze`;
    return `${baseClass}`;
  }

  return (
    <div className="font-sans my-8">
      <h1 className="text-3xl md:text-4xl font-bold text-white text-center mb-6">{t('scoreboardTitle')}</h1>
      <div className="overflow-x-auto bg-contest-dark-light rounded-xl shadow-2xl">
        <style>{`
          @keyframes flash {
            0%, 100% { background-color: inherit; }
            50% { background-color: #8B5CF6; } /* contest-secondary */
          }
          .animate-flash {
            animation: flash 1.5s ease-out;
          }
        `}</style>
        <table className="min-w-full text-sm text-left text-gray-300">
          <thead className="text-xs text-white uppercase bg-gray-900/50">
            <tr>
              <th scope="col" className="py-3 px-4 text-center">{t('rank')}</th>
              <th scope="col" className="py-3 px-6">{t('teamName')}</th>
              <th scope="col" className="py-3 px-4 text-center">{t('solved')}</th>
              <th scope="col" className="py-3 px-4 text-center">{t('totalScore')}</th>
              {tasks.map(task => (
                <th key={task.id} scope="col" className="py-3 px-4 text-center">{task.name}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {teams.map((team) => (
              <tr 
                key={team.id} 
                className={getRankRowClass(team.rank)}
                onClick={() => onTeamSelect(team)}
              >
                <td className="py-3 px-4 font-bold text-lg text-center align-middle">{getRankBadge(team.rank)}</td>
                <td className="py-3 px-6 font-semibold align-middle">
                  <div className="flex items-center space-x-2">
                    <span>{team.name}</span>
                    <button
                      onClick={(e) => handleAnalyzeClick(e, team)}
                      className="text-contest-secondary hover:text-purple-400 transition-colors"
                      title={t('analyzePerformance', { teamName: team.name })}
                    >
                      <SparkleIcon className="w-5 h-5" />
                    </button>
                  </div>
                </td>
                <td className="py-3 px-4 text-center font-bold align-middle">{team.solved}</td>
                <td className="py-3 px-4 text-center font-bold align-middle">{team.totalScore.toFixed(1)}</td>
                {tasks.map(task => getSubmissionStatus(team.submissions.find(s => s.taskId === task.id), team.id, task.id))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};