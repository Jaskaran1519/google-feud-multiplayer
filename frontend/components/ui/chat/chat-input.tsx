import * as React from "react";
import { cn } from "@/lib/utils";

interface ChatInputProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement>{}

const ChatInput = React.forwardRef<HTMLTextAreaElement, ChatInputProps>(
  ({ className, onChange, ...props }, ref) => {
    const handleInputChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
      event.target.style.height = 'auto';
      
      const newHeight = Math.min(event.target.scrollHeight, 96); // 24px per line * 4 lines
      event.target.style.height = `${newHeight}px`;
      
      onChange?.(event);
    };

    return (
      <textarea
        ref={ref}
        onChange={handleInputChange}
        className={cn(
          "min-h-[24px] max-h-24 px-4 py-3 bg-background text-sm",
          "placeholder:text-muted-foreground focus-visible:outline-none",
          "focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
          "w-full rounded-md resize-none overflow-y-auto",
          "scrollbar-thin scrollbar-thumb-transparent",
          'bg-transparent border-[1px] border-white',
          className
        )}
        {...props}
      />
    );
  }
);

ChatInput.displayName = "ChatInput";

export { ChatInput };
