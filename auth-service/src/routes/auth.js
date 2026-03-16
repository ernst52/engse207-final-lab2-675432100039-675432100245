const express = require("express");
const bcrypt = require("bcryptjs");
const { pool } = require("../db/db");
const { generateToken, verifyToken } = require("../middleware/jwtUtils");

const router = express.Router();

const DUMMY_BCRYPT_HASH =
  "$2b$10$CwTycUXWue0Thq9StjUM0uJ8y0R6VQwWi4KFOeFHrgb3R04QLbL7a";

// ── Helper: ส่ง log ไปที่ Log Service ────────────────────────────────
async function logEvent({
  service = "auth-service",
  level,
  event,
  userId,
  ip,
  method,
  path,
  statusCode,
  message,
  meta,
}) {
  try {
    await fetch(`http://log-service:3003/api/logs/internal`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        service,
        level,
        event,
        user_id: userId,
        ip_address: ip,
        method,
        path,
        status_code: statusCode,
        message,
        meta,
      }),
    });
  } catch (_) {}
}

// ─────────────────────────────────────────────
// POST /api/auth/register
// ─────────────────────────────────────────────
router.post("/register", async (req, res) => {
  const { email, password, username } = req.body;
  const ip = req.headers["x-real-ip"] || req.ip;

  if (!email || !password || !username) {
    return res.status(400).json({
      error: "กรุณากรอก email, password และ username",
    });
  }
  if (password.length < 6) {
    return res.status(400).json({
      error: "Password ต้องมีอย่างน้อย 6 ตัวอักษร",
    });
  }

  try {
    const passwordHash = await bcrypt.hash(password, 10);

    const result = await pool.query(
      `INSERT INTO users (username, email, password_hash, role)
       VALUES ($1, $2, $3, 'member')
       RETURNING id, username, email, role`,
      [username, email.toLowerCase(), passwordHash]
    );

    const user = result.rows[0];

    const token = generateToken({
      sub:      user.id,
      email:    user.email,
      role:     user.role,
      username: user.username,
    });

    await logEvent({
      level:      "INFO",
      event:      "REGISTER_SUCCESS",
      userId:     user.id,
      ip,
      method:     "POST",
      path:       "/api/auth/register",
      statusCode: 201,
      message:    `User ${user.username} registered`,
      meta:       { username: user.username, role: user.role },
    });

    res.status(201).json({
      message: "สมัครสมาชิกสำเร็จ",
      token,
      user: {
        id:       user.id,
        username: user.username,
        email:    user.email,
        role:     user.role,
      },
    });
  } catch (err) {
    if (err.code === "23505") {
      return res.status(409).json({ error: "Email หรือ Username นี้ถูกใช้แล้ว" });
    }
    console.error("[AUTH] Register error:", err.message);

    await logEvent({
      level:      "ERROR",
      event:      "REGISTER_ERROR",
      ip,
      method:     "POST",
      path:       "/api/auth/register",
      statusCode: 500,
      message:    err.message,
      meta:       { email },
    });

    res.status(500).json({ error: "Server error" });
  }
});

// ─────────────────────────────────────────────
// POST /api/auth/login
// ─────────────────────────────────────────────
router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  const ip = req.headers["x-real-ip"] || req.ip;

  if (!email || !password) {
    return res.status(400).json({ error: "กรุณากรอก email และ password" });
  }

  const normalizedEmail = String(email).trim().toLowerCase();

  try {
    const result = await pool.query(
      "SELECT id, username, email, password_hash, role FROM users WHERE email = $1",
      [normalizedEmail]
    );

    const user = result.rows[0] || null;

    const passwordHash = user ? user.password_hash : DUMMY_BCRYPT_HASH;
    const isValid = await bcrypt.compare(password, passwordHash);

    if (!user || !isValid) {
      await logEvent({
        level:      "WARN",
        event:      "LOGIN_FAILED",
        userId:     user?.id || null,
        ip,
        method:     "POST",
        path:       "/api/auth/login",
        statusCode: 401,
        message:    `Login failed for: ${normalizedEmail}`,
        meta:       { email: normalizedEmail },
      });

      return res.status(401).json({ error: "Email หรือ Password ไม่ถูกต้อง" });
    }

    await pool.query("UPDATE users SET last_login = NOW() WHERE id = $1", [
      user.id,
    ]);

    const token = generateToken({
      sub:      user.id,
      email:    user.email,
      role:     user.role,
      username: user.username,
    });

    await logEvent({
      level:      "INFO",
      event:      "LOGIN_SUCCESS",
      userId:     user.id,
      ip,
      method:     "POST",
      path:       "/api/auth/login",
      statusCode: 200,
      message:    `User ${user.username} logged in`,
      meta:       { username: user.username, role: user.role },
    });

    res.json({
      message: "Login สำเร็จ",
      token,
      user: {
        id:       user.id,
        username: user.username,
        email:    user.email,
        role:     user.role,
      },
    });
  } catch (err) {
    console.error("[AUTH] Login error:", err.message);

    await logEvent({
      level:      "ERROR",
      event:      "LOGIN_ERROR",
      ip,
      method:     "POST",
      path:       "/api/auth/login",
      statusCode: 500,
      message:    err.message,
      meta:       { email: normalizedEmail },
    });

    res.status(500).json({ error: "Server error" });
  }
});

// ─────────────────────────────────────────────
// GET /api/auth/verify
// ─────────────────────────────────────────────
router.get("/verify", (req, res) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ valid: false, error: "No token provided" });
  }

  try {
    const decoded = verifyToken(token);
    res.json({ valid: true, user: decoded });
  } catch (err) {
    res.status(401).json({ valid: false, error: err.message });
  }
});

// GET /api/auth/health
router.get("/health", (req, res) => {
  res.json({ status: "ok", service: "auth-service", time: new Date() });
});

module.exports = router;