import { User } from '../types';

const API_URL = 'https://68004a7eb72e9cfaf7272f66.mockapi.io';

/**
 * Attempts to log in a user by checking credentials against the mock API.
 * The API doesn't support querying, so we fetch all users and check locally.
 */
export const loginUser = async (username: string, password: string, role: 'admin' | 'contestant'): Promise<User | null> => {
    const endpoint = role === 'admin' ? '/admins' : '/students';
    const response = await fetch(`${API_URL}${endpoint}`);
    if (!response.ok) {
        throw new Error('Failed to fetch user data.');
    }
    const users: User[] = await response.json();
    
    const user = users.find(u => u.username === username && u.password === password);
    
    if (user) {
        // Add role to the user object as it's not in the API response
        return { ...user, role };
    }
    
    return null;
};

/**
 * Registers a new user by POSTing their data to the mock API.
 */
export const registerUser = async (userData: Omit<User, 'id'>): Promise<User> => {
    const endpoint = userData.role === 'admin' ? '/admins' : '/students';
    
    const dataToSend: any = {
        username: userData.username,
        email: userData.email,
        password: userData.password,
    };

    if (userData.role === 'contestant') {
        dataToSend.teamName = userData.teamName;
        dataToSend.bestScore = 0;
        dataToSend.submissions = [];
    }

    const response = await fetch(`${API_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dataToSend),
    });

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Registration failed.');
    }

    const newUser: User = await response.json();
    return { ...newUser, role: userData.role };
};

/**
 * Fetches all student records from the API to build the scoreboard.
 */
export const getStudents = async (): Promise<User[]> => {
    const response = await fetch(`${API_URL}/students`);
    if (!response.ok) {
        throw new Error('Failed to fetch student data.');
    }
    return response.json();
};


/**
 * Updates a student's record (e.g., after a submission).
 */
export const updateStudent = async (studentData: User): Promise<User> => {
    const response = await fetch(`${API_URL}/students/${studentData.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            // Only send fields the API expects
            username: studentData.username,
            email: studentData.email,
            password: studentData.password,
            teamName: studentData.teamName,
            bestScore: studentData.bestScore,
            submissions: studentData.submissions,
        }),
    });

    if (!response.ok) {
        throw new Error('Failed to update student data.');
    }

    return response.json();
}