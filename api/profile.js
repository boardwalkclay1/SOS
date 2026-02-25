const express = require("express");

module.exports = (pb) => {
  const router = express.Router();

  // --------------------------------------------------
  // CREATE OR UPDATE PROFILE
  // --------------------------------------------------
  router.post("/", async (req, res) => {
    const profile = req.body;

    if (!profile || !profile.id) {
      return res.status(400).json({
        success: false,
        message: "Missing profile id",
      });
    }

    try {
      // Check if profile already exists
      const list = await pb.collection("profiles").getList(1, 1, {
        filter: `id="${profile.id}"`,
      });

      let record;

      if (list.items.length) {
        // Update existing profile
        record = await pb.collection("profiles").update(list.items[0].id, profile);
      } else {
        // Create new profile
        record = await pb.collection("profiles").create(profile);
      }

      res.json({ success: true, profile: record });
    } catch (err) {
      console.error("PB PROFILE ERROR:", err);
      res.status(500).json({
        success: false,
        error: err.message,
      });
    }
  });

  return router;
};
