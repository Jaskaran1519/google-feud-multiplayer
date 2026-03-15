import dotenv from "dotenv";

dotenv.config();

// ─── CURATED QUESTION BANK ───────────────────────────────────────────────────
// Modeled after real Google Feud: the query prefix is SPECIFIC enough
// that Google autocomplete completions are only 1-2 words.
//
// Pattern: "subject + verb + context..." so completions are just the object/noun.
// e.g. "can dogs eat..." → "chocolate", "grapes", "bananas"
//      "is my cat..." → "pregnant", "sick", "dying"
const CURATED_QUESTIONS = [
  // ──── Animals ────
  "can dogs eat...",
  "can cats eat...",
  "can rabbits eat...",
  "can hamsters eat...",
  "can birds eat...",
  "why does my dog eat...",
  "why does my cat lick...",
  "why does my dog smell like...",
  "why does my cat stare at...",
  "is my cat...",
  "is my dog...",
  "are goldfish...",
  "do cats like...",
  "do dogs like...",
  "can turtles eat...",
  "are snakes...",
  "why do cats hate...",
  "giraffes are...",
  "can parrots eat...",

  // ──── Food & Cooking ────
  "can you eat...",
  "can you freeze...",
  "can you microwave...",
  "can you reheat...",
  "is it safe to eat...",
  "what does ... taste like",
  "how long to boil...",
  "how long to bake...",
  "how long to cook...",
  "how long to grill...",
  "what goes well with...",
  "can you eat raw...",
  "is ... good for you",
  "calories in a...",

  // ──── Body & Health ────
  "why does my ... hurt",
  "why does my eye...",
  "why does my stomach...",
  "why does my head...",
  "why does my back...",
  "why is my pee...",
  "why is my tongue...",
  "why is my skin...",
  "is it normal to...",
  "is it bad to crack your...",
  "i broke my...",
  "can you survive...",
  "why do i always feel...",
  "my ... is swollen",
  "why am i so...",

  // ──── Illegal / Rules ────
  "is it illegal to...",
  "is it legal to...",
  "can you get arrested for...",
  "is it against the law to...",
  "can you get fired for...",

  // ──── Relationships / People ────
  "why does my boyfriend...",
  "why does my girlfriend...",
  "why does my husband...",
  "why does my wife...",
  "how to tell if someone is...",
  "how to deal with a...",
  "my mom always...",
  "my dad never...",
  "why is my friend so...",
  "why do teachers...",
  "why do parents...",
  "i think my neighbor is...",

  // ──── Feelings / Self ────
  "why do i feel so...",
  "why do i always...",
  "why can't i...",
  "how to stop being so...",
  "is it weird to...",
  "is it rude to...",
  "is it okay to...",
  "i'm scared of...",
  "what if i accidentally...",
  "should i sell my...",

  // ──── Culture / Media ────
  "why did they cancel...",
  "the Beatles are...",
  "is ... based on a true story",
  "who invented...",
  "what happened to...",
  "is ... still alive",
  "poems about...",
  "songs about...",
  "movies about...",
  "books about...",

  // ──── Tech / Everyday ────
  "why is my phone...",
  "why is my computer...",
  "why is my wifi...",
  "how to fix a broken...",
  "how to remove...",
  "how to clean...",
  "how to open...",
  "how to unlock...",
  "what to do if you lose your...",
  "how to get ... out of clothes",

  // ──── Random / Fun ────
  "what if I ate...",
  "how to hold in a...",
  "what do astronauts eat for...",
  "what does the president eat for...",
  "why do old people...",
  "why do babies...",
  "can humans...",
  "the earth is...",
  "the moon is made of...",
  "why is the ocean...",
  "how deep is the...",
  "how tall is the average...",
  "what country has the most...",
];

// Track used questions to avoid repeats within a session
const usedCuratedIndices = new Set();

/**
 * Pick a random question from the curated bank (without repeats).
 */
function pickCuratedQuestion() {
  const available = CURATED_QUESTIONS
    .map((q, i) => ({ q, i }))
    .filter(({ i }) => !usedCuratedIndices.has(i));

  if (available.length === 0) {
    usedCuratedIndices.clear();
    const idx = Math.floor(Math.random() * CURATED_QUESTIONS.length);
    usedCuratedIndices.add(idx);
    return CURATED_QUESTIONS[idx];
  }

  const pick = available[Math.floor(Math.random() * available.length)];
  usedCuratedIndices.add(pick.i);
  return pick.q;
}

/**
 * Generate a question using AI via OpenRouter.
 */
async function generateAIQuestion() {
  try {
    const response = await fetch(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
          "Content-Type": "application/json",
          "HTTP-Referer": `http://localhost:${process.env.PORT}`,
          "X-Title": "Google Feud Multiplayer",
        },
        body: JSON.stringify({
          model:
            process.env.OPENROUTER_MODEL ||
            "google/gemini-2.0-flash-exp:free",
          messages: [
            {
              role: "system",
              content: `You generate Google search query starters for a game like Google Feud.

CRITICAL RULES:
- Output ONLY the query. No quotes, no extra text, no commentary.
- The query MUST end with "..."
- The query must be SPECIFIC ENOUGH that Google autocomplete completions are only 1-2 WORDS long.
- Think about what real people actually type into Google every day.

HOW TO MAKE COMPLETIONS SHORT:
The more context you give in the query, the shorter the completion. Compare:
  BAD (too generic, completions are 3+ words): "how to..." "why do people..." "what is..."  
  GOOD (specific, completions are 1-2 words): "can dogs eat..." "why is my tongue..." "is it illegal to..."

GOOD EXAMPLES that produce short completions:
- "can dogs eat..."        → chocolate, grapes, bananas (1 word!)
- "is my cat..."           → pregnant, sick, dying (1 word!)
- "why does my dog lick..."→ me, everything, the floor (1-2 words!)
- "should I sell my..."    → house, car, stocks (1 word!)
- "how to hold in a..."    → sneeze, fart, burp (1 word!)
- "why does my ... hurt"   → back, knee, chest (1 word!)
- "can you freeze..."      → cheese, milk, eggs (1 word!)
- "what if I ate..."       → mold, glue, soap (1 word!)
- "i broke my..."          → toe, phone, arm (1 word!)
- "is it bad to crack your..." → knuckles, back, neck (1 word!)

BAD EXAMPLES (don't do this):
- "why do people..." (too open, completions are multi-word phrases)
- "how to get rid of..." (completions are 2-3 words)  
- "what is the best..." (completions are long phrases)
- "how to make a homemade..." (too wordy AND niche)`,
            },
            {
              role: "user",
              content:
                "Generate ONE Google search query starter for the game. The completions when someone types this into Google should only be 1-2 words. Just output the query, nothing else.",
            },
          ],
          max_tokens: 40,
          temperature: 1.1,
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`OpenRouter API error: ${response.status}`);
    }

    const data = await response.json();
    let question = data.choices[0].message.content.trim();

    // Clean up: remove quotes, take first line only
    question = question.replace(/^["""'''`*]+|["""'''`*]+$/g, "").trim();
    question = question.replace(/\n.*/s, "").trim();
    if (!question.endsWith("...")) {
      question += "...";
    }

    // Validate length: 3-10 words is acceptable
    const wordCount = question.replace(/\.{3}$/, "").trim().split(/\s+/).length;
    if (wordCount > 10 || wordCount < 2) {
      console.log(`AI question invalid (${wordCount} words), using curated: "${question}"`);
      return null;
    }

    console.log(`AI generated: "${question}"`);
    return question;
  } catch (error) {
    console.error("Error generating AI question:", error.message);
    return null;
  }
}

/**
 * Main export: generates a question.
 * 50/50 mix of curated bank and AI for variety,
 * curated is the guaranteed fallback.
 */
export async function generateQuestion() {
  const useAI = Math.random() < 0.5;

  if (useAI) {
    const aiQuestion = await generateAIQuestion();
    if (aiQuestion) return aiQuestion;
  }

  return pickCuratedQuestion();
}
