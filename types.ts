export enum Difficulty {
  EASY = 'EASY',
  MEDIUM = 'MEDIUM',
  HARD = 'HARD'
}

export interface Question {
  id: string;
  text: string;
  answer: string;
}

export interface StorySession {
  id: string;
  title: string;
  content: string;
  visualPrompt: string;
  imageBase64?: string | null;
  questions: Question[];
}

export interface QuizResult {
  questionId: string;
  questionText: string;
  userAnswer: string;
  correctAnswer: string;
  isCorrect: boolean;
}

export enum GameState {
  MENU = 'MENU',
  LOADING = 'LOADING',
  READING = 'READING',
  QUIZ = 'QUIZ',
  SUMMARY = 'SUMMARY',
  ERROR = 'ERROR'
}

export interface Feedback {
  type: 'success' | 'error' | 'neutral';
  message: string;
}