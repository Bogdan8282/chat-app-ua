import axios from "axios";

const instance = axios.create({
  baseURL: "https://chat-app-ua.onrender.com/api",
  withCredentials: true,
});

export default instance;
