const express = require("express");

module.exports = (pb) => {
  const router = express.Router();

  // CREATE SOS EVENT
  router.post("/", async (req, res) => {
    const { groupId, userId, message } = req.body;

    if (!groupId || !userId) {
      return res.status(400).json({
        success: false,
        message: "Missing groupId or userId",
      });
    }

    try {
      const record = await pb.collection("sos_events").create({
        group_id: groupId,
        user_id: userId,
        message: message || "SOS triggered",
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
