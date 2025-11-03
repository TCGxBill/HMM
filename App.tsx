
import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ContestProvider, useContest } from './context/ContestContext';
import { ToastProvider } from './context/ToastContext';
import { LoginPage } from './components/LoginPage';
import { Scoreboard } from './components/Scoreboard';
import { AdminPanel } from './components/AdminPanel';
import { SubmissionPanel } from './components/SubmissionPanel';
import { Chatbot } from './components/Chatbot';
import { ScoreChart } from './components/ScoreChart';
import { TeamDetailModal } from './components/TeamDetailModal';
import { Team } from './types';
import { LogoIcon } from './components/Icons';


const AppContent: React.FC = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const { teams } = useContest();
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  return (
    <div className="min-h-screen bg-contest-dark text-white font-sans">
        <header className="bg-contest-dark-light shadow-md">
            <nav className="container mx-auto px-6 py-3 flex justify-between items-center">
                <div className="flex items-center space-x-3">
                    <LogoIcon className="h-8 w-8 text-contest-blue"/>
                    <h1 className="text-xl font-bold">ICPC NLP Contest</h1>
                </div>
                <div className="flex items-center">
                    <span className="text-gray-300 mr-4">Welcome, <span className="font-semibold">{user?.username}</span>!</span>
                    <button 
                        onClick={logout}
                        className="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded"
                    >
                        Logout
                    </button>
                </div>
            </nav>
        </header>
      <main className="container mx-auto p-4">
        {user?.role === 'admin' && <AdminPanel />}
        {user?.role === 'contestant' && <SubmissionPanel />}
        <Scoreboard onTeamSelect={setSelectedTeam}/>
        <ScoreChart teams={teams} />
      </main>
      <Chatbot />
      <TeamDetailModal team={selectedTeam} onClose={() => setSelectedTeam(null)} />
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