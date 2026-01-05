import { ProficiencyLevel } from "../types";

// TypeScript declarations for Puter.js global object
declare global {
  interface Window {
    puter: {
      ai: {
        chat: (prompt: string, options?: any) => Promise<any> | any;
        txt2img: (prompt: string, options?: any) => Promise<HTMLImageElement>;
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

    NEW FEATURE: Visual Aids (Educational Diagrams)
    Include visual diagrams [GRAMMAR_VISUAL: ...] when introducing grammar concepts to help Myanmar learners visualize English grammar.
    - YOU MUST USE THIS TAG: [GRAMMAR_VISUAL: A professional, minimalist educational infographic of this grammar rule. Use high contrast, clear English text labels, and a clean white background. Show arrows, timelines, or boxes to represent structure.]
    - Note: Visual aids help learners understand complex concepts through diagrams and examples. Image generation may require Puter.js account funding for unlimited use.

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

// FREE Image Generation using Puter.js
export const generateImageWithPuter = async (
  prompt: string,
  options?: {
    model?: string;
    quality?: string;
  }
): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const puterAI = (window as any).puter?.ai;
    if (!puterAI) {
      reject(new Error('Puter.js is not available'));
      return;
    }

    // Default options
    const defaultOptions = {
      model: 'gpt-image-1', // Default model
      quality: 'low' // Default quality
    };

    const finalOptions = { ...defaultOptions, ...options };

    console.log('NSLO Image Generation: Generating image with prompt:', prompt.substring(0, 100) + '...');
    console.log('NSLO Image Generation: Using model:', finalOptions.model, 'quality:', finalOptions.quality);

    puterAI.txt2img(prompt, finalOptions)
      .then((imageElement: HTMLImageElement) => {
        console.log('NSLO Image Generation: Image generated successfully');
        resolve(imageElement);
      })
      .catch((error: Error) => {
        console.error('NSLO Image Generation: Failed to generate image:', error);
        reject(error);
      });
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
// 2. Image Generation - Now supported via puter.ai.txt2img()
// 3. Persistent chat sessions - Manual history tracking required

// Helper function to detect if text contains Myanmar script
const containsMyanmarScript = (text: string): boolean => {
  // Myanmar Unicode range: \u1000-\u109F
  const myanmarPattern = /[\u1000-\u109F]/;
  return myanmarPattern.test(text);
};

// Track current utterance for interruption handling
let currentUtterance: SpeechSynthesisUtterance | null = null;

// Fallback TTS using browser's built-in SpeechSynthesis
export const speakText = (
  text: string, 
  lang?: string,
  onEnd?: () => void,
  onError?: (error: string) => void
): void => {
  if (typeof window === 'undefined') {
    if (onError) onError('SpeechSynthesis not available');
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

  // Auto-detect language if not provided
  const detectedLang = lang || (containsMyanmarScript(cleanedText) ? 'my-MM' : 'en-US');
  
  console.log('NSLO TTS: Speaking text in', detectedLang);
  console.log('NSLO TTS: Text:', cleanedText.substring(0, 50) + '...');
  
  // Cancel any ongoing speech first
  window.speechSynthesis.cancel();
  
  // Small delay to ensure cancel completes
  setTimeout(() => {
    const utterance = new SpeechSynthesisUtterance(cleanedText);
    utterance.lang = detectedLang;
    utterance.rate = 0.85; // Slightly slower for better clarity
    utterance.pitch = 1;
    utterance.volume = 1;

    // Get available voices
    const voices = window.speechSynthesis.getVoices();
    console.log('NSLO TTS: Available voices:', voices.length);
    
    // Log all available voices for debugging
    if (voices.length > 0) {
      console.log('NSLO TTS: Voice list:');
      voices.forEach((v, i) => {
        console.log(`  ${i}: ${v.name} (${v.lang}) ${v.localService ? '[local]' : '[remote]'}`);
      });
    }
    
    // Try to find a voice that matches the language
    let selectedVoice = null;
    
    if (detectedLang === 'my-MM' || detectedLang === 'my') {
      // For Myanmar, try various Myanmar-related language codes
      const myanmarLangCodes = ['my-MM', 'my', 'bur-MM', 'bur', 'myanmar-MM', 'myanmar'];
      
      for (const langCode of myanmarLangCodes) {
        selectedVoice = voices.find(voice => 
          voice.lang === langCode || 
          voice.lang.startsWith(langCode.split('-')[0])
        );
        if (selectedVoice) {
          console.log('NSLO TTS: Found Myanmar voice:', selectedVoice.name, selectedVoice.lang);
          break;
        }
      }
    } else {
      // For English, look for Google English voice first
      selectedVoice = voices.find(voice => 
        voice.lang.startsWith('en') && voice.name.includes('Google')
      ) || voices.find(voice => 
        voice.lang.startsWith('en')
      );
    }
    
    if (selectedVoice) {
      utterance.voice = selectedVoice;
      console.log('NSLO TTS: Using voice:', selectedVoice.name);
    } else {
      console.log('NSLO TTS: No matching voice found, using default');
    }

    // Track current utterance for potential cleanup
    currentUtterance = utterance;

    // Handle errors
    utterance.onerror = (event) => {
      console.log('NSLO TTS: Speech error:', event.error);
      // 'interrupted' is normal when user clicks another audio button
      if (event.error !== 'interrupted') {
        if (onError) onError(event.error);
      }
      currentUtterance = null;
    };

    utterance.onend = () => {
      console.log('NSLO TTS: Speech ended successfully');
      currentUtterance = null;
      if (onEnd) onEnd();
    };

    utterance.onstart = () => {
      console.log('NSLO TTS: Speech started');
    };

    try {
      window.speechSynthesis.speak(utterance);
    } catch (error) {
      console.warn('NSLO TTS: Failed to speak:', error);
      currentUtterance = null;
      if (onError) onError('Speech synthesis failed');
    }
  }, 50);
};

// Export helper function for language detection
export { containsMyanmarScript };

export const stopSpeaking = (): void => {
  console.log('NSLO TTS: Stopping speech');
  if (typeof window !== 'undefined' && window.speechSynthesis) {
    window.speechSynthesis.cancel();
    currentUtterance = null;
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

// Get available image generation models via Puter.js
export const getAvailableImageModels = (): string[] => {
  return [
    'gemini-2.5-flash-image-preview',
    'gpt-image-1.5',
    'gpt-image-1',
    'gpt-image-1-mini',
    'dall-e-3',
    'dall-e-2',
    'ByteDance-Seed/Seedream-3.0',
    'ByteDance-Seed/Seedream-4.0',
    'HiDream-ai/HiDream-I1-Dev',
    'HiDream-ai/HiDream-I1-Fast',
    'HiDream-ai/HiDream-I1-Full',
    'Lykon/DreamShaper',
    'Qwen/Qwen-Image',
    'RunDiffusion/Juggernaut-pro-flux',
    'Rundiffusion/Juggernaut-Lightning-Flux',
    'black-forest-labs/FLUX.1-Canny-pro',
    'black-forest-labs/FLUX.1-dev',
    'black-forest-labs/FLUX.1-dev-lora',
    'black-forest-labs/FLUX.1-kontext-dev',
    'black-forest-labs/FLUX.1-kontext-max',
    'black-forest-labs/FLUX.1-kontext-pro',
    'black-forest-labs/FLUX.1-krea-dev',
    'black-forest-labs/FLUX.1-pro',
    'black-forest-labs/FLUX.1-schnell',
    'black-forest-labs/FLUX.1-schnell-Free',
    'black-forest-labs/FLUX.1.1-pro',
    'google/flash-image-2.5',
    'google/imagen-4.0-fast',
    'google/imagen-4.0-preview',
    'google/imagen-4.0-ultra',
    'ideogram/ideogram-3.0',
    'stabilityai/stable-diffusion-3-medium',
    'stabilityai/stable-diffusion-xl-base-1.0'
  ];
};
