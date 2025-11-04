import React from 'react';
import { ContestStatus } from '../types';
import { useTranslation } from '../context/LanguageContext';
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
  const { t } = useTranslation();
  const statusColor = status === 'Live' ? 'bg-contest-green' : status === 'Finished' ? 'bg-contest-red' : 'bg-contest-gray';
  const translatedStatus = t(`status${status.replace(' ', '')}`);
  
  return (
    <div className="my-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatCard 
                icon={<ClockIcon className="w-6 h-6 text-white"/>} 
                label={t('statsStatus')}
                value={translatedStatus}
                color={statusColor}
            />
            <StatCard 
                icon={<ClipboardListIcon className="w-6 h-6 text-white"/>} 
                label={t('statsTotalSubmissions')}
                value={totalSubmissions}
                color="bg-contest-primary"
            />
            <StatCard 
                icon={<StarIcon className="w-6 h-6 text-white"/>} 
                label={t('statsHighestScore')}
                value={highestScore.toFixed(1)}
                color="bg-contest-secondary"
            />
            <StatCard 
                icon={<CalculatorIcon className="w-6 h-6 text-white"/>} 
                label={t('statsAvgAttempts')}
                value={avgAttempts.toFixed(2)}
                color="bg-contest-yellow"
            />
        </div>
    </div>
  );
};
