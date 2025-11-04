import React from 'react';
import { ToastMessage } from '../types';
import { CloseIcon } from './Icons';

interface ToastProps {
  message: ToastMessage;
  onDismiss: () => void;
}

export const Toast: React.FC<ToastProps> = ({ message, onDismiss }) => {
  const baseClasses = "relative flex items-center p-4 text-white rounded-lg shadow-lg max-w-sm";
  const typeClasses = {
    success: 'bg-contest-green',
    error: 'bg-contest-red',
    info: 'bg-contest-primary',
  };

  return (
    <div className={`${baseClasses} ${typeClasses[message.type]}`} role="alert">
      <div className="text-sm font-medium">{message.message}</div>
      <button
        onClick={onDismiss}
        className="ml-4 -mr-2 -my-2 p-1.5 text-white rounded-lg hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white/50"
        aria-label="Dismiss"
      >
        <CloseIcon className="w-4 h-4" />
      </button>
    </div>
  );
};