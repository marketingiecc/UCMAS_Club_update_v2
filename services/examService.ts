import { ExamConfig, Mode, Question } from '../types';

// Simplified rules engine. In a real app, this would fetch the JSON rules from DB.
export const getExamConfig = (mode: Mode, level: number): ExamConfig => {
  const baseConfig = {
    mode,
    level,
    numQuestions: 20, // Reduced for demo (Visual usually 200)
    timeLimit: 300,
    flashSpeed: 1000,
    numOperandsRange: [3, 5] as [number, number],
    digitRange: [1, 9] as [number, number],
  };

  if (mode === Mode.VISUAL) {
    if (level === 1) return { ...baseConfig, numQuestions: 10, numOperandsRange: [2, 3], digitRange: [1, 9] };
    if (level === 2) return { ...baseConfig, numQuestions: 20, numOperandsRange: [3, 5], digitRange: [1, 9] };
    if (level >= 3) return { ...baseConfig, numQuestions: 50, numOperandsRange: [5, 8], digitRange: [10, 99], timeLimit: 600 };
  }
  
  if (mode === Mode.LISTENING) {
    baseConfig.numQuestions = 10;
    if (level === 1) return { ...baseConfig, timeLimit: 120, numOperandsRange: [2, 3] };
    if (level >= 2) return { ...baseConfig, timeLimit: 180, numOperandsRange: [3, 5], digitRange: [10, 99] };
  }

  if (mode === Mode.FLASH) {
    baseConfig.numQuestions = 10;
    if (level === 1) return { ...baseConfig, flashSpeed: 1500, numOperandsRange: [2, 3] };
    if (level === 2) return { ...baseConfig, flashSpeed: 1000, numOperandsRange: [3, 5] };
    if (level >= 3) return { ...baseConfig, flashSpeed: 500, numOperandsRange: [5, 10] };
  }

  return baseConfig;
};

export const generateExam = (config: ExamConfig): Question[] => {
  const questions: Question[] = [];
  
  for (let i = 0; i < config.numQuestions; i++) {
    const numOperands = Math.floor(Math.random() * (config.numOperandsRange[1] - config.numOperandsRange[0] + 1)) + config.numOperandsRange[0];
    const operands: number[] = [];
    
    for (let j = 0; j < numOperands; j++) {
       // Simple logic: Level 1 (1-9), Level 2 (10-99) roughly
       const min = config.digitRange[0];
       const max = config.digitRange[1];
       let val = Math.floor(Math.random() * (max - min + 1)) + min;
       
       // Allow negatives for subtraction in higher operands, but keep sum positive for simple demo
       // For UCMAS, visual often mixes positive and negative.
       // We'll simplisticly make 30% of numbers negative if not the first number
       if (j > 0 && Math.random() > 0.7) {
           val = -val;
       }
       operands.push(val);
    }
    
    // Ensure result is not negative for basic levels (optional constraint)
    const sum = operands.reduce((a, b) => a + b, 0);
    
    questions.push({
      id: `q-${i + 1}`,
      operands,
      correctAnswer: sum
    });
  }
  
  return questions;
};