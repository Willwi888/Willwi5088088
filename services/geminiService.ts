import { GoogleGenAI, Type } from "@google/genai";
import { VisualSettings, ThemeStyle } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const analyzeLyricsForTheme = async (lyrics: string): Promise<Partial<VisualSettings>> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Analyze the following song lyrics (which may be in Chinese or English) and suggest a visual theme. 
      Determine the best color palette (hex codes), and the overall mood style.
      
      Lyrics Sample:
      ${lyrics.substring(0, 1000)}...
      `,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            primaryColor: { type: Type.STRING, description: "Main accent color hex code" },
            secondaryColor: { type: Type.STRING, description: "Secondary accent color hex code" },
            backgroundColor: { type: Type.STRING, description: "Dark background color hex code" },
            style: { 
              type: Type.STRING, 
              enum: [ThemeStyle.NEON, ThemeStyle.MINIMAL, ThemeStyle.NATURE, ThemeStyle.FIERY],
              description: "The visual style category"
            },
            moodDescription: { type: Type.STRING, description: "Short description of the song's mood" }
          },
          required: ["primaryColor", "secondaryColor", "backgroundColor", "style"]
        }
      }
    });

    if (response.text) {
        const data = JSON.parse(response.text);
        return {
            primaryColor: data.primaryColor,
            secondaryColor: data.secondaryColor,
            backgroundColor: data.backgroundColor,
            style: data.style as ThemeStyle,
        };
    }
    return {};
  } catch (error) {
    console.error("Error analyzing lyrics with Gemini:", error);
    // Fallback default
    return {
        primaryColor: "#6366f1",
        secondaryColor: "#c084fc",
        backgroundColor: "#0f172a",
        style: ThemeStyle.NEON
    };
  }
};