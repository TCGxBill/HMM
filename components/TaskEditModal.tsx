
import React, { useState, useEffect } from 'react';
import { Task } from '../types';
import { CloseIcon } from './Icons';

interface TaskEditModalProps {
  task: Task | null;
  onSave: (task: Task) => void;
  onClose: () => void;
}

export const TaskEditModal: React.FC<TaskEditModalProps> = ({ task, onSave, onClose }) => {
  const [taskName, setTaskName] = useState('');

  useEffect(() => {
    if (task) {
      setTaskName(task.name);
    } else {
      setTaskName('');
    }
  }, [task]);

  if (!task) return null;

  const handleSave = () => {
    onSave({ ...task, name: taskName });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex justify-center items-center z-50 font-sans" onClick={onClose}>
      <div className="bg-contest-dark-light rounded-lg shadow-2xl p-6 w-full max-w-md mx-4" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-white">Edit Task</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <CloseIcon className="w-6 h-6" />
          </button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-bold text-gray-400 block mb-2" htmlFor="taskName">
              Task Name
            </label>
            <input
              id="taskName"
              type="text"
              value={taskName}
              onChange={(e) => setTaskName(e.target.value)}
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