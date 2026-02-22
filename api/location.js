const express = require("express");
const router = express.Router();
const axios = require("axios");

// Your PocketBase URL (set this in Railway env vars)
const PB_URL = process.env.PB_URL;

// SAVE LOCATION
router.post("/", async (req, res) => {
  const { groupId, userId, location } = req.body;

  if (!groupId || !userId || !location) {
    return res.status(400).json({ success: false, message: "Missing fields" });
  }

  try {
    const result = await axios.post(`${PB_URL}/api/collections/locations/records`, {
      group_id: groupId,
      user_id: userId,
      lat: location.lat,
      lng: location.lng
    });

    res.json({ success: true, record: result.data });
  } catch (err) {
    console.error("POCKETBASE LOCATION ERROR:", err.response?.data || err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
