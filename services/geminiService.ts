import { GoogleGenAI } from "@google/genai";
import { PipeSegment } from "../types";

let aiClient: GoogleGenAI | null = null;

const getAi = () => {
    if (!aiClient) {
        const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY || "missing_key";
        aiClient = new GoogleGenAI({ apiKey });
    }
    return aiClient;
};

export const generate3DFromImage = async (base64Image: string): Promise<PipeSegment[]> => {
  try {
    const ai = getAi();
    const model = 'gemini-3.1-pro-preview';
    
    // Extract mime type and base64 data
    const match = base64Image.match(/^data:(image\/[a-zA-Z+]+);base64,(.+)$/);
    if (!match) throw new Error("Formato de imagem inválido");
    const mimeType = match[1];
    const base64Data = match[2];

    const prompt = `
      Você é um especialista em tubulação industrial e software CAD.
      Analise este esboço de tubulação isométrica ou desenho.
      Extraia a sequência de tubos e conexões e converta para um array JSON de objetos PipeSegment.
      
      Regras:
      1. Comece no ponto {x: 0, y: 0, z: 0}.
      2. Mova-se ao longo dos eixos X, Y ou Z.
      3. O tamanho padrão do grid é 100mm (1 unidade = 100).
      4. Categorias válidas (type): 'PIPE', 'ELBOW_LR', 'ELBOW_SR', 'TEE', 'VALVE_GATE', 'VALVE_GLOBE', 'VALVE_BALL', 'FLANGE_WN', 'FLANGE_SO', 'REDUCER_CON'.
      5. Retorne APENAS um array JSON válido, sem blocos de código markdown (\`\`\`json).
      
      Formato do objeto PipeSegment:
      {
        "id": "1",
        "start": {"x": 0, "y": 0, "z": 0},
        "end": {"x": 500, "y": 0, "z": 0},
        "type": "PIPE",
        "size": 4
      }
    `;

    const response = await ai.models.generateContent({
      model: model,
      contents: {
        parts: [
          { inlineData: { mimeType, data: base64Data } },
          { text: prompt }
        ]
      },
      config: {
        responseMimeType: "application/json",
      }
    });

    const text = response.text || "[]";
    const cleanedText = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    return JSON.parse(cleanedText);
  } catch (error) {
    console.error("Gemini Vision Error:", error);
    throw new Error("Falha ao analisar o desenho.");
  }
};

export const askTubistaAssistant = async (question: string) => {
  try {
    const ai = getAi();
    const model = 'gemini-3-flash-preview';
    const systemInstruction = `
      Você é um encarregado de tubulação industrial experiente (Mestre Tubista) com 30 anos de experiência.
      Responda de forma direta, técnica e prática.
      Use terminologia correta em português (ex: bisel, raiz, eletrodo, spool, flange, schedule).
      Se perguntarem sobre conexões, explique a função (retenção, controle, bloqueio).
      Se perguntarem sobre cálculos, mostre a fórmula passo a passo.
      Responda sempre em Markdown.
    `;

    const response = await ai.models.generateContent({
      model: model,
      contents: question,
      config: {
        systemInstruction: systemInstruction,
        thinkingConfig: { thinkingBudget: 0 } 
      }
    });

    return response.text || "Desculpe, não consegui processar a resposta.";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Erro ao conectar com o assistente inteligente. Verifique sua chave API.";
  }
};