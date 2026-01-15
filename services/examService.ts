
import { ExamConfig, Mode, Question } from '../types';

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
    },
    [Mode.MIXED]: {
        "default": { numQuestions: 20, numOperandsRange: [3, 5], digitRange: [1, 99], timeLimit: 600 }
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

  let ruleset = DEFAULT_RULES[mode];
  
  if (customRules && typeof customRules === 'object') {
     if (customRules[level] || customRules['default']) {
         ruleset = customRules;
     }
  }

  // Ensure ruleset exists before accessing properties
  const levelConfig = ruleset ? (ruleset[level.toString()] || ruleset['default']) : {};

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
    let currentSum = 0;
    
    for (let j = 0; j < numOperands; j++) {
       const min = config.digitRange[0];
       const max = config.digitRange[1];
       let val = Math.floor(Math.random() * (max - min + 1)) + min;
       
       if (j === 0) {
           operands.push(val);
           currentSum += val;
       } else {
           // Quy tắc: Tổng tích lũy a+b, a+b+c... luôn phải dương
           // Random 40% khả năng là số âm
           const wantSubtract = Math.random() < 0.4;
           
           if (wantSubtract && (currentSum - val >= 0)) {
               operands.push(-val);
               currentSum -= val;
           } else {
               operands.push(val);
               currentSum += val;
           }
       }
    }
    
    questions.push({
      id: `q-${i + 1}`,
      operands,
      correctAnswer: currentSum
    });
  }
  
  return questions;
};
