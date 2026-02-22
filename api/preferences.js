const express = require("express");
const router = express.Router();
const axios = require("axios");

const PB_URL = process.env.PB_URL;

router.post("/", async (req, res) => {
  const { userId, profile } = req.body;

  try {
    const result = await axios.post(`${PB_URL}/api/collections/profiles/records`, {
      user_id: userId,
      ...profile
    });

    res.json({ success: true, record: result.data });
  } catch (err) {
    console.error("POCKETBASE PROFILE ERROR:", err.response?.data || err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
