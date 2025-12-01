import { GoogleGenAI, Type } from "@google/genai";
import { AspectRatio, ImageSize, Platform, Tone } from "../types";

// Helper to get client with current key
const getClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) throw new Error("API Key not found");
  return new GoogleGenAI({ apiKey });
};

export const generatePostContent = async (
  idea: string,
  tone: Tone
): Promise<{
  linkedin: { text: string; imagePrompt: string };
  twitter: { text: string; imagePrompt: string };
  instagram: { text: string; hashtags: string[]; imagePrompt: string };
  facebook: { text: string; imagePrompt: string };
}> => {
  const ai = getClient();
  
  const prompt = `
    You are a professional social media manager fluent in Arabic.
    Task: Create drafted posts for LinkedIn, Twitter, Instagram, and Facebook based on the following user idea.
    Idea: "${idea}"
    Tone: ${tone} (Please match this tone strictly in Arabic).

    Requirements:
    1. Language: Arabic (Modern Standard Arabic or appropriate dialect if implied by tone).
    2. LinkedIn: Long-form, professional, engaging, thought leadership style.
    3. Twitter: Short, punchy, under 280 chars, viral potential.
    4. Instagram: Visual-first caption, engaging hook, spacing, and relevant hashtags.
    5. Facebook: Conversational, community-focused, storytelling or question-based, moderate length.
    6. For EACH platform, provide a detailed English prompt to generate a high-quality image that matches the post content and platform aesthetics.
  `;

  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview', // High intelligence model for complex text tasks
    contents: prompt,
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          linkedin: {
            type: Type.OBJECT,
            properties: {
              text: { type: Type.STRING },
              imagePrompt: { type: Type.STRING, description: "Prompt for image generation in English" }
            },
            required: ["text", "imagePrompt"]
          },
          twitter: {
            type: Type.OBJECT,
            properties: {
              text: { type: Type.STRING },
              imagePrompt: { type: Type.STRING, description: "Prompt for image generation in English" }
            },
            required: ["text", "imagePrompt"]
          },
          instagram: {
            type: Type.OBJECT,
            properties: {
              text: { type: Type.STRING },
              hashtags: { type: Type.ARRAY, items: { type: Type.STRING } },
              imagePrompt: { type: Type.STRING, description: "Prompt for image generation in English" }
            },
            required: ["text", "hashtags", "imagePrompt"]
          },
          facebook: {
            type: Type.OBJECT,
            properties: {
              text: { type: Type.STRING },
              imagePrompt: { type: Type.STRING, description: "Prompt for image generation in English" }
            },
            required: ["text", "imagePrompt"]
          }
        },
        required: ["linkedin", "twitter", "instagram", "facebook"]
      }
    }
  });

  const text = response.text;
  if (!text) throw new Error("No response from Gemini");
  return JSON.parse(text);
};

export const generateImageForPlatform = async (
  prompt: string,
  platform: Platform,
  config: { aspectRatio: AspectRatio | 'AUTO'; size: ImageSize }
): Promise<string> => {
  const ai = getClient();

  // Determine aspect ratio
  let ratio = config.aspectRatio;
  if (ratio === 'AUTO') {
    switch (platform) {
      case Platform.LINKEDIN:
        ratio = '16:9';
        break;
      case Platform.TWITTER:
        ratio = '16:9';
        break;
      case Platform.INSTAGRAM:
        ratio = '1:1';
        break;
      case Platform.FACEBOOK:
        ratio = '4:3';
        break;
      default:
        ratio = '1:1';
    }
  }

  // Aspect Ratio Mapping
  // The UI supports extensive ratios (e.g., 21:9, 2:3), but the API strictly supports:
  // "1:1", "3:4", "4:3", "9:16", "16:9".
  // We map unsupported user choices to the closest supported API value to ensure successful generation.
  const safeRatioMap: Record<string, string> = {
    '1:1': '1:1',
    '3:4': '3:4',
    '4:3': '4:3',
    '9:16': '9:16',
    '16:9': '16:9',
    // Mappings
    '2:3': '3:4',   // Vertical: map to closest vertical
    '3:2': '4:3',   // Horizontal: map to closest horizontal
    '21:9': '16:9', // Ultrawide: map to wide
  };
  
  const apiRatio = safeRatioMap[ratio as string] || '1:1';

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-image-preview', // Nano Banana Pro for high quality images
      contents: {
        parts: [{ text: prompt }]
      },
      config: {
        imageConfig: {
          aspectRatio: apiRatio as any, 
          imageSize: config.size
        }
      }
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
      }
    }
    throw new Error("No image data found in response");
  } catch (error) {
    console.error("Image generation failed", error);
    throw error;
  }
};