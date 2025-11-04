import React, { createContext, useContext, useState, ReactNode, useCallback, useMemo, useEffect } from 'react';
import usePersistentState from '../hooks/usePersistentState';
import { Team, Task, Submission, ContestStatus, User } from '../types';
import { mockTeams, mockTasks } from '../constants';
import { useAuth } from './AuthContext';
import { useToast } from './ToastContext';
import { calculateScore, parseTaskKey } from '../services/scoringService';
import * as apiService from '../services/apiService';

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
  deleteTeam: (teamId: number) => void;
  addTask: (taskName: string) => void;
  updateTask: (task: Task) => void;
  deleteTask: (taskId: string) => void;
  resetContest: () => void;
  refreshData: () => void;
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

  const reRankTeams = useCallback((updatedTeams: Team[]): Team[] => {
    return updatedTeams
      .sort((a, b) => b.totalScore - a.totalScore)
      .map((team, index) => ({ ...team, rank: index + 1 }));
  }, []);

  const transformUserDataToTeams = (users: User[]): Team[] => {
    const teamsData = users.map((u, index) => ({
      id: index + 1, // Internal ID
      apiUserId: u.id,
      rank: 0, // Will be calculated later
      name: u.teamName,
      solved: (u.submissions ?? []).filter(s => s.score !== null && s.score > 0).length,
      totalScore: u.bestScore ?? 0,
      submissions: (u.submissions ?? []),
    }));
    return reRankTeams(teamsData);
  };
  
  const refreshData = useCallback(async () => {
    setIsLoading(true);
    try {
        const students = await apiService.getStudents();
        const teamsData = transformUserDataToTeams(students);
        setTeams(teamsData);
    } catch (error) {
        console.error("Failed to load scoreboard data", error);
        addToast("Could not load scoreboard data from API.", 'error');
        setTeams(reRankTeams(mockTeams)); // Fallback to mock data
    } finally {
        setIsLoading(false);
    }
  }, [addToast, reRankTeams, setTeams]);

  useEffect(() => {
    if (user) { // Only fetch data if user is logged in
        refreshData();
    } else {
        setIsLoading(false);
        setTeams([]); // Clear teams on logout
    }
  }, [user, refreshData, setTeams]);
  
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
    if (!user || user.role !== 'contestant' || !user.teamName) {
      addToast('You must be a logged-in contestant to submit.', 'error');
      return;
    }
    if (contestStatus !== 'Live') {
      addToast(`Submissions are closed. Contest status: ${contestStatus}`, 'error');
      return;
    }
    if (!masterKey || !masterKey[taskId]) {
        addToast(`The answer key for task ${taskId} has not been set.`, 'error');
        return;
    }

    try {
        const score = calculateScore(submissionContent, masterKey[taskId]);
        addToast(`Submission for ${taskId} received! Score: ${score.toFixed(1)}`, 'success');
        
        // Find the user's current data from API to update
        const studentToUpdate = await apiService.getStudents().then(students => students.find(s => s.id === user.id));

        if(!studentToUpdate) {
            addToast('Could not find your record to update score.', 'error');
            return;
        }

        let submission = (studentToUpdate.submissions ?? []).find(s => s.taskId === taskId);
        if (submission) {
            submission.attempts += 1;
            if (submission.score === null || score > submission.score) {
              submission.score = score;
            }
        } else {
            submission = { taskId, score, attempts: 1, isBestScore: false };
            studentToUpdate.submissions = [...(studentToUpdate.submissions ?? []), submission];
        }

        const bestScore = Math.max(...(studentToUpdate.submissions ?? []).map(s => s.score ?? 0));
        studentToUpdate.bestScore = bestScore;

        await apiService.updateStudent(studentToUpdate);
        await refreshData(); // Refresh all data from source of truth

    } catch (error: any) {
        addToast(error.message, 'error');
    }
  }, [user, contestStatus, masterKey, addToast, refreshData]);
  
  const updateContestStatus = (newStatus: ContestStatus) => {
    if (user?.role !== 'admin') {
      addToast('Only admins can change contest status.', 'error');
      return;
    }
    setContestStatus(newStatus);
    addToast(`Contest status updated to ${newStatus}`, 'info');
  };

  const setTaskKey = (taskId: string, keyContent: string) => {
    if (user?.role !== 'admin') {
      addToast('Only admins can upload answer keys.', 'error');
      return;
    }
    try {
      const parsedKey = parseTaskKey(keyContent);
      setMasterKey(prev => ({ ...prev, [taskId]: parsedKey }));
      setTasks(prevTasks => prevTasks.map(t => t.id === taskId ? {...t, keyUploaded: true} : t));
      addToast(`Answer key for ${taskId} uploaded successfully!`, 'success');
    } catch (error: any) {
      addToast(`Error parsing key for ${taskId}: ${error.message}`, 'error');
    }
  };

  const addTeam = (teamName: string) => {
    addToast("Teams are now added via contestant registration.", 'info');
  };

  const updateTeam = (updatedTeam: Team) => {
    setTeams(prev => reRankTeams(prev.map(t => t.id === updatedTeam.id ? updatedTeam : t)));
  };
  
  const deleteTeam = async (teamId: number) => {
    if (user?.role !== 'admin') {
      addToast('Only admins can delete teams.', 'error');
      return;
    }
    
    const teamToDelete = teams.find(t => t.id === teamId);
    if (!teamToDelete || !teamToDelete.apiUserId) {
        addToast('Could not find team to delete.', 'error');
        return;
    }

    try {
        await apiService.deleteStudent(teamToDelete.apiUserId);
        addToast(`Team "${teamToDelete.name}" has been deleted.`, 'success');
        await refreshData(); // Refresh the list from the API
    } catch (error) {
        addToast('Failed to delete team.', 'error');
        console.error('Error deleting team:', error);
    }
  };

  const addTask = (taskName: string) => {
    const newId = `T${tasks.length + 1}`;
    const newTask: Task = { id: newId, name: taskName, keyVisibility: 'private', keyUploaded: false };
    setTasks(prev => [...prev, newTask]);
    // Note: this doesn't add empty submissions to API data automatically
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
    // This now only resets local non-API state
    setTasks(mockTasks);
    setContestStatus('Live');
    setMasterKey(null);
    addToast('Local contest state (tasks, status, keys) has been reset.', 'info');
    refreshData();
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
      refreshData,
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