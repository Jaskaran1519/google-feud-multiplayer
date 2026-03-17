"use client";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Send } from "lucide-react";
import { ChatInput } from "@/components/ui/chat/chat-input";

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
  const currentUser = localStorage.getItem("playerName");

  return (
    <div className="w-96 max-w-full h-[600px] bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-md flex flex-col gap-2 rounded-2xl p-4 border border-white/10 shadow-xl">
      <ScrollArea className="flex-grow pr-4 -mr-4">
        <div className="flex flex-col gap-3 pr-4">
          {messages.map((msg: any, index) => {
            const isCurrentUser = msg.player === currentUser;
            const isPreviousMessageFromSameUser =
              index > 0 && messages[index - 1].player === msg.player;

            if (msg.player === SYSTEM_USER) {
              return (
                <div
                  key={index}
                  className="flex items-center justify-center w-full my-2"
                >
                  <div className="inline-block bg-white/10 backdrop-blur-sm border border-white/10 px-4 py-1.5 rounded-full mx-auto shadow-sm">
                    <span className="text-xs text-gray-300 font-medium tracking-wide">
                      {msg.content}
                    </span>
                  </div>
                </div>
              );
            }

            return (
              <div
                key={index}
                className={`flex ${
                  isCurrentUser ? "justify-end" : "justify-start"
                } ${isPreviousMessageFromSameUser ? "mt-1" : "mt-3"}`}
              >
                <div
                  className={`max-w-[85%] px-4 py-2.5 ${
                    isCurrentUser
                      ? "bg-gradient-to-br from-violet-500 to-purple-600 text-white rounded-2xl rounded-tr-sm shadow-md"
                      : "bg-gradient-to-br from-indigo-500/20 to-blue-500/10 backdrop-blur-md border border-indigo-500/30 text-white rounded-2xl rounded-tl-sm shadow-md"
                  }`}
                >
                  {!isCurrentUser && !isPreviousMessageFromSameUser && (
                    <p className="font-semibold text-xs text-indigo-300 mb-1">
                      {msg.player}
                    </p>
                  )}
                  <p className="break-words text-sm leading-relaxed">
                    {msg.content}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </ScrollArea>

      <div className="flex gap-2 items-center mt-2 bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-1.5">
        <ChatInput
          placeholder="Type a message..."
          value={message}
          onChange={(e) => {
            const words = e.target.value.trim().split(/\s+/);
            if (words.length <= 50) {
              setMessage(e.target.value);
            }
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              sendMessage();
            }
          }}
          className="flex-1 bg-transparent border-none focus-visible:ring-0 text-white placeholder:text-gray-500 resize-none min-h-[44px] py-3 px-3 shadow-none focus-visible:ring-offset-0"
        />
        <Button
          size="icon"
          className="h-11 w-11 rounded-lg bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 text-white flex-shrink-0 transition-all shadow-lg shadow-violet-500/20 disabled:opacity-50"
          onClick={sendMessage}
          disabled={!message.trim()}
        >
          <Send className="w-5 h-5 ml-0.5" />
        </Button>
      </div>
    </div>
  );
};

export default ChatArea;
