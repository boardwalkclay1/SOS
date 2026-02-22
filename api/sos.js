const express = require("express");
const router = express.Router();
const axios = require("axios");

// Your PocketBase URL (set this in Railway env vars)
const PB_URL = process.env.PB_URL;

// CREATE SOS EVENT
router.post("/", async (req, res) => {
  const { groupId, userId, message } = req.body;

  if (!groupId || !userId) {
    return res.status(400).json({ success: false, message: "Missing groupId or userId" });
  }

  try {
    const result = await axios.post(`${PB_URL}/api/collections/sos_events/records`, {
      group_id: groupId,
      user_id: userId,
      message: message || "SOS triggered"
    });

    res.json({ success: true, event: result.data });
  } catch (err) {
    console.error("POCKETBASE SOS ERROR:", err.response?.data || err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
