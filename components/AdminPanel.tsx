import React, { useState, useCallback, useMemo } from 'react';
import { useContest } from '../context/ContestContext';
import { useToast } from '../context/ToastContext';
import { useDropzone } from 'react-dropzone';
import { ContestStatus, Task, Team } from '../types';
import { UploadIcon, EditIcon, DeleteIcon } from './Icons';
import { TeamEditModal } from './TeamEditModal';
import { TaskEditModal } from './TaskEditModal';

const TaskKeyManager: React.FC<{ task: Task }> = ({ task }) => {
    const { setTaskKey, updateTask } = useContest();

    const onDrop = useCallback((acceptedFiles: File[]) => {
        if (acceptedFiles.length > 0) {
            const file = acceptedFiles[0];
            const reader = new FileReader();
            reader.onload = (event) => {
                const content = event.target?.result as string;
                setTaskKey(task.id, content);
            };
            reader.readAsText(file);
        }
    }, [task.id, setTaskKey]);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: { 'text/csv': ['.csv'] },
        multiple: false,
    });

    const handleVisibilityToggle = () => {
        const newVisibility = task.keyVisibility === 'private' ? 'public' : 'private';
        updateTask({ ...task, keyVisibility: newVisibility });
    };

    return (
        <li className="flex items-center justify-between bg-contest-dark-light p-3 rounded-lg">
            <div className="flex-1">
                <p className="text-white font-semibold">{task.name} ({task.id})</p>
                <p className={`text-xs ${task.keyUploaded ? 'text-contest-green' : 'text-contest-yellow'}`}>
                    Key Status: {task.keyUploaded ? 'Uploaded' : 'Missing'}
                </p>
            </div>
             <div className="flex items-center space-x-4">
                <div {...getRootProps()} className="cursor-pointer text-gray-400 hover:text-white" title="Upload key for this task">
                    <input {...getInputProps()} />
                    <UploadIcon className="w-6 h-6" />
                </div>
                <div className="flex items-center space-x-2">
                    <span className={`text-sm font-medium ${task.keyVisibility === 'public' ? 'text-gray-400' : 'text-white'}`}>Private</span>
                     <button onClick={handleVisibilityToggle}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${task.keyVisibility === 'public' ? 'bg-contest-primary' : 'bg-contest-gray'}`}>
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${task.keyVisibility === 'public' ? 'translate-x-6' : 'translate-x-1'}`}/>
                    </button>
                    <span className={`text-sm font-medium ${task.keyVisibility === 'public' ? 'text-white' : 'text-gray-400'}`}>Public</span>
                </div>
            </div>
        </li>
    );
};


export const AdminPanel: React.FC = () => {
    // FIX: Destructure addTask from useContest and reorganize for readability.
    const { 
        contestStatus, updateContestStatus, resetContest,
        teams, addTeam, updateTeam, deleteTeam,
        tasks, addTask, updateTask, deleteTask
    } = useContest();
    const { addToast } = useToast();

    const [newTaskName, setNewTaskName] = useState('');
    const [editingTeam, setEditingTeam] = useState<Team | null>(null);
    const [editingTask, setEditingTask] = useState<Task | null>(null);
    
    const handleAddTask = () => {
        if (newTaskName.trim()) {
            addTask(newTaskName.trim());
            setNewTaskName('');
            addToast(`Task "${newTaskName.trim()}" added.`, 'success');
        }
    };
    
    const handleResetContest = () => {
        if (window.confirm('Are you sure you want to reset the contest? This will reset tasks, status, and keys, and reload scoreboard data from the API.')) {
            resetContest();
        }
    };
    
    const handleDeleteTeam = (team: Team) => {
        if (window.confirm(`Are you sure you want to delete the team "${team.name}"? This action cannot be undone.`)) {
            deleteTeam(team.id);
        }
    };

    return (
        <div className="bg-contest-dark-light p-6 rounded-xl shadow-2xl max-w-4xl mx-auto my-8 space-y-8">
            <h2 className="text-3xl font-bold text-white text-center">Admin Panel</h2>

            {/* Contest Status */}
            <div className="bg-contest-dark p-4 rounded-lg">
                <h3 className="text-xl font-semibold text-white mb-3">Contest Status</h3>
                <div className="flex space-x-2">
                    {(['Not Started', 'Live', 'Finished'] as ContestStatus[]).map(status => (
                        <button key={status} onClick={() => updateContestStatus(status)}
                            className={`flex-1 py-2 px-4 rounded-md font-semibold transition-colors ${contestStatus === status ? 'bg-contest-primary text-white' : 'bg-contest-gray hover:bg-gray-600'}`}>
                            {status}
                        </button>
                    ))}
                </div>
            </div>

            {/* Task and Key Management */}
            <div className="bg-contest-dark p-4 rounded-lg">
                <h3 className="text-xl font-semibold text-white mb-3">Manage Tasks & Answer Keys</h3>
                 <div className="flex space-x-2 mb-4">
                    <input type="text" value={newTaskName} onChange={e => setNewTaskName(e.target.value)} placeholder="New task name"
                        className="flex-1 bg-contest-dark-light border border-contest-gray rounded-md px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-contest-primary"/>
                    <button onClick={handleAddTask} className="px-4 py-2 bg-contest-primary text-white rounded-md font-semibold hover:bg-indigo-500">Add Task</button>
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
            
            {/* Team Management - Readonly */}
             <div className="bg-contest-dark p-4 rounded-lg">
                <h3 className="text-xl font-semibold text-white mb-3">Manage Teams</h3>
                <p className="text-sm text-gray-400 mb-3">Teams are now managed through user registration. You can edit team names or delete teams here.</p>
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
                <h3 className="text-xl font-semibold text-contest-red mb-3">Danger Zone</h3>
                <button onClick={handleResetContest} className="w-full py-2 px-4 bg-contest-red hover:bg-red-700 text-white font-bold rounded-md">
                    Reset Contest to Initial State
                </button>
            </div>

            {/* Modals */}
            <TeamEditModal 
                team={editingTeam}
                onClose={() => setEditingTeam(null)}
                onSave={(team) => {
                    updateTeam(team);
                    setEditingTeam(null);
                    addToast("Team updated locally! API update not implemented in this version.", 'info');
                }}
            />
            <TaskEditModal 
                task={editingTask}
                onClose={() => setEditingTask(null)}
                onSave={(task) => {
                    updateTask(task);
                    setEditingTask(null);
                    addToast("Task updated!", 'success');
                }}
            />
        </div>
    );
};