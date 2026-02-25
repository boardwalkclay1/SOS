// server.js
const express = require("express");
const path = require("path");
const cors = require("cors");
const PocketBase = require("pocketbase/cjs");

// --------------------------------------
// INITIALIZE EXPRESS + POCKETBASE CLIENT
// --------------------------------------
const app = express();
const PORT = process.env.PORT || 3000;

const pb = new PocketBase("https://pocketbase-production-289f.up.railway.app");

// --------------------------------------
// CORE MIDDLEWARE
// --------------------------------------
app.use(cors());
app.use(express.json());

// --------------------------------------
// STATIC FILES (MUST BE FIRST)
// --------------------------------------
app.use(express.static(path.join(__dirname, "public")));

// --------------------------------------
// API ROUTES (INJECT POCKETBASE CLIENT)
// --------------------------------------
app.use("/api/group", require("./api/group")(pb));
app.use("/api/location", require("./api/location")(pb));
app.use("/api/sos", require("./api/sos")(pb));
app.use("/api/profile", require("./api/profile")(pb));
app.use("/api/preferences", require("./api/preferences")(pb));

// --------------------------------------
// FALLBACK ROUTE (MUST BE LAST)
// --------------------------------------
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// --------------------------------------
// START SERVER
// --------------------------------------
app.listen(PORT, () => {
  console.log(`TogetherSafe backend running on port ${PORT}`);
});
