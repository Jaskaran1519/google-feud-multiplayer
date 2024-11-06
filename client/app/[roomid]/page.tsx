import React from 'react';

interface RoomPageProps {
  params: {
    roomid: string;
  };
}

const RoomPage: React.FC<RoomPageProps> = ({ params }) => {
  const { roomid } = params;

  return (
    <div>
      <h1>Room ID: {roomid}</h1>
    </div>
  );
};

export default RoomPage;
