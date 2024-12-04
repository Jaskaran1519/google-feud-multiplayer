import { GOOGLE_CONFIG } from '../config/config.js';

export async function getAutocompleteSuggestions(query) {
  try {
    // Using a proxy service that provides Google Autocomplete results
    const response = await fetch(`http://suggestqueries.google.com/complete/search?client=firefox&q=${encodeURIComponent(query)}`);
    const data = await response.json();
    
    // Google Autocomplete returns an array where the second element contains suggestions
    const suggestions = data[1]?.slice(0, 10) || [];

    return suggestions;
  } catch (error) {
    console.error("Error fetching suggestions:", error);
    // Fallback suggestions if API fails
    return [
      "bored at home",
      "bored at work",
      "bored in class",
      "bored and lonely",
      "bored during summer",
      "bored during quarantine",
      "bored during winter",
      "bored during weekend",
      "bored during vacation",
      "bored during lunch"
    ];
  }
}