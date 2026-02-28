// api/group.js (PostgreSQL version)
const express = require("express");

module.exports = (db) => {
  const router = express.Router();

  // --------------------------------------------------
  // CREATE GROUP
  // --------------------------------------------------
  router.post("/", async (req, res) => {
    const { name } = req.body;

    if (!name) {
      return res.status(400).json({ success: false, message: "Missing group name" });
    }

    try {
      const result = await db.query(
        `INSERT INTO groups (name)
         VALUES ($1)
         RETURNING *`,
        [name]
      );

      res.json({ success: true, group: result.rows[0] });
    } catch (err) {
      console.error("POSTGRES GROUP CREATE ERROR:", err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // --------------------------------------------------
  // JOIN GROUP
  // --------------------------------------------------
  router.post("/:id/join", async (req, res) => {
    const groupId = req.params.id;
    const { member } = req.body;

    if (!member?.id) {
      return res.status(400).json({ success: false, message: "Missing member.id" });
    }

    try {
      const result = await db.query(
        `INSERT INTO group_members (group_id, profile_id, name, avatar)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT DO NOTHING
         RETURNING *`,
        [groupId, member.id, member.name, member.avatar || null]
      );

      res.json({ success: true, member: result.rows[0] || null });
    } catch (err) {
      console.error("POSTGRES GROUP JOIN ERROR:", err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // --------------------------------------------------
  // GET GROUP STATE
  // --------------------------------------------------
  router.get("/:id/state", async (req, res) => {
    const groupId = req.params.id;

    try {
      // Fetch group
      const group = await db.query(
        `SELECT * FROM groups WHERE id=$1`,
        [groupId]
      );

      if (group.rows.length === 0) {
        return res.json({ success: false, message: "Group not found" });
      }

      // Fetch members
      const members = await db.query(
        `SELECT gm.*, p.contact, p.name AS profile_name, p.location AS profile_location
         FROM group_members gm
         JOIN profiles p ON p.id = gm.profile_id
         WHERE gm.group_id=$1`,
        [groupId]
      );

      // Fetch locations (optional table)
      let locations = [];
      try {
        const locResult = await db.query(
          `SELECT * FROM locations WHERE group_id=$1`,
          [groupId]
        );
        locations = locResult.rows;
      } catch {
        // If locations table doesn't exist, ignore
      }

      res.json({
        success: true,
        group: group.rows[0],
        members: members.rows,
        locations
      });
    } catch (err) {
      console.error("POSTGRES GROUP STATE ERROR:", err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  return router;
};
