const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema({
  sender: { type: String, required: true },
  text: { type: String, required: true },
  timestamp: { type: Date, default: Date.now, expires: "24h" },
});

module.exports = mongoose.model("Message", messageSchema);
