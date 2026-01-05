
import { GoogleGenAI, Modality, Chat } from "@google/genai";
import { ProficiencyLevel, VoiceName } from "../types";

const API_KEY = process.env.API_KEY || "";

export const createChat = (level: ProficiencyLevel): Chat => {
  const ai = new GoogleGenAI({ apiKey: API_KEY });
  
  const systemInstruction = `
    You are NSLO AI, an English learning tutor for Myanmar learners.
    Role: Teach English step-by-step from ${level} level.
    Explanation Language: Use SIMPLE English and Myanmar language.
    Brand Name: NSLO (Never Stop Learning Online).
    
    Teaching Rules:
    1. For every grammar point or lesson, use this EXACT order:
       - Meaning (Myanmar)
       - Definition (Simple English)
       - Grammar Pattern
       - Example Sentence
       - Sentence Breakdown (Subject | Verb | Object | etc.)
       - Common mistakes (Incorrect vs. Correct and WHY in Myanmar.)
       - Short practice (1-2 sentences for the user to try)
    
    2. Friendly & Patient tone. Use Myanmar for explanations as the learner is ${level}.
    3. Pronunciation: Show Myanmar pronunciation (အသံထွက်) for keywords. Example: apple -> အာ-ပလ်.
    4. Breakdown sentences: Subject | Verb | Object | Complement | Adjective | Adverb.

    NEW FEATURE: Visual Aids
    Always include a visual diagram [GRAMMAR_VISUAL: ...] when introducing a new tense, a complex sentence structure, or confusing word pairs (like since/for).
    - YOU MUST USE THIS TAG: [GRAMMAR_VISUAL: A professional, minimalist educational infographic of this grammar rule. Use high contrast, clear English text labels, and a clean white background. Show arrows, timelines, or boxes to represent structure.]

    NEW FEATURE: Stories & Poems (Reading/Listening)
    When providing a Story or Poem:
    - Include a Clear Title (### Title).
    - Provide a short Myanmar Summary (အကျဉ်းချုပ်).
    - Present the English text in clear paragraphs or stanzas.
    - IMPORTANT: For poems, use italicized stanzas.
    - Provide a "Contextual Vocabulary" section with Myanmar meanings.
    - End with 2-3 simple Reading Comprehension questions.

    NEW FEATURE: Listening Challenges
    When the user asks for a "Listening Challenge":
    - Format: [LISTENING_CHALLENGE: Exact English sentence] followed by Myanmar question and MCQ options.

    NEW FEATURE: Related Vocabulary
    When the user asks for "Vocabulary":
    - Format: ### 📚 Related Vocabulary followed by list with Myanmar meanings and examples.

    NEW FEATURE: Extra Practice
    When the user asks for "More Practice":
    - Use tag: [PRACTICE: Difficulty | Sentence/Blank | Myanmar Meaning | Question | Correct Answer]

    NEW FEATURE: Quiz Mode (Comprehensive Test)
    When the user asks to "Start a Quiz" or "Test my knowledge":
    - Provide a series of 5 mixed questions based on ${level} proficiency.
    - YOU MUST USE THIS TAG FORMAT FOR EACH QUESTION:
      [QUIZ_QUESTION: Topic | Difficulty | Question/Sentence | Hint in Myanmar | Correct Answer]
  `;

  return ai.chats.create({
    model: 'gemini-3-flash-preview',
    config: {
      systemInstruction,
      temperature: 0.7,
    },
  });
};

export const generateGrammarVisual = async (description: string): Promise<string | undefined> => {
  const ai = new GoogleGenAI({ apiKey: API_KEY });
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          {
            text: `High-quality educational infographic for English learners: ${description}. Design style: Minimalist, professional, sharp text, high readability, white background, corporate educational aesthetic. No clutter.`,
          },
        ],
      },
      config: {
        imageConfig: {
          aspectRatio: "16:9",
        },
      },
    });

    for (const part of response.candidates[0].content.parts) {
      if (part.inlineData) {
        return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
      }
    }
    return undefined;
  } catch (error) {
    console.error("Image generation error:", error);
    return undefined;
  }
};

export const generateSpeech = async (text: string): Promise<string | undefined> => {
  const ai = new GoogleGenAI({ apiKey: API_KEY });
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: `Say this naturally: ${text}` }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: VoiceName.Zephyr },
          },
        },
      },
    });

    return response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  } catch (error) {
    console.error("Speech generation error:", error);
    return undefined;
  }
};

export const decodeBase64Audio = (base64: string): Uint8Array => {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
};

export const playAudioBuffer = async (data: Uint8Array) => {
  const ctx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
  const dataInt16 = new Int16Array(data.buffer);
  const buffer = ctx.createBuffer(1, dataInt16.length, 24000);
  const channelData = buffer.getChannelData(0);
  for (let i = 0; i < dataInt16.length; i++) {
    channelData[i] = dataInt16[i] / 32768.0;
  }
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  source.connect(ctx.destination);
  source.start();
};
