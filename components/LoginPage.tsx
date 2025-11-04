import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from '../context/LanguageContext';
import { LogoIcon } from './Icons';

export const LoginPage: React.FC = () => {
  const [currentView, setCurrentView] = useState<'login' | 'register'>('login');
  const [currentRole, setCurrentRole] = useState<'contestant' | 'admin'>('contestant');
  
  // Login State
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Register State
  const [regUsername, setRegUsername] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regTeamName, setRegTeamName] = useState('');
  
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { login, register } = useAuth();
  const { t } = useTranslation();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setIsLoading(true);

    try {
        const user = await login(loginUsername, loginPassword, currentRole);
        if (!user) {
            setMessage({ text: t('error.invalidCredentials'), type: 'error' });
        }
    } catch (error) {
        setMessage({ text: t('error.genericLogin'), type: 'error' });
    } finally {
        setIsLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if(currentRole === 'contestant' && !regTeamName) {
        setMessage({ text: t('error.teamNameRequired'), type: 'error' });
        return;
    }
    setMessage(null);
    setIsLoading(true);

    try {
        await register({
            username: regUsername,
            email: regEmail,
            password: regPassword,
            teamName: currentRole === 'contestant' ? regTeamName : 'AdminTeam',
            role: currentRole,
        });
        setMessage({ text: t('registerSuccessMessage'), type: 'success' });
        setCurrentView('login');
        // Clear registration form
        setRegUsername('');
        setRegEmail('');
        setRegPassword('');
        setRegTeamName('');
    } catch (error: any) {
        const errorMessage = t(error.message) || t('error.registrationFailed');
        setMessage({ text: errorMessage, type: 'error' });
    } finally {
        setIsLoading(false);
    }
  }

  const switchTab = (role: 'contestant' | 'admin') => {
    setCurrentRole(role);
    setMessage(null);
  }

  const MessageDisplay = () => {
    if (!message) return null;
    const color = message.type === 'success' ? 'text-contest-green' : 'text-contest-red';
    return <p className={`text-sm text-center ${color}`}>{message.text}</p>;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-contest-dark font-sans p-4">
      <div className="w-full max-w-sm p-8 space-y-6 bg-contest-dark-light rounded-xl shadow-2xl">
        <div className="text-center">
            <div className="flex justify-center items-center mb-4">
                <LogoIcon className="h-12 w-12 text-contest-primary" />
            </div>
          <h1 className="text-3xl font-bold text-white">{t('loginPageTitle')}</h1>
          <p className="text-contest-light-gray mt-2">{t('loginPageSubtitle')}</p>
        </div>

        <div className="flex bg-contest-dark rounded-lg p-1">
            <button onClick={() => switchTab('contestant')} className={`w-1/2 p-2 rounded-md text-sm font-semibold transition-colors ${currentRole === 'contestant' ? 'bg-contest-primary text-white' : 'text-gray-400 hover:bg-contest-gray/50'}`}>
                {t('roleContestant')}
            </button>
            <button onClick={() => switchTab('admin')} className={`w-1/2 p-2 rounded-md text-sm font-semibold transition-colors ${currentRole === 'admin' ? 'bg-contest-primary text-white' : 'text-gray-400 hover:bg-contest-gray/50'}`}>
                {t('roleAdmin')}
            </button>
        </div>

        {currentView === 'login' ? (
            <form className="space-y-4" onSubmit={handleLogin}>
              <h2 className="text-xl font-semibold text-center text-white">{t('loginTitle')}</h2>
              <div>
                <input id="username" type="text" value={loginUsername} onChange={(e) => setLoginUsername(e.target.value)}
                  className="w-full p-3 bg-contest-dark border border-contest-gray rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-contest-primary"
                  placeholder={t('usernamePlaceholder')} required />
              </div>
              <div>
                <input id="password" type="password" value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)}
                  className="w-full p-3 bg-contest-dark border border-contest-gray rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-contest-primary"
                  placeholder={t('passwordPlaceholder')} required />
              </div>
              <MessageDisplay />
              <button type="submit" disabled={isLoading}
                className="w-full p-3 bg-contest-primary text-white font-bold rounded-lg hover:bg-indigo-500 disabled:bg-contest-gray transition-colors">
                {isLoading ? t('loggingInButton') : t('loginButton')}
              </button>
              <p className="text-sm text-center text-gray-400">
                {t('noAccount')} <a href="#" onClick={() => setCurrentView('register')} className="font-medium text-contest-primary hover:underline">{t('registerTitle')}</a>
              </p>
            </form>
        ) : (
            <form className="space-y-4" onSubmit={handleRegister}>
                <h2 className="text-xl font-semibold text-center text-white">{t('registerTitle')}</h2>
                <input type="text" value={regUsername} onChange={e => setRegUsername(e.target.value)} placeholder={t('usernamePlaceholder')} required 
                    className="w-full p-3 bg-contest-dark border border-contest-gray rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-contest-primary" />
                <input type="email" value={regEmail} onChange={e => setRegEmail(e.target.value)} placeholder={t('emailPlaceholder')} required
                    className="w-full p-3 bg-contest-dark border border-contest-gray rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-contest-primary" />
                <input type="password" value={regPassword} onChange={e => setRegPassword(e.target.value)} placeholder={t('passwordPlaceholder')} required
                    className="w-full p-3 bg-contest-dark border border-contest-gray rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-contest-primary" />
                {currentRole === 'contestant' && (
                    <input type="text" value={regTeamName} onChange={e => setRegTeamName(e.target.value)} placeholder={t('teamNamePlaceholder')} required
                        className="w-full p-3 bg-contest-dark border border-contest-gray rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-contest-primary" />
                )}
                <MessageDisplay />
                <button type="submit" disabled={isLoading}
                    className="w-full p-3 bg-contest-green text-white font-bold rounded-lg hover:bg-green-600 disabled:bg-contest-gray transition-colors">
                    {isLoading ? t('registeringButton') : t('registerButton')}
                </button>
                <p className="text-sm text-center text-gray-400">
                    {t('alreadyHaveAccount')} <a href="#" onClick={() => setCurrentView('login')} className="font-medium text-contest-primary hover:underline">{t('loginTitle')}</a>
                </p>
            </form>
        )}
      </div>
    </div>
  );
};
