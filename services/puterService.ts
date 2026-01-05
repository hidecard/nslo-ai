import { ProficiencyLevel } from "../types";

// TypeScript declarations for Puter.js global object
declare global {
  interface Window {
    puter: {
      ai: {
        chat: (prompt: string, options?: any) => Promise<any> | any;
      };
    };
  }
}

// Puter.js provides free access to Gemini models without API keys
// Models available: gemini-3-flash-preview, gemini-3-pro-preview, gemini-2.5-pro, gemini-2.5-flash, etc.

// System instruction template for NSLO AI
const getSystemInstruction = (level: ProficiencyLevel): string => {
  return `
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
};

// Note: Puter.js doesn't provide a persistent chat session object like Google GenAI
// We need to track conversation history manually

export interface PuterChatSession {
  messages: Array<{ role: 'user' | 'model'; content: string }>;
  level: ProficiencyLevel;
}

export const createChatSession = (level: ProficiencyLevel): PuterChatSession => {
  return {
    messages: [],
    level
  };
};

export const sendMessageToPuter = async (
  session: PuterChatSession,
  message: string,
  onChunk?: (text: string) => void
): Promise<string> => {
  // Add user message to history
  session.messages.push({ role: 'user', content: message });
  
  // Build conversation context with system instruction
  const systemInstruction = getSystemInstruction(session.level);
  
  // Create full conversation for the model
  // Include system instruction and recent conversation history
  const conversationMessages = [
    { role: 'system', content: systemInstruction },
    ...session.messages.slice(-10) // Keep last 10 messages for context
  ];
  
  // Format messages for Puter.js
  // Puter.js expects a simple prompt, so we combine everything into one message
  const fullPrompt = conversationMessages
    .map(m => m.role === 'system' ? `[SYSTEM INSTRUCTION]\n${m.content}\n[/SYSTEM INSTRUCTION]` : 
               m.role === 'user' ? `[USER]: ${m.content}` : 
               `[ASSISTANT]: ${m.content}`)
    .join('\n\n');
  
  // Add instruction to include response tags
  const finalPrompt = `${fullPrompt}

[INSTRUCTION]
Now provide your response as NSLO AI tutor. Use the system instruction as your guide. When creating grammar visuals, use the exact format: [GRAMMAR_VISUAL: description]. For listening challenges: [LISTENING_CHALLENGE: sentence]. For practice: [PRACTICE: difficulty | sentence | meaning | question | answer]. For quizzes: [QUIZ_QUESTION: topic | difficulty | question | hint | answer].
[/INSTRUCTION]

[ASSISTANT]:`;

  return new Promise((resolve, reject) => {
    let fullResponse = '';
    let hasResolved = false;

    // Get Puter.ai instance with proper typing
    const puterAI = (window as any).puter?.ai;
    if (!puterAI) {
      reject(new Error('Puter.js is not available'));
      return;
    }

    try {
      // Call Puter.ai.chat - response might be a Promise or direct result
      const response = puterAI.chat(finalPrompt, {
        model: 'gemini-3-flash-preview',
        stream: true
      });

      // Handle if response is a Promise
      const handleResponse = async (responseObj: any) => {
        try {
          // Check if response is async iterable (streaming)
          if (responseObj && typeof responseObj[Symbol.asyncIterator] === 'function') {
            for await (const part of responseObj) {
              if (part?.text) {
                fullResponse += part.text;
                if (onChunk) {
                  onChunk(part.text);
                }
              }
            }
          } 
          // Check if response has a stream property
          else if (responseObj?.stream && typeof responseObj.stream[Symbol.asyncIterator] === 'function') {
            for await (const part of responseObj.stream) {
              if (part?.text) {
                fullResponse += part.text;
                if (onChunk) {
                  onChunk(part.text);
                }
              }
            }
          }
          // Check if response has text directly
          else if (responseObj?.text) {
            fullResponse = responseObj.text;
          }
          // If response is a string or has direct text property
          else if (typeof responseObj === 'string') {
            fullResponse = responseObj;
          }
          // Fallback: try to get text from response
          else {
            // Try to get text from various possible locations
            const possibleText = responseObj?.text || responseObj?.content || responseObj?.message || responseObj;
            if (typeof possibleText === 'string') {
              fullResponse = possibleText;
            } else {
              console.log('Puter.js response structure:', responseObj);
              fullResponse = String(possibleText);
            }
          }
          
          // Add assistant response to session
          session.messages.push({ role: 'model', content: fullResponse });
          hasResolved = true;
          resolve(fullResponse);
        } catch (error) {
          if (!hasResolved) {
            reject(error);
          }
        }
      };

      // Check if response is a Promise
      if (response && typeof response.then === 'function') {
        response.then(handleResponse).catch((error: Error) => {
          if (!hasResolved) {
            reject(error);
          }
        });
      } else {
        handleResponse(response);
      }
    } catch (error) {
      if (!hasResolved) {
        reject(error);
      }
    }
  });
};

// Non-streaming version for simpler use cases
export const sendMessage = async (
  session: PuterChatSession,
  message: string
): Promise<string> => {
  return sendMessageToPuter(session, message);
};

// Image analysis using Puter.js
export const analyzeImageWithPuter = async (
  imageUrl: string,
  question: string
): Promise<string> => {
  return new Promise((resolve, reject) => {
    const puterAI = (window as any).puter?.ai;
    if (!puterAI) {
      reject(new Error('Puter.js is not available'));
      return;
    }
    
    puterAI.chat(
      question,
      imageUrl,
      { model: 'gemini-3-flash-preview' }
    ).then((response: any) => {
      resolve(response?.text || response);
    }).catch(reject);
  });
};

// Utility to format conversation history for context
export const getConversationContext = (session: PuterChatSession): string => {
  return session.messages
    .map(m => m.role === 'user' ? `User: ${m.content}` : `Assistant: ${m.content}`)
    .join('\n\n');
};

// Note: Puter.js does not support:
// 1. Text-to-Speech (TTS) - Use browser SpeechSynthesis API as fallback
// 2. Image Generation - No equivalent in Puter.js
// 3. Persistent chat sessions - Manual history tracking required

// Fallback TTS using browser's built-in SpeechSynthesis
export const speakText = (text: string, lang: string = 'en-US'): void => {
  if (typeof window === 'undefined' || !window.speechSynthesis) {
    console.warn('SpeechSynthesis not available');
    return;
  }
  
  // Clean the text for speech
  const cleanedText = text
    .replace(/\[GRAMMAR_VISUAL:.*?\]/gi, '')
    .replace(/\[LISTENING_CHALLENGE:.*?\]/gi, '')
    .replace(/\[PRACTICE:.*?\]/gi, '')
    .replace(/\[QUIZ_QUESTION:.*?\]/gi, '')
    .replace(/[#*|\[\]]/g, '')
    .replace(/->/g, ' means ')
    .replace(/\n/g, ' ')
    .trim();

  if (!cleanedText) return;

  // Cancel any ongoing speech
  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(cleanedText);
  utterance.lang = lang;
  utterance.rate = 0.9;
  utterance.pitch = 1;
  utterance.volume = 1;

  // Try to find a good English voice
  const voices = window.speechSynthesis.getVoices();
  const englishVoice = voices.find(voice => 
    voice.lang.startsWith('en') && voice.name.includes('Google')
  ) || voices.find(voice => 
    voice.lang.startsWith('en')
  );
  
  if (englishVoice) {
    utterance.voice = englishVoice;
  }

  // Handle errors
  utterance.onerror = (event) => {
    console.warn('Speech synthesis error:', event.error);
  };

  utterance.onend = () => {
    // Reset playing state
  };

  try {
    window.speechSynthesis.speak(utterance);
  } catch (error) {
    console.warn('Failed to speak:', error);
  }
};

export const stopSpeaking = (): void => {
  if (typeof window !== 'undefined' && window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }
};

// Check if Puter.js is available
export const isPuterAvailable = (): boolean => {
  return typeof window !== 'undefined' && !!(window as any).puter;
};

// Get available Gemini models via Puter.js
export const getAvailableModels = (): string[] => {
  return [
    'gemini-3-flash-preview',
    'gemini-3-pro-preview',
    'gemini-2.5-pro',
    'gemini-2.5-flash-lite',
    'gemini-2.5-flash',
    'gemini-2.0-flash-lite',
    'gemini-2.0-flash',
    'gemini-1.5-flash'
  ];
};

