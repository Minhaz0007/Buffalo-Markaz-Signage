import { GoogleGenAI } from "@google/genai";

export const fetchDailyWisdom = async (): Promise<string> => {
  // If no API key is present, return a default wisdom to prevent crashing in demo mode without env vars
  if (!process.env.API_KEY) {
    console.warn("API_KEY not found. Returning fallback wisdom.");
    return "The best of you are those who are best to their families.";
  }

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: "Generate a short, inspiring Islamic quote or Hadith suitable for display on a mosque digital signage screen. Keep it under 20 words. Do not include quotes or citations, just the text.",
    });

    return response.text.trim();
  } catch (error) {
    console.error("Error fetching wisdom from Gemini:", error);
    return "Seek knowledge from the cradle to the grave.";
  }
};
