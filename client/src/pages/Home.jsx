import { useState, useEffect } from "react";
import axios from "../utils/axios.js";
import { useNavigate } from "react-router-dom";
import Chat from "../components/Chat.jsx";

const Home = () => {
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

  const checkAuth = async () => {
    try {
      const response = await axios.get("/check-auth");
      setUser(response.data.user);
    } catch (error) {
      console.error("Error checking auth", error);
      navigate("/login");
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  return (
    <div>
      {user ? (
        <div>
          <Chat user={user} />
        </div>
      ) : (
        <p>Loading...</p>
      )}
    </div>
  );
};

export default Home;
