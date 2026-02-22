// server.js
const express = require("express");
const path = require("path");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// -----------------------------
// API ROUTES (your real backend)
// -----------------------------
app.use("/api/group", require("./api/group"));
app.use("/api/location", require("./api/location"));
app.use("/api/sos", require("./api/sos"));
app.use("/api/profile", require("./api/profile"));
app.use("/api/preferences", require("./api/preferences"));

// -----------------------------
// FALLBACK ROUTE (must be last)
// -----------------------------
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// -----------------------------
// START SERVER
// -----------------------------
app.listen(PORT, () => {
  console.log(`Save a Sista server running on port ${PORT}`);
});
