"use client";

import { Roboto } from "next/font/google";
import { useRouter } from "next/navigation";
import React, { useEffect, useState } from "react";
import { BACKEND_URL, JSON_HEADERS } from "../config/config.js";
import { generateRandomName } from "../utils/utils.js";
import Image from "next/image.js";
import AnimatedAlert from "@/components/AnimatedAlert";
import Header from "@/components/Header";

// Import Anton font
const anton = Roboto({
  subsets: ["latin"],
  weight: ["400", "900"],
});

const Page = () => {
  const router = useRouter();
  const [showModal, setShowModal] = useState(false);
  const [roomId, setRoomId] = useState("");
  const [playerName, setPlayerName] = useState("");
  const [alert, setAlert] = useState<{
    message: string;
    type: "success" | "error" | "warning" | "info";
  } | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const ALERT_DURATION = 3000;

  const buttonStyles =
    "group group-hover:before:duration-500 group-hover:after:duration-500 after:duration-500 hover:border-rose-300 hover:before:[box-shadow:_20px_20px_20px_30px_#a21caf] duration-500 before:duration-500 hover:duration-500  hover:after:-right-8 hover:before:right-12 hover:before:-bottom-8 hover:before:blur   origin-left hover:decoration-2 hover:text-rose-300 relative bg-neutral-800 h-16 w-64 border text-left p-3 text-gray-50 text-base font-bold rounded-lg  overflow-hidden  before:absolute before:w-12 before:h-12 before:content[''] before:right-1 before:top-1 before:z-10 before:bg-violet-500 before:rounded-full before:blur-lg  after:absolute after:z-10 after:w-20 after:h-20 after:content['']  after:bg-rose-300 after:right-8 after:top-3 after:rounded-full after:blur-lg";

  useEffect(() => {
    const generatedUserName = generateRandomName();
    setPlayerName(generatedUserName);
  }, []);

  const showAlertMessage = (
    message: string,
    type: "success" | "error" | "warning" | "info" = "error"
  ) => {
    setAlert({ message, type });
  };

  const createRoom = async () => {
    try {
      if (!playerName) {
        showAlertMessage("Please enter a player name");
        return;
      }
      setIsLoading(true);

      console.log("Storing username:", playerName);
      localStorage.setItem("playerName", playerName);

      const response = await fetch(`${BACKEND_URL}api/rooms/create`, {
        method: "POST",
        headers: JSON_HEADERS,
        body: JSON.stringify({ userName: playerName }),
      });

      if (!response.ok) {
        throw new Error("Failed to create room");
      }

      const data = await response.json();
      const { roomName } = data;

      router.push(`/${roomName}`);
    } catch (error) {
      console.error("Error creating room:", error);
      showAlertMessage("Failed to create room");
    }
  };

  const handleJoinRoom = async (event: any) => {
    event.preventDefault();

    if (!playerName) {
      showAlertMessage("Please enter a player name.");
      return;
    }

    if (!roomId) {
      showAlertMessage("Please enter a valid Room ID");
      return;
    }

    try {
      localStorage.setItem("playerName", playerName);

      const response = await fetch(`${BACKEND_URL}api/rooms/join`, {
        method: "POST",
        headers: JSON_HEADERS,
        body: JSON.stringify({ roomName: roomId, userName: playerName }),
      });

      const data = await response.json();

      // Use the room name from the response instead of the input
      if (data.room && data.room.roomName) {
        router.push(`/${data.room.roomName}`);
      } else {
        showAlertMessage("Failed to join room");
      }
    } catch (error) {
      console.error("Error joining room:", error);
      showAlertMessage("Error joining room");
    }
  };

  return (
    <div className="w-full max-w-[2000px] mx-auto min-h-screen p-5  relative overflow-hidden">
      {alert && (
        <AnimatedAlert
          message={alert.message}
          type={alert.type}
          duration={ALERT_DURATION}
          onClose={() => setAlert(null)}
        />
      )}
      <Header />
      <div className="flex flex-col lg:flex-row gap-16 justify-center md:justify-between max-w-[1200px] mx-auto  mt-28 z-30 px-5 relative">
        <div
          className={`flex flex-col text-left text-white font-bold md:ml-16 lg:ml-24 xl:ml-32 text-8xl md:text-[8rem] xl:text-[9rem] leading-[0.8] ${anton.className}`}
        >
          <div className="flex gap-5 items-end">
            Start{" "}
            <span className="inline text-sm align-baseline text-gray-300">
              Invite friends <br /> and Play
            </span>
          </div>
          <h1
            className="relative"
            style={{
              textShadow: "0px -10px 10px rgba(0, 0, 0, 0.3)",
              WebkitTextFillColor: "transparent",
              WebkitTextStroke: "2px white",
            }}
          >
            Guess
          </h1>
          <h1>
            <span className="text-8xl md:text-8xl lg:text-[7rem] xl:text-[7rem] mr-2 text-blue-400">
              ✺
            </span>
            <span>Enjoy</span>
          </h1>
        </div>

        <div className="flex flex-col space-y-6 justify-center items-center">
          <button
            className={`${buttonStyles} relative`}
            onClick={createRoom}
            disabled={isLoading}
          >
            {isLoading ? (
              <div className="absolute inset-0 flex items-center justify-center">
                <div
                  className="loader border-t-2 rounded-full border-yellow-500 bg-yellow-300 animate-spin
                aspect-square w-8 flex justify-center items-center text-yellow-700"
                >
                  $
                </div>
              </div>
            ) : (
              "Create Room"
            )}
          </button>
          <button className={buttonStyles} onClick={() => setShowModal(true)}>
            Join Room
          </button>
          <div className="flex flex-col gap-2">
            <h1 className="text-2xl font-semibold text-white">Choose a name</h1>
            <input
              className="bg-[#222630] text-lg px-4 py-2 outline-none h-16 w-64 text-white rounded-lg border-2 transition-colors duration-100 border-solid focus:border-[#596A95] border-[#2B3040]"
              name="text"
              placeholder={playerName}
              value={playerName}
              onChange={(e) => {
                setPlayerName(e.target.value);
              }}
              type="text"
            />
          </div>
        </div>
        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-xl shadow-2xl w-[90%] max-w-md transform transition-all scale-105">
              <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">
                Join a Room
              </h2>
              <form onSubmit={handleJoinRoom}>
                <input
                  type="text"
                  value={roomId}
                  onChange={(e) => setRoomId(e.target.value)}
                  placeholder="Enter Room ID"
                  className="w-full py-3 px-4 mb-5 text-gray-800 bg-gray-100 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-300"
                  required
                />
                <div className="flex justify-center space-x-4">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-5 py-2 text-gray-800 font-medium bg-gray-200 rounded-lg hover:bg-gray-300 transition ease-in-out"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-blue-300 text-white font-medium rounded-lg shadow hover:bg-blue-400 transition ease-in-out"
                  >
                    Join
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>

      {/* Top-left image */}
      <Image
        src="/pattern.png"
        width={500}
        height={500}
        alt=""
        className="absolute top-10 left-10 rotate-90 z-10 filter drop-shadow-[0_10px_20px_rgba(0,0,0,0.5)] blur-sm"
      />
      <div className="absolute top-0 left-0 bottom-0 w-1/3 bg-gradient-to-r from-black to-transparent z-10 pointer-events-none"></div>
      <div className="absolute top-0 left-0 w-full h-1/3 bg-gradient-to-b from-black to-transparent z-10 pointer-events-none"></div>

      {/* Bottom-right image */}
      <Image
        src="/pattern.png"
        width={700}
        height={700}
        alt=""
        className="absolute bottom-10 right-10 -rotate-90 z-10 filter drop-shadow-[0_-10px_20px_rgba(0,0,0,0.5)] blur-md"
      />
      <div className="absolute bottom-0 right-0 top-0 w-1/3 bg-gradient-to-l from-black to-transparent z-10 pointer-events-none"></div>
      <div className="absolute bottom-0 right-0 w-full h-1/3 bg-gradient-to-t from-black to-transparent z-10 pointer-events-none"></div>
    </div>
  );
};

export default Page;
