import * as React from "react";
import { cn } from "@/lib/utils";

interface ChatInputProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement>{}

const ChatInput = React.forwardRef<HTMLTextAreaElement, ChatInputProps>(
  ({ className, onChange, ...props }, ref) => {
    const handleInputChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
      // Reset height to auto to get the correct scrollHeight
      event.target.style.height = 'auto';
      
      // Set new height based on scrollHeight, with a maximum of approximately 4 lines
      const newHeight = Math.min(event.target.scrollHeight, 96); // 24px per line * 4 lines
      event.target.style.height = `${newHeight}px`;
      
      // Call the original onChange handler if it exists
      onChange?.(event);
    };

    return (
      <textarea
        ref={ref}
        onChange={handleInputChange}
        className={cn(
          "min-h-[40px] max-h-24 px-4 py-3 bg-background text-sm",
          "placeholder:text-muted-foreground focus-visible:outline-none",
          "focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
          "w-full rounded-md resize-none overflow-y-auto",
          "scrollbar-thin scrollbar-thumb-transparent", // Hide scrollbar but keep functionality
          className
        )}
        {...props}
      />
    );
  }
);

ChatInput.displayName = "ChatInput";

export { ChatInput };
