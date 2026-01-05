
export type ProficiencyLevel = 'Beginner' | 'Intermediate' | 'Advanced' | 'IELTS';

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}

export interface SavedLesson {
  id: string;
  level: ProficiencyLevel;
  text: string;
  timestamp: number;
}

export interface AppState {
  level: ProficiencyLevel;
  chatHistory: ChatMessage[];
  isThinking: boolean;
}

export enum VoiceName {
  Kore = 'Kore',
  Puck = 'Puck',
  Charon = 'Charon',
  Fenrir = 'Fenrir',
  Zephyr = 'Zephyr'
}
