import { useState } from "react";
import axios from "../utils/axios.js";
import { useNavigate } from "react-router-dom";
import Header from "../components/Header.jsx";

const Login = () => {
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      await axios.post("/login", { name, password });
      navigate("/");
    } catch (error) {
      setError(error.response.data || "Login failed");
    }
  };

  return (
    <div>
      <Header />
      <h2>Login</h2>
      <form onSubmit={handleLogin}>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Name"
        />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
        />
        <button type="submit">Login</button>
        {error && <p>{error}</p>}
      </form>
    </div>
  );
};

export default Login;
