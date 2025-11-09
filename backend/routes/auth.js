const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../db');
const { broadcastScoreboardUpdate } = require('./scoreboard');

const router = express.Router();

// POST /api/auth/register
router.post('/register', async (req, res) => {
    const { username, email, password, role, teamName } = req.body;

    if (!username || !email || !password || !role) {
        return res.status(400).json({ message: 'Missing required fields.' });
    }
    if (role === 'contestant' && !teamName) {
        return res.status(400).json({ message: 'Team name is required for contestants.' });
    }

    try {
        // Check for existing user or team
        const userCheck = await db.query('SELECT id FROM users WHERE username = $1 OR email = $2', [username, email]);
        if (userCheck.rows.length > 0) {
            return res.status(409).json({ message: 'error.usernameExists' });
        }
        if (role === 'contestant') {
            const teamCheck = await db.query('SELECT id FROM users WHERE team_name = $1 AND role = \'contestant\'', [teamName]);
            if (teamCheck.rows.length > 0) {
                return res.status(409).json({ message: 'error.teamNameExists' });
            }
        }

        const salt = await bcrypt.genSalt(10);
        const password_hash = await bcrypt.hash(password, salt);

        const query = 'INSERT INTO users (username, email, password_hash, role, team_name) VALUES ($1, $2, $3, $4, $5) RETURNING id, username, email, role, team_name';
        const { rows } = await db.query(query, [username, email, password_hash, role, teamName]);
        
        const newUser = rows[0];
        res.status(201).json({
            id: newUser.id,
            username: newUser.username,
            email: newUser.email,
            role: newUser.role,
            teamName: newUser.team_name,
        });

        // After successful registration of a contestant, update scoreboard
        if (role === 'contestant') {
            const io = req.app.get('io');
            broadcastScoreboardUpdate(io);
        }

    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ message: 'error.registrationFailed' });
    }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
    const { username, password, role } = req.body;

    if (!username || !password || !role) {
        return res.status(400).json({ message: 'Missing required fields.' });
    }

    try {
        const { rows } = await db.query('SELECT * FROM users WHERE username = $1 AND role = $2', [username, role]);
        if (rows.length === 0) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }
        
        const user = rows[0];
        const isMatch = await bcrypt.compare(password, user.password_hash);

        if (!isMatch) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        res.json({
            id: user.id,
            username: user.username,
            email: user.email,
            role: user.role,
            teamName: user.team_name,
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'error.genericLogin' });
    }
});


module.exports = router;
