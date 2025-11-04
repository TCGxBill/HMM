import React, { useState, useCallback, useMemo } from 'react';
import { useDropzone } from 'react-dropzone';
import { useContest } from '../context/ContestContext';
import { useToast } from '../context/ToastContext';
import { UploadIcon } from './Icons';

export const SubmissionPanel: React.FC = () => {
  const { tasks, submitSolution, contestStatus } = useContest();
  const { addToast } = useToast();
  const [selectedTask, setSelectedTask] = useState<string>(tasks[0]?.id || '');
  const [file, setFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [fileContent, setFileContent] = useState<string>('');
  
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
      addToast('Please select a task and a file.', 'error');
      return;
    }

    setIsLoading(true);
    await submitSolution(selectedTask, fileContent);
    setIsLoading(false);
    
    // Clear file input on successful or handled submission
    setFile(null);
    setFileContent('');
  };

  const dropzoneClasses = useMemo(() => {
    const base = "border-2 border-dashed border-contest-gray rounded-lg p-8 text-center cursor-pointer transition-colors";
    return isDragActive ? `${base} bg-contest-primary/20 border-contest-primary` : `${base} hover:border-gray-400`;
  }, [isDragActive]);

  const isSubmissionDisabled = isLoading || !file || !selectedTask || contestStatus !== 'Live';

  return (
    <div className="bg-contest-dark-light p-6 rounded-xl shadow-2xl max-w-2xl mx-auto my-8">
      <h2 className="text-2xl font-bold text-white mb-4">Submit Your Solution</h2>
      <div className="space-y-4">
        <div>
          <label htmlFor="task-select" className="block text-sm font-medium text-gray-300 mb-2">
            Select Task
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
            <p className="mt-2 text-contest-primary">Drop the file here ...</p>
          ) : (
            <p className="mt-2 text-gray-400">Drag & drop a .csv file here, or click to select a file</p>
          )}
        </div>

        <button
          onClick={handleSubmit}
          disabled={isSubmissionDisabled}
          className="w-full p-3 bg-contest-primary text-white font-bold rounded-md hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-contest-dark-light focus:ring-indigo-500 disabled:bg-contest-gray disabled:cursor-not-allowed transition-colors"
        >
          {contestStatus !== 'Live' 
            ? `Submissions are closed (${contestStatus})`
            : isLoading 
              ? 'Submitting...' 
              : 'Submit Solution'}
        </button>
      </div>
    </div>
  );
};