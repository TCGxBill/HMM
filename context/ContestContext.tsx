
import React, { createContext, useContext, useState, ReactNode, useCallback } from 'react';
import usePersistentState from '../hooks/usePersistentState';
import { Team, Task, Submission, ContestStatus } from '../types';
import { mockTeams, mockTasks } from '../constants';
import { useAuth } from './AuthContext';
import { useToast } from './ToastContext';
import { calculateScore, parseMasterKey } from '../services/scoringService';

interface ContestContextType {
  teams: Team[];
  tasks: Task[];
  contestStatus: ContestStatus;
  masterKey: { [taskId: string]: string[][] } | null;
  submitSolution: (taskId: string, submissionContent: string) => Promise<void>;
  updateContestStatus: (newStatus: ContestStatus) => void;
  setMasterKey: (keyContent: string) => void;
  addTeam: (teamName: string) => void;
  updateTeam: (team: Team) => void;
  deleteTeam: (teamId: number) => void;
  addTask: (taskName: string) => void;
  updateTask: (task: Task) => void;
  deleteTask: (taskId: string) => void;
  resetContest: () => void;
}

const ContestContext = createContext<ContestContextType | undefined>(undefined);

export const ContestProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [teams, setTeams] = usePersistentState<Team[]>('teams', mockTeams);
  const [tasks, setTasks] = usePersistentState<Task[]>('tasks', mockTasks);
  const [contestStatus, setContestStatus] = usePersistentState<ContestStatus>('contestStatus', 'Live');
  const [masterKey, setMasterKey] = usePersistentState<{ [taskId: string]: string[][] } | null>('masterKey', null);
  
  const { user } = useAuth();
  const { addToast } = useToast();

  const reRankTeams = useCallback((updatedTeams: Team[]): Team[] => {
    return updatedTeams
      .sort((a, b) => b.totalScore - a.totalScore)
      .map((team, index) => ({ ...team, rank: index + 1 }));
  }, []);

  const submitSolution = useCallback(async (taskId: string, submissionContent: string) => {
    if (!user || user.role !== 'contestant' || !user.teamId) {
      addToast('You must be a logged-in contestant to submit.', 'error');
      return;
    }
    if (contestStatus !== 'Live') {
      addToast(`Submissions are closed. Contest status: ${contestStatus}`, 'error');
      return;
    }
    if (!masterKey) {
        addToast('The master answer key has not been set by the admin.', 'error');
        return;
    }
    if (!masterKey[taskId]) {
        addToast(`No answer key found for task ${taskId}.`, 'error');
        return;
    }

    try {
        const score = calculateScore(submissionContent, masterKey[taskId]);
        addToast(`Submission for ${taskId} received! Score: ${score.toFixed(1)}`, 'success');

        setTeams(prevTeams => {
            const newTeams = prevTeams.map(team => {
                if (team.id === user.teamId) {
                    let submission = team.submissions.find(s => s.taskId === taskId);
                    
                    if (submission) {
                        submission.attempts += 1;
                        if (submission.score === null || score > submission.score) {
                          submission.score = score;
                        }
                    } else {
                        submission = { taskId, score, attempts: 1, isBestScore: false }; // isBestScore will be updated below
                        team.submissions.push(submission);
                    }
                    submission.recentlyUpdated = true; // For flash effect

                    // Update isBestScore for all submissions for this team for this task
                    const teamSubmissionsForTask = team.submissions.filter(s => s.taskId === taskId && s.score !== null);
                    const bestScoreForTask = teamSubmissionsForTask.length > 0 ? Math.max(...teamSubmissionsForTask.map(s => s.score!)) : -1;
                    
                    team.submissions.forEach(s => {
                        if (s.taskId === taskId) {
                            s.isBestScore = s.score !== null && s.score === bestScoreForTask;
                        }
                    });

                    // Recalculate total score based on best scores for each task
                    const bestScores = tasks.map(task => {
                        const bestSubmissionForTask = team.submissions
                            .filter(s => s.taskId === task.id && s.isBestScore);
                        return bestSubmissionForTask[0]?.score ?? 0;
                    });
                    
                    team.totalScore = bestScores.reduce((acc, s) => acc + s, 0);
                    team.solved = bestScores.filter(s => s > 0).length;
                }
                return team;
            });
            return reRankTeams(newTeams);
        });

        // Remove flash effect after a delay
        setTimeout(() => {
            setTeams(currentTeams => currentTeams.map(t => ({
                ...t,
                submissions: t.submissions.map(s => ({ ...s, recentlyUpdated: false }))
            })));
        }, 2000);

    } catch (error: any) {
        addToast(error.message, 'error');
    }
  }, [user, contestStatus, masterKey, setTeams, addToast, reRankTeams, tasks]);
  
  const updateContestStatus = (newStatus: ContestStatus) => {
    if (user?.role !== 'admin') {
      addToast('Only admins can change contest status.', 'error');
      return;
    }
    setContestStatus(newStatus);
    addToast(`Contest status updated to ${newStatus}`, 'info');
  };

  const setMasterKeyAction = (keyContent: string) => {
    if (user?.role !== 'admin') {
      addToast('Only admins can upload the master key.', 'error');
      return;
    }
    try {
      const parsedKey = parseMasterKey(keyContent);
      setMasterKey(parsedKey);
      addToast('Master answer key uploaded successfully!', 'success');
    } catch (error: any) {
      addToast(`Error parsing master key: ${error.message}`, 'error');
    }
  };

  const addTeam = (teamName: string) => {
    setTeams(prev => {
        const newTeam: Team = {
            id: prev.length > 0 ? Math.max(...prev.map(t => t.id)) + 1 : 1,
            name: teamName,
            rank: prev.length + 1,
            solved: 0,
            totalScore: 0,
            submissions: tasks.map(task => ({ taskId: task.id, score: null, attempts: 0, isBestScore: false })),
        };
        return reRankTeams([...prev, newTeam]);
    });
  };

  const updateTeam = (updatedTeam: Team) => {
    setTeams(prev => reRankTeams(prev.map(t => t.id === updatedTeam.id ? updatedTeam : t)));
  };
  
  const deleteTeam = (teamId: number) => {
    setTeams(prev => reRankTeams(prev.filter(t => t.id !== teamId)));
  };

  const addTask = (taskName: string) => {
    const newId = `T${tasks.length + 1}`;
    const newTask: Task = { id: newId, name: taskName };
    setTasks(prev => [...prev, newTask]);
    // Also add empty submissions for this task to all teams
    setTeams(prev => prev.map(team => ({
        ...team,
        submissions: [...team.submissions, { taskId: newId, score: null, attempts: 0, isBestScore: false }]
    })));
  };

  const updateTask = (updatedTask: Task) => {
    setTasks(prev => prev.map(t => t.id === updatedTask.id ? updatedTask : t));
  };
  
  const deleteTask = (taskId: string) => {
    setTasks(prev => prev.filter(t => t.id !== taskId));
    // Also remove submissions for this task from all teams
    setTeams(prev => prev.map(team => ({
        ...team,
        submissions: team.submissions.filter(s => s.taskId !== taskId)
    })));
  };

  const resetContest = () => {
    setTeams(mockTeams);
    setTasks(mockTasks);
    setContestStatus('Live');
    setMasterKey(null);
    addToast('Contest has been reset to its initial state.', 'info');
  };

  return (
    <ContestContext.Provider value={{
      teams,
      tasks,
      contestStatus,
      masterKey,
      submitSolution,
      updateContestStatus,
      setMasterKey: setMasterKeyAction,
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