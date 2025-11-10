import React, { createContext, useContext, useState, ReactNode, useCallback, useMemo, useEffect } from 'react';
import usePersistentState from '../hooks/usePersistentState';
import { Team, Task, Submission, ContestStatus, User } from '../types';
import { mockTasks } from '../constants';
import { useAuth } from './AuthContext';
import { useToast } from './ToastContext';
import { useTranslation } from './LanguageContext';
import { calculateScore, parseTaskKey } from '../services/scoringService';
import { supabase } from '../services/supabaseClient';

interface ContestContextType {
  teams: Team[];
  tasks: Task[];
  contestStatus: ContestStatus;
  masterKey: { [taskId: string]: string[][] } | null;
  contestStats: {
    totalSubmissions: number;
    highestScore: number;
    avgAttempts: number;
  };
  isLoading: boolean;
  submitSolution: (taskId: string, submissionContent: string) => Promise<void>;
  updateContestStatus: (newStatus: ContestStatus) => void;
  setTaskKey: (taskId: string, keyContent: string) => void;
  addTeam: (teamName: string) => void;
  updateTeam: (team: Team) => void;
  deleteTeam: (teamId: string) => void;
  addTask: (taskName: string) => void;
  updateTask: (task: Task) => void;
  deleteTask: (taskId: string) => void;
  resetContest: () => void;
}

const ContestContext = createContext<ContestContextType | undefined>(undefined);

export const ContestProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [teams, setTeams] = usePersistentState<Team[]>('teams', []);
  const [tasks, setTasks] = usePersistentState<Task[]>('tasks', mockTasks);
  const [contestStatus, setContestStatus] = usePersistentState<ContestStatus>('contestStatus', 'Live');
  const [masterKey, setMasterKey] = usePersistentState<{ [taskId: string]: string[][] } | null>('masterKey', null);
  const [isLoading, setIsLoading] = useState(true);
  
  const { user } = useAuth();
  const { addToast } = useToast();
  const { t } = useTranslation();

  const reRankTeams = useCallback((updatedTeams: Team[]): Team[] => {
    // 1. Find the best score for each task across all teams
    const bestScoresPerTask: { [taskId: string]: number } = {};
    
    tasks.forEach(task => {
        const scores = updatedTeams
            .map(team => team.submissions.find(s => s.taskId === task.id)?.score)
            .filter((score): score is number => score !== null && score !== undefined);
        
        if (scores.length > 0) {
            bestScoresPerTask[task.id] = Math.max(...scores);
        }
    });

    // 2. Update isBestScore flag for each submission
    const teamsWithBestScores = updatedTeams.map(team => ({
        ...team,
        submissions: team.submissions.map(sub => ({
            ...sub,
            isBestScore: sub.score !== null && sub.score !== undefined && sub.score === bestScoresPerTask[sub.taskId],
        })),
    }));
    
    // 3. Sort teams by totalScore (primary) and lastSolveTimestamp (secondary tie-breaker)
    return teamsWithBestScores
      .sort((a, b) => {
        if (a.totalScore !== b.totalScore) {
          return b.totalScore - a.totalScore;
        }
        // If scores are equal, the one with the lower (earlier) timestamp wins.
        // Teams with no solves (null timestamp) are ranked last among ties.
        const timeA = a.lastSolveTimestamp ?? Infinity;
        const timeB = b.lastSolveTimestamp ?? Infinity;
        return timeA - timeB;
      })
      .map((team, index) => ({ ...team, rank: index + 1 }));
  }, [tasks]);
  
  const fetchInitialData = useCallback(async () => {
    setIsLoading(true);
    try {
        const { data, error } = await supabase.rpc('get_scoreboard');
        if (error) throw error;
        
        const scoreboardData = data.map((team: any) => ({
          ...team,
          name: team.teamName, // Map teamName from RPC to name for the Team type
        }));
        
        const rankedTeams = reRankTeams(scoreboardData);
        setTeams(rankedTeams);
    } catch (error) {
        console.error("Failed to load scoreboard data", error);
        addToast(t('error.loadScoreboard'), 'error');
        setTeams([]); // Clear teams on error instead of using mock data
    } finally {
        setIsLoading(false);
    }
  }, [addToast, t, setTeams, reRankTeams]);

  useEffect(() => {
    if (user) {
        fetchInitialData();

        const channel = supabase
            .channel('scoreboard-updates')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'submissions' }, payload => {
                console.log('Submission change received!', payload);
                addToast(t('toastScoreboardUpdated'), 'info');
                fetchInitialData(); // Refetch all data on any change
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'users', filter: `role=eq.contestant` }, payload => {
                 console.log('Contestant user change received!', payload);
                 fetchInitialData(); // A new contestant registered, or a team was deleted/updated
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    } else {
        setIsLoading(false);
        setTeams([]);
    }
  }, [user, fetchInitialData, addToast, t]);
  
  const contestStats = useMemo(() => {
    let totalSubmissions = 0;
    let highestScore = 0;
    let totalAttemptsOnSuccessfullySolvedTasks = 0;
    let countOfSuccessfullySolvedTasks = 0;

    teams.forEach(team => {
        team.submissions.forEach(sub => {
            totalSubmissions += sub.attempts;
            if(sub.score !== null) {
                if(sub.score > highestScore) {
                    highestScore = sub.score;
                }
                if(sub.score > 0) {
                    countOfSuccessfullySolvedTasks++;
                    totalAttemptsOnSuccessfullySolvedTasks += sub.attempts;
                }
            }
        });
    });

    const avgAttempts = countOfSuccessfullySolvedTasks > 0 ? totalAttemptsOnSuccessfullySolvedTasks / countOfSuccessfullySolvedTasks : 0;
    
    return { totalSubmissions, highestScore, avgAttempts };
  }, [teams]);

  const submitSolution = useCallback(async (taskId: string, submissionContent: string) => {
    if (!user || user.role !== 'contestant' || !user.id) {
      addToast(t('error.mustBeContestant'), 'error');
      return;
    }
    if (contestStatus !== 'Live') {
      addToast(t('error.submissionsNotLive', { status: t(`status${contestStatus.replace(' ','')}`) }), 'error');
      return;
    }
    if (!masterKey || !masterKey[taskId]) {
        addToast(t('error.keyNotSet', { taskId }), 'error');
        return;
    }

    try {
        const score = calculateScore(submissionContent, masterKey[taskId]);
        addToast(t('toastSubmissionReceived', { taskId, score: score.toFixed(1) }), 'success');
        
        const newAttempt = { score, timestamp: Date.now() };

        const { error } = await supabase.rpc('submit_solution', {
            p_user_id: user.id,
            p_task_id: taskId,
            p_attempt: newAttempt
        });

        if (error) throw error;
        // Realtime subscription will handle updating the UI

    } catch (error: any) {
        addToast(t(error.message) || error.message, 'error');
    }
  }, [user, contestStatus, masterKey, addToast, t]);
  
  const updateContestStatus = (newStatus: ContestStatus) => {
    if (user?.role !== 'admin') {
      addToast(t('error.adminOnly'), 'error');
      return;
    }
    setContestStatus(newStatus);
    const translatedStatus = t(`status${newStatus.replace(' ','')}`);
    addToast(t('toastContestStatusUpdated', { status: translatedStatus }), 'info');
  };

  const setTaskKey = (taskId: string, keyContent: string) => {
    if (user?.role !== 'admin') {
      addToast(t('error.adminOnly'), 'error');
      return;
    }
    try {
      const parsedKey = parseTaskKey(keyContent);
      setMasterKey(prev => ({ ...prev, [taskId]: parsedKey }));
      setTasks(prevTasks => prevTasks.map(t => t.id === taskId ? {...t, keyUploaded: true} : t));
      addToast(t('toastKeyUploaded', { taskId }), 'success');
    } catch (error: any) {
      addToast(t('error.parsingKeyError', { taskId, error: error.message }), 'error');
    }
  };

  const addTeam = (teamName: string) => {
    addToast(t('manageTeamsSubtitle'), 'info');
  };

  const updateTeam = (updatedTeam: Team) => {
    // This now only updates local state. A real implementation would hit a backend endpoint.
    setTeams(prev => reRankTeams(prev.map(t => t.id === updatedTeam.id ? updatedTeam : t)));
  };
  
  const deleteTeam = async (teamId: string) => {
    if (user?.role !== 'admin') {
      addToast(t('error.adminOnly'), 'error');
      return;
    }
    
    const teamToDelete = teams.find(t => t.id === teamId);
    if (!teamToDelete) {
        addToast(t('error.findTeamToDelete'), 'error');
        return;
    }

    try {
        const { error } = await supabase.rpc('delete_team', { p_user_id: teamId });
        if (error) throw error;

        addToast(t('toastTeamDeleted', { teamName: teamToDelete.name }), 'success');
        // Realtime subscription will handle updating the UI
    } catch (error) {
        addToast(t('error.deleteTeamGeneral'), 'error');
        console.error('Error deleting team:', error);
    }
  };

  const addTask = (taskName: string) => {
    const newId = `T${tasks.length + 1}`;
    const newTask: Task = { id: newId, name: taskName, keyVisibility: 'private', keyUploaded: false };
    setTasks(prev => [...prev, newTask]);
  };

  const updateTask = (updatedTask: Task) => {
    setTasks(prev => prev.map(t => t.id === updatedTask.id ? updatedTask : t));
  };
  
  const deleteTask = (taskId: string) => {
    setTasks(prev => prev.filter(t => t.id !== taskId));
    setMasterKey(prev => {
        if (!prev) return null;
        const newKey = {...prev};
        delete newKey[taskId];
        return newKey;
    });
  };

  const resetContest = () => {
    // This only resets local state. The remote DB is unaffected.
    setTasks(mockTasks);
    setContestStatus('Live');
    setMasterKey(null);
    addToast(t('toastContestReset'), 'info');
    fetchInitialData(); // Refetch from DB to get the current server state.
  };

  return (
    <ContestContext.Provider value={{
      teams,
      tasks,
      contestStatus,
      masterKey,
      contestStats,
      isLoading,
      submitSolution,
      updateContestStatus,
      setTaskKey,
      addTeam,
      updateTeam,
      deleteTeam,
      addTask,
      updateTask,
      deleteTask,
      resetContest,
    }}>
      {children}
    </ContestContext.Provider>
  );
};

export const useContest = (): ContestContextType => {
  const context = useContext(ContestContext);
  if (context === undefined) {
    throw new Error('useContest must be used within a ContestProvider');
  }
  return context;
};