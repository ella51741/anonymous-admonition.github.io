const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema({
  topic: {
    type: String,
  },
  content: {
    type: String,
  },
  date: {
    type: Date,
    default: Date.now,
  },
});

const message = mongoose.model("message", messageSchema);
module.exports = message;
