
import { GoogleGenAI, Type } from "@google/genai";
import { Question, Language } from "./types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const generateQuestion = async (language: Language, level: number): Promise<Question> => {
  const difficulty = level <= 5 ? 'fácil' : level <= 10 ? 'médio' : level <= 15 ? 'difícil' : 'expert';
  
  const prompt = `Gere uma pergunta de múltipla escolha para aprender o idioma ${language}. 
  O nível de dificuldade é ${difficulty} (Questão número ${level} de 16).
  A pergunta deve focar em gramática, vocabulário ou expressões comuns.
  O texto da pergunta deve estar em Português, mas as opções e o conteúdo gramatical devem ser no idioma ${language}.
  Forneça uma explicação curta do porquê a resposta está correta.`;

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          text: { type: Type.STRING, description: "O enunciado da pergunta." },
          options: { 
            type: Type.ARRAY, 
            items: { type: Type.STRING },
            description: "4 opções de resposta."
          },
          correctIndex: { type: Type.INTEGER, description: "Índice da resposta correta (0-3)." },
          explanation: { type: Type.STRING, description: "Explicação da regra gramatical ou vocabulário." },
          difficulty: { type: Type.STRING, enum: ['fácil', 'médio', 'difícil', 'expert'] }
        },
        required: ["text", "options", "correctIndex", "explanation", "difficulty"]
      }
    }
  });

  const questionData = JSON.parse(response.text || '{}');
  return questionData as Question;
};

export const getHostCommentary = async (state: 'correct' | 'incorrect' | 'intro' | 'lifeline'): Promise<string> => {
  const prompt = `Você é o apresentador de um game show de idiomas estilo 'Show do Milhão'. 
  Gere uma frase curta e carismática para o momento: ${state}. Seja encorajador e divertido.`;
  
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: prompt,
  });

  return response.text || "Vamos ver se você acerta!";
};
