const express = require("express");

module.exports = (pb) => {
  const router = express.Router();

  // SAVE LOCATION
  router.post("/", async (req, res) => {
    const { groupId, userId, location } = req.body;

    if (!groupId || !userId || !location) {
      return res.status(400).json({
        success: false,
        message: "Missing fields",
      });
    }

    try {
      // Check if a location record already exists for this user in this group
      const list = await pb.collection("locations").getList(1, 1, {
        filter: `group_id="${groupId}" && user_id="${userId}"`,
      });

      let record;

      if (list.items.length) {
        // Update existing location
        record = await pb.collection("locations").update(list.items[0].id, {
          group_id: groupId,
          user_id: userId,
          lat: location.lat,
          lng: location.lng,
        });
      } else {
        // Create new location
        record = await pb.collection("locations").create({
          group_id: groupId,
          user_id: userId,
          lat: location.lat,
          lng: location.lng,
        });
      }

      res.json({ success: true, record });
    } catch (err) {
      console.error("POCKETBASE LOCATION ERROR:", err);
      res.status(500).json({
        success: false,
        error: err.message,
      });
    }
  });

  return router;
};
