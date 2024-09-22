import React, { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import Chat from "../components/Chat";

function Home() {
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const storedUser = JSON.parse(localStorage.getItem("user"));
    if (!storedUser) {
      navigate("/login");
    } else {
      setUser(storedUser);
    }
  }, [navigate]);

  return (
    <div>
      {user ? <Chat user={user} /> : <p>Loading...</p>}{" "}
      {!user && (
        <p>
          Want to go back? <Link to="/login">Login</Link> or{" "}
          <Link to="/register">Register</Link>.
        </p>
      )}
    </div>
  );
}

export default Home;
