// server.js
const express = require("express");
const path = require("path");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 3000;

// In-memory stores (replace with DB later)
const groups = new Map();      // groupId -> { id, name, members[] }
const locations = new Map();   // groupId -> Map(userId -> location)
const sosEvents = new Map();   // groupId -> [events]

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

app.post("/api/profile", (req, res) => {
  // For now, just accept and return success
  res.json({ success: true });
});

app.post("/api/group", (req, res) => {
  const group = req.body;
  if (!group || !group.id) {
    return res.status(400).json({ success: false, message: "Missing group id" });
  }
  groups.set(group.id, {
    id: group.id,
    name: group.name || "Tonight’s Group",
    members: group.members || [],
    createdAt: group.createdAt || new Date().toISOString(),
  });
  res.json({ success: true, group: groups.get(group.id) });
});

app.post("/api/group/:id/join", (req, res) => {
  const groupId = req.params.id;
  const { member } = req.body;
  const group = groups.get(groupId) || { id: groupId, name: "Tonight’s Group", members: [] };

  if (member) {
    const exists = group.members.find((m) => m.id === member.id);
    if (!exists) group.members.push(member);
  }

  groups.set(groupId, group);
  res.json({ success: true, group });
});

app.post("/api/group/:id/leave", (req, res) => {
  // No-op for now
  res.json({ success: true });
});

app.post("/api/location", (req, res) => {
  const { groupId, userId, location } = req.body;
  if (!groupId || !userId || !location) {
    return res.status(400).json({ success: false, message: "Missing fields" });
  }

  if (!locations.has(groupId)) locations.set(groupId, new Map());
  locations.get(groupId).set(userId, location);

  res.json({ success: true });
});

app.get("/api/group/:id/state", (req, res) => {
  const groupId = req.params.id;
  const group = groups.get(groupId);
  if (!group) {
    return res.json({ success: false, message: "No group", group: null });
  }

  const locMap = locations.get(groupId) || new Map();
  const members = group.members.map((m) => ({
    ...m,
    location: locMap.get(m.id) || null,
  }));

  res.json({ success: true, group: { ...group, members } });
});

app.post("/api/sos", (req, res) => {
  const event = req.body;
  if (!event.groupId) {
    return res.status(400).json({ success: false, message: "Missing groupId" });
  }

  if (!sosEvents.has(event.groupId)) sosEvents.set(event.groupId, []);
  sosEvents.get(event.groupId).push(event);

  // In a real app, you’d push via WebSocket / push notifications here
  res.json({ success: true });
});

app.post("/api/preferences", (req, res) => {
  // Stub for now
  res.json({ success: true });
});

// Fallback to index.html for root
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(PORT, () => {
  console.log(`TogetherSafe server running on port ${PORT}`);
});
app.use("/api/group", require("./api/group"));
app.use("/api/location", require("./api/location"));
app.use("/api/sos", require("./api/sos"));
app.use("/api/profile", require("./api/profile"));
app.use("/api/preferences", require("./api/preferences"));
