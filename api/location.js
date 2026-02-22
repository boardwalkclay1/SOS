const express = require("express");
const router = express.Router();
const pool = require("../db");

router.post("/", async (req, res) => {
  const { groupId, userId, location } = req.body;

  try {
    await pool.query(
      "INSERT INTO locations (group_id, user_id, lat, lng) VALUES ($1, $2, $3, $4)",
      [groupId, userId, location.lat, location.lng]
    );

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
