const express = require("express");
const PocketBase = require("pocketbase/cjs");

module.exports = (pb) => {
  const router = express.Router();

  const PB_URL = "https://pocketbase-production-289f.up.railway.app";
  const client = pb || new PocketBase(PB_URL);

  router.post("/", async (req, res) => {
    const { groupId, userId, message, location } = req.body;

    if (!groupId || !userId) {
      return res.status(400).json({
        success: false,
        message: "Missing groupId or userId",
      });
    }

    try {
      const record = await client.collection("sos_events").create({
        group_id: groupId,
        user_id: userId,
        message: message || "SOS triggered",
        location: location || null,
      });

      res.json({ success: true, event: record });
    } catch (err) {
      console.error("POCKETBASE SOS ERROR:", err);
      res.status(500).json({
        success: false,
        error: err.message,
      });
    }
  });

  return router;
};
