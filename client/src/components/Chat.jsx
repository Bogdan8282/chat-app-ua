import { useState, useEffect, useRef } from "react";
import io from "socket.io-client";
import axios from "../utils/axios";
import { useNavigate } from "react-router-dom";

const socket = io("https://chat-app-ua.onrender.com");

function Chat() {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [username, setUsername] = useState("");
  const [onlineUsers, setOnlineUsers] = useState([]);
  const navigate = useNavigate();
  const messagesEndRef = useRef(null);

  useEffect(() => {
    fetch("https://chat-app-ua.onrender.com/api/check-auth", {
      credentials: "include",
    })
      .then((res) => res.json())
      .then((data) => {
        if (!data.authenticated) {
          navigate("/login");
        } else {
          setUsername(data.user.name);
          socket.emit("userConnected", data.user.name);

          fetch("https://chat-app-ua.onrender.com/api/chat/messages")
            .then((response) => response.json())
            .then((data) => {
              setMessages(data);
            })
            .catch((error) => console.error("Error fetching messages:", error));
        }
      })
      .catch((error) => {
        console.error("Authentication check failed:", error);
        navigate("/login");
      });

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

  const handleLogout = async () => {
    try {
      await axios.post("/logout");
      navigate("/login");
    } catch (error) {
      console.error("Error during logout", error);
    }
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
            style={{ flex: 1, marginRight: "1px" }}
          />
          <button type="submit">Send</button>
        </form>
      </div>
    </div>
  );
}

export default Chat;
