import React from "react";

const page = () => {
  return (
    <div className="w-[90%] mx-auto max-w-[1600px] min-h-screen ">
      <div className="max-w-[700px] mx-auto my-5 text-center">
        <h1 className="text-3xl md:text-4xl lg:text-6xl xl:text-7xl font-bold">
          Googussy
        </h1>
      </div>
      <div className="mt-32 flex flex-col space-y-5 mx-auto w-fit">
        <button className="text-2xl font-semibold border-[1px] border-black px-5 py-2 hover:bg-zinc-900 hover:text-white duration-300">
          CREATE ROOM
        </button>
        <button className="text-2xl font-semibold border-[1px] border-black px-5 py-2 hover:bg-zinc-900 hover:text-white duration-300">
          JOIN ROOM
        </button>
      </div>
      <div className="w-fit mx-auto mt-16 flex flex-col space-2">
        <h1 className=""></h1>
      </div>
    </div>
  );
};  

export default page;
