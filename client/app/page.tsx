"use client"
import { useEffect } from "react";
import { testAPI } from "../services/api";

const Home = () => {
  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await testAPI();
        console.log(response.data);
      } catch (error) {
        console.error("Error fetching data:", error);
      }
    };
    fetchData();
  }, []);

  return (
    <div>
      <h1>Welcome to the MERN Stack with Next.js!</h1>
    </div>
  );
};

export default Home;
