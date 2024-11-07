"use client";

import { Check } from "lucide-react";
import { useRouter } from "next/navigation";
import React, { useEffect, useState } from "react";
import { BACKEND_URL, JSON_HEADERS } from "../config/config.js";
import { generateRandomName } from "../utils/utils.js";

const Page = () => {
  const router = useRouter();
  const [showModal, setShowModal] = useState(false);
  const [roomId, setRoomId] = useState(""); // State to store the room ID input
  const [playerName, setPlayerName] = useState("");

  useEffect(() => {
    const generatedUserName = generateRandomName();
    setPlayerName(generatedUserName);
  }, []);

  const createRoom = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}api/rooms/create`, {
        method: "POST",
        headers: JSON_HEADERS,
      });

      if (!response.ok) {
        throw new Error("Failed to create room");
      }

      const data = await response.json();
      const { roomName } = data;

      router.push(`/${roomName}`);
    } catch (error) {
      console.error("Error creating room:", error);
    }
  };

  const handleJoinRoom = async (event: any) => {
    event.preventDefault();
    if (roomId) {
      try {
        const response = await fetch(`${BACKEND_URL}api/rooms/join`, {
          method: "POST",
          headers: JSON_HEADERS,
          body: JSON.stringify({ roomName: roomId, userName: playerName }),
        });

        if (!response.ok) {
          throw new Error("Failed to join the room");
        }

        const data = await response.json();
        console.log("Joined room:", data);

        // Navigate to the room page
        router.push(`/${roomId}`);
        setShowModal(false); // Close modal after joining
      } catch (error: any) {
        console.error("Error joining room:", error);
        alert("Error joining room: " + error.message);
      }
    } else {
      alert("Please enter a valid Room ID");
    }
  };

  return (
    <div className="w-[90%] mx-auto max-w-[1600px] min-h-screen">
      <div className="max-w-[700px] mx-auto mt-16 mb-10 text-center">
        <h1 className="text-3xl md:text-4xl lg:text-6xl xl:text-8xl font-bold">
          Googussy
        </h1>
      </div>
      <div className="mt-32 flex flex-col space-y-5 mx-auto w-fit">
        <button
          onClick={createRoom}
          className="text-2xl font-semibold border-[1px] border-black px-5 py-2 hover:bg-zinc-900 hover:text-white duration-300"
        >
          CREATE ROOM
        </button>
        <button
          onClick={() => setShowModal(true)}
          className="text-2xl font-semibold border-[1px] border-black px-5 py-2 hover:bg-zinc-900 hover:text-white duration-300"
        >
          JOIN ROOM
        </button>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white p-5 rounded-lg shadow-lg w-[90%] max-w-md">
            <h2 className="text-2xl font-bold mb-4">Join a Room</h2>
            <form onSubmit={handleJoinRoom}>
              <input
                type="text"
                value={roomId}
                onChange={(e) => setRoomId(e.target.value)}
                placeholder="Enter Room ID"
                className="rounded-full w-full py-2 px-4 border border-black mb-4"
                required
              />
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border border-black rounded-lg hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800"
                >
                  Join
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="w-fit mx-auto mt-16 flex flex-col gap-5">
        <div className="flex items-center gap-5 px-2">
          <h1 className="text-xl md:text-2xl font-semibold">Player's name</h1>
          <button className="bg-zinc-600 hover:bg-zinc-800 text-white p-1 rounded-full">
            <Check />
          </button>
        </div>
        <input
          type="text"
          placeholder={playerName}
          value={playerName}
          onChange={(e) => {
            setPlayerName(e.target.value);
          }}
          className="rounded-full w-full py-2 px-1 border-black border-[1px]"
        />
      </div>
    </div>
  );
};

export default Page;
