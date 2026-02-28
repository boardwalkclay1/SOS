// api/sos.js (PostgreSQL version)
const express = require("express");

module.exports = (db) => {
  const router = express.Router();

  router.post("/", async (req, res) => {
    const { groupId, userId, message, location } = req.body;

    if (!groupId || !userId) {
      return res.status(400).json({
        success: false,
        message: "Missing groupId or userId",
      });
    }

    try {
      await db.query(
        `INSERT INTO sos_events (group_id, profile_id, message, location)
         VALUES ($1, $2, $3, $4)`,
        [
          groupId,
          userId,
          message || "SOS triggered",
          location || null
        ]
      );

      res.json({ success: true });
    } catch (err) {
      console.error("POSTGRES SOS ERROR:", err);
      res.status(500).json({
        success: false,
        error: err.message,
      });
    }
  });

  return router;
};
