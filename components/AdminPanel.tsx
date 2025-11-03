
import React, { useState, useCallback, useMemo } from 'react';
import { useContest } from '../context/ContestContext';
import { useToast } from '../context/ToastContext';
import { useDropzone } from 'react-dropzone';
import { ContestStatus, Task, Team } from '../types';
import { UploadIcon, EditIcon, DeleteIcon } from './Icons';
import { TeamEditModal } from './TeamEditModal';
import { TaskEditModal } from './TaskEditModal';

export const AdminPanel: React.FC = () => {
    const { 
        contestStatus, updateContestStatus, setMasterKey, resetContest,
        teams, tasks, addTeam, updateTeam, deleteTeam, addTask, updateTask, deleteTask
    } = useContest();
    const { addToast } = useToast();

    const [newTeamName, setNewTeamName] = useState('');
    const [newTaskName, setNewTaskName] = useState('');
    const [editingTeam, setEditingTeam] = useState<Team | null>(null);
    const [editingTask, setEditingTask] = useState<Task | null>(null);

    const onDrop = useCallback((acceptedFiles: File[]) => {
        if (acceptedFiles.length > 0) {
            const file = acceptedFiles[0];
            const reader = new FileReader();
            reader.onload = (event) => {
                const content = event.target?.result as string;
                setMasterKey(content);
            };
            reader.readAsText(file);
        }
    }, [setMasterKey]);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: { 'text/csv': ['.csv'] },
        multiple: false,
    });
    
    const dropzoneClasses = useMemo(() => {
        const base = "border-2 border-dashed border-contest-gray rounded-lg p-6 text-center cursor-pointer transition-colors";
        return isDragActive ? `${base} bg-contest-blue/20 border-contest-blue` : `${base} hover:border-gray-400`;
    }, [isDragActive]);

    const handleAddTeam = () => {
        if (newTeamName.trim()) {
            addTeam(newTeamName.trim());
            setNewTeamName('');
            addToast(`Team "${newTeamName.trim()}" added.`, 'success');
        }
    };
    
    const handleAddTask = () => {
        if (newTaskName.trim()) {
            addTask(newTaskName.trim());
            setNewTaskName('');
            addToast(`Task "${newTaskName.trim()}" added.`, 'success');
        }
    };
    
    const handleResetContest = () => {
        if (window.confirm('Are you sure you want to reset the entire contest? This will restore mock data and cannot be undone.')) {
            resetContest();
        }
    };

    return (
        <div className="bg-contest-dark-light p-6 rounded-lg shadow-2xl max-w-4xl mx-auto my-8 space-y-8">
            <h2 className="text-3xl font-bold text-white text-center">Admin Panel</h2>

            {/* Contest Status and Master Key */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-contest-dark p-4 rounded-lg">
                    <h3 className="text-xl font-semibold text-white mb-3">Contest Status</h3>
                    <div className="flex space-x-2">
                        {(['Not Started', 'Live', 'Finished'] as ContestStatus[]).map(status => (
                            <button key={status} onClick={() => updateContestStatus(status)}
                                className={`flex-1 py-2 px-4 rounded-md font-semibold transition-colors ${contestStatus === status ? 'bg-contest-blue text-white' : 'bg-contest-gray hover:bg-gray-600'}`}>
                                {status}
                            </button>
                        ))}
                    </div>
                </div>
                <div className="bg-contest-dark p-4 rounded-lg">
                    <h3 className="text-xl font-semibold text-white mb-3">Master Answer Key</h3>
                    <div {...getRootProps()} className={dropzoneClasses}>
                        <input {...getInputProps()} />
                        <UploadIcon className="w-8 h-8 mx-auto text-gray-400" />
                        <p className="mt-2 text-sm text-gray-400">Drop a .csv key file here, or click to select</p>
                    </div>
                </div>
            </div>

            {/* Team Management */}
            <div className="bg-contest-dark p-4 rounded-lg">
                <h3 className="text-xl font-semibold text-white mb-3">Manage Teams</h3>
                <div className="flex space-x-2 mb-4">
                    <input type="text" value={newTeamName} onChange={e => setNewTeamName(e.target.value)} placeholder="New team name"
                        className="flex-1 bg-contest-dark-light border border-contest-gray rounded-md px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-contest-blue"/>
                    <button onClick={handleAddTeam} className="px-4 py-2 bg-contest-blue text-white rounded-md font-semibold hover:bg-blue-600">Add Team</button>
                </div>
                <ul className="space-y-2 max-h-60 overflow-y-auto pr-2">
                    {teams.map(team => (
                        <li key={team.id} className="flex items-center justify-between bg-contest-dark-light p-2 rounded">
                            <span className="text-white">{team.name}</span>
                            <div className="space-x-2">
                                <button onClick={() => setEditingTeam(team)} className="text-yellow-400 hover:text-yellow-300"><EditIcon className="w-5 h-5"/></button>
                                <button onClick={() => deleteTeam(team.id)} className="text-red-500 hover:text-red-400"><DeleteIcon className="w-5 h-5"/></button>
                            </div>
                        </li>
                    ))}
                </ul>
            </div>
            
            {/* Task Management */}
            <div className="bg-contest-dark p-4 rounded-lg">
                <h3 className="text-xl font-semibold text-white mb-3">Manage Tasks</h3>
                <div className="flex space-x-2 mb-4">
                    <input type="text" value={newTaskName} onChange={e => setNewTaskName(e.target.value)} placeholder="New task name"
                        className="flex-1 bg-contest-dark-light border border-contest-gray rounded-md px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-contest-blue"/>
                    <button onClick={handleAddTask} className="px-4 py-2 bg-contest-blue text-white rounded-md font-semibold hover:bg-blue-600">Add Task</button>
                </div>
                <ul className="space-y-2 max-h-60 overflow-y-auto pr-2">
                    {tasks.map(task => (
                        <li key={task.id} className="flex items-center justify-between bg-contest-dark-light p-2 rounded">
                            <span className="text-white">{task.name} ({task.id})</span>
                             <div className="space-x-2">
                                <button onClick={() => setEditingTask(task)} className="text-yellow-400 hover:text-yellow-300"><EditIcon className="w-5 h-5"/></button>
                                <button onClick={() => deleteTask(task.id)} className="text-red-500 hover:text-red-400"><DeleteIcon className="w-5 h-5"/></button>
                            </div>
                        </li>
                    ))}
                </ul>
            </div>
            
             {/* Reset Contest */}
            <div className="bg-contest-dark p-4 rounded-lg">
                <h3 className="text-xl font-semibold text-red-500 mb-3">Danger Zone</h3>
                <button onClick={handleResetContest} className="w-full py-2 px-4 bg-red-600 hover:bg-red-700 text-white font-bold rounded-md">
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
                    addToast("Team updated!", 'success');
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