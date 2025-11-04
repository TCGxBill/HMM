import React, { createContext, useContext, useState, ReactNode, useCallback, useMemo, useEffect } from 'react';
import usePersistentState from '../hooks/usePersistentState';
import { Team, Task, Submission, ContestStatus, User } from '../types';
import { mockTeams, mockTasks } from '../constants';
import { useAuth } from './AuthContext';
import { useToast } from './ToastContext';
import { useTranslation } from './LanguageContext';
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
    
    // 3. Sort teams by totalScore and assign rank
    return teamsWithBestScores
      .sort((a, b) => b.totalScore - a.totalScore)
      .map((team, index) => ({ ...team, rank: index + 1 }));
  }, [tasks]);

  const transformUserDataToTeams = useCallback((users: User[]): Team[] => {
    const teamsData = users.map((u, index) => ({
      id: index + 1, // Internal ID
      apiUserId: u.id,
      rank: 0, // Will be calculated later
      name: u.teamName,
      solved: (u.submissions ?? []).filter(s => s.score !== null && s.score > 0).length,
      totalScore: u.bestScore ?? 0,
      submissions: (u.submissions ?? []).map((sub: any) => ({
          ...sub,
          history: sub.history && sub.history.length > 0
              ? sub.history
              : (sub.score !== null
                  ? Array.from({length: sub.attempts > 0 ? sub.attempts : 1}, (_, i) => ({ 
                      score: i === (sub.attempts > 0 ? sub.attempts : 1) - 1 ? sub.score! : Math.max(0, sub.score! - (Math.random() * 15)),
                      timestamp: Date.now() - ((sub.attempts > 0 ? sub.attempts : 1) - i) * 1000 * 60 * 15 
                    })) 
                  : [])
      })),
    }));
    return reRankTeams(teamsData);
  }, [reRankTeams]);
  
  const refreshData = useCallback(async () => {
    setIsLoading(true);
    try {
        const students = await apiService.getStudents();
        const teamsData = transformUserDataToTeams(students);
        setTeams(teamsData);
    } catch (error) {
        console.error("Failed to load scoreboard data", error);
        addToast(t('error.loadScoreboard'), 'error');
        const fallbackTeams = mockTeams.map(team => ({
            ...team,
            submissions: team.submissions.map(sub => ({
                ...sub,
                history: sub.score !== null 
                    ? Array.from({length: sub.attempts}, (_, i) => ({ 
                        score: i === sub.attempts - 1 ? sub.score! : Math.max(0, sub.score! - Math.random() * 10),
                        timestamp: Date.now() - (sub.attempts - i) * 1000 * 60 * 5 
                      })) 
                    : []
            }))
        }));
        setTeams(reRankTeams(fallbackTeams));
    } finally {
        setIsLoading(false);
    }
  }, [addToast, t, transformUserDataToTeams, setTeams, reRankTeams]);

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

        const studentToUpdate = await apiService.getStudents().then(students => students.find(s => s.id === user.id));

        if(!studentToUpdate) {
            addToast(t('error.findUserToUpdate'), 'error');
            return;
        }

        const existingSubmissions = (studentToUpdate.submissions || []).map((s: any) => ({ ...s, history: s.history || [] }));
        let submission = existingSubmissions.find(s => s.taskId === taskId);
        
        if (submission) {
            submission.attempts += 1;
            submission.history.push(newAttempt);
            if (submission.score === null || score > submission.score) {
              submission.score = score;
            }
            studentToUpdate.submissions = existingSubmissions.map(s => s.taskId === taskId ? submission : s);
        } else {
            submission = { 
                taskId, 
                score, 
                attempts: 1, 
                history: [newAttempt],
                isBestScore: false
            };
            studentToUpdate.submissions = [...existingSubmissions, submission];
        }

        const bestScore = Math.max(...(studentToUpdate.submissions ?? []).map(s => s.score ?? 0));
        studentToUpdate.bestScore = bestScore;

        await apiService.updateStudent(studentToUpdate);
        await refreshData(); // Refresh all data from source of truth

    } catch (error: any) {
        addToast(t(error.message) || error.message, 'error');
    }
  }, [user, contestStatus, masterKey, addToast, refreshData, t]);
  
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
    setTeams(prev => reRankTeams(prev.map(t => t.id === updatedTeam.id ? updatedTeam : t)));
  };
  
  const deleteTeam = async (teamId: number) => {
    if (user?.role !== 'admin') {
      addToast(t('error.adminOnly'), 'error');
      return;
    }
    
    const teamToDelete = teams.find(t => t.id === teamId);
    if (!teamToDelete || !teamToDelete.apiUserId) {
        addToast(t('error.findTeamToDelete'), 'error');
        return;
    }

    try {
        await apiService.deleteStudent(teamToDelete.apiUserId);
        addToast(t('toastTeamDeleted', { teamName: teamToDelete.name }), 'success');
        await refreshData(); // Refresh the list from the API
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
    setTasks(mockTasks);
    setContestStatus('Live');
    setMasterKey(null);
    addToast(t('toastContestReset'), 'info');
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