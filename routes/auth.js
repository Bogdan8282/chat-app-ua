const express = require("express");
const bcrypt = require("bcrypt");
const User = require("../models/User");
const router = express.Router();

router.post("/register", async (req, res) => {
  const { username, password } = req.body;

  const userIP = req.headers["x-forwarded-for"] || req.connection.remoteAddress;

  try {
    const existingUserWithIP = await User.findOne({ ip: userIP });
    if (existingUserWithIP) {
      return res
        .status(403)
        .json({
          error:
            "This IP address has already been used to register an account.",
        });
    }

    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new User({
      username,
      password: hashedPassword,
      ip: userIP,
    });

    await newUser.save();

    res.status(201).json({ message: "Account created successfully!" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Server error. Please try again later." });
  }
});

router.post("/login", async (req, res) => {
  const { username, password } = req.body;
  try {
    const user = await User.findOne({ username });
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ message: "Invalid credentials" });
    }
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: "Login failed" });
  }
});

module.exports = router;
