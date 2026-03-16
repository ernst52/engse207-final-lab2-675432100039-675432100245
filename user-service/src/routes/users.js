const express = require('express');
const { pool } = require('../db/db');
const { requireAuth, requireRole } = require('../middleware/authMiddleware');

const router = express.Router();

// GET /api/users/me — ดูโปรไฟล์ตัวเอง (ต้อง login)
router.get('/me', requireAuth, async (req, res) => {
  try {
    let result = await pool.query(
      'SELECT * FROM user_profiles WHERE user_id = $1',
      [req.user.sub]
    );

    if (!result.rows[0]) {
      // Auto-create profile from JWT data
      result = await pool.query(
        `INSERT INTO user_profiles (user_id, username, email)
         VALUES ($1, $2, $3) RETURNING *`,
        [req.user.sub, req.user.username, req.user.email]
      );
    }

    res.json({ user: result.rows[0] });
  } catch (err) {
    console.error('[USER] /me error:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/users — ดู users ทั้งหมด (admin only)
router.get('/', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, user_id, username, email, role, updated_at FROM user_profiles ORDER BY updated_at DESC'
    );
    res.json({ users: result.rows, total: result.rowCount });
  } catch (err) {
    console.error('[USER] GET / error:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/users/health
router.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'user-service' });
});

// PUT /api/users/me — แก้ไข profile
router.put('/me', requireAuth, async (req, res) => {
  const { display_name, bio, avatar_url } = req.body;
  try {
    // ตรวจว่ามี profile อยู่ไหม ถ้าไม่มีสร้างก่อน
    const check = await pool.query(
      'SELECT id FROM user_profiles WHERE user_id = $1',
      [req.user.sub]
    );
    if (!check.rows[0]) {
      await pool.query(
        `INSERT INTO user_profiles (user_id, username, email, role)
         VALUES ($1, $2, $3, $4)`,
        [req.user.sub, req.user.username, req.user.email, req.user.role]
      );
    }

    const result = await pool.query(
      `UPDATE user_profiles
       SET display_name = COALESCE($1, display_name),
           bio          = COALESCE($2, bio),
           avatar_url   = COALESCE($3, avatar_url),
           updated_at   = NOW()
       WHERE user_id = $4
       RETURNING *`,
      [display_name, bio, avatar_url, req.user.sub]
    );
    res.json({ user: result.rows[0] });
  } catch (err) {
    console.error('[USER] PUT /me error:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;