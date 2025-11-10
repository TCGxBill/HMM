import React, { useState, useCallback, useMemo } from 'react';
import { useContest } from '../context/ContestContext';
import { useToast } from '../context/ToastContext';
import { useTranslation } from '../context/LanguageContext';
import { useDropzone } from 'react-dropzone';
import { ContestStatus, Task, Team } from '../types';
import { UploadIcon, EditIcon, DeleteIcon } from './Icons';
import { TeamEditModal } from './TeamEditModal';
import { TaskEditModal } from './TaskEditModal';

const TaskKeyManager: React.FC<{ task: Task }> = ({ task }) => {
    const { setTaskKey, updateTask, uploadingTasks } = useContest();
    const { t } = useTranslation();
    const isUploading = uploadingTasks.has(task.id);

    const onDrop = useCallback((acceptedFiles: File[]) => {
        if (acceptedFiles.length > 0 && !isUploading) {
            const file = acceptedFiles[0];
            // The new architecture uploads the file directly instead of reading it.
            setTaskKey(task.id, file);
        }
    }, [task.id, setTaskKey, isUploading]);

    const { getRootProps, getInputProps } = useDropzone({
        onDrop,
        accept: { 'text/csv': ['.csv'] },
        multiple: false,
        disabled: isUploading,
    });

    const handleVisibilityToggle = () => {
        const newVisibility = task.keyVisibility === 'private' ? 'public' : 'private';
        updateTask({ ...task, keyVisibility: newVisibility });
    };

    return (
        <li className="flex items-center justify-between bg-contest-dark-light p-3 rounded-lg">
            <div className="flex-1">
                <p className="text-white font-semibold">{task.name} ({task.id})</p>
                {isUploading ? (
                    <p className="text-xs text-contest-primary animate-pulse">{t('keyUploading')}</p>
                ) : (
                    <p className={`text-xs ${task.keyUploaded ? 'text-contest-green' : 'text-contest-yellow'}`}>
                        {t('keyStatus')}: {task.keyUploaded ? t('keyUploaded') : t('keyMissing')}
                    </p>
                )}
            </div>
             <div className="flex items-center space-x-4">
                <div {...getRootProps()} className={`cursor-pointer text-gray-400 ${isUploading ? 'cursor-not-allowed text-gray-600' : 'hover:text-white'}`} title="Upload key for this task">
                    <input {...getInputProps()} />
                    {isUploading ? (
                        <div className="w-6 h-6 border-2 border-contest-primary border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                        <UploadIcon className="w-6 h-6" />
                    )}
                </div>
                <div className="flex items-center space-x-2">
                    <span className={`text-sm font-medium ${task.keyVisibility === 'public' ? 'text-gray-400' : 'text-white'}`}>{t('keyPrivate')}</span>
                     <button onClick={handleVisibilityToggle}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${task.keyVisibility === 'public' ? 'bg-contest-primary' : 'bg-contest-gray'}`}>
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${task.keyVisibility === 'public' ? 'translate-x-6' : 'translate-x-1'}`}/>
                    </button>
                    <span className={`text-sm font-medium ${task.keyVisibility === 'public' ? 'text-white' : 'text-gray-400'}`}>{t('keyPublic')}</span>
                </div>
            </div>
        </li>
    );
};


export const AdminPanel: React.FC = () => {
    const { 
        contestStatus, updateContestStatus, resetContest,
        teams, updateTeam, deleteTeam,
        tasks, addTask, updateTask, deleteTask
    } = useContest();
    const { addToast } = useToast();
    const { t } = useTranslation();

    const [newTaskName, setNewTaskName] = useState('');
    const [editingTeam, setEditingTeam] = useState<Team | null>(null);
    const [editingTask, setEditingTask] = useState<Task | null>(null);
    
    const handleAddTask = () => {
        if (newTaskName.trim()) {
            addTask(newTaskName.trim());
            addToast(t('toastTaskAdded', { taskName: newTaskName.trim() }), 'success');
            setNewTaskName('');
        }
    };
    
    const handleResetContest = () => {
        if (window.confirm(t('confirmReset'))) {
            resetContest();
        }
    };
    
    const handleDeleteTeam = (team: Team) => {
        if (window.confirm(t('confirmDeleteTeam', { teamName: team.name }))) {
            deleteTeam(team.id);
        }
    };

    const contestStatuses: ContestStatus[] = ['Not Started', 'Live', 'Finished'];

    return (
        <div className="bg-contest-dark-light p-6 rounded-xl shadow-2xl max-w-4xl mx-auto my-8 space-y-8">
            <h2 className="text-3xl font-bold text-white text-center">{t('adminPanelTitle')}</h2>

            {/* Contest Status */}
            <div className="bg-contest-dark p-4 rounded-lg">
                <h3 className="text-xl font-semibold text-white mb-3">{t('contestStatus')}</h3>
                <div className="flex space-x-2">
                    {contestStatuses.map(status => (
                        <button key={status} onClick={() => updateContestStatus(status)}
                            className={`flex-1 py-2 px-4 rounded-md font-semibold transition-colors ${contestStatus === status ? 'bg-contest-primary text-white' : 'bg-contest-gray hover:bg-gray-600'}`}>
                            {t(`status${status.replace(' ', '')}`)}
                        </button>
                    ))}
                </div>
            </div>

            {/* Task and Key Management */}
            <div className="bg-contest-dark p-4 rounded-lg">
                <h3 className="text-xl font-semibold text-white mb-3">{t('manageTasksTitle')}</h3>
                 <div className="flex space-x-2 mb-4">
                    <input type="text" value={newTaskName} onChange={e => setNewTaskName(e.target.value)} placeholder={t('newTaskNamePlaceholder')}
                        className="flex-1 bg-contest-dark-light border border-contest-gray rounded-md px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-contest-primary"/>
                    <button onClick={handleAddTask} className="px-4 py-2 bg-contest-primary text-white rounded-md font-semibold hover:bg-indigo-500">{t('addTask')}</button>
                </div>
                <ul className="space-y-3 max-h-96 overflow-y-auto pr-2">
                    {tasks.map(task => (
                        <div key={task.id} className="flex items-center space-x-2">
                            <div className="flex-grow"><TaskKeyManager task={task} /></div>
                            <div className="flex items-center space-x-1">
                                <button onClick={() => setEditingTask(task)} className="p-2 bg-contest-dark-light rounded text-contest-yellow hover:text-yellow-300"><EditIcon className="w-5 h-5"/></button>
                                <button onClick={() => deleteTask(task.id)} className="p-2 bg-contest-dark-light rounded text-contest-red hover:text-red-400"><DeleteIcon className="w-5 h-5"/></button>
                            </div>
                        </div>
                    ))}
                </ul>
            </div>
            
            {/* Team Management */}
             <div className="bg-contest-dark p-4 rounded-lg">
                <h3 className="text-xl font-semibold text-white mb-3">{t('manageTeamsTitle')}</h3>
                <p className="text-sm text-gray-400 mb-3">{t('manageTeamsSubtitle')}</p>
                <ul className="space-y-2 max-h-60 overflow-y-auto pr-2">
                    {teams.map(team => (
                        <li key={team.id} className="flex items-center justify-between bg-contest-dark-light p-2 rounded">
                            <span className="text-white">{team.name}</span>
                            <div className="space-x-2">
                                <button onClick={() => setEditingTeam(team)} className="text-contest-yellow hover:text-yellow-300"><EditIcon className="w-5 h-5"/></button>
                                <button onClick={() => handleDeleteTeam(team)} className="text-contest-red hover:text-red-400"><DeleteIcon className="w-5 h-5"/></button>
                            </div>
                        </li>
                    ))}
                </ul>
            </div>
            
             {/* Reset Contest */}
            <div className="bg-contest-dark p-4 rounded-lg">
                <h3 className="text-xl font-semibold text-contest-red mb-3">{t('dangerZone')}</h3>
                <button onClick={handleResetContest} className="w-full py-2 px-4 bg-contest-red hover:bg-red-700 text-white font-bold rounded-md">
                    {t('resetContest')}
                </button>
            </div>

            {/* Modals */}
            <TeamEditModal 
                team={editingTeam}
                onClose={() => setEditingTeam(null)}
                onSave={(team) => {
                    updateTeam(team);
                    setEditingTeam(null);
                    addToast(t('toastTeamUpdated'), 'info');
                }}
            />
            <TaskEditModal 
                task={editingTask}
                onClose={() => setEditingTask(null)}
                onSave={(task) => {
                    updateTask(task);
                    setEditingTask(null);
                    addToast(t('toastTaskUpdated'), 'success');
                }}
            />
        </div>
    );
};