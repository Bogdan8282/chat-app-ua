import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import axios from "axios";

function Auth({ type }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    const endpoint =
      type === "login" ? "/api/auth/login" : "/api/auth/register";
    try {
      const response = await axios.post(endpoint, { username, password });
      localStorage.setItem("user", JSON.stringify(response.data));
      navigate("/");
    } catch (error) {
      console.error(error);
      alert("Authentication failed");
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <h2>{type === "login" ? "Login" : "Register"}</h2>
      <input
        type="text"
        placeholder="Username"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
      />
      <br />
      <br />
      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      <br />
      <br />
      <button type="submit">{type === "login" ? "Login" : "Register"}</button>
      {type === "login" ? (
        <p>
          Don't have an account? <Link to="/register">Register here</Link>.
        </p>
      ) : (
        <p>
          Already have an account? <Link to="/login">Login here</Link>.
        </p>
      )}
    </form>
  );
}

export default Auth;
