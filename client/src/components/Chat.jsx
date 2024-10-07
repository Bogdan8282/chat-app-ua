import React, { useState, useEffect, useRef } from "react";
import io from "socket.io-client";
import { useNavigate } from "react-router-dom";

const socket = io("http://localhost:5000");

function Chat() {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [username, setUsername] = useState("");
  const [onlineUsers, setOnlineUsers] = useState([]);
  const navigate = useNavigate();
  const messagesEndRef = useRef(null);

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("user"));
    if (!user) {
      navigate("/login");
    } else {
      setUsername(user.username);
      socket.emit("userConnected", user.username);

      fetch("http://localhost:5000/api/chat/messages")
        .then((response) => response.json())
        .then((data) => {
          setMessages(data.reverse());
        })
        .catch((error) => console.error("Error fetching messages:", error));
    }

    socket.on("message", (msg) => {
      setMessages((prevMessages) => [...prevMessages, msg]);
    });

    socket.on("updateUserList", (users) => {
      setOnlineUsers(users);
    });

    socket.on("spamWarning", (message) => {
      alert(message);
    });

    return () => {
      socket.emit("userDisconnected", username);
      socket.off("message");
      socket.off("updateUserList");
    };
  }, [navigate, username]);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  const handleSubmit = (e) => {
    e.preventDefault();
    socket.emit("message", { username, text: message });
    setMessage("");
  };

  const handleLogout = () => {
    localStorage.removeItem("user");
    socket.emit("userDisconnected", username);
    navigate("/login");
  };

  return (
    <div style={{ display: "flex", height: "100vh", width: "100vw" }}>
      <div
        style={{
          width: "250px",
          padding: "10px",
          borderRight: "1px solid #ccc",
          boxSizing: "border-box",
        }}
      >
        <h2>{username}</h2>
        <button onClick={handleLogout}>Logout</button>
        <h3>Online Users</h3>
        <ul>
          {onlineUsers.map((user, index) => (
            <li key={index}>{user}</li>
          ))}
        </ul>
      </div>

      <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "10px",
            boxSizing: "border-box",
          }}
        >
          {messages.map((msg, index) => (
            <div key={index}>
              <strong>{msg.sender || msg.username}:</strong> {msg.text}
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        <form
          onSubmit={handleSubmit}
          style={{
            padding: "10px",
            borderTop: "1px solid #ccc",
            boxSizing: "border-box",
            display: "flex",
          }}
        >
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            required
            style={{ flex: 1, marginRight: "10px" }}
          />
          <button type="submit">Send</button>
        </form>
      </div>
    </div>
  );
}

export default Chat;
