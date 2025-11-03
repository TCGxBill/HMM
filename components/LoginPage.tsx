
import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { LogoIcon } from './Icons';

export const LoginPage: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    const success = await login(username, password);

    if (!success) {
      setError('Invalid credentials. Please try again.');
    }
    
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-contest-dark font-sans">
      <div className="w-full max-w-md p-8 space-y-8 bg-contest-dark-light rounded-lg shadow-2xl">
        <div className="text-center">
            <div className="flex justify-center items-center mb-4">
                <LogoIcon className="h-12 w-12 text-contest-blue" />
            </div>
          <h1 className="text-3xl font-bold text-white">ICPC Scoreboard Login</h1>
          <p className="text-contest-light-gray mt-2">Enter your credentials to access the contest.</p>
        </div>
        <form className="space-y-6" onSubmit={handleLogin}>
          <div>
            <label className="text-sm font-bold text-gray-400 block mb-2" htmlFor="username">
              Username
            </label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full p-3 bg-contest-dark border border-contest-gray rounded-md text-white focus:outline-none focus:ring-2 focus:ring-contest-blue"
              placeholder="e.g., admin or contestant1"
              required
            />
          </div>
          <div>
            <label className="text-sm font-bold text-gray-400 block mb-2" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-3 bg-contest-dark border border-contest-gray rounded-md text-white focus:outline-none focus:ring-2 focus:ring-contest-blue"
              placeholder="Hint: password123"
              required
            />
          </div>
          
          {error && <p className="text-contest-red text-sm text-center">{error}</p>}

          <div>
            <button
              type="submit"
              disabled={isLoading}
              className="w-full p-3 bg-contest-blue text-white font-bold rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-contest-dark-light focus:ring-blue-500 disabled:bg-contest-gray disabled:cursor-not-allowed"
            >
              {isLoading ? 'Logging in...' : 'Login'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};