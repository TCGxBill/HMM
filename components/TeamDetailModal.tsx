import React from 'react';
import { Team } from '../types';
import { useContest } from '../context/ContestContext';
import { useTranslation } from '../context/LanguageContext';
import { CloseIcon } from './Icons';

interface TeamDetailModalProps {
  team: Team | null;
  onClose: () => void;
}

export const TeamDetailModal: React.FC<TeamDetailModalProps> = ({ team, onClose }) => {
  const { tasks } = useContest();
  const { t } = useTranslation();

  if (!team) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex justify-center items-center z-50 font-sans" onClick={onClose}>
      <div className="bg-contest-dark-light rounded-xl shadow-2xl p-6 w-full max-w-2xl mx-4" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-white">{t('teamDetailTitle', { teamName: team.name })}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <CloseIcon className="w-6 h-6" />
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 text-center">
            <div className="bg-contest-dark p-4 rounded-lg">
                <p className="text-sm text-gray-400">{t('rank')}</p>
                <p className="text-2xl font-bold text-white">{team.rank}</p>
            </div>
            <div className="bg-contest-dark p-4 rounded-lg">
                <p className="text-sm text-gray-400">{t('solved')}</p>
                <p className="text-2xl font-bold text-white">{team.solved}</p>
            </div>
            <div className="bg-contest-dark p-4 rounded-lg">
                <p className="text-sm text-gray-400">{t('totalScore')}</p>
                <p className="text-2xl font-bold text-white">{team.totalScore.toFixed(1)}</p>
            </div>
        </div>
        <div>
            <h3 className="text-xl font-semibold text-white mb-3">{t('mySubmissionHistory')}</h3>
            <div className="overflow-x-auto">
                <table className="min-w-full text-sm text-left text-gray-300">
                    <thead className="text-xs text-white uppercase bg-gray-900/50">
                        <tr>
                            <th scope="col" className="py-3 px-6">Task</th>
                            <th scope="col" className="py-3 px-4 text-center">{t('bestScore')}</th>
                            <th scope="col" className="py-3 px-4 text-center">{t('attempts')}</th>
                            <th scope="col" className="py-3 px-4 text-center">Is Best?</th>
                        </tr>
                    </thead>
                    <tbody>
                        {tasks.map(task => {
                            const submission = team.submissions.find(s => s.taskId === task.id);
                            const bestSubmissionsForTask = team.submissions
                                .filter(s => s.taskId === task.id && s.score !== null)
                                .sort((a, b) => b.score! - a.score!);
                            const bestScore = bestSubmissionsForTask.length > 0 ? bestSubmissionsForTask[0].score : null;

                            return (
                                <tr key={task.id} className="border-b border-contest-gray">
                                    <td className="py-3 px-6 font-semibold">{task.name}</td>
                                    <td className="py-3 px-4 text-center">{submission?.score?.toFixed(1) ?? '-'}</td>
                                    <td className="py-3 px-4 text-center">{submission?.attempts ?? 0}</td>
                                    <td className={`py-3 px-4 text-center font-bold ${submission?.score === bestScore && bestScore !== null ? 'text-contest-green' : 'text-gray-500'}`}>
                                        {submission?.score === bestScore && bestScore !== null ? 'Yes' : 'No'}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
      </div>
    </div>
  );
};
