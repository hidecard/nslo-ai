
import React, { useState, useRef, useEffect } from 'react';
import { ProficiencyLevel, ChatMessage as ChatMessageType, SavedLesson } from './types';
import { createChatSession, sendMessageToPuter, speakText, stopSpeaking, isPuterAvailable, PuterChatSession } from './services/puterService';
import LevelSelector from './components/LevelSelector';
import ChatMessage from './components/ChatMessage';

interface Topic {
  title: string;
  prompt: string;
  details: string;
  isChallenge?: boolean;
}

const GRAMMAR_TOPICS: Record<ProficiencyLevel, Topic[]> = {
  Beginner: [
    { title: 'Listening Challenge 🎧', prompt: 'Give me a beginner listening challenge. Say a simple sentence and ask me what I said.', details: 'နားထောင်မှု စွမ်းရည်ကို စမ်းသပ်ပြီး အဖြေမှန် ရွေးချယ်ပါ။', isChallenge: true },
    { title: 'Verb "To Be"', prompt: 'Please explain the Verb "To Be" (am, is, are).', details: 'am, is, are ကို ဝါကျများတွင် မှန်ကန်စွာ အသုံးပြုပုံများ။' },
    { title: 'Present Simple', prompt: 'Please explain the Present Simple Tense.', details: 'နေ့စဉ်ပြုလုပ်လေ့ရှိသော အလေ့အကျင့်များကို ဖော်ပြပုံ။' },
    { title: 'Nouns & Articles', prompt: 'Please explain Singular/Plural Nouns and a/an/the.', details: 'နာမ်များနှင့် a, an, the အသုံးပြုပုံ အခြေခံများ။' },
    { title: 'Pronouns', prompt: 'Please explain Personal Pronouns (I, you, he, she...).', details: 'နာမ်စားများ (I, you, he, she...) အကြောင်း လေ့လာရန်။' },
  ],
  Intermediate: [
    { title: 'Listening Challenge 🎧', prompt: 'Give me an intermediate listening challenge. Say a natural sentence and ask me to identify its meaning or grammar.', details: 'စကားပြောဆိုမှုများကို နားထောင်ပြီး အဓိပ္ပာယ် ခွဲခြားပါ။', isChallenge: true },
    { title: 'Present Perfect', prompt: 'Please explain the Present Perfect Tense vs Past Simple.', details: 'ပြီးစီးခဲ့သော်လည်း လက်ရှိနှင့် ဆက်စပ်နေသော အကြောင်းအရာများ။' },
    { title: 'Passive Voice', prompt: 'Please explain how to use the Passive Voice.', details: 'လုပ်ဆောင်ချက်ကို ခံရသူကို အလေးပေးဖော်ပြသော ဝါကျတည်ဆောက်ပုံ။' },
    { title: 'Relative Clauses', prompt: 'Please explain Relative Clauses (who, which, that).', details: 'ဝါကျနှစ်ခုကို ဆက်စပ်ပေးပုံ (who, which, that)။' },
    { title: 'Modal Verbs', prompt: 'Please explain Modal Verbs for possibility and advice.', details: 'ဖြစ်နိုင်ခြေနှင့် အကြံပြုချက်များ (can, could, should...)။' },
  ],
  Advanced: [
    { title: 'Listening Challenge 🎧', prompt: 'Give me an advanced listening challenge. Use complex vocabulary or structures.', details: 'အဆင့်မြင့် ဝါကျများနှင့် စကားလုံးများကို နားထောင်လေ့ကျင့်ပါ။', isChallenge: true },
    { title: 'Mixed Conditionals', prompt: 'Please explain Mixed Conditionals in detail.', details: 'အတိတ်နှင့် ပစ္စုပ္ပန် အခြေအနေများ ရောနှောဖော်ပြပုံ။' },
    { title: 'Inversion', prompt: 'Please explain Grammar Inversion for emphasis.', details: 'အလေးပေးပြောဆိုရန် ဝါကျ တည်ဆောက်ပုံ ပြောင်းလဲခြင်း။' },
    { title: 'Subjunctive Mood', prompt: 'Please explain the Subjunctive Mood.', details: 'စိတ်ကူးယဉ် အခြေအနေများနှင့် တောင်းဆိုချက်များ ဖော်ပြပုံ။' },
    { title: 'Participle Clauses', prompt: 'Please explain Participle Clauses.', details: 'ဝါကျများကို ပိုမိုကျဉ်းမြောင်းစွာ အတိုချုံး ရေးသားနည်း။' },
  ],
  IELTS: [
    { title: 'Listening Challenge 🎧', prompt: 'Give me an IELTS listening challenge. Simulate a short clip from an IELTS test and ask a question.', details: 'IELTS စာမေးပွဲပုံစံ နားထောင်မှု စွမ်းရည် လေ့ကျင့်ခန်း။', isChallenge: true },
    { title: 'Writing Task 1', prompt: 'Explain how to describe trends in IELTS Writing Task 1.', details: 'ဇယားများနှင့် ပြောင်းလဲမှုများကို အမှတ်ကောင်းအောင် ဖော်ပြနည်း။' },
    { title: 'Complex Sentences', prompt: 'Explain how to use complex sentences to get a Band 7+.', details: 'Band 7+ ရရှိရန် အဆင့်မြင့် ဝါကျရှည်များ တည်ဆောက်ပုံ။' },
    { title: 'Paraphrasing', prompt: 'Explain the best techniques for paraphrasing in IELTS.', details: 'အဓိပ္ပာယ်မပြောင်းဘဲ စကားလုံး အစားထိုးပုံ နည်းစနစ်များ။' },
    { title: 'Cohesion & Coherence', prompt: 'Explain how to improve Cohesion and Coherence in essays.', details: 'စာစီစာကုံး တစ်ခုလုံး အချိတ်အဆက် မိစေရန် နည်းလမ်းများ။' },
  ],
};

const STORY_TOPICS: Record<ProficiencyLevel, Topic[]> = {
  Beginner: [
    { title: 'Short Story 📖', prompt: 'Tell me a very simple short story (fable) for beginners. Use simple words. Include a Myanmar summary and vocabulary.', details: 'အခြေခံ အင်္ဂလိပ်စာ လေ့လာသူများအတွက် ပုံပြင်တိုများ။' },
    { title: 'Simple Poem 🎵', prompt: 'Share a short, rhyming simple poem. Explain the meaning and show Myanmar pronunciation for key lines.', details: 'ရိုးရှင်းပြီး နားထောင်လို့ကောင်းသော ကဗျာတိုများ။' },
  ],
  Intermediate: [
    { title: 'Adventure Story 🚀', prompt: 'Tell me an intermediate level short story about an adventure. Focus on natural dialogues and descriptive verbs.', details: 'စကားပြောနှင့် ကြိယာ အသုံးအနှုန်းများ ကြွယ်ဝသော ပုံပြင်များ။' },
    { title: 'Descriptive Poem ☁️', prompt: 'Share a descriptive poem about nature or emotions. Analyze the imagery used.', details: 'ခံစားချက်နှင့် သဘာဝအလှကို ဖော်ပြသော ကဗျာများ။' },
  ],
  Advanced: [
    { title: 'Literary Excerpt 📚', prompt: 'Provide a short excerpt from a classic literary work. Analyze the complex sentence structures and advanced vocabulary.', details: 'ဂန္ထဝင် စာပေလက်ရာများမှ ကောက်နုတ်ချက်များ။' },
    { title: 'Modern Poetry 🎭', prompt: 'Share a modern poem with deep meaning. Discuss the metaphors and abstract concepts.', details: 'လေးနက်သော အဓိပ္ပာယ်ပါရှိသော ခေတ်ပေါ်ကဗျာများ။' },
  ],
  IELTS: [
    { title: 'Academic Passage 📊', prompt: 'Provide an IELTS-style reading passage about a scientific or historical topic. Include 3 comprehension questions.', details: 'IELTS စာမေးပွဲပုံစံ ဖတ်ရှုလေ့ကျင့်ခန်းများ။' },
    { title: 'Formal Prose ✍️', prompt: 'Share a formal prose piece. Analyze the coherence and high-level linking words.', details: 'အဆင့်မြင့် စာစီစာကုံး တည်ဆောက်ပုံ လေ့လာရန် စာသားများ။' },
  ],
};

const App: React.FC = () => {
  const [level, setLevel] = useState<ProficiencyLevel | null>(null);
  const [chatHistory, setChatHistory] = useState<ChatMessageType[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [savedLessons, setSavedLessons] = useState<SavedLesson[]>([]);
  const [showReviewBook, setShowReviewBook] = useState(false);
  const [puterStatus, setPuterStatus] = useState<'checking' | 'available' | 'unavailable'>('checking');
  
  const chatInstance = useRef<PuterChatSession | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Check if Puter.js is available
    const checkPuter = () => {
      if (isPuterAvailable()) {
        setPuterStatus('available');
      } else {
        setPuterStatus('unavailable');
      }
    };
    
    // Give Puter.js script time to load
    const timer = setTimeout(checkPuter, 1000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const stored = localStorage.getItem('nslo_saved_lessons');
    if (stored) {
      try {
        setSavedLessons(JSON.parse(stored));
      } catch (e) {
        console.error("Failed to parse saved lessons", e);
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('nslo_saved_lessons', JSON.stringify(savedLessons));
  }, [savedLessons]);

  useEffect(() => {
    if (level && !chatInstance.current && puterStatus === 'available') {
      chatInstance.current = createChatSession(level);
      const greet = async () => {
        setIsThinking(true);
        try {
          const result = await sendMessageToPuter(
            chatInstance.current!,
            "Hello teacher! Let's start a lesson. Introduce yourself briefly as NSLO AI and tell me you are ready to help with any grammar topic, a listening challenge, or a story/poem for reading."
          );
          if (result) {
            setChatHistory([{ role: 'model', text: result }]);
          }
        } catch (error) {
          console.error("Initialization error:", error);
        } finally {
          setIsThinking(false);
        }
      };
      greet();
    }
  }, [level, puterStatus]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [chatHistory, isThinking]);

  const handleLevelSelect = (selectedLevel: ProficiencyLevel) => {
    setLevel(selectedLevel);
  };

  const handleSendMessage = async (text: string) => {
    if (!text.trim() || isThinking || !chatInstance.current || puterStatus !== 'available') return;

    const userMessage: ChatMessageType = { role: 'user', text };
    setChatHistory(prev => [...prev, userMessage]);
    setInputValue('');
    setIsThinking(true);

    try {
      const response = await sendMessageToPuter(chatInstance.current, text);
      const modelMessage: ChatMessageType = { role: 'model', text: response };
      setChatHistory(prev => [...prev, modelMessage]);
    } catch (error) {
      console.error("Chat error:", error);
      const errorMessage: ChatMessageType = { 
        role: 'model', 
        text: "စိတ်မရှိပါနဲ့၊ တစ်ခုခုမှားယွင်းနေပါတယ်။ ခဏနေမှ ပြန်ကြိုးစားကြည့်ပေးပါ။ (I'm sorry, something went wrong. Please try again later.)" 
      };
      setChatHistory(prev => [...prev, errorMessage]);
    } finally {
      setIsThinking(false);
    }
  };

  const saveLesson = (text: string) => {
    if (!level) return;
    if (savedLessons.some(l => l.text === text)) {
      setSavedLessons(prev => prev.filter(l => l.text !== text));
      return;
    }
    const newLesson: SavedLesson = {
      id: Date.now().toString(),
      level,
      text,
      timestamp: Date.now(),
    };
    setSavedLessons(prev => [newLesson, ...prev]);
  };

  const removeSavedLesson = (id: string) => {
    setSavedLessons(prev => prev.filter(l => l.id !== id));
  };

  const onFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSendMessage(inputValue);
  };

  const getVocabularyForLastTopic = () => {
    handleSendMessage("Can you suggest 5-10 related vocabulary words for the grammar or story topic we are discussing? Please include Myanmar meanings and example sentences.");
  };

  const getExtraPractice = () => {
    handleSendMessage("Please provide 3-5 additional practice sentences or comprehension questions for the current topic with varying difficulty. Include Myanmar meanings where needed.");
  };

  const startQuiz = () => {
    handleSendMessage("I want to start a comprehensive quiz! Please test my knowledge with mixed questions based on what we've learned or my current level.");
  };

  const getVisualDiagram = () => {
    handleSendMessage("I'm confused about the structure of the current topic. Can you please provide a clear visual diagram or infographic explaining the grammar rule or story map?");
  };

  if (!level) {
    return (
      <div className="min-h-screen bg-indigo-50">
        <header className="bg-white border-b border-indigo-100 p-4 sticky top-0 z-10 shadow-sm">
          <div className="max-w-6xl mx-auto flex items-center justify-between">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center mr-3 shadow-lg">
                <span className="text-white font-bold text-xl">N</span>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-800 leading-tight">NSLO AI</h1>
                <p className="text-[10px] text-indigo-500 font-bold uppercase tracking-wider">Never Stop Learning Online</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {savedLessons.length > 0 && (
                <button onClick={() => setShowReviewBook(true)} className="flex items-center gap-2 px-4 py-2 bg-amber-100 text-amber-700 rounded-lg font-bold hover:bg-amber-200 transition-colors">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M9 4.804A7.968 7.968 0 005.5 4c-1.255 0-2.443.29-3.5.804v10A7.969 7.969 0 015.5 14c1.669 0 3.218.51 4.5 1.385A7.962 7.962 0 0114.5 14c1.255 0 2.443.29 3.5.804v-10A7.968 7.968 0 0014.5 4c-1.255 0-2.443.29-3.5.804V12a1 1 0 11-2 0V4.804z" />
                  </svg>
                  Review Book ({savedLessons.length})
                </button>
              )}
              {/* Puter.js Status Indicator */}
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-100">
                <span className={`w-2 h-2 rounded-full ${
                  puterStatus === 'available' ? 'bg-green-500 animate-pulse' : 
                  puterStatus === 'unavailable' ? 'bg-red-500' : 'bg-yellow-500 animate-pulse'
                }`}></span>
                <span className="text-xs font-medium text-gray-600">
                  {puterStatus === 'checking' ? 'Connecting...' : 
                   puterStatus === 'available' ? 'Puter.js Ready' : 'Using Demo Mode'}
                </span>
              </div>
            </div>
          </div>
        </header>
        
        {/* Status Message */}
        {puterStatus === 'unavailable' && (
          <div className="max-w-6xl mx-auto px-4 py-3">
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center gap-3">
              <span className="text-2xl">⚠️</span>
              <div>
                <p className="font-bold text-amber-800">Puter.js is loading...</p>
                <p className="text-sm text-amber-600">Please wait a moment while we connect to Gemini models.</p>
              </div>
            </div>
          </div>
        )}

        <LevelSelector onSelect={handleLevelSelect} isDisabled={puterStatus !== 'available'} />
        {showReviewBook && <ReviewBookModal lessons={savedLessons} onClose={() => setShowReviewBook(false)} onRemove={removeSavedLesson} />}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between sticky top-0 z-10 shadow-sm">
        <div className="flex items-center flex-1">
          <button onClick={() => { setLevel(null); chatInstance.current = null; setChatHistory([]); }} className="mr-4 p-2 hover:bg-gray-100 rounded-full transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="mr-auto">
            <h2 className="font-bold text-xl text-gray-800 flex items-center gap-2">
              NSLO AI <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">{level}</span>
            </h2>
            <p className="text-xs text-green-500 flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span> Online Tutor
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button onClick={getVisualDiagram} className="p-2.5 bg-emerald-50 text-emerald-600 rounded-full hover:bg-emerald-100 transition-colors" title="Show Diagram">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </button>
          <button onClick={startQuiz} className="p-2.5 bg-indigo-50 text-indigo-600 rounded-full hover:bg-indigo-100 transition-colors" title="Start Quiz">
             <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
             </svg>
          </button>
          <button onClick={getVocabularyForLastTopic} className="p-2.5 bg-green-50 text-green-600 rounded-full hover:bg-green-100 transition-colors" title="Vocabulary">
             <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
             </svg>
          </button>
          <button onClick={() => setShowReviewBook(true)} className="p-2.5 bg-amber-50 text-amber-600 rounded-full hover:bg-amber-100 transition-colors relative" title="Review Book">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
            </svg>
            {savedLessons.length > 0 && (
              <span className="absolute -top-0.5 -right-0.5 bg-amber-500 text-white text-[7px] font-bold w-3.5 h-3.5 rounded-full flex items-center justify-center border border-white">
                {savedLessons.length}
              </span>
            )}
          </button>
        </div>
      </header>

      <main ref={scrollRef} className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
        <div className="max-w-3xl mx-auto">
          {chatHistory.length === 1 && (
             <div className="mb-8 flex flex-col gap-8">
               {/* Grammar Section */}
               <div className="bg-indigo-50 border border-indigo-100 p-6 rounded-3xl">
                 <h3 className="text-indigo-800 font-bold mb-4 myanmar-text text-xl flex items-center gap-2">
                   <span>📜</span> Grammar Lessons
                 </h3>
                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                   <div className="sm:col-span-2 p-5 bg-indigo-600 rounded-2xl shadow-lg flex items-center justify-between text-white relative overflow-hidden group cursor-pointer" onClick={startQuiz}>
                      <div className="z-10 text-left">
                        <h4 className="text-lg font-bold mb-1">Knowledge Quiz (ဉာဏ်စမ်း)</h4>
                        <p className="text-xs text-indigo-100 myanmar-text">သင်လေ့လာထားသမျှကို ပြန်လည်စစ်ဆေးကြည့်ပါ။</p>
                      </div>
                      <span className="text-4xl group-hover:scale-125 transition-transform">🎓</span>
                      <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16"></div>
                   </div>
                   {GRAMMAR_TOPICS[level].map((topic, i) => (
                     <div key={i} className={`flex flex-col bg-white rounded-2xl border transition-all hover:shadow-md group overflow-hidden ${topic.isChallenge ? 'border-amber-200 bg-amber-50/20' : 'border-gray-100 shadow-sm'}`}>
                       <button onClick={() => handleSendMessage(topic.prompt)} disabled={isThinking} className="p-4 text-left flex-1">
                         <div className={`font-bold text-sm mb-1 ${topic.isChallenge ? 'text-amber-700' : 'text-indigo-700'}`}>{topic.title}</div>
                         <div className="text-[11px] text-gray-500 myanmar-text group-hover:text-gray-700 transition-colors">{topic.details}</div>
                       </button>
                       <div className="flex border-t border-gray-50 bg-gray-50/50">
                          <button onClick={() => handleSendMessage(topic.prompt)} className="flex-1 py-2 text-[10px] font-bold text-indigo-600 hover:bg-indigo-100 transition-colors uppercase tracking-widest border-r border-gray-100">Learn</button>
                          <button onClick={() => handleSendMessage(`I want extra practice sentences for: ${topic.title}`)} className="flex-1 py-2 text-[10px] font-bold text-emerald-600 hover:bg-emerald-100 transition-colors uppercase tracking-widest">Practice</button>
                       </div>
                     </div>
                   ))}
                 </div>
               </div>

               {/* Story & Poem Section */}
               <div className="bg-emerald-50 border border-emerald-100 p-6 rounded-3xl">
                 <h3 className="text-emerald-800 font-bold mb-4 myanmar-text text-xl flex items-center gap-2">
                   <span>📖</span> Stories & Poems (ပုံပြင်နှင့် ကဗျာ)
                 </h3>
                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                   {STORY_TOPICS[level].map((topic, i) => (
                     <div key={i} className="flex flex-col bg-white rounded-2xl border border-gray-100 shadow-sm transition-all hover:shadow-md group overflow-hidden">
                       <button onClick={() => handleSendMessage(topic.prompt)} disabled={isThinking} className="p-4 text-left flex-1">
                         <div className="font-bold text-sm mb-1 text-emerald-700">{topic.title}</div>
                         <div className="text-[11px] text-gray-500 myanmar-text group-hover:text-gray-700 transition-colors">{topic.details}</div>
                       </button>
                       <div className="flex border-t border-gray-50 bg-gray-50/50">
                          <button onClick={() => handleSendMessage(topic.prompt)} className="flex-1 py-2 text-[10px] font-bold text-emerald-600 hover:bg-emerald-100 transition-colors uppercase tracking-widest">Listen & Read</button>
                       </div>
                     </div>
                   ))}
                 </div>
               </div>
             </div>
          )}
          {chatHistory.map((msg, idx) => (
            <ChatMessage key={idx} message={msg} onSave={msg.role === 'model' ? saveLesson : undefined} isSaved={msg.role === 'model' && savedLessons.some(l => l.text === msg.text)} />
          ))}
          {isThinking && (
            <div className="flex justify-start mb-6">
              <div className="bg-white border border-indigo-100 p-4 rounded-2xl shadow-sm rounded-tl-none flex items-center gap-3">
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce [animation-delay:0.2s]"></div>
                  <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce [animation-delay:0.4s]"></div>
                </div>
                <span className="text-sm text-gray-500 myanmar-text font-medium">သင်ခန်းစာ ပြင်ဆင်နေသည်...</span>
              </div>
            </div>
          )}
        </div>
      </main>

      <footer className="bg-white border-t border-gray-200 p-4 sm:p-6 sticky bottom-0">
        <div className="max-w-3xl mx-auto">
          <form onSubmit={onFormSubmit} className="relative flex items-center">
            <input type="text" value={inputValue} onChange={(e) => setInputValue(e.target.value)} placeholder="သင်ခန်းစာတစ်ခုခု မေးမြန်းပါ သို့မဟုတ် စတင်ပါ..." className="w-full pl-4 pr-16 py-4 bg-gray-50 border-2 border-gray-200 rounded-2xl focus:outline-none focus:border-indigo-500 transition-all shadow-inner myanmar-text" disabled={isThinking} />
            <button type="submit" disabled={isThinking || !inputValue.trim()} className={`absolute right-2 p-2.5 rounded-xl transition-all ${!inputValue.trim() || isThinking ? 'bg-gray-300 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700 shadow-md hover:shadow-lg text-white'}`}>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </button>
          </form>
          <div className="mt-2 flex gap-4 text-[10px] text-gray-400 font-medium uppercase tracking-widest justify-center">
            <span>Powered by Puter.js (Free Gemini Access)</span>
            <span className="text-indigo-500 font-bold">NSLO AI: Never Stop Learning Online</span>
          </div>
        </div>
      </footer>

      {showReviewBook && <ReviewBookModal lessons={savedLessons} onClose={() => setShowReviewBook(false)} onRemove={removeSavedLesson} />}
    </div>
  );
};

const ReviewBookModal: React.FC<{ lessons: SavedLesson[], onClose: () => void, onRemove: (id: string) => void }> = ({ lessons, onClose, onRemove }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-white w-full max-w-2xl h-[80vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden">
        <header className="px-6 py-4 bg-amber-50 border-b border-amber-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">📘</span>
            <h3 className="text-xl font-bold text-amber-900">Review Book (သိမ်းဆည်းထားသည်များ)</h3>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-amber-100 rounded-full transition-colors text-amber-800">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l18 18" />
            </svg>
          </button>
        </header>
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {lessons.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center opacity-40">
              <span className="text-6xl mb-4">📭</span>
              <p className="text-lg font-medium myanmar-text">သိမ်းဆည်းထားသော သင်ခန်းစာ မရှိသေးပါ။</p>
            </div>
          ) : (
            lessons.map((lesson) => (
              <div key={lesson.id} className="relative bg-amber-50/30 border border-amber-100 p-5 rounded-2xl group transition-all hover:border-amber-200">
                <div className="flex justify-between items-start mb-2">
                  <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full">{lesson.level}</span>
                  <button onClick={() => onRemove(lesson.id)} className="p-1 text-gray-400 hover:text-red-500 transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
                <ChatMessage message={{ role: 'model', text: lesson.text }} />
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default App;
