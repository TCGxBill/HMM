
import React, { useState, useEffect } from 'react';
import { Team } from '../types';
import { CloseIcon } from './Icons';

interface TeamEditModalProps {
  team: Team | null;
  onSave: (team: Team) => void;
  onClose: () => void;
}

export const TeamEditModal: React.FC<TeamEditModalProps> = ({ team, onSave, onClose }) => {
  const [teamName, setTeamName] = useState('');

  useEffect(() => {
    if (team) {
      setTeamName(team.name);
    } else {
      setTeamName('');
    }
  }, [team]);

  if (!team) return null;

  const handleSave = () => {
    onSave({ ...team, name: teamName });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex justify-center items-center z-50 font-sans" onClick={onClose}>
      <div className="bg-contest-dark-light rounded-lg shadow-2xl p-6 w-full max-w-md mx-4" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-white">Edit Team</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <CloseIcon className="w-6 h-6" />
          </button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-bold text-gray-400 block mb-2" htmlFor="teamName">
              Team Name
            </label>
            <input
              id="teamName"
              type="text"
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              className="w-full p-3 bg-contest-dark border border-contest-gray rounded-md text-white focus:outline-none focus:ring-2 focus:ring-contest-blue"
            />
          </div>
          <div className="flex justify-end space-x-2">
            <button onClick={onClose} className="px-4 py-2 bg-contest-gray text-white rounded-md hover:bg-gray-600">Cancel</button>
            <button onClick={handleSave} className="px-4 py-2 bg-contest-blue text-white rounded-md hover:bg-blue-600">Save</button>
          </div>
        </div>
      </div>
    </div>
  );
};