
import { GoogleGenAI, Type, Modality, GenerateContentResponse } from "@google/genai";
import { Patient, Medication } from '../types';

const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  // This is a client-side check. The key is expected to be in the environment.
  console.warn("API_KEY environment variable not set. Gemini API calls will fail.");
}

const getAIClient = () => new GoogleGenAI({ apiKey: API_KEY });

const fileToGenerativePart = async (file: File) => {
  const base64EncodedDataPromise = new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
    reader.readAsDataURL(file);
  });
  return {
    inlineData: { data: await base64EncodedDataPromise, mimeType: file.type },
  };
};

const base64ToGenerativePart = (base64: string, mimeType: string = 'image/jpeg') => {
    return {
        inlineData: {
            data: base64,
            mimeType,
        },
    };
};

export const compareFaces = async (photo1: string, photo2: string): Promise<boolean> => {
    if (!API_KEY) return false;
    const ai = getAIClient();
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: {
                parts: [
                    base64ToGenerativePart(photo1),
                    base64ToGenerativePart(photo2),
                    { text: "Are these two photos of the same person? Answer with only 'Yes' or 'No'." }
                ]
            },
        });
        const text = response.text.trim().toLowerCase();
        return text.includes('yes');
    } catch (error) {
        console.error("Face comparison failed:", error);
        return false;
    }
};

export const generateDietPlan = async (patient: Patient): Promise<string> => {
  if (!API_KEY) return "AI service is unavailable.";
  const ai = getAIClient();
  const prompt = `Create a simple one-day diet plan for a patient named ${patient.name}. Consider they are taking the following medications: ${patient.medications.map(m => m.name).join(', ') || 'none'}. The plan should be healthy, balanced, and easy to follow. Format it nicely using markdown.`;
  try {
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
    });
    return response.text;
  } catch (error) {
    console.error("Diet plan generation failed:", error);
    return "Could not generate a diet plan at this time.";
  }
};

export const generateHealthChatMessageStream = async (history: {role: 'user' | 'model', parts: {text: string}[]}[], newMessage: string): Promise<AsyncGenerator<GenerateContentResponse>> => {
    if (!API_KEY) throw new Error("AI service is unavailable.");
    const ai = getAIClient();
    try {
      const chat = ai.chats.create({
          model: 'gemini-2.5-flash',
          config: {
            systemInstruction: "You are a friendly and helpful AI Health Coach. Provide supportive and informative advice about general wellness, diet, and fitness. Do not provide medical diagnoses or prescribe treatments. If asked about a serious medical condition, advise the user to consult a doctor.",
          },
          history: history,
      });

      const response = await chat.sendMessageStream({ message: newMessage });
      return response;
    } catch (error) {
        console.error("Health chat failed:", error);
        throw new Error("I'm sorry, I'm having trouble responding right now.");
    }
};

export const analyzeMealImage = async (photoBase64: string): Promise<string> => {
    if (!API_KEY) return "AI service is unavailable.";
    const ai = getAIClient();
    const prompt = `Analyze this meal. Provide a detailed nutritional breakdown including:
    1.  A list of identifiable ingredients.
    2.  An estimated calorie count.
    3.  A breakdown of macronutrients (protein, carbs, fats).
    4.  An estimation of key vitamins and minerals present.
    5.  A list of potential common allergens (like gluten, dairy, nuts).
    6.  A helpful suggestion for making the meal healthier or a comment on its benefits.
    Format the response in clear, easy-to-read markdown.`;
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: { parts: [base64ToGenerativePart(photoBase64), { text: prompt }] },
        });
        return response.text;
    } catch (error) {
        console.error("Meal analysis failed:", error);
        return "I'm sorry, I couldn't analyze the meal image.";
    }
};

export const generateVoiceAlert = async (message: string): Promise<string | null> => {
    if (!API_KEY) return null;
    const ai = getAIClient();
    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash-preview-tts",
            contents: [{ parts: [{ text: message }] }],
            config: {
                responseModalities: [Modality.AUDIO],
                speechConfig: {
                    voiceConfig: {
                        prebuiltVoiceConfig: { voiceName: 'Kore' },
                    },
                },
            },
        });
        const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
        return base64Audio || null;
    } catch (error) {
        console.error("Voice generation failed:", error);
        return null;
    }
};

export const generateYogaVideo = async (prompt: string): Promise<string | null> => {
    if (!API_KEY) {
      console.error("API key not available for video generation.");
      throw new Error("API key not available.");
    };
    const ai = getAIClient();
    try {
        let operation = await ai.models.generateVideos({
            model: 'veo-3.1-fast-generate-preview',
            prompt: prompt,
            config: {
                numberOfVideos: 1,
                resolution: '720p',
                aspectRatio: '9:16'
            }
        });

        while (!operation.done) {
            await new Promise(resolve => setTimeout(resolve, 10000));
            operation = await ai.operations.getVideosOperation({ operation: operation });
        }

        const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
        if (downloadLink) {
             return `${downloadLink}&key=${API_KEY}`;
        }
        return null;
    } catch (error) {
        console.error("Video generation failed:", error);
        if (error instanceof Error && error.message.includes("Requested entity was not found.")) {
             throw new Error("API key is invalid. Please select a valid key.");
        }
        throw new Error("Failed to generate video.");
    }
};


export const generateHealthArticle = async (topic: string): Promise<string> => {
    if (!API_KEY) return "AI service is unavailable.";
    const ai = getAIClient();
    const prompt = `Write a short, patient-friendly health article on the topic: "${topic}". The article should be encouraging, easy to understand, and avoid complex medical jargon. Structure it with a title, a short introduction, 3-4 key points (using bullet points or numbered lists), and a brief concluding summary. At the end, include the disclaimer: "Disclaimer: This article is for informational purposes only and does not constitute medical advice. Please consult a healthcare professional for any health concerns." Format the entire response using Markdown.`;
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
        });
        return response.text;
    } catch (error) {
        console.error("Article generation failed:", error);
        return "Could not generate an article at this time.";
    }
};