
import React from 'react';
import { useContest } from '../context/ContestContext';
import { TeamDetailModal } from './TeamDetailModal';
import { Team, Task, Submission } from '../types';

interface ScoreboardProps {
  onTeamSelect: (team: Team) => void;
}

export const Scoreboard: React.FC<ScoreboardProps> = ({ onTeamSelect }) => {
  const { teams, tasks } = useContest();

  const getSubmissionStatus = (submission: Submission | undefined, teamId: number, taskId: string) => {
    const key = `${teamId}-${taskId}`;

    if (!submission) {
      return <td key={key} className="py-3 px-4 text-center align-middle">-</td>;
    }
    
    // FIX: Add null check for recentlyUpdated
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

  return (
    <div className="font-sans my-8">
      <h1 className="text-3xl md:text-4xl font-bold text-white text-center mb-6">Live Scoreboard</h1>
      <div className="overflow-x-auto bg-contest-dark-light rounded-lg shadow-2xl">
        <style>{`
          @keyframes flash {
            0%, 100% { background-color: inherit; }
            50% { background-color: #6b46c1; } /* contest-purple */
          }
          .animate-flash {
            animation: flash 1.5s ease-out;
          }
        `}</style>
        <table className="min-w-full text-sm text-left text-gray-300">
          <thead className="text-xs text-white uppercase bg-gray-800">
            <tr>
              <th scope="col" className="py-3 px-4 text-center">Rank</th>
              <th scope="col" className="py-3 px-6">Team Name</th>
              <th scope="col" className="py-3 px-4 text-center">Solved</th>
              <th scope="col" className="py-3 px-4 text-center">Total Score</th>
              {tasks.map(task => (
                <th key={task.id} scope="col" className="py-3 px-4 text-center">{task.name}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {teams.map((team) => (
              <tr 
                key={team.id} 
                className="border-b border-contest-gray hover:bg-contest-gray/50 cursor-pointer"
                onClick={() => onTeamSelect(team)}
              >
                <td className="py-3 px-4 font-bold text-lg text-center align-middle">{team.rank}</td>
                <td className="py-3 px-6 font-semibold align-middle">{team.name}</td>
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