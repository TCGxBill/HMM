import React, { createContext, useContext, useState, ReactNode, useCallback, useMemo, useEffect, useRef } from 'react';
import usePersistentState from '../hooks/usePersistentState';
import { Team, Task, Submission, ContestStatus, User } from '../types';
import { mockTasks } from '../constants';
import { useAuth } from './AuthContext';
import { useToast } from './ToastContext';
import { useTranslation } from './LanguageContext';
import { parseCSV } from '../services/scoringService';
import { supabase } from '../services/supabaseClient';

interface ContestContextType {
  teams: Team[];
  tasks: Task[];
  contestStatus: ContestStatus;
  contestStats: {
    totalSubmissions: number;
    highestScore: number;
    avgAttempts: number;
  };
  isLoading: boolean;
  uploadingTasks: Set<string>;
  submitSolution: (taskId: string, submissionContent: string) => Promise<void>;
  updateContestStatus: (newStatus: ContestStatus) => void;
  setTaskKey: (taskId: string, keyFile: File) => void;
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
  const [isLoading, setIsLoading] = useState(true);
  const [uploadingTasks, setUploadingTasks] = useState(new Set<string>());
  
  const isFetchingScoreboard = useRef(false);
  const isFetchingTaskStatus = useRef(false);
  
  const { user } = useAuth();
  const { addToast } = useToast();
  const { t } = useTranslation();

  const reRankTeams = useCallback((updatedTeams: Team[]): Team[] => {
    // This function no longer depends on the `tasks` state, breaking the infinite loop.
    // It derives the tasks from the submissions themselves.
    const bestScoresPerTask: { [taskId: string]: number } = {};
    const allTaskIds = new Set<string>();

    updatedTeams.forEach(team => {
        team.submissions.forEach(sub => {
            allTaskIds.add(sub.taskId);
        });
    });

    allTaskIds.forEach(taskId => {
        const scores = updatedTeams
            .map(team => team.submissions.find(s => s.taskId === taskId)?.score)
            .filter((score): score is number => score !== null && score !== undefined);
        
        if (scores.length > 0) {
            bestScoresPerTask[taskId] = Math.max(...scores);
        }
    });

    const teamsWithBestScores = updatedTeams.map(team => ({
        ...team,
        submissions: team.submissions.map(sub => ({
            ...sub,
            isBestScore: sub.score !== null && sub.score !== undefined && sub.score === bestScoresPerTask[sub.taskId],
        })),
    }));
    
    return teamsWithBestScores
      .sort((a, b) => {
        if (a.totalScore !== b.totalScore) {
          return b.totalScore - a.totalScore;
        }
        const timeA = a.lastSolveTimestamp ?? Infinity;
        const timeB = b.lastSolveTimestamp ?? Infinity;
        return timeA - timeB;
      })
      .map((team, index) => ({ ...team, rank: index + 1 }));
  }, []);

  const fetchScoreboard = useCallback(async () => {
    if (isFetchingScoreboard.current) return;
    isFetchingScoreboard.current = true;
    setIsLoading(true);
    try {
        const { data: scoreboardData, error: scoreboardError } = await supabase.rpc('get_scoreboard');
        if (scoreboardError) throw scoreboardError;
        
        const mappedData = scoreboardData.map((team: any) => ({
          ...team,
          name: team.teamName,
        }));
        
        const rankedTeams = reRankTeams(mappedData);
        setTeams(rankedTeams);
    } catch (error) {
        console.error("Failed to load scoreboard data", error);
        addToast(t('error.loadScoreboard'), 'error');
    } finally {
        setIsLoading(false);
        isFetchingScoreboard.current = false;
    }
  }, [addToast, t, setTeams, reRankTeams]);

  const fetchTaskKeyStatus = useCallback(async () => {
    if (user?.role !== 'admin' || isFetchingTaskStatus.current) return;
    isFetchingTaskStatus.current = true;
    try {
      const { data: keyStatusData, error: keyStatusError } = await supabase.rpc('get_uploaded_task_keys');
      if (keyStatusError) throw keyStatusError;

      const uploadedKeyIds = new Set(keyStatusData.map((k: any) => k.task_id));
      
      setTasks(prevTasks => {
        const needsUpdate = prevTasks.some(t => t.keyUploaded !== uploadedKeyIds.has(t.id));
        if (!needsUpdate) return prevTasks;
        return prevTasks.map(t => ({ ...t, keyUploaded: uploadedKeyIds.has(t.id) }));
      });
    } catch (error) {
        console.error("Failed to fetch task key status:", error);
    } finally {
        isFetchingTaskStatus.current = false;
    }
  }, [user, setTasks]);


  useEffect(() => {
    if (user) {
        fetchScoreboard();
        fetchTaskKeyStatus();

        const channel = supabase
            .channel('scoreboard-updates')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'submissions' }, payload => {
                console.log('Submission change received!', payload);
                addToast(t('toastScoreboardUpdated'), 'info');
                fetchScoreboard();
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'users', filter: `role=eq.contestant` }, payload => {
                 console.log('Contestant user change received!', payload);
                 fetchScoreboard();
            })
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'task_keys' }, payload => {
                if (user.role === 'admin') {
                    console.log('Task key added!', payload);
                    setTasks(prev => prev.map(t => t.id === payload.new.task_id ? {...t, keyUploaded: true} : t));
                }
            })
            .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'task_keys' }, payload => {
                 if (user.role === 'admin') {
                    console.log('Task key deleted!', payload);
                    setTasks(prev => prev.map(t => t.id === payload.old.task_id ? {...t, keyUploaded: false} : t));
                }
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    } else {
        setIsLoading(false);
        setTeams([]);
    }
  }, [user, fetchScoreboard, fetchTaskKeyStatus, addToast, t, setTasks]);
  
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

    try {
        const submissionData = parseCSV(submissionContent);
        // Remove header row if it exists
        if(submissionData[0] && submissionData[0][0].toLowerCase() === 'category_id') {
            submissionData.shift();
        }

        const { data: score, error } = await supabase.rpc('submit_solution', {
            p_user_id: user.id,
            p_task_id: taskId,
            p_submission_data: submissionData
        });

        if (error) throw error;
        
        addToast(t('toastSubmissionReceived', { taskId, score: score.toFixed(1) }), 'success');
        // Realtime subscription will handle updating the UI.

    } catch (error: any) {
        console.error("Submission RPC error:", error);
        addToast(t(error.message) || error.message, 'error');
    }
  }, [user, contestStatus, addToast, t]);
  
  const updateContestStatus = (newStatus: ContestStatus) => {
    if (user?.role !== 'admin') {
      addToast(t('error.adminOnly'), 'error');
      return;
    }
    setContestStatus(newStatus);
    const translatedStatus = t(`status${newStatus.replace(' ','')}`);
    addToast(t('toastContestStatusUpdated', { status: translatedStatus }), 'info');
  };

  const setTaskKey = async (taskId: string, keyFile: File) => {
    if (user?.role !== 'admin') {
      addToast(t('error.adminOnly'), 'error');
      return;
    }
    
    setUploadingTasks(prev => new Set(prev).add(taskId));

    try {
      const filePath = `${taskId}.csv`;
      
      const { error } = await supabase
        .storage
        .from('task-keys')
        .upload(filePath, keyFile, {
          cacheControl: '3600',
          upsert: true, // Overwrite the file if it already exists
        });

      if (error) throw error;
      
      addToast(t('toastKeyUploaded', { taskId }), 'success');
      // The Edge Function will be triggered by the upload.
      // The realtime subscription to the `task_keys` table will update the UI automatically.

    } catch (error: any) {
      console.error("Error uploading key file:", error);
      addToast(`Error uploading key: ${error.message}`, 'error');
    } finally {
        setUploadingTasks(prev => {
            const newSet = new Set(prev);
            newSet.delete(taskId);
            return newSet;
        });
    }
  };

  const addTeam = (teamName: string) => {
    addToast(t('manageTeamsSubtitle'), 'info');
  };

  const updateTeam = (updatedTeam: Team) => {
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
  
  const deleteTask = async (taskId: string) => {
    if (user?.role !== 'admin') {
      addToast(t('error.adminOnly'), 'error');
      return;
    }
    // Delete local task immediately for responsive UI
    setTasks(prev => prev.filter(t => t.id !== taskId));

    try {
        // Also delete the key from the database and storage
        const { error: rpcError } = await supabase.rpc('delete_task_key', { p_task_id: taskId });
        if (rpcError) throw rpcError;

        const { error: storageError } = await supabase.storage.from('task-keys').remove([`${taskId}.csv`]);
        if (storageError) console.warn("Could not delete from storage, it might not exist.", storageError);

    } catch (error) {
        console.error("Error deleting task assets:", error);
        addToast('Failed to delete task assets from server.', 'error');
        // Optionally, add the task back to the list if the server call fails
    }
  };

  const resetContest = () => {
    if (user?.role !== 'admin') {
      addToast(t('error.adminOnly'), 'error');
      return;
    }
    // This now only resets local, non-persistent state like tasks.
    setTasks(mockTasks);
    setContestStatus('Live');
    addToast(t('toastContestReset'), 'info');
    fetchScoreboard(); 
  };

  return (
    <ContestContext.Provider value={{
      teams,
      tasks,
      contestStatus,
      contestStats,
      isLoading,
      uploadingTasks,
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