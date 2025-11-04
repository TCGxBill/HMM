import React from 'react';
import { Team } from '../types';

interface ScoreChartProps {
  teams: Team[];
}

export const ScoreChart: React.FC<ScoreChartProps> = ({ teams }) => {
  const topTeams = [...teams]
    .sort((a, b) => b.totalScore - a.totalScore)
    .slice(0, 5);

  const maxScore = topTeams.length > 0 ? Math.max(...topTeams.map(t => t.totalScore), 100) : 100;

  const colorPalette = [
    'bg-contest-primary',
    'bg-contest-secondary',
    'bg-contest-green',
    'bg-contest-yellow',
    'bg-contest-red',
  ];

  return (
    <div className="bg-contest-dark-light p-6 rounded-xl shadow-2xl mt-8">
      <h2 className="text-xl font-bold text-white mb-6 text-center">Top 5 Teams</h2>
      <div className="space-y-4">
        {topTeams.map((team, index) => (
          <div key={team.id} className="flex items-center space-x-4">
            <span className="font-bold text-gray-300 w-6 text-right">{index + 1}.</span>
            <span className="text-white font-semibold w-40 truncate">{team.name}</span>
            <div className="flex-1 bg-contest-dark rounded-full h-6">
              <div
                className={`${colorPalette[index % colorPalette.length]} h-6 rounded-full flex items-center justify-end pr-2 text-white font-bold text-sm transition-all duration-500 ease-out`}
                style={{ width: `${(team.totalScore / maxScore) * 100}%` }}
              >
                {team.totalScore.toFixed(1)}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};