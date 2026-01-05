import React, { useState, useMemo, useEffect, useRef } from 'react';
import { ChatMessage as ChatMessageType } from '../types';
import { speakText, stopSpeaking, isPuterAvailable, containsMyanmarScript, generateImageWithPuter } from '../services/puterService';

interface ChatMessageProps {
  message: ChatMessageType;
  onSave?: (text: string) => void;
  isSaved?: boolean;
}

// Ref to track if speech is currently playing
const speechRef = { isPlaying: false };

const AudioButton: React.FC<{ text: string, isPlaying: boolean, onPlay: (text: string) => void, className?: string }> = ({ text, isPlaying, onPlay, className }) => (
  <button 
    onClick={(e) => { e.stopPropagation(); onPlay(text); }}
    disabled={isPlaying}
    className={`p-1.5 rounded-full hover:bg-indigo-100 transition-colors inline-flex items-center justify-center text-indigo-500 disabled:opacity-50 ${className}`}
    title="Listen"
  >
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
    </svg>
  </button>
);

// Grammar Visual component - Now with FREE Puter.js image generation!
const GrammarVisual: React.FC<{ description: string }> = ({ description }) => {
  const [imageElement, setImageElement] = useState<HTMLImageElement | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasGenerated, setHasGenerated] = useState(false);

  const generateImage = async () => {
    if (hasGenerated || isLoading) return;

    setIsLoading(true);
    setError(null);

    try {
      console.log('NSLO: Generating grammar visual:', description);
      const img = await generateImageWithPuter(description, {
        model: 'gpt-image-1', // Use GPT Image for educational content
        quality: 'medium'
      });
      setImageElement(img);
      setHasGenerated(true);
      console.log('NSLO: Grammar visual generated successfully');
    } catch (err) {
      console.error('NSLO: Failed to generate grammar visual:', err);
      setError(err instanceof Error ? err.message : 'Failed to generate image');
    } finally {
      setIsLoading(false);
    }
  };

  // Auto-generate on mount (but only once)
  useEffect(() => {
    if (!hasGenerated && !isLoading) {
      generateImage();
    }
  }, []);

  return (
    <div className="w-full max-w-2xl mx-auto mb-6">
      <div className="bg-white rounded-2xl border-2 border-indigo-100 shadow-sm overflow-hidden">
        <div className="p-4 bg-indigo-50/50 border-b border-indigo-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-lg">🎨</span>
              <span className="text-sm font-bold text-indigo-800">Grammar Visual</span>
            </div>
            {!hasGenerated && !isLoading && (
              <button
                onClick={generateImage}
                className="px-3 py-1.5 bg-indigo-600 text-white text-xs font-bold rounded-lg hover:bg-indigo-700 transition-colors"
              >
                Generate Image
              </button>
            )}
          </div>
        </div>

        <div className="relative">
          {isLoading && (
            <div className="aspect-video flex items-center justify-center bg-gray-50">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-2"></div>
                <p className="text-sm text-gray-600">Generating visual...</p>
              </div>
            </div>
          )}

          {error && (
            <div className="aspect-video flex items-center justify-center bg-red-50">
              <div className="text-center px-6">
                <span className="text-2xl mb-2 block">⚠️</span>
                <p className="text-sm text-red-600 font-medium">Failed to generate image</p>
                <p className="text-xs text-red-500 mt-1">{error}</p>
                <button
                  onClick={generateImage}
                  className="mt-3 px-3 py-1.5 bg-red-600 text-white text-xs font-bold rounded-lg hover:bg-red-700 transition-colors"
                >
                  Try Again
                </button>
              </div>
            </div>
          )}

          {imageElement && (
            <div className="relative">
              <img
                src={imageElement.src}
                alt={description}
                className="w-full h-auto max-h-96 object-contain"
                style={{ display: 'block' }}
              />
              <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-white p-2">
                <p className="text-xs opacity-90">{description}</p>
              </div>
            </div>
          )}

          {!isLoading && !error && !imageElement && (
            <div className="aspect-video flex items-center justify-center bg-indigo-50/30">
              <div className="text-center px-6">
                <span className="text-3xl mb-3 block">🎨</span>
                <p className="text-sm text-indigo-600 font-medium mb-3">Click to generate visual aid</p>
                <button
                  onClick={generateImage}
                  className="px-4 py-2 bg-indigo-600 text-white text-sm font-bold rounded-lg hover:bg-indigo-700 transition-colors"
                >
                  Generate Grammar Visual
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const ChatMessage: React.FC<ChatMessageProps> = ({ message, onSave, isSaved }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [showTranscript, setShowTranscript] = useState(false);
  const [revealedAnswers, setRevealedAnswers] = useState<Record<string, boolean>>({});
  const [speechError, setSpeechError] = useState<string | null>(null);
  
  const isModel = message.role === 'model';

  const parsedContent = useMemo(() => {
    const text = message.text;
    
    // Grammar Visuals
    const visualRegex = /\[GRAMMAR_VISUAL:\s*(.*?)\]/gi;
    const visuals: string[] = [];
    let vMatch;
    while ((vMatch = visualRegex.exec(text)) !== null) {
      visuals.push(vMatch[1]);
    }

    // Listening Challenges
    const challengeRegex = /\[LISTENING_CHALLENGE:\s*(.*?)\]/gi;
    const challenges: string[] = [];
    let cMatch;
    while ((cMatch = challengeRegex.exec(text)) !== null) {
      challenges.push(cMatch[1]);
    }

    // Practice Cards
    const practiceRegex = /\[PRACTICE:\s*([^|]*?)\s*\|\s*([^|]*?)\s*\|\s*([^|]*?)\s*\|\s*([^|]*?)\s*\|\s*([^|]*?)\s*\]/gi;
    const practices: Array<{difficulty: string, sentence: string, meaning: string, question: string, answer: string}> = [];
    let pMatch;
    while ((pMatch = practiceRegex.exec(text)) !== null) {
      practices.push({
        difficulty: pMatch[1].trim(),
        sentence: pMatch[2].trim(),
        meaning: pMatch[3].trim(),
        question: pMatch[4].trim(),
        answer: pMatch[5].trim()
      });
    }

    // Quiz Questions
    const quizRegex = /\[QUIZ_QUESTION:\s*([^|]*?)\s*\|\s*([^|]*?)\s*\|\s*([^|]*?)\s*\|\s*([^|]*?)\s*\|\s*([^|]*?)\s*\]/gi;
    const quizzes: Array<{topic: string, difficulty: string, sentence: string, hint: string, answer: string}> = [];
    let qMatch;
    while ((qMatch = quizRegex.exec(text)) !== null) {
      quizzes.push({
        topic: qMatch[1].trim(),
        difficulty: qMatch[2].trim(),
        sentence: qMatch[3].trim(),
        hint: qMatch[4].trim(),
        answer: qMatch[5].trim()
      });
    }

    let cleanText = text
      .replace(/\[GRAMMAR_VISUAL:.*?\]/gi, '')
      .replace(/\[LISTENING_CHALLENGE:.*?\]/gi, '')
      .replace(/\[PRACTICE:.*?\]/gi, '')
      .replace(/\[QUIZ_QUESTION:.*?\]/gi, '')
      .trim();

    return { visuals, challenges, practices, quizzes, cleanText };
  }, [message.text]);

  const handleSpeech = (textToSpeak: string) => {
    // Clear any previous error
    setSpeechError(null);
    
    // Toggle speech - if speaking, stop it
    if (speechRef.isPlaying) {
      stopSpeaking();
      speechRef.isPlaying = false;
      setIsPlaying(false);
      return;
    }
    
    speechRef.isPlaying = true;
    setIsPlaying(true);
    
    // Clean all potentially annoying markdown symbols for TTS
    const cleanedTextForTTS = textToSpeak.replace(/[#*|\[\]]/g, '').replace(/->/g, ' means ').replace(/\n/g, ' ').trim();
    
    // Auto-detect language based on text content
    const detectedLang = containsMyanmarScript(cleanedTextForTTS) ? 'my-MM' : 'en-US';
    
    // Use the speakText function with callbacks
    speakText(
      cleanedTextForTTS,
      detectedLang,
      () => {
        // onEnd callback
        speechRef.isPlaying = false;
        setIsPlaying(false);
      },
      (error) => {
        // onError callback
        speechRef.isPlaying = false;
        setIsPlaying(false);
        setSpeechError(error);
      }
    );
  };

  const togglePracticeAnswer = (idx: number) => {
    setRevealedAnswers(prev => ({ ...prev, [`p-${idx}`]: !prev[`p-${idx}`] }));
  };

  const toggleQuizAnswer = (idx: number) => {
    setRevealedAnswers(prev => ({ ...prev, [`q-${idx}`]: !prev[`q-${idx}`] }));
  };

  /**
   * Refined markdown-lite renderer to handle headers (###) and bold (**text**)
   * STRICTLY REMOVES # and * symbols and transforms them into UI styles.
   */
  const renderFormattedText = (text: string) => {
    if (!text) return null;

    const vocabHeaderPattern = /^###\s*📚\s*Related Vocabulary/m;
    let mainText = text;
    let vocabContent = "";

    const vocabSplit = text.split(vocabHeaderPattern);
    if (vocabSplit.length > 1) {
      mainText = vocabSplit[0];
      vocabContent = vocabSplit[1];
    }

    const processTextLine = (line: string, index: number) => {
      const trimmedLine = line.trim();
      if (!trimmedLine) return <div key={index} className="h-2"></div>;

      // Detect keyword patterns like "Apple -> အာ-ပလ်"
      const keywordMatch = trimmedLine.match(/^([a-zA-Z\s]+)\s*->/);
      // Detect example patterns
      const isExample = trimmedLine.toLowerCase().startsWith('example') || trimmedLine.toLowerCase().startsWith('- example');

      // Handle Headers (starting with one or more #)
      if (trimmedLine.startsWith('#')) {
        const headerContent = trimmedLine.replace(/[#*]/g, '').trim();
        return (
          <h3 key={index} className="text-lg font-bold text-indigo-900 mt-6 mb-3 flex items-center gap-2 border-l-4 border-indigo-500 pl-3">
            {headerContent}
          </h3>
        );
      }

      // Parse bolding inside a line (**text**)
      const parts = line.split(/(\*\*.*?\*\*)/g);
      const renderedParts = parts.map((part, i) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          const content = part.slice(2, -2).replace(/[*]/g, '').trim();
          
          const isStructuralLabel = content.includes(':');
          if (isStructuralLabel) {
            return (
              <span key={i} className="font-black text-indigo-700 block mt-4 mb-1 uppercase text-[10px] tracking-wider">
                {content}
              </span>
            );
          }
          return <span key={i} className="font-bold text-gray-900">{content}</span>;
        }
        return part.replace(/[*#]/g, '');
      });

      return (
        <div key={index} className="my-1.5 leading-relaxed text-[15px] flex items-start gap-2 group/line">
          <div className="flex-1">
            {renderedParts}
          </div>
          {isModel && (keywordMatch || isExample) && (
            <AudioButton 
              text={trimmedLine.replace(/->/g, ' ').replace(/^-\s*/, '')} 
              isPlaying={isPlaying} 
              onPlay={handleSpeech}
              className="opacity-0 group-hover/line:opacity-100 transition-opacity"
            />
          )}
        </div>
      );
    };

    return (
      <div className="space-y-1">
        {mainText.split('\n').map((line, i) => processTextLine(line, i))}
        
        {vocabContent && (
          <div className="bg-green-50/50 border border-green-100 rounded-2xl p-5 my-8 shadow-sm">
            <h4 className="text-green-800 font-bold flex items-center gap-2 mb-4 border-b border-green-200 pb-3">
              <span>📚</span> Vocabulary (ဝေါဟာရများ)
            </h4>
            <div className="text-sm text-gray-700 space-y-2">
              {vocabContent.split('\n').map((line, i) => processTextLine(line, i + 1000))}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={`flex w-full mb-6 ${isModel ? 'justify-start' : 'justify-end'}`}>
      <div className={`flex flex-col max-w-[95%] sm:max-w-[85%] ${isModel ? 'items-start' : 'items-end'}`}>
        <div className="flex items-center gap-2 mb-1 px-2">
           <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
             {isModel ? 'NSLO AI Tutor' : 'You'}
           </span>
        </div>
        
        <div className={`relative p-5 sm:p-6 rounded-3xl shadow-sm transition-all ${
          isModel 
            ? 'bg-white text-gray-800 border border-indigo-100 rounded-tl-none' 
            : 'bg-indigo-600 text-white rounded-tr-none shadow-indigo-100'
        }`}>
          
          {/* Speech Error Message */}
          {speechError && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-600">
              Audio error: {speechError}. Please try again.
            </div>
          )}
          
          {isModel && parsedContent.visuals.map((visual, idx) => (
            <GrammarVisual key={`visual-${idx}`} description={visual} />
          ))}

          {isModel && parsedContent.challenges.map((challenge, idx) => (
            <div key={`challenge-${idx}`} className="mb-6 p-5 bg-indigo-50 rounded-2xl border border-indigo-200 shadow-sm">
              <div className="flex justify-between items-center mb-4">
                <p className="text-xs font-bold text-indigo-800 flex items-center gap-2 uppercase tracking-wider">
                  <span className="text-base">🎧</span> Listening Challenge
                </p>
              </div>
              <button 
                onClick={() => handleSpeech(challenge)}
                disabled={isPlaying}
                className="w-full py-3.5 px-4 bg-indigo-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-indigo-700 active:scale-[0.98] transition-all shadow-md disabled:opacity-50"
              >
                {isPlaying ? 'Playing...' : 'Play Audio (နားထောင်မည်)'}
              </button>
              <div className="mt-4 text-center">
                {showTranscript ? (
                  <div className="p-3 bg-white/80 rounded-lg border border-indigo-100 text-sm italic text-gray-600 animate-fade-in font-medium">
                    "{challenge}"
                  </div>
                ) : (
                  <button onClick={() => setShowTranscript(true)} className="text-[10px] text-indigo-400 hover:text-indigo-600 underline uppercase tracking-widest font-bold">
                    Show Transcript (စာသားကြည့်မည်)
                  </button>
                )}
              </div>
            </div>
          ))}

          <div className="myanmar-text">
            {renderFormattedText(parsedContent.cleanText)}
          </div>

          {isModel && parsedContent.practices.length > 0 && (
            <div className="space-y-5 mt-8 pt-8 border-t border-gray-100">
              <h4 className="text-xs font-black text-indigo-900 flex items-center gap-2 uppercase tracking-widest opacity-70">
                <span>✍️</span> Practice Exercises
              </h4>
              <div className="grid grid-cols-1 gap-5">
                {parsedContent.practices.map((card, i) => (
                  <div key={`practice-${i}`} className={`p-5 rounded-3xl border-2 transition-all shadow-sm ${
                    card.difficulty.toLowerCase().includes('easy') ? 'bg-emerald-50/30 border-emerald-100' :
                    card.difficulty.toLowerCase().includes('medium') ? 'bg-amber-50/30 border-amber-100' :
                    'bg-rose-50/30 border-rose-100'
                  }`}>
                    <div className="flex justify-between items-start mb-3">
                      <span className={`text-[9px] font-black px-2 py-0.5 rounded-md uppercase tracking-widest ${
                         card.difficulty.toLowerCase().includes('easy') ? 'bg-emerald-200 text-emerald-800' :
                         card.difficulty.toLowerCase().includes('medium') ? 'bg-amber-200 text-amber-800' :
                         'bg-rose-200 text-rose-800'
                      }`}>
                        {card.difficulty}
                      </span>
                      <AudioButton text={card.sentence} isPlaying={isPlaying} onPlay={handleSpeech} />
                    </div>
                    <p className="text-base font-bold text-gray-800 mb-2">{card.sentence}</p>
                    <p className="text-xs text-gray-500 myanmar-text mb-5 italic">({card.meaning})</p>
                    <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-inner">
                      <div className="flex justify-between items-center mb-3">
                        <p className="text-sm font-semibold text-gray-700 myanmar-text">{card.question}</p>
                        <AudioButton text={card.question} isPlaying={isPlaying} onPlay={handleSpeech} />
                      </div>
                      {revealedAnswers[`p-${i}`] ? (
                        <div className="py-2.5 px-4 bg-indigo-50 rounded-xl text-sm font-bold text-indigo-700 animate-fade-in flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span>✅ Answer: {card.answer}</span>
                            <AudioButton text={card.answer} isPlaying={isPlaying} onPlay={handleSpeech} />
                          </div>
                          <button onClick={() => togglePracticeAnswer(i)} className="text-[9px] text-gray-400 hover:text-gray-600">Hide</button>
                        </div>
                      ) : (
                        <button onClick={() => togglePracticeAnswer(i)} className="w-full py-2.5 border-2 border-dashed border-indigo-100 rounded-xl text-[10px] font-bold text-indigo-400 hover:bg-indigo-50 uppercase tracking-widest transition-colors">
                          Show Answer
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {isModel && parsedContent.quizzes.length > 0 && (
            <div className="space-y-5 mt-8 pt-8 border-t border-indigo-100">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-black text-indigo-900 flex items-center gap-2 uppercase tracking-widest">
                  <span>🎓</span> Final Quiz (စစ်ဆေးမှု)
                </h4>
              </div>
              <div className="grid grid-cols-1 gap-5">
                {parsedContent.quizzes.map((quiz, i) => (
                  <div key={`quiz-${i}`} className="p-6 rounded-[2rem] bg-indigo-50/50 border-2 border-indigo-100 shadow-sm relative overflow-hidden">
                    <div className="flex justify-between items-center mb-5">
                      <span className="text-[10px] font-bold bg-white px-3 py-1.5 rounded-xl text-indigo-600 border border-indigo-100 shadow-xs">
                        {quiz.topic}
                      </span>
                      <div className="flex items-center gap-2">
                        <AudioButton text={quiz.sentence} isPlaying={isPlaying} onPlay={handleSpeech} />
                        <span className="text-[10px] font-black text-indigo-300">#{i + 1}</span>
                      </div>
                    </div>
                    
                    <p className="text-lg font-bold text-gray-800 mb-3 leading-snug">{quiz.sentence}</p>
                    <p className="text-xs text-indigo-400 myanmar-text mb-6">💡 Hint: {quiz.hint}</p>

                    <div className="flex gap-3">
                       {revealedAnswers[`q-${i}`] ? (
                          <div className="flex-1 py-4 px-5 bg-white rounded-2xl border-2 border-indigo-600 animate-fade-in shadow-inner flex items-center justify-between">
                            <div>
                              <p className="text-[10px] font-bold text-indigo-400 uppercase mb-1 tracking-widest">Correct Answer</p>
                              <p className="text-xl font-black text-indigo-700">{quiz.answer}</p>
                            </div>
                            <AudioButton text={quiz.answer} isPlaying={isPlaying} onPlay={handleSpeech} className="p-3" />
                          </div>
                       ) : (
                          <button 
                            onClick={() => toggleQuizAnswer(i)}
                            className="flex-1 py-4 px-6 bg-indigo-600 text-white rounded-2xl font-bold text-xs shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all active:scale-[0.98]"
                          >
                            Check Answer
                          </button>
                       )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {isModel && (
            <div className="mt-6 flex items-center gap-6 border-t border-gray-50 pt-4 opacity-80 hover:opacity-100 transition-opacity">
              <button onClick={() => handleSpeech(parsedContent.cleanText)} disabled={isPlaying} className="flex items-center gap-2 text-[10px] font-bold text-indigo-500 hover:text-indigo-700 transition-colors uppercase tracking-widest">
                {isPlaying ? 'Playing...' : 'Listen Full Text'}
              </button>
              {onSave && (
                <button onClick={() => onSave(message.text)} className={`flex items-center gap-2 text-[10px] font-bold transition-colors uppercase tracking-widest ${isSaved ? 'text-amber-500' : 'text-gray-400 hover:text-amber-500'}`}>
                  {isSaved ? 'Saved' : 'Bookmark'}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChatMessage;

