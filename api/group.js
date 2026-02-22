const express = require("express");
const router = express.Router();
const axios = require("axios");

// Your PocketBase URL
const PB_URL = process.env.PB_URL; // set this in Railway

// CREATE GROUP
router.post("/", async (req, res) => {
  const { id, name } = req.body;

  try {
    const result = await axios.post(`${PB_URL}/api/collections/groups/records`, {
      id,
      name
    });

    res.json({ success: true, group: result.data });
  } catch (err) {
    console.error("PB ERROR:", err.response?.data || err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// JOIN GROUP
router.post("/:id/join", async (req, res) => {
  const groupId = req.params.id;
  const { member } = req.body;

  try {
    const result = await axios.post(`${PB_URL}/api/collections/group_members/records`, {
      id: member.id,
      group_id: groupId,
      name: member.name,
      avatar: member.avatar || null
    });

    res.json({ success: true, member: result.data });
  } catch (err) {
    console.error("PB ERROR:", err.response?.data || err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET GROUP STATE
router.get("/:id/state", async (req, res) => {
  const groupId = req.params.id;

  try {
    const group = await axios.get(`${PB_URL}/api/collections/groups/records/${groupId}`);
    const members = await axios.get(`${PB_URL}/api/collections/group_members/records?filter=group_id="${groupId}"`);
    const locations = await axios.get(`${PB_URL}/api/collections/locations/records?filter=group_id="${groupId}"`);

    res.json({
      success: true,
      group: group.data,
      members: members.data.items,
      locations: locations.data.items
    });
  } catch (err) {
    console.error("PB ERROR:", err.response?.data || err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
