// services/api.ts
import axios from "axios";

const api = axios.create({
  baseURL: "http://localhost:5000/api", // Change to your backend URL
});

export const testAPI = () => {
  return api.get("/test");
};
