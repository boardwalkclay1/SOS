const express = require("express");

module.exports = (pb) => {
  const router = express.Router();

  // --------------------------------------------------
  // CREATE OR UPDATE PROFILE
  // --------------------------------------------------
  router.post("/", async (req, res) => {
    const { userId, profile } = req.body;

    if (!userId || !profile) {
      return res.status(400).json({
        success: false,
        message: "Missing userId or profile payload",
      });
    }

    try {
      // Check if profile already exists for this user
      const list = await pb.collection("profiles").getList(1, 1, {
        filter: `user_id="${userId}"`,
      });

      let record;

      if (list.items.length) {
        // Update existing profile
        record = await pb.collection("profiles").update(list.items[0].id, {
          user_id: userId,
          ...profile,
        });
      } else {
        // Create new profile
        record = await pb.collection("profiles").create({
          user_id: userId,
          ...profile,
        });
      }

      res.json({ success: true, record });
    } catch (err) {
      console.error("POCKETBASE PROFILE ERROR:", err);
      res.status(500).json({
        success: false,
        error: err.message,
      });
    }
  });

  return router;
};
