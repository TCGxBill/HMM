import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useTranslation } from '../context/LanguageContext';
import { CloseIcon } from './Icons';

interface ChangePasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ChangePasswordModal: React.FC<ChangePasswordModalProps> = ({ isOpen, onClose }) => {
  const { changePassword } = useAuth();
  const { addToast } = useToast();
  const { t } = useTranslation();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;
  
  const handleClose = () => {
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setError(null);
      setIsLoading(false);
      onClose();
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (newPassword !== confirmPassword) {
      setError(t('error.passwordMismatch'));
      return;
    }
    if (newPassword.length < 6) {
      setError(t('error.passwordTooShort'));
      return;
    }

    setIsLoading(true);
    try {
      await changePassword(currentPassword, newPassword);
      addToast(t('toastPasswordChanged'), 'success');
      handleClose();
    } catch (err: any) {
      const errorMessage = t(err.message) || t('error.passwordUpdateFailed');
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex justify-center items-center z-50 font-sans" onClick={handleClose}>
      <div className="bg-contest-dark-light rounded-xl shadow-2xl p-6 w-full max-w-md mx-4" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-white">{t('changePasswordModalTitle')}</h2>
          <button onClick={handleClose} className="text-gray-400 hover:text-white">
            <CloseIcon className="w-6 h-6" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <input type="password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} placeholder={t('currentPasswordPlaceholder')} required 
              className="w-full p-3 bg-contest-dark border border-contest-gray rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-contest-primary" />
          </div>
          <div>
            <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder={t('newPasswordPlaceholder')} required
              className="w-full p-3 bg-contest-dark border border-contest-gray rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-contest-primary" />
          </div>
          <div>
            <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder={t('confirmNewPasswordPlaceholder')} required
              className="w-full p-3 bg-contest-dark border border-contest-gray rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-contest-primary" />
          </div>
          {error && <p className="text-sm text-center text-contest-red">{error}</p>}
          <div className="flex justify-end space-x-2 pt-2">
            <button type="button" onClick={handleClose} className="px-4 py-2 bg-contest-gray text-white rounded-md hover:bg-gray-600">{t('cancel')}</button>
            <button type="submit" disabled={isLoading} className="px-4 py-2 bg-contest-primary text-white rounded-md hover:bg-indigo-500 disabled:bg-contest-gray">
              {isLoading ? t('saving') : t('save')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
