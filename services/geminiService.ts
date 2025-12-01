
import { GoogleGenAI, Type, Schema } from "@google/genai";
import { Challenge, TaskType, Category, AssessmentResult } from "../types";

// Helper to get a random enum value
const getRandomEnumValue = <T>(anEnum: T): T[keyof T] => {
  const enumValues = Object.values(anEnum as object) as unknown as T[keyof T][];
  const randomIndex = Math.floor(Math.random() * enumValues.length);
  return enumValues[randomIndex];
};

const pickCategory = (pool?: Category[]): Category => {
  const list = (pool && pool.length ? pool : (Object.values(Category) as Category[]));
  const randomIndex = Math.floor(Math.random() * list.length);
  return list[randomIndex];
};

// Helper to clean JSON string (remove markdown code blocks)
const cleanJsonString = (str: string): string => {
  if (!str) return "{}";
  // Remove ```json and ```
  let cleaned = str.replace(/```json/g, '').replace(/```/g, '');
  return cleaned.trim();
};

const getAI = (apiKey: string) => {
  if (!apiKey) throw new Error("API Key is missing");
  return new GoogleGenAI({ apiKey });
}

/**
 * Generates the text portion of a challenge
 */
export const generateChallengeMetadata = async (apiKey: string, specificType?: TaskType, categoryPool?: Category[]): Promise<Omit<Challenge, 'generatedImageUrl'>> => {
  const ai = getAI(apiKey);
  const category = pickCategory(categoryPool);
  const type = specificType || getRandomEnumValue(TaskType);
  const randomFactor = Math.random();

  const typeInstructions = {
    [TaskType.MULTIPLE_CHOICE]: `
      Generate a MULTIPLE_CHOICE question in one short sentence (<= 40 Chinese characters).
      You MUST provide 4 distinct options. 
      The options should NOT be black and white. Design them with "weighted correctness":
      - One "Best" answer (100 points)
      - One "Okay/Partial" answer (50 points)
      - One "Weak" answer (20 points)
      - One "Wrong/Distractor" answer (0 points)
      
      Keep each option concise and concrete (<= 14 characters).
      Output an array 'optionScores' corresponding to the order of options (e.g. [0, 100, 20, 50]).
      Identify the index (0-3) of the 'most correct' (100 point) answer as correctOptionIndex.
    `,
    [TaskType.OBSERVATION]: "Generate an OBSERVATION task in one concise line. Ask the user to describe a specific detail, color relationship, or emotional trigger in the image. Keep it plain and clear. Short answer format.",
    [TaskType.ANALYSIS]: "Generate an ANALYSIS task. Ask for a pointed critique of the composition, lighting, and style. Keep the ask short (one sentence) but allow for a thoughtful essay answer."
  };

  const varietyPrompt = randomFactor > 0.5 
    ? "Focus on high-contrast, modern, avant-garde aesthetics." 
    : "Focus on classical, harmonious, natural aesthetics.";

  const brevityGuide = `
    Use modern, easy-to-read Traditional Chinese.
    Keep the main question within ~40 characters, one sentence max.
    Avoid archaic or overly literary phrasing—be direct and conversational.
    Keep options brief noun phrases when applicable.
  `;

  const systemInstruction = `
    You are an expert Art Professor and Aesthetic Mentor. 
    Your goal is to create a daily challenge to train a student's aesthetic sense.
    
    Category: ${category}.
    Task Type: ${type}.
    Style Direction: ${varietyPrompt}
    Brevity + tone guide: ${brevityGuide}
    
    ${typeInstructions[type]}

    Crucially, provide a detailed 'imagePrompt' that will be used to generate the visual subject for this test using an AI image generator. The image should be visually interesting and relevant to the question.
    
    Respond in Traditional Chinese (Taiwan).
  `;

  const schema: Schema = {
    type: Type.OBJECT,
    properties: {
      question: { type: Type.STRING, description: "The question for the user." },
      options: { 
        type: Type.ARRAY, 
        items: { type: Type.STRING },
        description: "Only required for MULTIPLE_CHOICE. Provide exactly 4 options."
      },
      optionScores: { 
        type: Type.ARRAY, 
        items: { type: Type.INTEGER },
        description: "For MCQs, scores (0-100) for each option index." 
      },
      correctOptionIndex: { type: Type.INTEGER, description: "For MCQs, the index (0-3) of the best answer." },
      imagePrompt: { type: Type.STRING, description: "A highly descriptive prompt for an image generator. In English." },
      contextDescription: { type: Type.STRING, description: "A secret brief explanation of the aesthetic principle being tested." },
    },
    required: ["question", "imagePrompt", "contextDescription"],
  };

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: "Generate a new aesthetic training challenge.",
      config: {
        systemInstruction: systemInstruction,
        responseMimeType: "application/json",
        responseSchema: schema,
      },
    });

    const text = cleanJsonString(response.text || "{}");
    const data = JSON.parse(text);
    
    return {
      id: Date.now().toString(),
      category,
      type,
      question: data.question || "題目生成中...",
      options: Array.isArray(data.options) ? data.options : [],
      optionScores: Array.isArray(data.optionScores) ? data.optionScores : [0,0,0,0],
      correctOptionIndex: typeof data.correctOptionIndex === 'number' ? data.correctOptionIndex : 0,
      imagePrompt: data.imagePrompt || "Abstract art",
      contextDescription: data.contextDescription || "Analysis",
    };
  } catch (error) {
    console.error("Error generating challenge metadata:", error);
    // Fallback to prevent crash
    return {
      id: Date.now().toString(),
      category: Category.COMPOSITION,
      type: type,
      question: "請分析這張圖片的構圖平衡（網絡異常，啟用備用題目）。",
      options: ["平衡", "不平衡", "對稱", "混亂"],
      optionScores: [100, 20, 50, 0],
      correctOptionIndex: 0,
      imagePrompt: "Minimalist photography of a single red chair in an empty concrete room.",
      contextDescription: "Testing understanding of negative space.",
    };
  }
};

/**
 * Generates the image
 */
export const generateChallengeImage = async (apiKey: string, prompt: string): Promise<string> => {
  const ai = getAI(apiKey);
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-image",
      contents: prompt,
      config: {
        // Defaulting to 1:1
      }
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
      }
    }
    // Fallback image if model returns no image data but no error
    return `https://picsum.photos/800/800?random=${Math.random()}`;
  } catch (error) {
    console.error("Error generating image:", error);
    return `https://picsum.photos/800/800?random=${Math.random()}`;
  }
};

/**
 * Evaluates the user's answer
 */
export const evaluateSubmission = async (
  apiKey: string,
  challenge: Challenge,
  userAnswer: string
): Promise<AssessmentResult> => {
  // If it's a weighted MCQ, we can grade it locally to save API calls and ensure consistency with the generated weights
  if (challenge.type === TaskType.MULTIPLE_CHOICE && challenge.options && challenge.optionScores) {
    const userIndex = challenge.options.indexOf(userAnswer);
    if (userIndex !== -1) {
      const score = challenge.optionScores[userIndex] || 0;
      let feedback = "";
      if (score === 100) feedback = "完美！你準確捕捉到了核心美感原則。";
      else if (score >= 50) feedback = "還不錯，這個觀點有道理，但還有更精準的切入點。";
      else if (score > 0) feedback = "觀察角度有些偏頗，建議多留意畫面主體。";
      else feedback = "這個判斷與美學原理有較大出入，請參考正確解析。";

      return {
        score,
        feedback,
        strengths: ["直覺判斷"],
        improvements: ["細節觀察"],
        correctOptionIndex: challenge.correctOptionIndex
      };
    }
  }

  const ai = getAI(apiKey);
  const systemInstruction = `
    You are a strict but encouraging Art Professor.
    Evaluate the student's answer to the aesthetic challenge.
    
    Category: ${challenge.category}
    Type: ${challenge.type}
    Question: ${challenge.question}
    Context/Correct Principle: ${challenge.contextDescription}
    Correct Option Index (if MCQ): ${challenge.correctOptionIndex}
    Student Answer: ${userAnswer}
    
    Task Specifics:
    - If OBSERVATION: Did they notice the details implied in the context?
    - If ANALYSIS: Did they use specific terminology? Is their argument logical?

    Provide a score from 0-100.
    
    Respond with a simple JSON object. No Markdown.
    Provide constructive feedback in Traditional Chinese.
  `;

  const schema: Schema = {
    type: Type.OBJECT,
    properties: {
      score: { type: Type.INTEGER },
      feedback: { type: Type.STRING, description: "Detailed critique and explanation." },
      strengths: { type: Type.ARRAY, items: { type: Type.STRING }, description: "What they did well. Returns empty array if none." },
      improvements: { type: Type.ARRAY, items: { type: Type.STRING }, description: "What to look for next time. Returns empty array if none." },
      correctOptionIndex: { type: Type.INTEGER, description: "Return the correct index again for UI highlight." }
    },
    required: ["score", "feedback", "strengths", "improvements"],
  };

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: "Evaluate this submission.",
      config: {
        systemInstruction: systemInstruction,
        responseMimeType: "application/json",
        responseSchema: schema,
      },
    });

    const text = cleanJsonString(response.text || "{}");
    const parsed = JSON.parse(text);

    // Validate and default fields to prevent crashes
    return {
      score: typeof parsed.score === 'number' ? parsed.score : 0,
      feedback: typeof parsed.feedback === 'string' ? parsed.feedback : "評分完成。",
      strengths: Array.isArray(parsed.strengths) ? parsed.strengths : [],
      improvements: Array.isArray(parsed.improvements) ? parsed.improvements : [],
      correctOptionIndex: typeof parsed.correctOptionIndex === 'number' ? parsed.correctOptionIndex : challenge.correctOptionIndex
    };

  } catch (error) {
    console.error("Error evaluating submission:", error);
    return {
      score: 50,
      feedback: "評分服務暫時無法連接，請稍後再試。",
      strengths: [],
      improvements: [],
      correctOptionIndex: challenge.correctOptionIndex
    };
  }
};
