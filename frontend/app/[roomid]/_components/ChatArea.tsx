"use client";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { ArrowUp } from "lucide-react";
import { ChatInput } from "@/components/ui/chat/chat-input";
import { ChatMessageList } from "@/components/ui/chat/chat-message-list";
import { ChatBubble } from "@/components/ui/chat/chat-bubble";

interface Message {
  player: string;
  content: string;
  timestamp: Date;
  isSystem?: boolean;
}

interface ChatAreaProps {
  messages: Message[];
  message: string;
  setMessage: React.Dispatch<React.SetStateAction<string>>;
  sendMessage: () => void;
}

const SYSTEM_USER = "Jaskaran@1519123";

export const ChatArea: React.FC<ChatAreaProps> = ({
  messages,
  message,
  setMessage,
  sendMessage,
}) => {
  // Get current user's name from localStorage
  const currentUser = localStorage.getItem('playerName');

  return (
    <div className="w-96 max-w-full h-[600px] bg-zinc-750 flex flex-col gap-2 rounded-lg p-4 border border-gray-200">
      <ScrollArea className="flex-grow pr-4">
        <div className="flex flex-col gap-2">
          {messages.map((msg:any, index) => {
            console.log("Message:", msg);
            const isCurrentUser = msg.player === currentUser;
            const isPreviousMessageFromSameUser = 
              index > 0 && messages[index - 1].player === msg.player;
            
            if (msg.player === SYSTEM_USER) {
              return (
                <div key={index} className="flex items-center justify-center w-full my-2">
                  <div className="inline-block bg-gray-100 px-4 py-1.5 rounded-full mx-auto">
                    <span className="text-xs text-gray-500">{msg.content}</span>
                  </div>
                </div>
              );
            }

            return (
              <div
                key={index}
                className={`flex ${
                  isCurrentUser ? 'justify-end' : 'justify-start'
                } ${isPreviousMessageFromSameUser ? 'mt-0.5' : 'mt-2'}`}
              >
                <div
                  className={`max-w-[80%] rounded-lg p-2 ${
                    isCurrentUser
                      ? 'bg-blue-500 text-white ml-auto'
                      : 'bg-gray-200 text-black mr-auto'
                  }`}
                >
                  {!isCurrentUser && (
                    <p className="font-semibold text-sm">{msg.player}</p>
                  )}
                  <p className="break-words">{msg.content}</p>
                </div>
              </div>
            );
          })}
        </div>
      </ScrollArea>

      <div className="flex gap-2 items-center mt-2">
        <ChatInput
          placeholder="Type a message..."
          value={message}
          onChange={(e) => {
            const words = e.target.value.trim().split(/\s+/);
            if (words.length <= 50) {
              setMessage(e.target.value);
            }
          }}
          onKeyDown={(e) => e.key === "Enter" && sendMessage()}
          className="flex-1"
        />
        <Button
          className="p-2 rounded-full bg-zinc-700 hover:bg-zinc-800 text-white flex-shrink-0"
          onClick={sendMessage}
        >
          <ArrowUp />
        </Button>
      </div>
    </div>
  );
};

export default ChatArea;
