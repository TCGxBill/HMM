import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ContestProvider, useContest } from './context/ContestContext';
import { ToastProvider } from './context/ToastContext';
import { useLanguage, useTranslation } from './context/LanguageContext';
import { LoginPage } from './components/LoginPage';
import { Scoreboard } from './components/Scoreboard';
import { AdminPanel } from './components/AdminPanel';
import { SubmissionPanel } from './components/SubmissionPanel';
import { Chatbot } from './components/Chatbot';
import { ScoreChart } from './components/ScoreChart';
import { TeamDetailModal } from './components/TeamDetailModal';
import { AnalysisModal } from './components/AnalysisModal';
import { StatsBar } from './components/StatsBar';
import { Team } from './types';
import { LogoIcon } from './components/Icons';


const AppContent: React.FC = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const { teams, contestStatus, contestStats } = useContest();
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [analyzingTeam, setAnalyzingTeam] = useState<Team | null>(null);
  const { language, setLanguage } = useLanguage();
  const { t } = useTranslation();

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  return (
    <div className="min-h-screen bg-contest-dark text-white font-sans">
        <header className="bg-contest-dark-light/50 backdrop-blur-sm shadow-md sticky top-0 z-40">
            <nav className="container mx-auto px-6 py-3 flex justify-between items-center">
                <div className="flex items-center space-x-3">
                    <LogoIcon className="h-8 w-8 text-contest-primary"/>
                    <h1 className="text-xl font-bold">{t('headerTitle')}</h1>
                </div>
                <div className="flex items-center space-x-4">
                    <span className="text-gray-300">{t('welcomeMessage')}, <span className="font-semibold">{user?.username}</span>!</span>
                    
                    <select
                        value={language}
                        onChange={(e) => setLanguage(e.target.value as 'en-US' | 'vi-VN')}
                        className="bg-contest-dark border border-contest-gray rounded-md py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-contest-primary"
                    >
                        <option value="en-US">English</option>
                        <option value="vi-VN">Tiếng Việt</option>
                    </select>

                    <button 
                        onClick={logout}
                        className="bg-contest-red hover:bg-red-600 text-white font-bold py-2 px-4 rounded-lg transition-colors"
                    >
                        {t('logout')}
                    </button>
                </div>
            </nav>
        </header>
      <main className="container mx-auto p-4">
        <StatsBar 
          status={contestStatus}
          totalSubmissions={contestStats.totalSubmissions}
          highestScore={contestStats.highestScore}
          avgAttempts={contestStats.avgAttempts}
        />
        {user?.role === 'admin' && <AdminPanel />}
        {user?.role === 'contestant' && <SubmissionPanel />}
        <Scoreboard onTeamSelect={setSelectedTeam} onAnalyzeTeam={setAnalyzingTeam} />
        <ScoreChart teams={teams} />
      </main>
      <Chatbot />
      <TeamDetailModal team={selectedTeam} onClose={() => setSelectedTeam(null)} />
      <AnalysisModal team={analyzingTeam} onClose={() => setAnalyzingTeam(null)} />
    </div>
  );
};


const App: React.FC = () => {
  return (
    <AuthProvider>
      <ToastProvider>
        <ContestProvider>
          <AppContent />
        </ContestProvider>
      </ToastProvider>
    </AuthProvider>
  );
};

export default App;
