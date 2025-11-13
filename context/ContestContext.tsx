import React, { createContext, useContext, useState, ReactNode, useCallback, useMemo, useEffect, useRef } from 'react';
import usePersistentState from '../hooks/usePersistentState';
import { Team, Task, Submission, ContestStatus, User } from '../types';
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
  updateContestStatus: (newStatus: ContestStatus) => Promise<void>;
  setTaskKey: (taskId: string, keyFile: File) => void;
  addTeam: (teamName: string) => void;
  updateTeam: (team: Team) => void;
  deleteTeam: (teamId: string) => void;
  addTask: (taskName: string) => Promise<void>;
  updateTask: (task: Task) => Promise<void>;
  deleteTask: (taskId: string, taskName: string) => Promise<void>;
  resetContest: () => Promise<void>;
}

const ContestContext = createContext<ContestContextType | undefined>(undefined);

export const ContestProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [teams, setTeams] = usePersistentState<Team[]>('teams', []);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [contestStatus, setContestStatus] = useState<ContestStatus>('Not Started');
  const [isLoading, setIsLoading] = useState(true);
  const [uploadingTasks, setUploadingTasks] = useState(new Set<string>());
  
  const isFetchingScoreboard = useRef(false);
  
  const { user } = useAuth();
  const { addToast } = useToast();
  const { t } = useTranslation();

  const reRankTeams = useCallback((updatedTeams: Team[]): Team[] => {
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
        isFetchingScoreboard.current = false;
    }
  }, [addToast, t, setTeams, reRankTeams]);
  
  const fetchTasks = useCallback(async () => {
      try {
        const { data, error } = await supabase.rpc('get_tasks_with_status');
        if (error) throw error;
        setTasks(data || []);
      } catch (error) {
        console.error("Failed to fetch tasks:", error);
        addToast(t('error.fetchTasks'), 'error');
      }
  }, [addToast, t]);

  const fetchContestStatus = useCallback(async () => {
      try {
          const { data, error } = await supabase
            .from('contest_settings')
            .select('contest_status')
            .eq('id', 1)
            .single();
          if (error) throw error;
          if (data) setContestStatus(data.contest_status);
      } catch(error) {
          console.error("Failed to fetch contest status:", error);
          // Don't show toast, as it might be a temporary network issue on load.
      }
  }, []);


  useEffect(() => {
    if (user) {
        setIsLoading(true);
        Promise.all([fetchScoreboard(), fetchTasks(), fetchContestStatus()]).finally(() => setIsLoading(false));

        const channel = supabase
            .channel('realtime-all')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'submissions' }, payload => {
                console.log('Submission change received!', payload);
                addToast(t('toastScoreboardUpdated'), 'info');
                fetchScoreboard();
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'users', filter: `role=eq.contestant` }, payload => {
                 console.log('Contestant user change received!', payload);
                 fetchScoreboard();
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, payload => {
                console.log('Tasks change received!', payload);
                fetchTasks();
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'task_keys' }, payload => {
                 console.log('Task key change received!', payload);
                 fetchTasks();
            })
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'contest_settings', filter: 'id=eq.1'}, payload => {
                console.log('Contest status change received!', payload);
                setContestStatus(payload.new.contest_status);
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    } else {
        setIsLoading(false);
        setTeams([]);
        setTasks([]);
    }
  }, [user, fetchScoreboard, fetchTasks, fetchContestStatus, addToast, t]);
  
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
  
  const updateContestStatus = async (newStatus: ContestStatus) => {
    if (user?.role !== 'admin') {
      addToast(t('error.adminOnly'), 'error');
      return;
    }
    const { error } = await supabase
        .from('contest_settings')
        .update({ contest_status: newStatus })
        .eq('id', 1);

    if (error) {
        addToast(t('error.updateStatus'), 'error');
        console.error("Failed to update contest status:", error);
    } else {
        const translatedStatus = t(`status${newStatus.replace(' ','')}`);
        addToast(t('toastContestStatusUpdated', { status: translatedStatus }), 'info');
    }
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

  const addTask = async (taskName: string) => {
    const existingNumbers = tasks.map(t => parseInt(t.id.substring(1), 10)).filter(n => !isNaN(n));
    const maxNumber = existingNumbers.length > 0 ? Math.max(...existingNumbers) : 0;
    const newId = `T${maxNumber + 1}`;
    
    try {
        const { error } = await supabase.from('tasks').insert({
            id: newId,
            name: taskName,
            key_visibility: 'private',
        });
        if (error) throw error;
        addToast(t('toastTaskAdded', { taskName }), 'success');
        // Realtime will update the state.
    } catch (error) {
        console.error("Error adding task:", error);
        addToast(t('error.addTask'), 'error');
    }
  };

  const updateTask = async (updatedTask: Task) => {
    try {
        const { error } = await supabase.from('tasks').update({
            name: updatedTask.name,
            key_visibility: updatedTask.keyVisibility,
        }).eq('id', updatedTask.id);
        if (error) throw error;
        // Realtime will update the state, no need for toast here if it feels redundant
    } catch (error) {
        console.error("Error updating task:", error);
        addToast(t('error.updateTask'), 'error');
    }
  };
  
  const deleteTask = async (taskId: string, taskName: string) => {
    if (user?.role !== 'admin') {
      addToast(t('error.adminOnly'), 'error');
      return;
    }
    try {
        const { error } = await supabase.rpc('delete_task', { p_task_id: taskId });
        if (error) throw error;
        addToast(t('toastTaskDeleted', { taskName }), 'success');
    } catch (error) {
        console.error("Error deleting task:", error);
        addToast(t('error.deleteTask'), 'error');
    }
  };

  const resetContest = async () => {
    if (user?.role !== 'admin') {
      addToast(t('error.adminOnly'), 'error');
      return;
    }
    
    try {
        const { error } = await supabase.rpc('reset_contest');
        if (error) throw error;
        
        addToast(t('toastContestReset'), 'info');
        // Realtime subscriptions will handle updating the UI for tasks, status, and scoreboard.
        // We can manually trigger a scoreboard fetch for immediate feedback.
        fetchScoreboard();
    } catch (error) {
        console.error("Error resetting contest:", error);
        addToast(t('error.resetContest'), 'error');
    }
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