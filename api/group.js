const express = require("express");
const router = express.Router();
const pool = require("../db");

// CREATE GROUP
router.post("/", async (req, res) => {
  const { id, name } = req.body;

  try {
    await pool.query(
      "INSERT INTO groups (id, name) VALUES ($1, $2)",
      [id, name]
    );

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// JOIN GROUP
router.post("/:id/join", async (req, res) => {
  const groupId = req.params.id;
  const { member } = req.body;

  try {
    await pool.query(
      "INSERT INTO group_members (id, group_id, name, avatar) VALUES ($1, $2, $3, $4)",
      [member.id, groupId, member.name, member.avatar || null]
    );

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET GROUP STATE
router.get("/:id/state", async (req, res) => {
  const groupId = req.params.id;

  try {
    const group = await pool.query("SELECT * FROM groups WHERE id = $1", [groupId]);
    const members = await pool.query("SELECT * FROM group_members WHERE group_id = $1", [groupId]);
    const locations = await pool.query("SELECT * FROM locations WHERE group_id = $1", [groupId]);

    res.json({
      success: true,
      group: group.rows[0] || null,
      members: members.rows,
      locations: locations.rows
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
