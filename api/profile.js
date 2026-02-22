const express = require("express");
const router = express.Router();
const axios = require("axios");

const PB_URL = process.env.PB_URL; // set this in Railway

router.post("/", async (req, res) => {
  const { userId, preferences } = req.body;

  try {
    const result = await axios.post(`${PB_URL}/api/collections/preferences/records`, {
      user_id: userId,
      data: preferences
    });

    res.json({ success: true, record: result.data });
  } catch (err) {
    console.error("PB PREF ERROR:", err.response?.data || err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
