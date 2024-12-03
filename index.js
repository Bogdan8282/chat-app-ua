const express = require("express");
const mongoose = require("mongoose");
const http = require("http");
const path = require("path");
const bodyParser = require("body-parser");
const cors = require("cors");
const { Server } = require("socket.io");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
const rateLimit = require("express-rate-limit");
const mongoSanitize = require("express-mongo-sanitize");
const Message = require("./models/Message.js");
const User = require("./models/User.js");

require("dotenv").config();

const app = express();
const port = process.env.PORT || 5000;
const AllowedOrigin = "https://chat-app-ua.onrender.com";

app.use(cors({ origin: AllowedOrigin, credentials: true }));
app.use(bodyParser.json());
app.use(cookieParser());
app.use(express.json());
app.use(mongoSanitize());

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: "Too many requests from this IP, please try again after 15 minutes",
});

app.use(apiLimiter);

const uri = process.env.MONGO_URI;

mongoose.connect(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

app.post("/api/register", async (req, res) => {
  const { name, password } = req.body;

  if (!name || name.length < 3 || /\s/.test(name)) {
    return res
      .status(400)
      .send("Name must be at least 3 characters and contain no spaces");
  }

  try {
    const existingUser = await User.findOne({ name: name });

    if (existingUser) {
      return res.status(400).send("User with this name already exists");
    }

    const passwordError = validatePassword(password);
    if (passwordError) {
      return res.status(400).send(passwordError);
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({ name, password: hashedPassword });
    await user.save();

    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
      expiresIn: "1h",
    });

    res
      .cookie("token", token, { httpOnly: true, secure: false }) // secure: true for production
      .status(201)
      .json({ message: "User registered" });
  } catch (error) {
    console.error(error);
    res.status(400).send(error.message);
  }
});

app.post("/api/login", async (req, res) => {
  const { name, password } = req.body;
  try {
    const user = await User.findOne({ name });
    if (user && (await bcrypt.compare(password, user.password))) {
      const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
        expiresIn: "1h",
      });

      res
        .cookie("token", token, { httpOnly: true, secure: false })
        .status(200)
        .json({ message: "Login successful" });
    } else {
      res.status(400).send("Invalid credentials");
    }
  } catch (error) {
    res.status(500).send(error.message);
  }
});

app.get("/api/check-auth", (req, res) => {
  const token = req.cookies.token;

  if (token) {
    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
      if (err) {
        return res.status(401).json({ authenticated: false });
      }
      User.findById(decoded.userId)
        .then((user) => {
          if (user) {
            res.json({ authenticated: true, user });
          } else {
            res
              .status(404)
              .json({ authenticated: false, message: "User not found" });
          }
        })
        .catch((err) => {
          res.status(500).json({ message: "Server error" });
        });
    });
  } else {
    res.status(401).json({ authenticated: false });
  }
});

app.delete("/api/delete-account", async (req, res) => {
  const token = req.cookies.token;

  if (!token) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findByIdAndDelete(decoded.userId);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.clearCookie("token").status(200).json({ message: "Account deleted" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

app.post("/api/logout", (req, res) => {
  res.clearCookie("token").status(200).json({ message: "Logout successful" });
});

function validatePassword(password) {
  const minLength = 8;
  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasNumber = /\d/.test(password);
  const hasSpecialChar = /[!@#$%^&*]/.test(password);

  if (password.length < minLength) {
    return "Password must be at least 8 characters long";
  }
  if (!hasUppercase) {
    return "Password must contain at least one uppercase letter";
  }
  if (!hasLowercase) {
    return "Password must contain at least one lowercase letter";
  }
  if (!hasNumber) {
    return "Password must contain at least one number";
  }
  if (!hasSpecialChar) {
    return "Password must contain at least one special character (!@#$%^&*)";
  }
  return null;
}

//Chat settings

app.get("/messages", async (req, res) => {
  try {
    const messages = await Message.find().sort({ timestamp: 1 }).limit(100);
    res.json(messages);
  } catch (error) {
    res.status(500).json({ message: "Failed to get messages" });
  }
});

app.post("/messages", async (req, res) => {
  const { text, sender } = req.body;
  try {
    const message = new Message({ text, sender });
    await message.save();
    res.status(201).json(message);
  } catch (error) {
    res.status(500).json({ message: "Failed to send message" });
  }
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
    credentials: true,
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

app.use(express.static(path.join(__dirname, "/client/dist")));

app.get("*", (req, res) => {
  res.sendFile(path.resolve(__dirname, "client", "dist", "index.html"));
});

server.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
