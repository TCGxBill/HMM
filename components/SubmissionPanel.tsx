import React, { useState, useCallback, useMemo } from 'react';
import { useDropzone } from 'react-dropzone';
import { useContest } from '../context/ContestContext';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from '../context/LanguageContext';
import { UploadIcon, ChevronDownIcon, ChevronUpIcon } from './Icons';

export const SubmissionPanel: React.FC = () => {
  const { user } = useAuth();
  const { teams, tasks, submitSolution, contestStatus } = useContest();
  const { addToast } = useToast();
  const { t } = useTranslation();
  const [selectedTask, setSelectedTask] = useState<string>(tasks[0]?.id || '');
  const [file, setFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [fileContent, setFileContent] = useState<string>('');
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);

  const currentUserTeam = useMemo(() => {
    if (!user || user.role !== 'contestant') return null;
    return teams.find(team => team.name === user.teamName);
  }, [teams, user]);
  
  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      const currentFile = acceptedFiles[0];
      setFile(currentFile);
      const reader = new FileReader();
      reader.onload = (event) => {
        setFileContent(event.target?.result as string);
      };
      reader.readAsText(currentFile);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'text/csv': ['.csv'] },
    multiple: false,
  });

  const handleSubmit = async () => {
    if (!selectedTask || !file || !fileContent) {
      addToast(t('error.selectTaskAndFile'), 'error');
      return;
    }

    setIsLoading(true);
    await submitSolution(selectedTask, fileContent);
    setIsLoading(false);
    
    setFile(null);
    setFileContent('');
  };

  const toggleHistory = (taskId: string) => {
    setExpandedTaskId(prev => (prev === taskId ? null : taskId));
  };

  const dropzoneClasses = useMemo(() => {
    const base = "border-2 border-dashed border-contest-gray rounded-lg p-8 text-center cursor-pointer transition-colors";
    return isDragActive ? `${base} bg-contest-primary/20 border-contest-primary` : `${base} hover:border-gray-400`;
  }, [isDragActive]);

  const isSubmissionDisabled = isLoading || !file || !selectedTask || contestStatus !== 'Live';

  const userSubmissions = useMemo(() => {
    return currentUserTeam?.submissions.filter(s => s.attempts > 0) || [];
  }, [currentUserTeam]);

  return (
    <div className="bg-contest-dark-light p-6 rounded-xl shadow-2xl max-w-2xl mx-auto my-8">
      <h2 className="text-2xl font-bold text-white mb-4">{t('submissionPanelTitle')}</h2>
      <div className="space-y-4">
        <div>
          <label htmlFor="task-select" className="block text-sm font-medium text-gray-300 mb-2">
            {t('selectTask')}
          </label>
          <select
            id="task-select"
            value={selectedTask}
            onChange={(e) => setSelectedTask(e.target.value)}
            className="w-full bg-contest-dark border border-contest-gray rounded-md p-2 text-white focus:outline-none focus:ring-2 focus:ring-contest-primary"
          >
            {tasks.map(task => (
              <option key={task.id} value={task.id}>{task.name}</option>
            ))}
          </select>
        </div>
        
        <div {...getRootProps()} className={dropzoneClasses}>
          <input {...getInputProps()} />
          <UploadIcon className="w-12 h-12 mx-auto text-gray-400" />
          {file ? (
            <p className="mt-2 text-white">{file.name}</p>
          ) : isDragActive ? (
            <p className="mt-2 text-contest-primary">{t('dropzoneActive')}</p>
          ) : (
            <p className="mt-2 text-gray-400">{t('dropzoneDefault')}</p>
          )}
        </div>

        <button
          onClick={handleSubmit}
          disabled={isSubmissionDisabled}
          className="w-full p-3 bg-contest-primary text-white font-bold rounded-md hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-contest-dark-light focus:ring-indigo-500 disabled:bg-contest-gray disabled:cursor-not-allowed transition-colors"
        >
          {contestStatus !== 'Live' 
            ? t('submissionsClosed', { status: t(`status${contestStatus.replace(' ','')}`) })
            : isLoading 
              ? t('submitting')
              : t('submitSolution')}
        </button>
      </div>

      {userSubmissions.length > 0 && (
          <div className="mt-8 pt-6 border-t border-contest-gray">
              <h3 className="text-xl font-bold text-white mb-4">{t('mySubmissionHistory')}</h3>
              <ul className="space-y-3">
                  {tasks.map(task => {
                      const submission = userSubmissions.find(s => s.taskId === task.id);
                      if (!submission) return null;

                      const isExpanded = expandedTaskId === task.id;

                      return (
                          <li key={task.id} className="bg-contest-dark p-4 rounded-lg">
                              <div className="flex justify-between items-center">
                                  <div>
                                      <p className="font-semibold text-white">{task.name}</p>
                                      <p className="text-sm text-gray-400">
                                          {t('bestScore')}: <span className="font-bold text-contest-primary">{submission.score?.toFixed(1) ?? 'N/A'}</span>
                                          {' | '}
                                          {t('attempts')}: <span className="font-bold text-contest-secondary">{submission.attempts}</span>
                                      </p>
                                  </div>
                                  {submission.history && submission.history.length > 0 && (
                                      <button 
                                          onClick={() => toggleHistory(task.id)}
                                          className="p-2 text-gray-400 hover:text-white rounded-full hover:bg-contest-gray"
                                          aria-label={isExpanded ? 'Collapse history' : 'Expand history'}
                                      >
                                          {isExpanded ? <ChevronUpIcon className="w-5 h-5" /> : <ChevronDownIcon className="w-5 h-5" />}
                                      </button>
                                  )}
                              </div>
                              {isExpanded && submission.history && submission.history.length > 0 && (
                                  <div className="mt-4 pt-4 border-t border-contest-gray/50">
                                      <h4 className="text-sm font-semibold text-gray-300 mb-2">{t('historyAttemptsTitle')}</h4>
                                      <ul className="space-y-2 max-h-40 overflow-y-auto pr-2">
                                          {[...submission.history].reverse().map((attempt, index) => (
                                              <li key={index} className="flex justify-between items-center text-sm bg-contest-dark-light p-2 rounded">
                                                  <span className="text-gray-400">{t('historyAttempt', { number: submission.history.length - index })}</span>
                                                  <span className={`font-semibold ${attempt.score === submission.score ? 'text-contest-green' : 'text-white'}`}>{attempt.score.toFixed(1)}</span>
                                                  <span className="text-xs text-gray-500">{new Date(attempt.timestamp).toLocaleString()}</span>
                                              </li>
                                          ))}
                                      </ul>
                                  </div>
                              )}
                          </li>
                      );
                  })}
              </ul>
          </div>
      )}
    </div>
  );
};
