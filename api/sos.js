const express = require("express");
const router = express.Router();
const pool = require("../db");

router.post("/", async (req, res) => {
  const { groupId, userId, message } = req.body;

  try {
    await pool.query(
      "INSERT INTO sos_events (group_id, user_id, message) VALUES ($1, $2, $3)",
      [groupId, userId, message]
    );

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
