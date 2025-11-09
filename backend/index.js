const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const cors = require('cors');
require('dotenv').config();

const db = require('./db');
const authRoutes = require('./routes/auth');
const scoreboardRoutes = require('./routes/scoreboard');
const teamRoutes = require('./routes/teams');

const app = express();

// Middleware
app.use(cors({
    origin: "*", // Adjust for production
}));
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*", // Adjust for production
        methods: ["GET", "POST"]
    }
});

// Make `io` accessible to routes
app.set('io', io);

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/scoreboard', scoreboardRoutes);
app.use('/api/teams', teamRoutes);


// WebSocket Logic
io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);
    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
    });
});

const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
    console.log(`Backend server is running on http://localhost:${PORT}`);
});
