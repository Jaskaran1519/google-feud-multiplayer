import dotenv from "dotenv";

dotenv.config();

const QUESTION_CATEGORIES = [
  {
    category: "Culture & Media",
    vibes: ["obscure indie films", "pop-culture disasters", "niche internet micro-celebrities", "overrated classics", "bizarre fandoms"],
    prompts: [
      "Give me a popular incomplete search query starting with 'what is the best movie about...'",
      "Create a brief search query starting with 'who played...'",
      "Generate an incomplete query about a celebrity starting with 'why is...'",
    ],
  },
  {
    category: "Geography & Travel",
    vibes: ["haunted places", "tourist traps", "underrated hidden gems", "strangest town names", "survival scenarios"],
    prompts: [
      "Give me an incomplete search query starting with 'what is the capital of...'",
      "Generate a popular query starting with 'how far is...'",
      "Create a common search starting with 'when is the best time to visit...'",
    ],
  },
  {
    category: "Health & Body",
    vibes: ["weird late-night symptoms", "old wives' tales", "harmless but embarrassing bodily functions", "phantom pains", "superstitions"],
    prompts: [
      "Give me a short, incomplete search query starting with 'why does my...'",
      "Create a popular symptom search starting with 'is it normal to...'",
      "Generate a common health query starting with 'how to get rid of...'",
    ],
  },
  {
    category: "Food & Cooking",
    vibes: ["weird ingredients", "kitchen disasters", "exotic snacks", "midnight cravings", "banned foods"],
    prompts: [
      "Give me an incomplete search starting with 'how long to cook...'",
      "Create a quick food query starting with 'can you eat...'",
      "Generate a recipe-related search starting with 'what is the main ingredient in...'",
    ],
  },
  {
    category: "How-To & DIY",
    vibes: ["useless life hacks", "dangerous repairs", "lazy solutions", "hyper-specific tech problems", "weird crafts"],
    prompts: [
      "Give me a popular how-to search starting with 'how to fix...'",
      "Create a common technical search starting with 'how to reset...'",
      "Generate an incomplete search starting with 'how to make a...'",
    ],
  },
  {
    category: "Advice & Questions",
    vibes: ["petty arguments", "existential dread", "awkward social interactions", "bizarre hypotheticals", "terrible decisions"],
    prompts: [
      "Create an incomplete search starting with 'what to do if...'",
      "Give me a search query starting with 'how to tell if...'",
      "Generate a popular question starting with 'why are people...'",
    ],
  },
];

function getRandomCategory() {
  return QUESTION_CATEGORIES[
    Math.floor(Math.random() * QUESTION_CATEGORIES.length)
  ];
}

export async function generateQuestion() {
  try {
    const category = getRandomCategory();
    const prompt =
      category.prompts[Math.floor(Math.random() * category.prompts.length)];

    const vibe =
      category.vibes[Math.floor(Math.random() * category.vibes.length)];

    const response = await fetch(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
          "Content-Type": "application/json",
          "HTTP-Referer": `http://localhost:${process.env.PORT}`,
          "X-Title": "Google Feud Multiplayer", // Optional, for OpenRouter rankings
        },
        body: JSON.stringify({
          model:
            process.env.OPENROUTER_MODEL ||
            "google/gemini-2.0-pro-exp-02-05:free", // Defaulting to a free capable model, or user can specify
          messages: [
            {
              role: "system",
              content: "You are a 'Creative Game Designer'. You must output ONLY the string ending in '...' and absolutely NO other text."
            },
            {
              role: "user",
              content: `${prompt} The question should be inspired by this sub-topic/vibe: "${vibe}". Pick a unique or slightly unusual niche within that category to avoid repetitive questions. Respond with ONLY the incomplete search query, making sure it's general, short, and ends with '...' suitable for a game. Avoid very specific or complex queries.`,
            },
          ],
        }),
      },
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `OpenRouter API error: ${response.status} ${response.statusText} - ${errorText}`,
      );
    }

    const data = await response.json();
    let question = data.choices[0].message.content.trim();

    // Clean up response if the model outputs quotes
    question = question.replace(/^["']|["']$/g, "").trim();

    // Fallback to ensure query ends with '...' and is concise
    if (!question.endsWith("...")) {
      question += "...";
    }

    // Optional: Log the category for potential game UI
    console.log(`Category: ${category.category}, Query generated: ${question}`);

    return question;
  } catch (error) {
    console.error("Error generating question with OpenRouter:", error);

    // Improved fallback questions with simple, broad queries
    const fallbackQuestions = [
      "why do people...",
      "how to stop...",
      "what happens when...",
      "is it weird if...",
      "how to get rid of...",
      "why does my...",
      "what to do if...",
      "can you eat...",
      "how long do...",
      "why is there...",
      "where can I find...",
      "is it illegal to...",
      "how to pretend...",
      "why are cats...",
    ];

    return fallbackQuestions[
      Math.floor(Math.random() * fallbackQuestions.length)
    ];
  }
}
