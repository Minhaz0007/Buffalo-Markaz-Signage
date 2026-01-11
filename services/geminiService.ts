import { GoogleGenAI } from "@google/genai";

const CACHE_KEY = 'daily_wisdom_cache';
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

interface CachedWisdom {
  text: string;
  timestamp: number;
}

export const fetchDailyWisdom = async (): Promise<string> => {
  // 1. Try to load from cache first
  try {
    const cachedRaw = localStorage.getItem(CACHE_KEY);
    if (cachedRaw) {
      const cached: CachedWisdom = JSON.parse(cachedRaw);
      const age = Date.now() - cached.timestamp;
      
      // If cache is fresh (less than 24 hours), use it
      if (age < CACHE_DURATION) {
        return cached.text;
      }

      // If offline, use stale cache regardless of age
      if (!navigator.onLine) {
        console.log("Offline: Using cached wisdom.");
        return cached.text;
      }
    }
  } catch (e) {
    console.warn("Failed to read wisdom cache", e);
  }

  // 2. Fallback if no API key or Offline with no cache
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

  if (!apiKey) {
    console.warn("VITE_GEMINI_API_KEY not found. Returning fallback wisdom.");
    return "The best of you are those who are best to their families.";
  }

  if (!navigator.onLine) {
    return "Seek knowledge from the cradle to the grave.";
  }

  // 3. Fetch fresh wisdom
  try {
    const ai = new GoogleGenAI({ apiKey });
    
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: "Generate a short, inspiring Islamic quote or Hadith suitable for display on a mosque digital signage screen. Keep it under 20 words. Do not include quotes or citations, just the text.",
    });

    const newText = response.text.trim();

    // 4. Save to cache
    try {
      const cacheData: CachedWisdom = {
        text: newText,
        timestamp: Date.now()
      };
      localStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));
    } catch (e) {
      console.warn("Failed to save wisdom to cache", e);
    }

    return newText;
  } catch (error) {
    console.error("Error fetching wisdom from Gemini:", error);
    // Return cached value if fetch fails, even if old
    const cachedRaw = localStorage.getItem(CACHE_KEY);
    if (cachedRaw) {
        return JSON.parse(cachedRaw).text;
    }
    return "Seek knowledge from the cradle to the grave.";
  }
};