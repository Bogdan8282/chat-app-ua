import { useState } from "react";
import axios from "../utils/axios.js";
import { useNavigate } from "react-router-dom";
import Header from "../components/Header.jsx";

const Register = () => {
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleRegister = async (e) => {
    e.preventDefault();
    try {
      await axios.post("/register", { name, password });
      navigate("/");
    } catch (error) {
      setError(error.response.data);
    }
  };

  return (
    <div>
      <Header />
      <h2>Register</h2>
      <form onSubmit={handleRegister}>
        <input
          type="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Name"
          required
        />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          required
        />
        <button type="submit">Register</button>
      </form>
      {error && <p>{error}</p>}
    </div>
  );
};

export default Register;
