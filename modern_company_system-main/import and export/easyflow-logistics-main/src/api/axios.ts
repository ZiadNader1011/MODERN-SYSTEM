import axios from "axios";

const api = axios.create({
  baseURL: "http://localhost:5000", // أو لينك السيرفر
});

export default api;