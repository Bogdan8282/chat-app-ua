const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");
const Message = require("./models/Message");
const path = require("path");
require("dotenv").config();

const authRoutes = require("./routes/auth");
const chatRoutes = require("./routes/chat");

const app = express();
const port = process.env.PORT || 5000;

const AllowedOrigin = "https://chat-app-ua.onrender.com/";

app.use(
  cors({
    origin: AllowedOrigin,
  })
);
app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/chat", chatRoutes);

app.use(express.static(path.join(__dirname, "/client/dist")));

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "client/dist/index.html"));
});

mongoose
  .connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.error(err));

const deleteOldMessages = async () => {
  try {
    const result = await Message.deleteMany({
      timestamp: { $lt: new Date(Date.now() - 24 * 60 * 60 * 1000) },
    });
    console.log(`Deleted ${result.deletedCount} old messages`);
  } catch (err) {
    console.error("Error deleting old messages:", err);
  }
};

setInterval(deleteOldMessages, 60 * 60 * 1000);

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: AllowedOrigin,
    methods: ["GET", "POST"],
  },
});

let onlineUsers = new Set();

let userMessageData = new Map();
const MESSAGE_LIMIT = 10;
const TIME_FRAME = 10000;
const BLOCK_TIME = 5000;

io.on("connection", (socket) => {
  console.log("New client connected");

  socket.on("userConnected", (username) => {
    socket.username = username;
    onlineUsers.add(username);
    io.emit("updateUserList", Array.from(onlineUsers));

    if (!userMessageData.has(username)) {
      userMessageData.set(username, { timestamps: [], blockedUntil: 0 });
    }
  });

  socket.on("message", async (message) => {
    const now = Date.now();
    const userData = userMessageData.get(message.username);

    if (userData.blockedUntil > now) {
      socket.emit(
        "spamWarning",
        "You are sending messages too quickly. Please wait."
      );
      return;
    }

    userData.timestamps = userData.timestamps.filter(
      (timestamp) => now - timestamp < TIME_FRAME
    );

    if (userData.timestamps.length >= MESSAGE_LIMIT) {
      userData.blockedUntil = now + BLOCK_TIME;
      socket.emit(
        "spamWarning",
        "Too many messages! You are blocked for 5 seconds."
      );
      return;
    }

    userData.timestamps.push(now);

    try {
      const newMessage = new Message({
        sender: message.username,
        text: message.text,
      });
      await newMessage.save();
      io.emit("message", {
        sender: message.username,
        text: message.text,
        timestamp: newMessage.timestamp,
      });
    } catch (err) {
      console.error("Error saving message:", err);
    }
  });

  socket.on("disconnect", () => {
    console.log("Client disconnected");
    const username = socket.username;
    if (username && onlineUsers.has(username)) {
      onlineUsers.delete(username);
      io.emit("updateUserList", Array.from(onlineUsers));
      userMessageData.delete(username);
    }
  });
});

app.get("/api/chat/messages", async (req, res) => {
  try {
    const messages = await Message.find().sort({ timestamp: 1 }).limit(50);
    res.json(messages);
  } catch (err) {
    console.error("Error fetching messages:", err);
    res.status(500).send("Server error");
  }
});

server.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
