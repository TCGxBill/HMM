import { User } from '../types';

const API_URL = '/api';

/**
 * Attempts to log in a user by checking credentials against the mock API.
 * The API doesn't support querying, so we fetch all users and check locally.
 */
export const loginUser = async (username: string, password: string, role: 'admin' | 'contestant'): Promise<User | null> => {
    const endpoint = role === 'admin' ? '/admins' : '/students';
    const response = await fetch(`${API_URL}${endpoint}`);
    if (!response.ok) {
        throw new Error('error.fetchUserData');
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
 * Registers a new user by POSTing their data to the mock API after checking for uniqueness.
 */
export const registerUser = async (userData: Omit<User, 'id'>): Promise<User> => {
    // 1. Fetch existing users to check for uniqueness
    const [students, admins] = await Promise.all([getStudents(), getAdmins()]);
    const allUsers = [...students, ...admins];

    // 2. Check for username uniqueness
    if (allUsers.some(user => user.username === userData.username)) {
        throw new Error('error.usernameExists');
    }

    // 3. Check for team name uniqueness for contestants
    if (userData.role === 'contestant' && students.some(student => student.teamName === userData.teamName)) {
        throw new Error('error.teamNameExists');
    }
    
    // 4. If checks pass, proceed with registration
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
        throw new Error(errorData.message || 'error.registrationFailed');
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
        throw new Error('error.fetchStudentData');
    }
    return response.json();
};


/**
 * Fetches all admin records from the API.
 */
export const getAdmins = async (): Promise<User[]> => {
    const response = await fetch(`${API_URL}/admins`);
    if (!response.ok) {
        throw new Error('error.fetchAdminData');
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
        throw new Error('error.updateStudentData');
    }

    return response.json();
}

/**
 * Deletes a student record from the API.
 */
export const deleteStudent = async (studentId: string): Promise<void> => {
    const response = await fetch(`${API_URL}/students/${studentId}`, {
        method: 'DELETE',
    });

    if (!response.ok) {
        throw new Error('error.deleteStudentData');
    }
};