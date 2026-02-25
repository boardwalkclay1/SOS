const express = require("express");

module.exports = (pb) => {
  const router = express.Router();

  // --------------------------------------------------
  // CREATE GROUP
  // --------------------------------------------------
  router.post("/", async (req, res) => {
    const { id, name } = req.body;

    try {
      const record = await pb.collection("groups").create({
        id,
        name
      });

      res.json({ success: true, group: record });
    } catch (err) {
      console.error("PB GROUP CREATE ERROR:", err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // --------------------------------------------------
  // JOIN GROUP
  // --------------------------------------------------
  router.post("/:id/join", async (req, res) => {
    const groupId = req.params.id;
    const { member } = req.body;

    try {
      const record = await pb.collection("group_members").create({
        id: member.id,
        group_id: groupId,
        name: member.name,
        avatar: member.avatar || null
      });

      res.json({ success: true, member: record });
    } catch (err) {
      console.error("PB GROUP JOIN ERROR:", err);
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
      const group = await pb.collection("groups").getOne(groupId);

      // Fetch members
      const members = await pb.collection("group_members").getFullList({
        filter: `group_id="${groupId}"`
      });

      // Fetch locations
      const locations = await pb.collection("locations").getFullList({
        filter: `group_id="${groupId}"`
      });

      res.json({
        success: true,
        group,
        members,
        locations
      });
    } catch (err) {
      console.error("PB GROUP STATE ERROR:", err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  return router;
};
