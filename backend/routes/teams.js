const express = require('express');
const db = require('../db');
const { broadcastScoreboardUpdate } = require('./scoreboard');
const router = express.Router();

// POST /api/teams/:userId/submit
router.post('/:userId/submit', async (req, res) => {
    const { userId } = req.params;
    const { taskId, attempt } = req.body;
    const io = req.app.get('io');

    if (!taskId || !attempt) {
        return res.status(400).json({ message: 'Missing taskId or attempt data' });
    }
    
    try {
        const upsertQuery = `
            INSERT INTO submissions (user_id, task_id, best_score, history)
            VALUES ($1, $2, $3, $4)
            ON CONFLICT (user_id, task_id) DO UPDATE 
            SET 
                best_score = GREATEST(submissions.best_score, EXCLUDED.best_score),
                history = submissions.history || EXCLUDED.history;
        `;

        await db.query(upsertQuery, [
            userId,
            taskId,
            attempt.score,
            JSON.stringify([attempt])
        ]);

        broadcastScoreboardUpdate(io);
        res.status(200).json({ message: 'Submission successful' });
        
    } catch (error) {
        console.error('Submission update error:', error);
        res.status(500).json({ message: 'Failed to record submission' });
    }
});

// DELETE /api/teams/:id
router.delete('/:id', async (req, res) => {
    const { id } = req.params;
    const io = req.app.get('io');

    try {
        const deleteResult = await db.query('DELETE FROM users WHERE id = $1 AND role = \'contestant\'', [id]);
        
        if (deleteResult.rowCount === 0) {
            return res.status(404).json({ message: 'Team not found' });
        }

        broadcastScoreboardUpdate(io);
        res.status(204).send();

    } catch (error) {
        console.error('Error deleting team:', error);
        res.status(500).json({ message: 'Failed to delete team' });
    }
});

module.exports = router;
