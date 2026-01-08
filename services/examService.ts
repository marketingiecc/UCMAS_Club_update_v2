
import { ExamConfig, Mode, Question } from '../types';

// Default Hardcoded Rules (Fallback)
const DEFAULT_RULES: Record<Mode, any> = {
    [Mode.VISUAL]: {
        "1": { numQuestions: 10, numOperandsRange: [2, 3], digitRange: [1, 9] },
        "2": { numQuestions: 20, numOperandsRange: [3, 5], digitRange: [1, 9] },
        "default": { numQuestions: 50, numOperandsRange: [5, 8], digitRange: [10, 99], timeLimit: 600 }
    },
    [Mode.LISTENING]: {
        "1": { timeLimit: 120, numOperandsRange: [2, 3] },
        "default": { timeLimit: 180, numOperandsRange: [3, 5], digitRange: [10, 99] }
    },
    [Mode.FLASH]: {
        "1": { flashSpeed: 1500, numOperandsRange: [2, 3] },
        "2": { flashSpeed: 1000, numOperandsRange: [3, 5] },
        "default": { flashSpeed: 500, numOperandsRange: [5, 10] }
    }
};

export const getExamConfig = (mode: Mode, level: number, customRules?: any): ExamConfig => {
  const baseConfig: ExamConfig = {
    mode,
    level,
    numQuestions: mode === Mode.VISUAL ? 20 : 10,
    timeLimit: 300,
    flashSpeed: 1000,
    numOperandsRange: [3, 5],
    digitRange: [1, 9],
  };

  // 1. Determine which ruleset to use (Custom > Default)
  let ruleset = DEFAULT_RULES[mode];
  
  if (customRules && typeof customRules === 'object') {
     // Check if the customRules structure looks valid (has keys like "1", "2", "default")
     if (customRules[level] || customRules['default']) {
         ruleset = customRules;
     }
  }

  // 2. Apply rules for specific level, or fallback to 'default' key in ruleset
  const levelConfig = ruleset[level.toString()] || ruleset['default'];

  if (levelConfig) {
      return { ...baseConfig, ...levelConfig };
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
