import { User, SubmissionAttempt, Team } from '../types';

const API_URL = '/api';

type LoginCredentials = Pick<User, 'username' | 'password' | 'role'>;

/**
 * Attempts to log in a user by posting credentials to a secure backend endpoint.
 */
export const loginUser = async (credentials: LoginCredentials): Promise<User | null> => {
    const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials),
    });

    if (!response.ok) {
        if (response.status === 401) return null; // Invalid credentials
        throw new Error('error.genericLogin');
    }
    
    return response.json();
};

/**
 * Registers a new user by POSTing their data to the backend.
 * Uniqueness checks are now handled by the server.
 */
export const registerUser = async (userData: Omit<User, 'id'>): Promise<User> => {
    const response = await fetch(`${API_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData),
    });

    if (!response.ok) {
        // Try to parse error message from backend
        const errorData = await response.json().catch(() => ({ message: 'error.registrationFailed' }));
        throw new Error(errorData.message || 'error.registrationFailed');
    }

    return response.json();
};

/**
 * Fetches the entire scoreboard data from the backend.
 */
export const getScoreboard = async (): Promise<Team[]> => {
    const response = await fetch(`${API_URL}/scoreboard`);
    if (!response.ok) {
        throw new Error('error.fetchStudentData');
    }
    return response.json();
};

/**
 * Submits a solution attempt for a specific user and task.
 */
export const submitSolution = async (userId: string, taskId: string, attempt: SubmissionAttempt): Promise<void> => {
    const response = await fetch(`${API_URL}/teams/${userId}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            taskId,
            attempt
        }),
    });

    if (!response.ok) {
        throw new Error('error.updateStudentData');
    }
};

/**
 * Deletes a team record from the API.
 */
export const deleteTeam = async (teamId: string): Promise<void> => {
    const response = await fetch(`${API_URL}/teams/${teamId}`, {
        method: 'DELETE',
    });

    if (!response.ok) {
        throw new Error('error.deleteStudentData');
    }
};
