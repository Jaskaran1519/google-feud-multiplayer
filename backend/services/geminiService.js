import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";

dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const QUESTION_CATEGORIES = [
  {
    category: "People Want To Know",
    prompts: [
      "Give me a very common, short incomplete search query about why people do something simple, like 'why do people...'",
      "Create a brief, popular search query starting with 'why are people...'",
      "Generate a common search query about human behavior starting with 'why is everyone...'",
    ]
  },
  {
    category: "Daily Life Mysteries",
    prompts: [
      "Generate a short, relatable search query about everyday problems, like 'how to stop...'",
      "Create an incomplete search about common life challenges, like 'when to call...'",
      "Give me a popular search query about solving simple life issues, like 'how to be a...'",
    ]
  },
  {
    category: "Weird Curiosities",
    prompts: [
      "Create a quirky, short incomplete search query that starts with 'why does my dog...'",
      "Generate a strange but common search about something unexpected, like 'Why is my gf so...'",
      "Give me an unusual but relatable search query starting with 'why is my cat so...'",
    ]
  },
  {
    category: "Quick Fixes",
    prompts: [
      "Generate a short troubleshooting search query like 'how to fix...'",
      "Create an incomplete search about solving quick problems, like 'what to do if...'",
      "Give me a common repair or solution search query like 'how to get rid of...'",
    ]
  }
];

function getRandomCategory() {
  return QUESTION_CATEGORIES[Math.floor(Math.random() * QUESTION_CATEGORIES.length)];
}

export async function generateQuestion() {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.0-pro" });
    const category = getRandomCategory();
    const prompt = category.prompts[Math.floor(Math.random() * category.prompts.length)];
    
    const result = await model.generateContent(
      `${prompt} Respond with ONLY the incomplete search query, making sure it's general, short, and ends with '...' suitable for a game. Avoid very specific or complex queries.`
    );
    
    let question = result.response.text().trim();
    
    // Fallback to ensure query ends with '...' and is concise
    if (!question.endsWith('...')) {
      question += '...';
    }
    
    // Optional: Log the category for potential game UI
    console.log(`Category: ${category.category}`);
    
    return question;
  } catch (error) {
    console.error("Error generating question:", error);
    
    // Improved fallback questions with simple, broad queries
    const fallbackQuestions = [
      "why do people...",
      "how to stop...",
      "what happens when...",
      "is it weird if...",
      "how to get rid of...",
      "why does my...",
      "what to do if..."
    ];
    
    return fallbackQuestions[Math.floor(Math.random() * fallbackQuestions.length)];
  }
}