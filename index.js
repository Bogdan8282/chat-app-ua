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

io.on("connection", (socket) => {
  console.log("New client connected");

  socket.on("userConnected", (username) => {
    onlineUsers.add(username);
    io.emit("updateUserList", Array.from(onlineUsers));
  });

  socket.on("userDisconnected", (username) => {
    onlineUsers.delete(username);
    io.emit("updateUserList", Array.from(onlineUsers));
  });

  Message.find()
    .sort({ timestamp: -1 })
    .limit(50)
    .then((messages) => {
      const formattedMessages = messages.map((msg) => ({
        sender: msg.sender,
        text: msg.text,
        timestamp: msg.timestamp,
      }));
      socket.emit("messages", formattedMessages);
    })
    .catch((err) => console.error("Error fetching messages:", err));

  socket.on("message", async (message) => {
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
    const username = Array.from(onlineUsers).find(
      (user) => user === socket.username
    );
    if (username) {
      onlineUsers.delete(username);
      io.emit("updateUserList", Array.from(onlineUsers));
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
