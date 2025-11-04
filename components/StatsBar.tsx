import React from 'react';
import { ContestStatus } from '../types';
import { ClockIcon, ClipboardListIcon, StarIcon, CalculatorIcon } from './Icons';

interface StatsBarProps {
  status: ContestStatus;
  totalSubmissions: number;
  highestScore: number;
  avgAttempts: number;
}

const StatCard: React.FC<{ icon: React.ReactNode; label: string; value: string | number; color: string }> = ({ icon, label, value, color }) => (
    <div className="bg-contest-dark-light rounded-xl p-6 flex items-center space-x-4 shadow-lg">
        <div className={`p-3 rounded-full ${color}`}>
            {icon}
        </div>
        <div>
            <p className="text-sm text-gray-400">{label}</p>
            <p className="text-2xl font-bold text-white">{value}</p>
        </div>
    </div>
);

export const StatsBar: React.FC<StatsBarProps> = ({ status, totalSubmissions, highestScore, avgAttempts }) => {
  const statusColor = status === 'Live' ? 'bg-contest-green' : status === 'Finished' ? 'bg-contest-red' : 'bg-contest-gray';
  return (
    <div className="my-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatCard 
                icon={<ClockIcon className="w-6 h-6 text-white"/>} 
                label="Contest Status"
                value={status}
                color={statusColor}
            />
            <StatCard 
                icon={<ClipboardListIcon className="w-6 h-6 text-white"/>} 
                label="Total Submissions"
                value={totalSubmissions}
                color="bg-contest-primary"
            />
            <StatCard 
                icon={<StarIcon className="w-6 h-6 text-white"/>} 
                label="Highest Score"
                value={highestScore.toFixed(1)}
                color="bg-contest-secondary"
            />
            <StatCard 
                icon={<CalculatorIcon className="w-6 h-6 text-white"/>} 
                label="Avg Attempts / Solved"
                value={avgAttempts.toFixed(2)}
                color="bg-contest-yellow"
            />
        </div>
    </div>
  );
};