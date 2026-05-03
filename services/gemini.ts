import { GoogleGenAI, Modality, Type } from "@google/genai";
import { StorySession, Difficulty } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const generateStorySession = async (difficulty: Difficulty): Promise<StorySession> => {
  let prompt = "";
  switch (difficulty) {
    case Difficulty.EASY:
      prompt = "Write a very short, simple story (3-4 sentences) for a 6-year-old using basic vocabulary. Provide a visual description for an illustration. Create 3 simple questions about the story where the answers are single words found in the text.";
      break;
    case Difficulty.MEDIUM:
      prompt = "Write a short story (5-6 sentences) for an 8-year-old about an interesting event. Provide a visual description for an illustration. Create 3 questions where the answers are 1-2 words.";
      break;
    case Difficulty.HARD:
      prompt = "Write a creative story (paragraph of 8-10 sentences) for a 10-year-old. Provide a detailed visual description. Create 3 comprehension questions where the answers are short phrases.";
      break;
  }

  try {
    // 1. Generate Text Content
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            content: { type: Type.STRING },
            visualPrompt: { type: Type.STRING },
            questions: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  text: { type: Type.STRING, description: "The question text" },
                  answer: { type: Type.STRING, description: "The short answer" }
                },
                required: ["text", "answer"]
              }
            }
          },
          required: ["title", "content", "visualPrompt", "questions"]
        }
      }
    });

    const data = JSON.parse(response.text || "{}");
    const session: StorySession = {
      id: crypto.randomUUID(),
      title: data.title,
      content: data.content,
      visualPrompt: data.visualPrompt,
      questions: data.questions.map((q: any, i: number) => ({
        id: `q-${i}`,
        text: q.text,
        answer: q.answer
      })),
      imageBase64: null
    };

    // 2. Generate Image in parallel (optional but good for UX)
    // We will let the UI trigger this or do it here. Doing it here ensures everything is ready.
    try {
      const imageResponse = await ai.models.generateContent({
        model: "gemini-2.5-flash-image",
        contents: {
          parts: [{ text: `A colorful, kid-friendly illustration style, vector art: ${data.visualPrompt}` }]
        },
        config: {
           // No responseSchema for image model
        }
      });
      
      // Extract image
      for (const part of imageResponse.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) {
          session.imageBase64 = part.inlineData.data;
          break;
        }
      }
    } catch (imgError) {
      console.error("Failed to generate image:", imgError);
      // Continue without image if it fails
    }

    return session;

  } catch (error) {
    console.error("Failed to generate story session:", error);
    throw error;
  }
};

export const generateSpeech = async (text: string): Promise<string | null> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: text }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Puck' }, // Friendly voice for kids
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    return base64Audio || null;
  } catch (error) {
    console.error("Failed to generate speech:", error);
    return null;
  }
};