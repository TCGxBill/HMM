const express = require('express');
const db = require('../db');
const router = express.Router();

const getScoreboardData = async () => {
    const query = `
        SELECT
            u.id,
            u.username,
            u.team_name as "teamName",
            COALESCE(
                (SELECT SUM(s_sum.best_score) FROM submissions s_sum WHERE s_sum.user_id = u.id), 0
            ) as "totalScore",
            COALESCE(
                (SELECT COUNT(*) FROM submissions s_count WHERE s_count.user_id = u.id AND s_count.best_score > 0), 0
            ) as "solved",
            COALESCE(
                (
                    SELECT json_agg(json_build_object(
                        'taskId', s_inner.task_id,
                        'score', s_inner.best_score,
                        'attempts', jsonb_array_length(s_inner.history),
                        'history', s_inner.history
                    ))
                    FROM submissions s_inner WHERE s_inner.user_id = u.id
                ), '[]'::json
            ) as submissions
        FROM users u
        WHERE u.role = 'contestant'
        GROUP BY u.id
        ORDER BY "totalScore" DESC;
    `;
    const { rows } = await db.query(query);
    return rows;
};

// GET /api/scoreboard
router.get('/', async (req, res) => {
    try {
        const scoreboardData = await getScoreboardData();
        res.json(scoreboardData);
    } catch (error) {
        console.error('Error fetching scoreboard:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

const broadcastScoreboardUpdate = async (io) => {
    try {
        const scoreboardData = await getScoreboardData();
        io.emit('scoreboard:update', scoreboardData);
    } catch (error) {
        console.error('Error broadcasting scoreboard update:', error);
    }
};

module.exports = router;
module.exports.broadcastScoreboardUpdate = broadcastScoreboardUpdate;
