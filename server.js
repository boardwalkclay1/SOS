// server.js
const express = require("express");
const path = require("path");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 3000;

// -----------------------------
// CORE MIDDLEWARE
// -----------------------------
app.use(cors());
app.use(express.json());

// -----------------------------
// STATIC FILES (MUST BE FIRST)
// -----------------------------
app.use(express.static(path.join(__dirname, "public")));

// -----------------------------
// API ROUTES (MUST BE BEFORE FALLBACK)
// -----------------------------
app.use("/api/group", require("./api/group"));
app.use("/api/location", require("./api/location"));
app.use("/api/sos", require("./api/sos"));
app.use("/api/profile", require("./api/profile"));
app.use("/api/preferences", require("./api/preferences"));

// -----------------------------
// FALLBACK ROUTE (MUST BE LAST)
// -----------------------------
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// -----------------------------
// START SERVER
// -----------------------------
app.listen(PORT, () => {
  console.log(`TogetherSafe backend running on port ${PORT}`);
});
