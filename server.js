const express = require("express");
const path = require("path");
const cors = require("cors");
const PocketBase = require("pocketbase/cjs");

const app = express();
const PORT = process.env.PORT || 3000;

const pb = new PocketBase(process.env.PB_URL);

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

app.use("/api/sos", require("./api/sos")(pb));

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(PORT, () => {
  console.log(`TogetherSafe backend running on port ${PORT}`);
});
