"use client";

import { Check } from "lucide-react";
import { useRouter } from "next/navigation";
import React from "react";
import { BACKEND_URL, JSON_HEADERS } from "../config/config.js";

const Page = () => {
  const router = useRouter();

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

      // Navigate to the room page
      router.push(`/${roomName}`);
    } catch (error) {
      console.error("Error creating room:", error);
    }
  };

  return (
    <div className="w-[90%] mx-auto max-w-[1600px] min-h-screen ">
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
        <button className="text-2xl font-semibold border-[1px] border-black px-5 py-2 hover:bg-zinc-900 hover:text-white duration-300">
          JOIN ROOM
        </button>
      </div>
      <div className="w-fit mx-auto mt-16 flex flex-col gap-5">
        <div className="flex items-center gap-5 px-2">
          <h1 className="text-xl md:text-2xl font-semibold">Player's name</h1>
          <button className="bg-zinc-600 hover:bg-zinc-800 text-white p-1 rounded-full">
            <Check />
          </button>
        </div>
        <input
          type="text"
          placeholder=""
          className="rounded-full w-full py-2 px-1 border-black border-[1px]"
        />
      </div>
    </div>
  );
};

export default Page;
