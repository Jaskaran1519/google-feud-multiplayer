// QuestionArea.tsx
"use client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface QuestionAreaProps {
  question: string;
  options: string[];
}

export const QuestionArea: React.FC<QuestionAreaProps> = ({
  question,
  options,
}) => {
  return (
    <Card className="flex-grow">
      <CardHeader>
        <CardTitle className="text-2xl font-bold text-center">
          {question}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {options.map((option, index) => (
            <Button
              key={index}
              variant="outline"
              className="h-12 text-left justify-start"
            >
              {index + 1}. {option}
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default QuestionArea;
