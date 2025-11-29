import { GoogleGenAI, Type } from "@google/genai";
import { SignalMapping, TestMode } from "../types";

// Initialize Gemini Client
// Note: In a real app, ensure process.env.API_KEY is handled securely.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const MODEL_NAME = 'gemini-2.5-flash';

/**
 * Uses Gemini to intelligently transform CAPL code when simple regex is insufficient.
 */
export const transformCodeWithAI = async (
  code: string,
  mode: TestMode,
  mappings: SignalMapping[]
): Promise<string> => {
  if (!code.trim()) return "";

  const target = mode === TestMode.SIL ? "Simulation (System Variables/DLL)" : "Real Hardware (Real Signals)";
  const mappingDesc = mappings.map(m => `"${m.realSignal}" <-> "${m.simSignal}"`).join("\n");

  const prompt = `
    You are an expert Vector CANoe CAPL developer. 
    Your task is to refactor the following CAPL code for ${target} testing.
    
    Rules:
    1. If converting to SIL (Simulation), replace Real Signals with the mapped Simulation Signals.
    2. If converting to HIL (Real Hardware), replace Simulation Signals with the mapped Real Signals.
    3. Keep all logic, comments, and structure exactly the same. Only change the signal references.
    4. Return ONLY the code. No markdown formatting, no explanation.

    Mappings provided:
    ${mappingDesc}

    Code to Transform:
    ${code}
  `;

  try {
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: prompt,
    });
    return response.text.replace(/```capl/g, '').replace(/```/g, '').trim();
  } catch (error) {
    console.error("AI Transformation Error:", error);
    throw new Error("Failed to transform code using AI.");
  }
};

/**
 * Uses Gemini to analyze CAPL code and generate a JSON mapping suggestions.
 */
export const generateMappingsFromCode = async (code: string): Promise<SignalMapping[]> => {
  if (!code.trim()) return [];

  const prompt = `
    Analyze the following CAPL code and identify all potential real signals (e.g., $SignalName, Message.Signal).
    Create a JSON mapping structure for them where you suggest a hypothetical System Variable name for each.
    
    The output must be a JSON array of objects with this schema:
    {
      "realSignal": "string (found in code)",
      "simSignal": "string (suggested sysvar format e.g. sysvar::Namespace::Var)",
      "description": "string (brief guess)"
    }

    Code:
    ${code}
  `;

  try {
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              realSignal: { type: Type.STRING },
              simSignal: { type: Type.STRING },
              description: { type: Type.STRING },
            },
            required: ["realSignal", "simSignal"],
          }
        }
      }
    });

    const result = JSON.parse(response.text);
    return result.map((item: any, index: number) => ({
      id: `gen_${Date.now()}_${index}`,
      realSignal: item.realSignal,
      simSignal: item.simSignal,
      description: item.description || "Auto-generated"
    }));

  } catch (error) {
    console.error("AI Mapping Generation Error:", error);
    return [];
  }
};
