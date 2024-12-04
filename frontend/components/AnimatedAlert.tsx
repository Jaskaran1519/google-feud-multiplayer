"use client";

import React, { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertCircle, CheckCircle, Info, XCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

type AlertType = "success" | "error" | "warning" | "info";

interface AnimatedAlertProps {
  message: string;
  type?: AlertType;
  duration?: number;
  onClose?: () => void;
}

const getAlertIcon = (type: AlertType) => {
  const iconProps = { className: "h-4 w-4" };

  switch (type) {
    case "success":
      return <CheckCircle {...iconProps} />;
    case "error":
      return <XCircle {...iconProps} />;
    case "warning":
      return <AlertCircle {...iconProps} />;
    case "info":
      return <Info {...iconProps} />;
    default:
      return <AlertCircle {...iconProps} />;
  }
};

const AnimatedAlert: React.FC<AnimatedAlertProps> = ({
  message,
  type = "error",
  duration = 3000,
  onClose,
}) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose && onClose();
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  return (
    <AnimatePresence>
      <motion.div
        initial={{
          y: -100,
          opacity: 0,
          x: "-50%", // Center horizontally
        }}
        animate={{
          y: 0,
          opacity: 1,
          x: "-50%", // Maintain horizontal center
        }}
        exit={{
          y: -100, // Move up when exiting
          opacity: 0,
          x: "-50%", // Maintain horizontal center during exit
        }}
        transition={{
          type: "spring",
          stiffness: 300,
          damping: 30,
        }}
        className="fixed top-5 left-1/2 transform -translate-x-1/2 z-50 w-full max-w-md"
      >
        <Alert
          variant={type === "error" ? "destructive" : "default"}
          className="bg-zinc-900 border-2 border-gray-200"
        >
          {getAlertIcon(type)}
          <AlertTitle>
            {type.charAt(0).toUpperCase() + type.slice(1)}
          </AlertTitle>
          <AlertDescription>{message}</AlertDescription>
        </Alert>
      </motion.div>
    </AnimatePresence>
  );
};

export default AnimatedAlert;
