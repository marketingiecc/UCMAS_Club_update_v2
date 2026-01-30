/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * UCMAS Club – Nhìn tính Exam Generator
 * Generated from rulebook markdown.
 *
 * Source rules: quy_tac_sinh_de_nhin_tinh_chi_tiet_lap_trinh.md
 *
 * Quy tắc sinh đề:
 * - Không lặp lại các câu giống y nhau trong cùng 1 bài luyện tập hoặc đề thi.
 *   (Hai câu coi là giống nhau khi có cùng biểu thức và cùng đáp án.)
 */

export type LevelSymbol = "Z" | "A" | "C" | "D" | "E" | "F" | "G" | "H" | "I" | "K";
export type QuestionOp = "addsub" | "mul" | "div";

export interface AddSubQuestion {
  no: number;
  op: "addsub";
  terms: number[];          // signed (decimal terms are scaled by 100)
  decimal: boolean;
  displayTerms: string[];   // formatted for UI
  answer: number;           // scaled by 100 if decimal=true
}

export interface MulQuestion {
  no: number;
  op: "mul";
  a: number;
  b: number;
  answer: number;
}

export interface DivQuestion {
  no: number;
  op: "div";
  dividend: number;
  divisor: number;
  answer: number;
}

export type GeneratedQuestion = AddSubQuestion | MulQuestion | DivQuestion;

export interface GeneratedExam {
  level: {
    vi: string;
    symbol: LevelSymbol;
    english: string;
  };
  questions: GeneratedQuestion[];
}

/** Raw rules extracted from the Markdown rulebook. */
const RULEBOOK_RAW: Array<{
  level_vi: string;
  symbol: LevelSymbol;
  english: string;
  total: string;
  groups: Array<{
    title: string;
    form: string;
    minus: string;
    principles: Record<string, string>;
  }>;
}> = [
  {
    "level_vi": "Cơ bản mở rộng",
    "symbol": "Z",
    "english": "FOUNDATION",
    "total": "200 phép tính cộng trừ",
    "groups": [
      {
        "title": "Từ câu 1- 25",
        "form": "1 chữ số 3 dòng (3 chữ số)",
        "minus": "Phép trừ xuất hiện 1 lần ở những câu chẵn.",
        "principles": {
          "1": "Tổng tích luỹ luôn <10 và không xảy ra trường hợp: \n  - Cộng: 1+4, 2+4, 3+4, 4+4, 2+3, 3+3, 4+3, 3+2, 4+2, 4+1.\n  - Trừ: 5-4, 6-4, 7-4, 8-4, 5-3, 6-3, 7-3, 5-2, 6-2, 5-1.\n  \n  Kết quả: 0<kết quả<10",
          "3": "Số hạng đầu tiên luôn dương\nKhông xuất hiện dấu \"-\" ở các số hạng liên tiếp"
        }
      },
      {
        "title": "Từ câu 26 - 50",
        "form": "1 chữ số 3 dòng (3 chữ số)",
        "minus": "Phép trừ xuất hiện 1 lần ở những câu lẻ.",
        "principles": {
          "1": "Tổng tích luỹ luôn <10 và không xảy ra trường hợp: \n  - Cộng: 1+4, 2+4, 3+4, 4+4, 2+3, 3+3, 4+3, 3+2, 4+2, 4+1.\n  - Trừ: 5-4, 6-4, 7-4, 8-4, 5-3, 6-3, 7-3, 5-2, 6-2, 5-1.\n  \n  Kết quả: 0<kết quả<10",
          "3": "Số hạng đầu tiên luôn dương\nKhông xuất hiện dấu \"-\" ở các số hạng liên tiếp"
        }
      },
      {
        "title": "Từ câu 51 - 75",
        "form": "1 chữ số 4 dòng (4 chữ số)",
        "minus": "Phép trừ xuất hiện 1 lần/ câu ở 5 câu liên tiếp sau câu 51, 57, 63, 69.",
        "principles": {
          "1": "Tổng tích luỹ luôn <10 và không xảy ra trường hợp: \n  - Trừ: 5-4, 6-4, 7-4, 8-4, 5-3, 6-3, 7-3, 5-2, 6-2, 5-1.\n  \n  Kết quả: 0<kết quả<10",
          "3": "Số hạng đầu tiên luôn dương\nKhông xuất hiện dấu \"-\" ở các số hạng liên tiếp"
        }
      },
      {
        "title": "Từ câu 76 - 100",
        "form": "1 chữ số 4 dòng (4 chữ số)",
        "minus": "Phép trừ xuất hiện 1 lần/ câu ở 5 câu liên tiếp sau câu 76, 82, 88, 94.",
        "principles": {
          "1": "Tổng tích luỹ luôn <10\n  Kết quả: 0<kết quả<10",
          "3": "Số hạng đầu tiên luôn dương\nKhông xuất hiện dấu \"-\" ở các số hạng liên tiếp"
        }
      },
      {
        "title": "Từ câu 101 - 125",
        "form": "1 chữ số 3 dòng (3 chữ số)",
        "minus": "Phép trừ xuất hiện ở câu chẵn.Không xuất hiện 2 dấu \"-\" liên tiếp.",
        "principles": {
          "1": "Tổng tích luỹ luôn <50 và: \n  - Khi tổng tích luỹ bằng 5 thì số hạng tiếp theo khác 6,7,8,9. \n  - Khi tổng tích luỹ bằng 6 thì số hạng tiếp theo khác 6,7,8. \n  - Khi tổng tích luỹ bằng 7 thì số hạng tiếp theo khác 6,7. \n  - Khi tổng tích luỹ bằng 8 thì số hạng tiếp theo khác 6.\n  - Khi tổng tích luỹ là một số có 2 chữ số có số cuối là 1 thì số hạng tiếp theo sẽ không phải là -6.\n  - Khi tổng tích luỹ là một số có 2 chữ số có số cuối là 2 thì số hạng tiếp theo sẽ không phải là -6, -7.\n  - Khi tổng tích luỹ là một số có 2 chữ số có số cuối là 3 thì số hạng tiếp theo sẽ không phải là -6, -7,-8.\n  - Khi tổng tích luỹ là một số có 2 chữ số có số cuối là 4 thì số hạng tiếp theo sẽ không phải là -6,7,8,9.\n  2. Kết quả: 0<kết quả<50",
          "3": "Số hạng đầu tiên luôn dương\nKhông xuất hiện dấu \"-\" ở các số hạng liên tiếp"
        }
      },
      {
        "title": "Từ câu 125 - 150",
        "form": "1 chữ số 4 dòng (4 chữ số)",
        "minus": "Phép trừ xuất hiện 1 lần/ câu ở 5 câu liên tiếp sau câu 126, 132, 138, 144. Không xuất hiện 2 dấu \"-\" liên tiếp.",
        "principles": {
          "1": "Tổng tích luỹ luôn <50 và: \n  - Khi tổng tích luỹ bằng 5 thì số hạng tiếp theo khác 6,7,8,9. \n  - Khi tổng tích luỹ bằng 6 thì số hạng tiếp theo khác 6,7,8. \n  - Khi tổng tích luỹ bằng 7 thì số hạng tiếp theo khác 6,7. \n  - Khi tổng tích luỹ bằng 8 thì số hạng tiếp theo khác 6.\n  - Khi tổng tích luỹ là một số có 2 chữ số có số cuối là 1 thì số hạng tiếp theo sẽ không phải là -6.\n  - Khi tổng tích luỹ là một số có 2 chữ số có số cuối là 2 thì số hạng tiếp theo sẽ không phải là -6, -7.\n  - Khi tổng tích luỹ là một số có 2 chữ số có số cuối là 3 thì số hạng tiếp theo sẽ không phải là -6, -7,-8.\n  - Khi tổng tích luỹ là một số có 2 chữ số có số cuối là 4 thì số hạng tiếp theo sẽ không phải là -6,7,8,9.\n  2. Kết quả: 0<kết quả<50",
          "3": "Số hạng đầu tiên luôn dương\nKhông xuất hiện dấu \"-\" ở các số hạng liên tiếp"
        }
      },
      {
        "title": "Từ câu 151 - 175",
        "form": "1 chữ số 5 dòng (5 chữ số)",
        "minus": "Phép trừ xuất hiện ở câu chẵn.\n Các câu 152, 156, 160, 164, 168 xuất hiện 2 dấu trừ/ câu, còn lại các câu khác chỉ xuất hiện 1 dấu trừ. Không xuất hiện 2 dấu \"-\" liên tiếp.",
        "principles": {
          "1": "Tổng tích luỹ luôn <50 và: \n  - Khi tổng tích luỹ bằng 5 thì số hạng tiếp theo khác 6,7,8,9. \n  - Khi tổng tích luỹ bằng 6 thì số hạng tiếp theo khác 6,7,8. \n  - Khi tổng tích luỹ bằng 7 thì số hạng tiếp theo khác 6,7. \n  - Khi tổng tích luỹ bằng 8 thì số hạng tiếp theo khác 6.\n  - Khi tổng tích luỹ là một số có 2 chữ số có số cuối là 1 thì số hạng tiếp theo sẽ không phải là -6.\n  - Khi tổng tích luỹ là một số có 2 chữ số có số cuối là 2 thì số hạng tiếp theo sẽ không phải là -6, -7.\n  - Khi tổng tích luỹ là một số có 2 chữ số có số cuối là 3 thì số hạng tiếp theo sẽ không phải là -6, -7,-8.\n  - Khi tổng tích luỹ là một số có 2 chữ số có số cuối là 4 thì số hạng tiếp theo sẽ không phải là -6,7,8,9.\n  2. Kết quả: 0<kết quả<50",
          "3": "Số hạng đầu tiên luôn dương\nKhông xuất hiện dấu \"-\" ở các số hạng liên tiếp"
        }
      },
      {
        "title": "Từ câu 176 - 200",
        "form": "1 chữ số 6 dòng (6 chữ số)",
        "minus": "Phép trừ xuất hiện ở câu lẻ.\n  Các câu 177, 181, 185, 193 xuất hiện 2 dấu trừ/ câu, còn lại các câu khác chỉ xuất hiện 1 dấu trừ. Không xuất hiện 2 dấu \"-\" liên tiếp.",
        "principles": {
          "1": "Tổng tích luỹ luôn <50 và: \n  - Khi tổng tích luỹ bằng 5 thì số hạng tiếp theo khác 6,7,8,9. \n  - Khi tổng tích luỹ bằng 6 thì số hạng tiếp theo khác 6,7,8. \n  - Khi tổng tích luỹ bằng 7 thì số hạng tiếp theo khác 6,7. \n  - Khi tổng tích luỹ bằng 8 thì số hạng tiếp theo khác 6.\n  - Khi tổng tích luỹ là một số có 2 chữ số có số cuối là 1 thì số hạng tiếp theo sẽ không phải là -6.\n  - Khi tổng tích luỹ là một số có 2 chữ số có số cuối là 2 thì số hạng tiếp theo sẽ không phải là -6, -7.\n  - Khi tổng tích luỹ là một số có 2 chữ số có số cuối là 3 thì số hạng tiếp theo sẽ không phải là -6, -7,-8.\n  - Khi tổng tích luỹ là một số có 2 chữ số có số cuối là 4 thì số hạng tiếp theo sẽ không phải là -6,7,8,9.\n  2. Kết quả: 0<kết quả<50",
          "3": "Số hạng đầu tiên luôn dương\nKhông xuất hiện dấu \"-\" ở các số hạng liên tiếp"
        }
      }
    ]
  },
  {
    "level_vi": "Cơ bản",
    "symbol": "A",
    "english": "Basic",
    "total": "200 phép tính cộng trừ",
    "groups": [
      {
        "title": "Từ câu 1- 25",
        "form": "1 chữ số 3 dòng (3 chữ số)",
        "minus": "Phép trừ xuất hiện 1 lần ở những câu chẵn.",
        "principles": {
          "1": "Tổng tích luỹ luôn <50 và: \n  - Khi tổng tích luỹ bằng 5 thì số hạng tiếp theo khác 6,7,8,9. \n  - Khi tổng tích luỹ bằng 6 thì số hạng tiếp theo khác 6,7,8. \n  - Khi tổng tích luỹ bằng 7 thì số hạng tiếp theo khác 6,7. \n  - Khi tổng tích luỹ bằng 8 thì số hạng tiếp theo khác 6.\n  - Khi tổng tích luỹ là một số có 2 chữ số có số cuối là 1 thì số hạng tiếp theo sẽ không phải là -6.\n  - Khi tổng tích luỹ là một số có 2 chữ số có số cuối là 2 thì số hạng tiếp theo sẽ không phải là -6, -7.\n  - Khi tổng tích luỹ là một số có 2 chữ số có số cuối là 3 thì số hạng tiếp theo sẽ không phải là -6, -7,-8.\n  - Khi tổng tích luỹ là một số có 2 chữ số có số cuối là 4 thì số hạng tiếp theo sẽ không phải là -6,7,8,9.\n  2. Kết quả: 0<kết quả<50",
          "3": "Số hạng đầu tiên luôn dương\nKhông xuất hiện dấu \"-\" ở các số hạng liên tiếp"
        }
      },
      {
        "title": "Từ câu 26 - 50",
        "form": "1 chữ số 4 dòng (4 chữ số)",
        "minus": "Phép trừ xuất hiện 1 lần ở những câu lẻ.",
        "principles": {
          "1": "Tổng tích luỹ luôn <50 và: \n  - Khi tổng tích luỹ bằng 5 thì số hạng tiếp theo khác 6,7,8,9. \n  - Khi tổng tích luỹ bằng 6 thì số hạng tiếp theo khác 6,7,8. \n  - Khi tổng tích luỹ bằng 7 thì số hạng tiếp theo khác 6,7. \n  - Khi tổng tích luỹ bằng 8 thì số hạng tiếp theo khác 6.\n  - Khi tổng tích luỹ là một số có 2 chữ số có số cuối là 1 thì số hạng tiếp theo sẽ không phải là -6.\n  - Khi tổng tích luỹ là một số có 2 chữ số có số cuối là 2 thì số hạng tiếp theo sẽ không phải là -6, -7.\n  - Khi tổng tích luỹ là một số có 2 chữ số có số cuối là 3 thì số hạng tiếp theo sẽ không phải là -6, -7,-8.\n  - Khi tổng tích luỹ là một số có 2 chữ số có số cuối là 4 thì số hạng tiếp theo sẽ không phải là -6,7,8,9.\n  2. Kết quả: 0<kết quả<51",
          "3": "Số hạng đầu tiên luôn dương\nKhông xuất hiện dấu \"-\" ở các số hạng liên tiếp"
        }
      },
      {
        "title": "Từ câu 51 - 75",
        "form": "1 chữ số 5 dòng (5 chữ số)",
        "minus": "Phép trừ xuất hiện 2 lần ở những câu chẵn. Không xuất hiện 2 dấu \"-\" liên tiếp.",
        "principles": {
          "1": "Tổng tích luỹ luôn <50 và: \n  - Khi tổng tích luỹ bằng 5 thì số hạng tiếp theo khác 6,7,8,9. \n  - Khi tổng tích luỹ bằng 6 thì số hạng tiếp theo khác 6,7,8. \n  - Khi tổng tích luỹ bằng 7 thì số hạng tiếp theo khác 6,7. \n  - Khi tổng tích luỹ bằng 8 thì số hạng tiếp theo khác 6.\n  - Khi tổng tích luỹ là một số có 2 chữ số có số cuối là 1 thì số hạng tiếp theo sẽ không phải là -6.\n  - Khi tổng tích luỹ là một số có 2 chữ số có số cuối là 2 thì số hạng tiếp theo sẽ không phải là -6, -7.\n  - Khi tổng tích luỹ là một số có 2 chữ số có số cuối là 3 thì số hạng tiếp theo sẽ không phải là -6, -7,-8.\n  - Khi tổng tích luỹ là một số có 2 chữ số có số cuối là 4 thì số hạng tiếp theo sẽ không phải là -6,7,8,9.\n  2. Kết quả: 0<kết quả<52",
          "3": "Số hạng đầu tiên luôn dương\nKhông xuất hiện dấu \"-\" ở các số hạng liên tiếp"
        }
      },
      {
        "title": "Từ câu 76 - 100",
        "form": "1 chữ số 5 dòng (5 chữ số)",
        "minus": "Phép trừ xuất hiện 2 lần ở những câu lẻ. Không xuất hiện 2 dấu \"-\" liên tiếp.",
        "principles": {
          "1": "Tổng tích luỹ luôn <50 và: \n  - Khi tổng tích luỹ bằng 5 thì số hạng tiếp theo khác 6,7,8,9. \n  - Khi tổng tích luỹ bằng 6 thì số hạng tiếp theo khác 6,7,8. \n  - Khi tổng tích luỹ bằng 7 thì số hạng tiếp theo khác 6,7. \n  - Khi tổng tích luỹ bằng 8 thì số hạng tiếp theo khác 6.\n  - Khi tổng tích luỹ là một số có 2 chữ số có số cuối là 1 thì số hạng tiếp theo sẽ không phải là -6.\n  - Khi tổng tích luỹ là một số có 2 chữ số có số cuối là 2 thì số hạng tiếp theo sẽ không phải là -6, -7.\n  - Khi tổng tích luỹ là một số có 2 chữ số có số cuối là 3 thì số hạng tiếp theo sẽ không phải là -6, -7,-8.\n  - Khi tổng tích luỹ là một số có 2 chữ số có số cuối là 4 thì số hạng tiếp theo sẽ không phải là -6,7,8,9.\n  2. Kết quả: 0<kết quả<53",
          "3": "Số hạng đầu tiên luôn dương\nKhông xuất hiện dấu \"-\" ở các số hạng liên tiếp"
        }
      },
      {
        "title": "Từ câu 101 - 125",
        "form": "1 chữ số 6 dòng (6 chữ số)",
        "minus": "Phép trừ xuất hiện 2 lần ở những câu chẵn. Không xuất hiện 2 dấu \"-\" liên tiếp.",
        "principles": {
          "1": "Tổng tích luỹ luôn <50 và: \n  - Khi tổng tích luỹ bằng 5 thì số hạng tiếp theo khác 6,7,8,9. \n  - Khi tổng tích luỹ bằng 6 thì số hạng tiếp theo khác 6,7,8. \n  - Khi tổng tích luỹ bằng 7 thì số hạng tiếp theo khác 6,7. \n  - Khi tổng tích luỹ bằng 8 thì số hạng tiếp theo khác 6.\n  - Khi tổng tích luỹ là một số có 2 chữ số có số cuối là 1 thì số hạng tiếp theo sẽ không phải là -6.\n  - Khi tổng tích luỹ là một số có 2 chữ số có số cuối là 2 thì số hạng tiếp theo sẽ không phải là -6, -7.\n  - Khi tổng tích luỹ là một số có 2 chữ số có số cuối là 3 thì số hạng tiếp theo sẽ không phải là -6, -7,-8.\n  - Khi tổng tích luỹ là một số có 2 chữ số có số cuối là 4 thì số hạng tiếp theo sẽ không phải là -6,7,8,9.\n  2. Kết quả: 0<kết quả<54",
          "3": "Số hạng đầu tiên luôn dương\nKhông xuất hiện dấu \"-\" ở các số hạng liên tiếp"
        }
      },
      {
        "title": "Từ câu 125 - 150",
        "form": "1 chữ số 6 dòng (6 chữ số)",
        "minus": "Phép trừ xuất hiện 2 lần ở những câu lẻ. Không xuất hiện 2 dấu \"-\" liên tiếp.",
        "principles": {
          "1": "Tổng tích luỹ luôn <50 và: \n  - Khi tổng tích luỹ bằng 5 thì số hạng tiếp theo khác 6,7,8,9. \n  - Khi tổng tích luỹ bằng 6 thì số hạng tiếp theo khác 6,7,8. \n  - Khi tổng tích luỹ bằng 7 thì số hạng tiếp theo khác 6,7. \n  - Khi tổng tích luỹ bằng 8 thì số hạng tiếp theo khác 6.\n  - Khi tổng tích luỹ là một số có 2 chữ số có số cuối là 1 thì số hạng tiếp theo sẽ không phải là -6.\n  - Khi tổng tích luỹ là một số có 2 chữ số có số cuối là 2 thì số hạng tiếp theo sẽ không phải là -6, -7.\n  - Khi tổng tích luỹ là một số có 2 chữ số có số cuối là 3 thì số hạng tiếp theo sẽ không phải là -6, -7,-8.\n  - Khi tổng tích luỹ là một số có 2 chữ số có số cuối là 4 thì số hạng tiếp theo sẽ không phải là -6,7,8,9.\n  2. Kết quả: 0<kết quả<55",
          "3": "Số hạng đầu tiên luôn dương\nKhông xuất hiện dấu \"-\" ở các số hạng liên tiếp"
        }
      },
      {
        "title": "Từ câu 151 - 175",
        "form": "1 chữ số 6 dòng (6 chữ số)",
        "minus": "Phép trừ xuất hiện 2 lần ở những câu chẵn. Không xuất hiện 2 dấu \"-\" liên tiếp.",
        "principles": {
          "1": "Tổng tích luỹ luôn <50 và: \n  - Khi tổng tích luỹ bằng 5 thì số hạng tiếp theo khác 6,7,8,9. \n  - Khi tổng tích luỹ bằng 6 thì số hạng tiếp theo khác 6,7,8. \n  - Khi tổng tích luỹ bằng 7 thì số hạng tiếp theo khác 6,7. \n  - Khi tổng tích luỹ bằng 8 thì số hạng tiếp theo khác 6.\n  - Khi tổng tích luỹ là một số có 2 chữ số có số cuối là 1 thì số hạng tiếp theo sẽ không phải là -6.\n  - Khi tổng tích luỹ là một số có 2 chữ số có số cuối là 2 thì số hạng tiếp theo sẽ không phải là -6, -7.\n  - Khi tổng tích luỹ là một số có 2 chữ số có số cuối là 3 thì số hạng tiếp theo sẽ không phải là -6, -7,-8.\n  - Khi tổng tích luỹ là một số có 2 chữ số có số cuối là 4 thì số hạng tiếp theo sẽ không phải là -6,7,8,9.\n  2. Kết quả: 0<kết quả<56",
          "3": "Số hạng đầu tiên luôn dương\nKhông xuất hiện dấu \"-\" ở các số hạng liên tiếp"
        }
      },
      {
        "title": "Từ câu 176 - 200",
        "form": "1 chữ số 7 dòng (7 chữ số)",
        "minus": "Phép trừ xuất hiện 2 lần ở những câu lẻ. Không xuất hiện 2 dấu \"-\" liên tiếp.",
        "principles": {
          "1": "Tổng tích luỹ luôn <50 và: \n  - Khi tổng tích luỹ bằng 5 thì số hạng tiếp theo khác 6,7,8,9. \n  - Khi tổng tích luỹ bằng 6 thì số hạng tiếp theo khác 6,7,8. \n  - Khi tổng tích luỹ bằng 7 thì số hạng tiếp theo khác 6,7. \n  - Khi tổng tích luỹ bằng 8 thì số hạng tiếp theo khác 6.\n  - Khi tổng tích luỹ là một số có 2 chữ số có số cuối là 1 thì số hạng tiếp theo sẽ không phải là -6.\n  - Khi tổng tích luỹ là một số có 2 chữ số có số cuối là 2 thì số hạng tiếp theo sẽ không phải là -6, -7.\n  - Khi tổng tích luỹ là một số có 2 chữ số có số cuối là 3 thì số hạng tiếp theo sẽ không phải là -6, -7,-8.\n  - Khi tổng tích luỹ là một số có 2 chữ số có số cuối là 4 thì số hạng tiếp theo sẽ không phải là -6,7,8,9.\n  2. Kết quả: 0<kết quả<57",
          "3": "Số hạng đầu tiên luôn dương\nKhông xuất hiện dấu \"-\" ở các số hạng liên tiếp"
        }
      }
    ]
  },
  {
    "level_vi": "Sơ cấp A",
    "symbol": "C",
    "english": "ELEMENTARY A",
    "total": "200 phép tính cộng trừ",
    "groups": [
      {
        "title": "Từ câu 1- 25",
        "form": "1 chữ số 3 dòng (3 chữ số)",
        "minus": "Phép trừ xuất hiện 1 lần ở những câu chẵn",
        "principles": {
          "1": "Tổng tích luỹ luôn <50 và: \n  - Khi tổng tích luỹ bằng 5 thì số hạng tiếp theo khác 6,7,8,9. \n  - Khi tổng tích luỹ bằng 6 thì số hạng tiếp theo khác 6,7,8. \n  - Khi tổng tích luỹ bằng 7 thì số hạng tiếp theo khác 6,7. \n  - Khi tổng tích luỹ bằng 8 thì số hạng tiếp theo khác 6.\n  - Khi tổng tích luỹ là một số có 2 chữ số có số cuối là 1 thì số hạng tiếp theo sẽ không phải là -6.\n  - Khi tổng tích luỹ là một số có 2 chữ số có số cuối là 2 thì số hạng tiếp theo sẽ không phải là -6, -7.\n  - Khi tổng tích luỹ là một số có 2 chữ số có số cuối là 3 thì số hạng tiếp theo sẽ không phải là -6, -7,-8.\n  - Khi tổng tích luỹ là một số có 2 chữ số có số cuối là 4 thì số hạng tiếp theo sẽ không phải là -6,7,8,9.\n  2. Kết quả: 0<kết quả<57",
          "2": "Không xuất hiện 2 dấu \"-\" liên tiếp.\n Kết quả luôn dương",
          "3": "Số hạng đầu tiên luôn dương\nKhông xuất hiện dấu \"-\" ở các số hạng liên tiếp"
        }
      },
      {
        "title": "Từ câu 26 - 50",
        "form": "1 chữ số 4 dòng (4 chữ số)",
        "minus": "Phép trừ xuất hiện 1 lần ở những câu lẻ",
        "principles": {
          "1": "Tổng tích luỹ luôn <50 và: \n  - Khi tổng tích luỹ bằng 5 thì số hạng tiếp theo khác 6,7,8,9. \n  - Khi tổng tích luỹ bằng 6 thì số hạng tiếp theo khác 6,7,8. \n  - Khi tổng tích luỹ bằng 7 thì số hạng tiếp theo khác 6,7. \n  - Khi tổng tích luỹ bằng 8 thì số hạng tiếp theo khác 6.\n  - Khi tổng tích luỹ là một số có 2 chữ số có số cuối là 1 thì số hạng tiếp theo sẽ không phải là -6.\n  - Khi tổng tích luỹ là một số có 2 chữ số có số cuối là 2 thì số hạng tiếp theo sẽ không phải là -6, -7.\n  - Khi tổng tích luỹ là một số có 2 chữ số có số cuối là 3 thì số hạng tiếp theo sẽ không phải là -6, -7,-8.\n  - Khi tổng tích luỹ là một số có 2 chữ số có số cuối là 4 thì số hạng tiếp theo sẽ không phải là -6,7,8,9.\n  2. Kết quả: 0<kết quả<57",
          "2": "Không xuất hiện 2 dấu \"-\" liên tiếp.\n Kết quả luôn dương",
          "3": "Số hạng đầu tiên luôn dương\nKhông xuất hiện dấu \"-\" ở các số hạng liên tiếp"
        }
      },
      {
        "title": "Từ câu 51 - 75",
        "form": "1 đến 2 chữ số 5 dòng (6 chữ số)",
        "minus": "Phép trừ xuất hiện 2 lần ở những câu chẵn. Không xuất hiện 2 dấu \"-\" liên tiếp.",
        "principles": {
          "1": "Số có 2 chữ số xuất hiện 1 lần/ câu, vị trí không cố định.\n Kết quả luôn dương",
          "2": "Không xuất hiện 2 dấu \"-\" liên tiếp.\n Kết quả luôn dương",
          "3": "Số hạng đầu tiên luôn dương\nKhông xuất hiện dấu \"-\" ở các số hạng liên tiếp"
        }
      },
      {
        "title": "Từ câu 76 - 100",
        "form": "1 đến 2 chữ số 5 dòng (6 chữ số)",
        "minus": "Phép trừ xuất hiện 2 lần ở những câu lẻ. Không xuất hiện 2 dấu \"-\" liên tiếp.",
        "principles": {
          "1": "Số có 2 chữ số xuất hiện 1 lần/ câu, vị trí không cố định.\n Kết quả luôn dương",
          "2": "Không xuất hiện 2 dấu \"-\" liên tiếp.\n Kết quả luôn dương",
          "3": "Số hạng đầu tiên luôn dương\nKhông xuất hiện dấu \"-\" ở các số hạng liên tiếp"
        }
      },
      {
        "title": "Từ câu 101 - 125",
        "form": "1 đến 2 chữ số 6 dòng (7 chữ số)",
        "minus": "Phép trừ xuất hiện 2 lần ở những câu chẵn. Không xuất hiện 2 dấu \"-\" liên tiếp.",
        "principles": {
          "1": "Số có 2 chữ số xuất hiện 1 lần/ câu, vị trí không cố định.\n Kết quả luôn dương",
          "2": "Không xuất hiện 2 dấu \"-\" liên tiếp.\n Kết quả luôn dương",
          "3": "Số hạng đầu tiên luôn dương\nKhông xuất hiện dấu \"-\" ở các số hạng liên tiếp"
        }
      },
      {
        "title": "Từ câu 126 - 150",
        "form": "1đến 2 chữ số 7 dòng (8 chữ số)",
        "minus": "Phép trừ xuất hiện 2 lần ở những câu chẵn. Không xuất hiện 2 dấu \"-\" liên tiếp.",
        "principles": {
          "1": "Số có 2 chữ số xuất hiện 1 lần/ câu, vị trí không cố định.\n Kết quả luôn dương",
          "2": "Không xuất hiện 2 dấu \"-\" liên tiếp.\n Kết quả luôn dương",
          "3": "Số hạng đầu tiên luôn dương\nKhông xuất hiện dấu \"-\" ở các số hạng liên tiếp"
        }
      },
      {
        "title": "Từ câu 151 - 175",
        "form": "1 đến 2 chữ số 8 dòng (9 chữ số)",
        "minus": "Phép trừ xuất hiện 3 lần ở những câu chẵn. Không xuất hiện 2 dấu \"-\" liên tiếp.",
        "principles": {
          "1": "Số có 2 chữ số xuất hiện 1 lần/ câu, vị trí không cố định.\n Kết quả luôn dương",
          "2": "Không xuất hiện 2 dấu \"-\" liên tiếp.\n Kết quả luôn dương",
          "3": "Số hạng đầu tiên luôn dương\nKhông xuất hiện dấu \"-\" ở các số hạng liên tiếp"
        }
      },
      {
        "title": "Từ câu 175 - 200",
        "form": "1 đến 2 chữ số 9 dòng (10 chữ số)",
        "minus": "Phép trừ xuất hiện 3 lần ở những câu chẵn. Không xuất hiện 2 dấu \"-\" liên tiếp.",
        "principles": {
          "1": "Số có 2 chữ số xuất hiện 1 lần/ câu, vị trí không cố định.\n Kết quả luôn dương",
          "2": "Không xuất hiện 2 dấu \"-\" liên tiếp.\n Kết quả luôn dương",
          "3": "Số hạng đầu tiên luôn dương\nKhông xuất hiện dấu \"-\" ở các số hạng liên tiếp"
        }
      }
    ]
  },
  {
    "level_vi": "Sơ cấp B",
    "symbol": "D",
    "english": "ELEMENTARY B",
    "total": "200 phép tính cộng trừ",
    "groups": [
      {
        "title": "Từ câu 1 - 25",
        "form": "1 chữ số 5 dòng (5 chữ số)",
        "minus": "Phép trừ xuất hiện 2 lần ở những câu chẵn",
        "principles": {
          "1": "Số có 2 chữ số xuất hiện 1 lần/ câu, vị trí không cố định.\n Kết quả luôn dương",
          "2": "Không xuất hiện 2 dấu \"-\" liên tiếp.\n Kết quả luôn dương",
          "3": "Số hạng đầu tiên luôn dương\nKhông xuất hiện dấu \"-\" ở các số hạng liên tiếp"
        }
      },
      {
        "title": "Từ câu 26 - 50",
        "form": "1 ~ 2 chữ số 5 dòng (6 chữ số)",
        "minus": "Phép trừ xuất hiện 2 lần ở những câu lẻ",
        "principles": {
          "1": "Số có 2 chữ số xuất hiện 1 lần/ câu, vị trí không cố định.",
          "2": "Không xuất hiện 2 dấu \"-\" liên tiếp.\n Kết quả luôn dương",
          "3": "Số hạng đầu tiên luôn dương\nKhông xuất hiện dấu \"-\" ở các số hạng liên tiếp"
        }
      },
      {
        "title": "Từ câu 51 - 75",
        "form": "2 chữ số 4 dòng (8 chữ số)",
        "minus": "Phép trừ xuất hiện 1 lần ở những câu chẵn",
        "principles": {
          "1": "Số có 2 chữ số xuất hiện 1 lần/ câu, vị trí không cố định.",
          "2": "Không xuất hiện 2 dấu \"-\" liên tiếp.\n Kết quả luôn dương",
          "3": "Số hạng đầu tiên luôn dương\nKhông xuất hiện dấu \"-\" ở các số hạng liên tiếp"
        }
      },
      {
        "title": "Từ câu 76 - 100",
        "form": "2 chữ số 5 dòng (10 chữ số)",
        "minus": "Phép trừ xuất hiện 2 lần ở những câu lẻ",
        "principles": {
          "1": "Số có 2 chữ số xuất hiện 1 lần/ câu, vị trí không cố định.",
          "2": "Không xuất hiện 2 dấu \"-\" liên tiếp.\n Kết quả luôn dương",
          "3": "Số hạng đầu tiên luôn dương\nKhông xuất hiện dấu \"-\" ở các số hạng liên tiếp"
        }
      },
      {
        "title": "Từ câu 101 - 125",
        "form": "3 chữ số 3 dòng (9 chữ số)",
        "minus": "Phép trừ xuất hiện 1 lần ở những câu chẵn",
        "principles": {
          "1": "Số có 2 chữ số xuất hiện 1 lần/ câu, vị trí không cố định.",
          "2": "Không xuất hiện 2 dấu \"-\" liên tiếp.\n Kết quả luôn dương",
          "3": "Số hạng đầu tiên luôn dương\nKhông xuất hiện dấu \"-\" ở các số hạng liên tiếp"
        }
      },
      {
        "title": "Từ câu 126 - 150",
        "form": "3 chữ số 3 dòng (9 chữ số)",
        "minus": "Phép trừ xuất hiện 1 lần ở những câu lẻ",
        "principles": {
          "1": "Số có 2 chữ số xuất hiện 1 lần/ câu, vị trí không cố định.",
          "2": "Không xuất hiện 2 dấu \"-\" liên tiếp.\n Kết quả luôn dương",
          "3": "Số hạng đầu tiên luôn dương\nKhông xuất hiện dấu \"-\" ở các số hạng liên tiếp"
        }
      },
      {
        "title": "Từ câu 151 - 175",
        "form": "3 chữ số 3 dòng (9 chữ số)",
        "minus": "Phép trừ xuất hiện 1 lần ở những câu chẵn",
        "principles": {
          "1": "Số có 2 chữ số xuất hiện 1 lần/ câu, vị trí không cố định.",
          "2": "Không xuất hiện 2 dấu \"-\" liên tiếp.\n Kết quả luôn dương",
          "3": "Số hạng đầu tiên luôn dương\nKhông xuất hiện dấu \"-\" ở các số hạng liên tiếp"
        }
      },
      {
        "title": "Từ câu 175 - 200",
        "form": "3 chữ số 3 dòng (9 chữ số)",
        "minus": "Phép trừ xuất hiện 1 lần ở những câu lẻ",
        "principles": {
          "1": "Số có 2 chữ số xuất hiện 1 lần/ câu, vị trí không cố định.",
          "2": "Không xuất hiện 2 dấu \"-\" liên tiếp.\n Kết quả luôn dương",
          "3": "Số hạng đầu tiên luôn dương\nKhông xuất hiện dấu \"-\" ở các số hạng liên tiếp"
        }
      }
    ]
  },
  {
    "level_vi": "Trung cấp A",
    "symbol": "E",
    "english": "INTERMEDIATE \"A\"",
    "total": "100 phép tính cộng trừ",
    "groups": [
      {
        "title": "Từ câu 1 - 25",
        "form": "1 chữ số 7 ~ 10 dòng (7 ~ 10 chữ số)",
        "minus": "Câu 1 - 7: 1 chữ số 7 dòng: Phép trừ xuất hiện 2 lần ở những câu chẵn \n Câu 8 - 14: 1 chữ số 8 dòng: Phép trừ xuất hiện 3 lần ở câu 9,11,13,16\n Câu 15 - 20: 1 chữ số 9 dòng: Phép trừ xuất hiện 2 lần ở câu chẵn\n Câu 21 - 25: 1 chữ số 10 dòng: Phép trừ xuất hiện 2 lần ở câu chẵn",
        "principles": {
          "1": "Số có 2 chữ số xuất hiện 1 lần/ câu, vị trí không cố định.",
          "2": "Không xuất hiện 2 dấu \"-\" liên tiếp.\n Kết quả luôn dương",
          "3": "Số hạng đầu tiên luôn dương\nKhông xuất hiện dấu \"-\" ở các số hạng liên tiếp"
        }
      },
      {
        "title": "Từ câu 26 - 50",
        "form": "1 ~ 2 chữ số 8 dòng (10 ~ 12 chữ số)",
        "minus": "Phép trừ xuất hiện 3 lần ở những câu lẻ",
        "principles": {
          "1": "Câu 26 - 33: Số có 2 chữ số xuất hiện 2 lần/ câu, vị trí không cố định.\n Câu 34 - 43: Số có 2 chữ số xuất hiện 3 lần/ câu, vị trí không cố định.\n Câu 44 - 50: Số có 2 chữ số xuất hiện 4 lần/ câu, vị trí không cố định.",
          "2": "Không xuất hiện 2 dấu \"-\" liên tiếp.\n Kết quả luôn dương",
          "3": "Số hạng đầu tiên luôn dương\nKhông xuất hiện dấu \"-\" ở các số hạng liên tiếp"
        }
      },
      {
        "title": "Từ câu 51 - 75",
        "form": "2 chữ số 3 ~ 4 dòng (6 ~ 8 chữ số)",
        "minus": "Phép trừ xuất hiện 1 lần ở những câu chẵn",
        "principles": {
          "1": "Câu 51 - 62: 2 chữ số 3 dòng (6 chữ số)\n Câu 63 - 75: 2 chữ số 4 dòng (8 chữ số)",
          "2": "Không xuất hiện 2 dấu \"-\" liên tiếp.\n Kết quả luôn dương",
          "3": "Số hạng đầu tiên luôn dương\nKhông xuất hiện dấu \"-\" ở các số hạng liên tiếp"
        }
      },
      {
        "title": "Từ câu 76 - 100",
        "form": "2 chữ số 5 ~ 6 dòng (10 ~ 12 chữ số)",
        "minus": "Phép trừ xuất hiện 2 lần ở những câu lẻ",
        "principles": {
          "1": "Câu 76 - 83: 2 chữ số 5 dòng (10 chữ số)\n Câu 84 - 91: 2 chữ số 6 dòng (12 chữ số)\n Câu 92 - 100: 2 chữ số 7 dòng (14 chữ số)",
          "2": "Không xuất hiện 2 dấu \"-\" liên tiếp.\n Kết quả luôn dương",
          "3": "Số hạng đầu tiên luôn dương\nKhông xuất hiện dấu \"-\" ở các số hạng liên tiếp"
        }
      },
      {
        "title": "Từ câu 1 - 100",
        "form": "2 chữ số nhân 1 chữ số",
        "minus": "Phép trừ xuất hiện 2 lần ở những câu lẻ",
        "principles": {
          "1": "Câu 76 - 83: 2 chữ số 5 dòng (10 chữ số)\n Câu 84 - 91: 2 chữ số 6 dòng (12 chữ số)\n Câu 92 - 100: 2 chữ số 7 dòng (14 chữ số)",
          "2": "Không xuất hiện 2 dấu \"-\" liên tiếp.\n Kết quả luôn dương",
          "3": "Số hạng đầu tiên luôn dương\nKhông xuất hiện dấu \"-\" ở các số hạng liên tiếp"
        }
      }
    ]
  },
  {
    "level_vi": "Trung cấp B",
    "symbol": "F",
    "english": "INTERMEDIATE 'B'",
    "total": "100 phép tính cộng trừ",
    "groups": [
      {
        "title": "Từ câu 1 - 25",
        "form": "1 chữ số 8 dòng",
        "minus": "Phép trừ xuất hiện 3 lần ở những câu chẵn",
        "principles": {
          "1": "Câu 76 - 83: 2 chữ số 5 dòng (10 chữ số)\n Câu 84 - 91: 2 chữ số 6 dòng (12 chữ số)\n Câu 92 - 100: 2 chữ số 7 dòng (14 chữ số)",
          "2": "Không xuất hiện 2 dấu \"-\" liên tiếp.\n Kết quả luôn dương",
          "3": "Số hạng đầu tiên luôn dương\nKhông xuất hiện dấu \"-\" ở các số hạng liên tiếp"
        }
      },
      {
        "title": "Từ câu 26 - 50",
        "form": "1 ~ 2 chữ số 8 dòng (12 chữ số)",
        "minus": "Phép trừ xuất hiện 3 lần ở những câu lẻ",
        "principles": {
          "1": "Số có 2 chữ số xuất hiện 4 lần/ câu, vị trí không cố định.",
          "2": "Không xuất hiện 2 dấu \"-\" liên tiếp.\n Kết quả luôn dương",
          "3": "Số hạng đầu tiên luôn dương\nKhông xuất hiện dấu \"-\" ở các số hạng liên tiếp"
        }
      },
      {
        "title": "Từ câu 51 - 75",
        "form": "2 chữ số 5 dòng (10 chữ số)",
        "minus": "Phép trừ xuất hiện 2 lần ở những câu chẵn",
        "principles": {
          "1": "Số có 2 chữ số xuất hiện 4 lần/ câu, vị trí không cố định.",
          "2": "Không xuất hiện 2 dấu \"-\" liên tiếp.\n Kết quả luôn dương",
          "3": "Số hạng đầu tiên luôn dương\nKhông xuất hiện dấu \"-\" ở các số hạng liên tiếp"
        }
      },
      {
        "title": "Từ câu 76 - 100",
        "form": "2 chữ số 6 ~ 8 dòng (12 ~ 16 chữ số)",
        "minus": "Phép trừ xuất hiện 2 lần ở những câu lẻ",
        "principles": {
          "1": "Câu 76 - 84: 2 chữ số 6 dòng (12 chữ số)\n Câu 86 - 92: 2 chữ số 7 dòng (14 chữ số)\n Câu 93 - 100: 2 chữ số 8 dòng (16 chữ số)",
          "2": "Không xuất hiện 2 dấu \"-\" liên tiếp.\n Kết quả luôn dương",
          "3": "Số hạng đầu tiên luôn dương\nKhông xuất hiện dấu \"-\" ở các số hạng liên tiếp"
        }
      },
      {
        "title": "Từ câu 1- 25",
        "form": "25 phép tính: 2 chữ số nhân 1 chữ số",
        "minus": "Phép trừ xuất hiện 2 lần ở những câu lẻ",
        "principles": {
          "1": "Câu 76 - 84: 2 chữ số 6 dòng (12 chữ số)\n Câu 86 - 92: 2 chữ số 7 dòng (14 chữ số)\n Câu 93 - 100: 2 chữ số 8 dòng (16 chữ số)",
          "2": "Không xuất hiện 2 dấu \"-\" liên tiếp.\n Kết quả luôn dương",
          "3": "Số hạng đầu tiên luôn dương\nKhông xuất hiện dấu \"-\" ở các số hạng liên tiếp"
        }
      },
      {
        "title": "Từ câu 26 - 50",
        "form": "25 phép tính: 1 chữ số nhân 2 chữ số",
        "minus": "Phép trừ xuất hiện 2 lần ở những câu lẻ",
        "principles": {
          "1": "Câu 76 - 84: 2 chữ số 6 dòng (12 chữ số)\n Câu 86 - 92: 2 chữ số 7 dòng (14 chữ số)\n Câu 93 - 100: 2 chữ số 8 dòng (16 chữ số)",
          "2": "Không xuất hiện 2 dấu \"-\" liên tiếp.\n Kết quả luôn dương",
          "3": "Số hạng đầu tiên luôn dương\nKhông xuất hiện dấu \"-\" ở các số hạng liên tiếp"
        }
      },
      {
        "title": "Từ câu 51 - 75",
        "form": "25 phép tính 3 chữ số chia 1 chữ số",
        "minus": "Phép trừ xuất hiện 2 lần ở những câu lẻ",
        "principles": {
          "1": "Câu 76 - 84: 2 chữ số 6 dòng (12 chữ số)\n Câu 86 - 92: 2 chữ số 7 dòng (14 chữ số)\n Câu 93 - 100: 2 chữ số 8 dòng (16 chữ số)",
          "2": "Không xuất hiện 2 dấu \"-\" liên tiếp.\n Kết quả luôn dương",
          "3": "Số hạng đầu tiên luôn dương\nKhông xuất hiện dấu \"-\" ở các số hạng liên tiếp"
        }
      },
      {
        "title": "Từ câu 76 - 100",
        "form": "25 phép tính 3 chữ số chia 1 chữ số",
        "minus": "Phép trừ xuất hiện 2 lần ở những câu lẻ",
        "principles": {
          "1": "Câu 76 - 84: 2 chữ số 6 dòng (12 chữ số)\n Câu 86 - 92: 2 chữ số 7 dòng (14 chữ số)\n Câu 93 - 100: 2 chữ số 8 dòng (16 chữ số)",
          "2": "Không xuất hiện 2 dấu \"-\" liên tiếp.\n Kết quả luôn dương",
          "3": "Số hạng đầu tiên luôn dương\nKhông xuất hiện dấu \"-\" ở các số hạng liên tiếp"
        }
      }
    ]
  },
  {
    "level_vi": "Cao cấp A",
    "symbol": "G",
    "english": "HIGHER 'A'",
    "total": "100 phép tính cộng trừ",
    "groups": [
      {
        "title": "Từ câu 1- 25",
        "form": "1 chữ số 10 dòng (10 chữ số)",
        "minus": "Phép trừ xuất hiện 3 lần ở những câu chẵn",
        "principles": {
          "1": "Câu 76 - 84: 2 chữ số 6 dòng (12 chữ số)\n Câu 86 - 92: 2 chữ số 7 dòng (14 chữ số)\n Câu 93 - 100: 2 chữ số 8 dòng (16 chữ số)",
          "2": "Không xuất hiện 2 dấu \"-\" liên tiếp.\n Kết quả luôn dương",
          "3": "Số hạng đầu tiên luôn dương\nKhông xuất hiện dấu \"-\" ở các số hạng liên tiếp"
        }
      },
      {
        "title": "Từ câu 26 - 50",
        "form": "2 chữ số 6 dòng (12 chữ số)",
        "minus": "Phép trừ xuất hiện 2 lần ở những câu lẻ",
        "principles": {
          "1": "Câu 76 - 84: 2 chữ số 6 dòng (12 chữ số)\n Câu 86 - 92: 2 chữ số 7 dòng (14 chữ số)\n Câu 93 - 100: 2 chữ số 8 dòng (16 chữ số)",
          "2": "Không xuất hiện 2 dấu \"-\" liên tiếp.\n Kết quả luôn dương",
          "3": "Số hạng đầu tiên luôn dương\nKhông xuất hiện dấu \"-\" ở các số hạng liên tiếp"
        }
      },
      {
        "title": "Từ câu 51 - 75",
        "form": "2 chữ số 8 dòng (16 chữ số)",
        "minus": "Phép trừ xuất hiện 3 lần ở những câu chẵn",
        "principles": {
          "1": "Câu 76 - 84: 2 chữ số 6 dòng (12 chữ số)\n Câu 86 - 92: 2 chữ số 7 dòng (14 chữ số)\n Câu 93 - 100: 2 chữ số 8 dòng (16 chữ số)",
          "2": "Không xuất hiện 2 dấu \"-\" liên tiếp.\n Kết quả luôn dương",
          "3": "Số hạng đầu tiên luôn dương\nKhông xuất hiện dấu \"-\" ở các số hạng liên tiếp"
        }
      },
      {
        "title": "Từ câu 76 - 100",
        "form": "2 chữ số 9 ~ 10 dòng (18 ~ 20 chữ số)",
        "minus": "Phép trừ xuất hiện 3 lần ở những câu lẻ",
        "principles": {
          "1": "Câu 76 - 87: 2 chữ số 9 dòng (18 chữ số)\n Câu 88 - 100: 2 chữ số 10 dòng (20 chữ số)",
          "2": "Không xuất hiện 2 dấu \"-\" liên tiếp.\n Kết quả luôn dương",
          "3": "Số hạng đầu tiên luôn dương\nKhông xuất hiện dấu \"-\" ở các số hạng liên tiếp"
        }
      },
      {
        "title": "Từ câu 1 - 25",
        "form": "3 chữ số nhân 1 chữ số",
        "minus": "Phép trừ xuất hiện 3 lần ở những câu lẻ",
        "principles": {
          "1": "Câu 76 - 87: 2 chữ số 9 dòng (18 chữ số)\n Câu 88 - 100: 2 chữ số 10 dòng (20 chữ số)",
          "2": "Không xuất hiện 2 dấu \"-\" liên tiếp.\n Kết quả luôn dương",
          "3": "Số hạng đầu tiên luôn dương\nKhông xuất hiện dấu \"-\" ở các số hạng liên tiếp"
        }
      },
      {
        "title": "Từ câu 26 - 50",
        "form": "1 chữ số nhân 3 chữ số",
        "minus": "Phép trừ xuất hiện 3 lần ở những câu lẻ",
        "principles": {
          "1": "Câu 76 - 87: 2 chữ số 9 dòng (18 chữ số)\n Câu 88 - 100: 2 chữ số 10 dòng (20 chữ số)",
          "2": "Không xuất hiện 2 dấu \"-\" liên tiếp.\n Kết quả luôn dương",
          "3": "Số hạng đầu tiên luôn dương\nKhông xuất hiện dấu \"-\" ở các số hạng liên tiếp"
        }
      },
      {
        "title": "Từ câu 51 - 75",
        "form": "3 chữ số chia 1 chữ số",
        "minus": "Phép trừ xuất hiện 3 lần ở những câu lẻ",
        "principles": {
          "1": "Câu 76 - 87: 2 chữ số 9 dòng (18 chữ số)\n Câu 88 - 100: 2 chữ số 10 dòng (20 chữ số)",
          "2": "Không xuất hiện 2 dấu \"-\" liên tiếp.\n Kết quả luôn dương",
          "3": "Số hạng đầu tiên luôn dương\nKhông xuất hiện dấu \"-\" ở các số hạng liên tiếp"
        }
      },
      {
        "title": "Từ câu 76 - 100",
        "form": "4 chữ số chia 1 chữ số",
        "minus": "Phép trừ xuất hiện 3 lần ở những câu lẻ",
        "principles": {
          "1": "Câu 76 - 87: 2 chữ số 9 dòng (18 chữ số)\n Câu 88 - 100: 2 chữ số 10 dòng (20 chữ số)",
          "2": "Không xuất hiện 2 dấu \"-\" liên tiếp.\n Kết quả luôn dương",
          "3": "Số hạng đầu tiên luôn dương\nKhông xuất hiện dấu \"-\" ở các số hạng liên tiếp"
        }
      }
    ]
  },
  {
    "level_vi": "Cao cấp B",
    "symbol": "H",
    "english": "HIGHER 'B'",
    "total": "100 phép tính cộng trừ",
    "groups": [
      {
        "title": "Từ câu 1- 25",
        "form": "1 ~ 2 chữ số 8 dòng (11 chữ số)",
        "minus": "Phép trừ xuất hiện 3 lần ở những câu chẵn",
        "principles": {
          "1": "Câu 76 - 87: 2 chữ số 9 dòng (18 chữ số)\n Câu 88 - 100: 2 chữ số 10 dòng (20 chữ số)",
          "2": "Không xuất hiện 2 dấu \"-\" liên tiếp.\n Kết quả luôn dương",
          "3": "Số hạng đầu tiên luôn dương\nKhông xuất hiện dấu \"-\" ở các số hạng liên tiếp"
        }
      },
      {
        "title": "Từ câu 26 - 50",
        "form": "2 chữ số 8 ~ 9 dòng (16 ~ 18 chữ số)",
        "minus": "Phép trừ xuất hiện 3 lần ở những câu lẻ",
        "principles": {
          "1": "Câu 26 - 38: 2 chữ số 8 dòng\n  Câu 39 - 50: 2 chữ số 9 dòng",
          "2": "Không xuất hiện 2 dấu \"-\" liên tiếp.\n Kết quả luôn dương",
          "3": "Số hạng đầu tiên luôn dương\nKhông xuất hiện dấu \"-\" ở các số hạng liên tiếp"
        }
      },
      {
        "title": "Từ câu 51 - 75",
        "form": "2 chữ số 10 dòng (20 chữ số)",
        "minus": "Phép trừ xuất hiện 3 lần ở những câu chẵn",
        "principles": {
          "1": "Câu 26 - 38: 2 chữ số 8 dòng\n  Câu 39 - 50: 2 chữ số 9 dòng",
          "2": "Không xuất hiện 2 dấu \"-\" liên tiếp.\n Kết quả luôn dương",
          "3": "Số hạng đầu tiên luôn dương\nKhông xuất hiện dấu \"-\" ở các số hạng liên tiếp"
        }
      },
      {
        "title": "Từ câu 76 - 100",
        "form": "2 chữ số 10 dòng (20 chữ số)",
        "minus": "Phép trừ xuất hiện 3 lần ở những câu chẵn",
        "principles": {
          "1": "Câu 26 - 38: 2 chữ số 8 dòng\n  Câu 39 - 50: 2 chữ số 9 dòng",
          "2": "Không xuất hiện 2 dấu \"-\" liên tiếp.\n Kết quả luôn dương",
          "3": "Số hạng đầu tiên luôn dương\nKhông xuất hiện dấu \"-\" ở các số hạng liên tiếp"
        }
      },
      {
        "title": "Từ câu 1 - 25",
        "form": "2 chữ số nhân 2 chữ số",
        "minus": "Phép trừ xuất hiện 3 lần ở những câu chẵn",
        "principles": {
          "1": "Câu 26 - 38: 2 chữ số 8 dòng\n  Câu 39 - 50: 2 chữ số 9 dòng",
          "2": "Không xuất hiện 2 dấu \"-\" liên tiếp.\n Kết quả luôn dương",
          "3": "Số hạng đầu tiên luôn dương\nKhông xuất hiện dấu \"-\" ở các số hạng liên tiếp"
        }
      },
      {
        "title": "Từ câu 26 - 50",
        "form": "4 chữ số nhân 1 chữ số",
        "minus": "Phép trừ xuất hiện 3 lần ở những câu chẵn",
        "principles": {
          "1": "Câu 26 - 38: 2 chữ số 8 dòng\n  Câu 39 - 50: 2 chữ số 9 dòng",
          "2": "Không xuất hiện 2 dấu \"-\" liên tiếp.\n Kết quả luôn dương",
          "3": "Số hạng đầu tiên luôn dương\nKhông xuất hiện dấu \"-\" ở các số hạng liên tiếp"
        }
      },
      {
        "title": "Từ câu 51 - 75",
        "form": "4 chữ số chia 1 chữ số",
        "minus": "Phép trừ xuất hiện 3 lần ở những câu chẵn",
        "principles": {
          "1": "Câu 26 - 38: 2 chữ số 8 dòng\n  Câu 39 - 50: 2 chữ số 9 dòng",
          "2": "Không xuất hiện 2 dấu \"-\" liên tiếp.\n Kết quả luôn dương",
          "3": "Số hạng đầu tiên luôn dương\nKhông xuất hiện dấu \"-\" ở các số hạng liên tiếp"
        }
      },
      {
        "title": "Từ câu 76 - 100",
        "form": "4 chữ số chia 2 chữ số",
        "minus": "Phép trừ xuất hiện 3 lần ở những câu chẵn",
        "principles": {
          "1": "Câu 26 - 38: 2 chữ số 8 dòng\n  Câu 39 - 50: 2 chữ số 9 dòng",
          "2": "Không xuất hiện 2 dấu \"-\" liên tiếp.\n Kết quả luôn dương",
          "3": "Số hạng đầu tiên luôn dương\nKhông xuất hiện dấu \"-\" ở các số hạng liên tiếp"
        }
      }
    ]
  },
  {
    "level_vi": "Nâng cao",
    "symbol": "I",
    "english": "ADVANCE",
    "total": "100 phép tính cộng trừ",
    "groups": [
      {
        "title": "Từ câu 1 - 25",
        "form": "2 ~ 3 chữ số 10 dòng (25 chữ số) (Số thập phân)",
        "minus": "Phép trừ xuất hiện 3 lần ở những câu chẵn",
        "principles": {
          "1": "Phần nguyên: 1 chữ số (bao gồm cả số 0).\n Phần thập phân: 2 chữ số\n Phần nguyên = 0 xuất hiện 5 lần/ câu.",
          "2": "Phần nguyên = 0 không cần hiển thị số 0 phía trước dấu \".\"\n VD: \"0.12\" -> \".12\"",
          "3": "Số hạng đầu tiên luôn dương\nKhông xuất hiện dấu \"-\" ở các số hạng liên tiếp"
        }
      },
      {
        "title": "Từ câu 26 - 50",
        "form": "3 chữ số 10 dòng (30 chữ số) (Số thập phân)",
        "minus": "Phép trừ xuất hiện 3 lần ở những câu lẻ",
        "principles": {
          "1": "Phần nguyên: 1 chữ số (> 0)\n Phần thập phân: 2 chữ số",
          "2": "Phần nguyên = 0 không cần hiển thị số 0 phía trước dấu \".\"\n VD: \"0.12\" -> \".12\"",
          "3": "Số hạng đầu tiên luôn dương\nKhông xuất hiện dấu \"-\" ở các số hạng liên tiếp"
        }
      },
      {
        "title": "Từ câu 51 - 75",
        "form": "3 ~ 4 chữ số 10 dòng (35 chữ số) (Số thập phân)",
        "minus": "Phép trừ xuất hiện 3 lần ở những câu chẵn",
        "principles": {
          "1": "Phần nguyên: 1-2 chữ số (> 0), 1 chữ số xuất hiện 5 lần/ câu\n Phần thập phân: 2 chữ số",
          "2": "Phần nguyên = 0 không cần hiển thị số 0 phía trước dấu \".\"\n VD: \"0.12\" -> \".12\"",
          "3": "Số hạng đầu tiên luôn dương\nKhông xuất hiện dấu \"-\" ở các số hạng liên tiếp"
        }
      },
      {
        "title": "Từ câu 76 - 100",
        "form": "4 chữ số 10 dòng (40 chữ số) (Số thập phân)",
        "minus": "Phép trừ xuất hiện 3 lần ở những câu lẻ",
        "principles": {
          "1": "Phần nguyên: 2 chữ số\n Phần thập phân: 2 chữ số",
          "2": "Phần nguyên = 0 không cần hiển thị số 0 phía trước dấu \".\"\n VD: \"0.12\" -> \".12\"",
          "3": "Số hạng đầu tiên luôn dương\nKhông xuất hiện dấu \"-\" ở các số hạng liên tiếp"
        }
      },
      {
        "title": "Từ câu 1 - 25",
        "form": "3 chữ số nhân 2 chữ số",
        "minus": "Phép trừ xuất hiện 3 lần ở những câu lẻ",
        "principles": {
          "1": "Phần nguyên: 2 chữ số\n Phần thập phân: 2 chữ số",
          "2": "Phần nguyên = 0 không cần hiển thị số 0 phía trước dấu \".\"\n VD: \"0.12\" -> \".12\"",
          "3": "Số hạng đầu tiên luôn dương\nKhông xuất hiện dấu \"-\" ở các số hạng liên tiếp"
        }
      },
      {
        "title": "Từ câu 26 - 50",
        "form": "4 chữ số nhân 2 chữ số",
        "minus": "Phép trừ xuất hiện 3 lần ở những câu lẻ",
        "principles": {
          "1": "Phần nguyên: 2 chữ số\n Phần thập phân: 2 chữ số",
          "2": "Phần nguyên = 0 không cần hiển thị số 0 phía trước dấu \".\"\n VD: \"0.12\" -> \".12\"",
          "3": "Số hạng đầu tiên luôn dương\nKhông xuất hiện dấu \"-\" ở các số hạng liên tiếp"
        }
      },
      {
        "title": "Từ câu 51 - 75",
        "form": "4 chữ số chia 2 chữ số",
        "minus": "Phép trừ xuất hiện 3 lần ở những câu lẻ",
        "principles": {
          "1": "Phần nguyên: 2 chữ số\n Phần thập phân: 2 chữ số",
          "2": "Phần nguyên = 0 không cần hiển thị số 0 phía trước dấu \".\"\n VD: \"0.12\" -> \".12\"",
          "3": "Số hạng đầu tiên luôn dương\nKhông xuất hiện dấu \"-\" ở các số hạng liên tiếp"
        }
      },
      {
        "title": "Từ câu 76 - 100",
        "form": "5 chữ số chia 2 chữ số và 5 chữ số chia 3 chữ số",
        "minus": "Phép trừ xuất hiện 3 lần ở những câu lẻ",
        "principles": {
          "1": "Câu 76 - 89: 5 chữ số chia 2 chữ số\n Câu 90 - 100: 5 chữ số chia 3 chữ số",
          "2": "Phần nguyên = 0 không cần hiển thị số 0 phía trước dấu \".\"\n VD: \"0.12\" -> \".12\"",
          "3": "Số hạng đầu tiên luôn dương\nKhông xuất hiện dấu \"-\" ở các số hạng liên tiếp"
        }
      }
    ]
  },
  {
    "level_vi": "Xuất sắc",
    "symbol": "K",
    "english": "GRAND LEVER",
    "total": "100 phép tính cộng trừ",
    "groups": [
      {
        "title": "Từ câu 1 - 25",
        "form": "3 chữ số 10 dòng (30 chữ số) (Số thập phân)",
        "minus": "Phép trừ xuất hiện 3 lần ở những câu chẵn",
        "principles": {
          "1": "Phần nguyên: 1 chữ số (> 0)\n Phần thập phân: 2 chữ số",
          "2": "Phần nguyên = 0 không cần hiển thị số 0 phía trước dấu \".\"\n VD: \"0.12\" -> \".12\"",
          "3": "Số hạng đầu tiên luôn dương\nKhông xuất hiện dấu \"-\" ở các số hạng liên tiếp"
        }
      },
      {
        "title": "Từ câu 26 - 50",
        "form": "3 ~ 4 chữ số 10 dòng (35 chữ số) (Số thập phân)",
        "minus": "Phép trừ xuất hiện 3 lần ở những câu lẻ",
        "principles": {
          "1": "Phần nguyên: 1-2 chữ số (> 0), 1 chữ số xuất hiện 5 lần/ câu\n Phần thập phân: 2 chữ số",
          "2": "Phần nguyên = 0 không cần hiển thị số 0 phía trước dấu \".\"\n VD: \"0.12\" -> \".12\"",
          "3": "Số hạng đầu tiên luôn dương\nKhông xuất hiện dấu \"-\" ở các số hạng liên tiếp"
        }
      },
      {
        "title": "Từ câu 51 - 75",
        "form": "4 chữ số 10 dòng (40 chữ số) (Số thập phân)",
        "minus": "Phép trừ xuất hiện 3 lần ở những câu chẵn",
        "principles": {
          "1": "Phần nguyên: 2 chữ số\n Phần thập phân: 2 chữ số",
          "2": "Phần nguyên = 0 không cần hiển thị số 0 phía trước dấu \".\"\n VD: \"0.12\" -> \".12\"",
          "3": "Số hạng đầu tiên luôn dương\nKhông xuất hiện dấu \"-\" ở các số hạng liên tiếp"
        }
      },
      {
        "title": "Từ câu 76 - 100",
        "form": "5 chữ số 10 dòng (50 chữ số) (Số thập phân)",
        "minus": "Phép trừ xuất hiện 3 lần ở những câu lẻ",
        "principles": {
          "1": "Phần nguyên: 3 chữ số\n Phần thập phân: 2 chữ số",
          "2": "Phần nguyên = 0 không cần hiển thị số 0 phía trước dấu \".\"\n VD: \"0.12\" -> \".12\"",
          "3": "Số hạng đầu tiên luôn dương\nKhông xuất hiện dấu \"-\" ở các số hạng liên tiếp"
        }
      },
      {
        "title": "Từ câu 1 - 25",
        "form": "2 chữ số nhân 3 chữ số,",
        "minus": "Phép trừ xuất hiện 3 lần ở những câu lẻ",
        "principles": {
          "1": "Câu 1 - 12: 2 chữ số nhân 3 chữ số\n Câu 13 - 25: 3 chữ số nhân 2 chữ số",
          "2": "Phần nguyên = 0 không cần hiển thị số 0 phía trước dấu \".\"\n VD: \"0.12\" -> \".12\"",
          "3": "Số hạng đầu tiên luôn dương\nKhông xuất hiện dấu \"-\" ở các số hạng liên tiếp"
        }
      },
      {
        "title": "Từ câu 26 - 50",
        "form": "3 chữ số nhân 3 chữ số,",
        "minus": "Phép trừ xuất hiện 3 lần ở những câu lẻ",
        "principles": {
          "1": "Câu 26 - 37: 3 chữ số nhân 3 chữ số.\n Câu 38 - 50: 4 chữ số nhân 2 chữ số",
          "2": "Phần nguyên = 0 không cần hiển thị số 0 phía trước dấu \".\"\n VD: \"0.12\" -> \".12\"",
          "3": "Số hạng đầu tiên luôn dương\nKhông xuất hiện dấu \"-\" ở các số hạng liên tiếp"
        }
      },
      {
        "title": "Từ câu 51 - 75",
        "form": "4 chữ số chia 2 chữ số",
        "minus": "Phép trừ xuất hiện 3 lần ở những câu lẻ",
        "principles": {
          "1": "Câu 26 - 37: 3 chữ số nhân 3 chữ số.\n Câu 38 - 50: 4 chữ số nhân 2 chữ số",
          "2": "Phần nguyên = 0 không cần hiển thị số 0 phía trước dấu \".\"\n VD: \"0.12\" -> \".12\"",
          "3": "Số hạng đầu tiên luôn dương\nKhông xuất hiện dấu \"-\" ở các số hạng liên tiếp"
        }
      },
      {
        "title": "Từ câu 76 - 100",
        "form": "5 -6 chữ số chia 2 - 3 chữ số,",
        "minus": "Phép trừ xuất hiện 3 lần ở những câu lẻ",
        "principles": {
          "1": "Câu 76 - 80: 5 chữ số chia 2 chữ số\n  Câu 81 - 85: 5 chữ số chia 3 chữ số\n  Câu 86 - 90: 6 chữ số chia 2 chữ số\n  Câu 91 - 95: 6 chữ số chia 3 chữ số\n  Câu 96 - 100: 6 chữ số chia 4 chữ số",
          "2": "Phần nguyên = 0 không cần hiển thị số 0 phía trước dấu \".\"\n VD: \"0.12\" -> \".12\"",
          "3": "Số hạng đầu tiên luôn dương\nKhông xuất hiện dấu \"-\" ở các số hạng liên tiếp"
        }
      }
    ]
  }
] as any;

/* ----------------------------- Deterministic RNG ----------------------------- */
class RNG {
  private state: number;
  constructor(seed: number) {
    this.state = seed | 0;
    if (this.state === 0) this.state = 0x6d2b79f5;
  }
  nextU32(): number {
    let x = this.state;
    x ^= x << 13;
    x ^= x >>> 17;
    x ^= x << 5;
    this.state = x | 0;
    return (x >>> 0);
  }
  nextFloat(): number {
    return this.nextU32() / 0xffffffff;
  }
  int(min: number, max: number): number {
    if (max < min) [min, max] = [max, min];
    const r = this.nextU32();
    return min + (r % (max - min + 1));
  }
  pick<T>(arr: T[]): T {
    return arr[this.int(0, arr.length - 1)];
  }
  shuffle<T>(arr: T[]): T[] {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = this.int(0, i);
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }
}

function seedFromString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h | 0;
}

/* ------------------------------ Rule structures ------------------------------ */
interface Range { start: number; end: number; }
interface DigitSpec {
  allowedDigitLens: number[];
  twoDigitCount?: number;
  decimal?: {
    intDigitsMin: number;
    intDigitsMax: number;
    fracDigits: number;
    intPartZeroCount?: number;
    omitLeadingZero?: boolean;
  };
}
interface AddSubConstraints {
  cumulativeMax?: number;
  resultMinExclusive?: number;
  resultMaxExclusive?: number;
  resultAlwaysPositive?: boolean;
  firstTermPositive?: boolean;
  noConsecutiveMinus?: boolean;
  forbiddenTransitions?: Array<{ whenPartial: number; forbidTerm: number }>;
  ucmas50Guard?: boolean;
}
type MinusCountFn = (qNo: number) => number;

interface AddSubGroupRule {
  range: Range;
  title: string;
  digitSpec: DigitSpec;
  minusCountFn: MinusCountFn;
  constraints: AddSubConstraints;
  lines: number;
}

interface MulDivGroupRule {
  range: Range;
  title: string;
  op: "mul" | "div";
  aDigits: number;
  bDigits: number;
  dividendDigits?: number;
}

interface ParsedLevelRules {
  vi: string;
  symbol: LevelSymbol;
  english: string;
  addSubGroups: AddSubGroupRule[];
  mulDivGroups: MulDivGroupRule[];
}

/* ------------------------------ Text parsers -------------------------------- */
function parseRangeFromTitle(title: string): Range {
  const m = title.match(/(\d+)\s*[-–]\s*(\d+)/);
  if (!m) throw new Error(`Cannot parse range from title: ${title}`);
  return { start: parseInt(m[1], 10), end: parseInt(m[2], 10) };
}

function parseLines(form: string): number {
  const m = form.match(/(\d+)\s*dòng/i);
  return m ? parseInt(m[1], 10) : 0;
}

function parseIsDecimal(form: string): boolean {
  return /thập\s*phân/i.test(form);
}

function parseDigitSpec(form: string, p1: string | undefined): DigitSpec {
  const spec: DigitSpec = { allowedDigitLens: [] };
  const decimal = parseIsDecimal(form);
  if (decimal) {
    const intRange = (p1 ?? "").match(/Phần\s*nguyên\s*:\s*([0-9]+)(?:\s*[-~–]|\s*đến\s*)([0-9]+)?/i);
    let intMin = 1, intMax = 1;
    if (intRange) {
      intMin = parseInt(intRange[1], 10);
      intMax = intRange[2] ? parseInt(intRange[2], 10) : intMin;
    } else {
      intMin = 1; intMax = 2;
    }
    const zeroCount = (p1 ?? "").match(/Phần\s*nguyên\s*=\s*0\s*xuất\s*hiện\s*(\d+)\s*lần\/\s*câu/i);
    spec.decimal = {
      intDigitsMin: intMin,
      intDigitsMax: intMax,
      fracDigits: 2,
      intPartZeroCount: zeroCount ? parseInt(zeroCount[1], 10) : undefined,
      omitLeadingZero: true,
    };
    return spec;
  }

  const mRange = form.match(/(\d+)\s*(?:đến|~|-|–)\s*(\d+)\s*chữ\s*số/i);
  if (mRange) {
    const a = parseInt(mRange[1], 10);
    const b = parseInt(mRange[2], 10);
    for (let d = Math.min(a, b); d <= Math.max(a, b); d++) spec.allowedDigitLens.push(d);
  } else {
    const mSingle = form.match(/(\d+)\s*chữ\s*số/i);
    if (mSingle) spec.allowedDigitLens = [parseInt(mSingle[1], 10)];
  }

  const count2 = (p1 ?? "").match(/(2\s*chữ\s*số|Số\s*có\s*2\s*chữ\s*số)\s*xuất\s*hiện\s*(\d+)\s*lần\/\s*câu/i);
  if (count2) spec.twoDigitCount = parseInt(count2[2], 10);

  return spec;
}

function parseForbiddenPairs(p1: string): Array<{ whenPartial: number; forbidTerm: number; }> {
  const out: Array<{ whenPartial: number; forbidTerm: number; }> = [];
  const addPart = p1.match(/Cộng\s*:\s*([^\n]+)/i);
  if (addPart) {
    for (const pr of addPart[1].split(",").map(s => s.trim())) {
      const m = pr.match(/(\d+)\s*\+\s*(\d+)/);
      if (m) out.push({ whenPartial: parseInt(m[1], 10), forbidTerm: +parseInt(m[2], 10) });
    }
  }
  const subPart = p1.match(/Trừ\s*:\s*([^\n]+)/i);
  if (subPart) {
    for (const pr of subPart[1].split(",").map(s => s.trim())) {
      const m = pr.match(/(\d+)\s*-\s*(\d+)/);
      if (m) out.push({ whenPartial: parseInt(m[1], 10), forbidTerm: -parseInt(m[2], 10) });
    }
  }
  return out;
}

function parseConstraints(principles: Record<string, string>): AddSubConstraints {
  const p1 = principles["1"] ?? "";
  const p2 = principles["2"] ?? "";
  const p3 = principles["3"] ?? "";

  const c: AddSubConstraints = {
    firstTermPositive: /Số\s*hạng\s*đầu\s*tiên\s*luôn\s*dương/i.test(p3 + "\n" + p1),
    noConsecutiveMinus: /Không\s*xuất\s*hiện\s*2\s*dấu\s*"?\-"?\s*liên\s*tiếp/i.test(p2 + "\n" + p3),
    resultAlwaysPositive: /Kết\s*quả\s*luôn\s*dương/i.test(p1 + "\n" + p2),
  };

  const maxM = p1.match(/Tổng\s*tích\s*luỹ\s*luôn\s*<\s*(\d+)/i);
  if (maxM) c.cumulativeMax = parseInt(maxM[1], 10);

  const rr = (p1 + "\n" + p2).match(/Kết\s*quả\s*:\s*(\d+)\s*<\s*kết\s*quả\s*<\s*(\d+)/i);
  if (rr) {
    c.resultMinExclusive = parseInt(rr[1], 10);
    c.resultMaxExclusive = parseInt(rr[2], 10);
  }

  if (/Khi\s+tổng\s*tích\s*luỹ\s*bằng\s*5\s*thì\s*số\s*hạng\s*tiếp\s*theo\s*khác/i.test(p1)) {
    c.cumulativeMax = 50;
    c.ucmas50Guard = true;
  }

  const forb = parseForbiddenPairs(p1);
  if (forb.length) c.forbiddenTransitions = forb;

  return c;
}

function parseMinusCountFn(minusText: string, groupRange: Range): MinusCountFn {
  const text = minusText.replace(/\s+/g, " ").trim();

  const mParity = text.match(/xuất\s*hiện\s*(\d+)\s*lần[^.]*câu\s*(chẵn|lẻ)/i);
  if (mParity) {
    const cnt = parseInt(mParity[1], 10);
    const parity = mParity[2].toLowerCase();
    return (qNo: number) => {
      const ok = (parity === "chẵn") ? (qNo % 2 === 0) : (qNo % 2 === 1);
      return ok ? cnt : 0;
    };
  }

  const mStreak = text.match(/(\d+)\s*lần\s*\/\s*câu\s*ở\s*(\d+)\s*câu\s*liên\s*tiếp\s*sau\s*câu\s*([\d,\s]+)/i);
  if (mStreak) {
    const cnt = parseInt(mStreak[1], 10);
    const len = parseInt(mStreak[2], 10);
    const starts = mStreak[3].split(",").map(s => parseInt(s.trim(), 10)).filter(n => !Number.isNaN(n));
    const intervals = starts.map(s => [s, s + len - 1] as const);
    return (qNo: number) => intervals.some(([a,b]) => qNo >= a && qNo <= b) ? cnt : 0;
  }

  const mList = text.match(/Các\s*câu\s*([\d,\s]+)\s*xuất\s*hiện\s*(\d+)\s*dấu\s*trừ\/\s*câu[^,]*,\s*còn\s*lại[^\d]*(\d+)\s*dấu\s*trừ/i);
  if (mList) {
    const list = mList[1].split(",").map(s => parseInt(s.trim(), 10)).filter(n => !Number.isNaN(n));
    const special = parseInt(mList[2], 10);
    const base = parseInt(mList[3], 10);
    const gate = text.match(/xuất\s*hiện\s*ở\s*câu\s*(chẵn|lẻ)/i);
    const gateParity = gate ? gate[1].toLowerCase() : null;

    return (qNo: number) => {
      if (qNo < groupRange.start || qNo > groupRange.end) return 0;
      if (gateParity) {
        const ok = (gateParity === "chẵn") ? (qNo % 2 === 0) : (qNo % 2 === 1);
        if (!ok) return 0;
      }
      return list.includes(qNo) ? special : base;
    };
  }

  const mAny = text.match(/xuất\s*hiện\s*(\d+)\s*lần/i);
  if (mAny) {
    const cnt = parseInt(mAny[1], 10);
    return (_qNo: number) => cnt;
  }

  return (_qNo: number) => 0;
}

function parseSubRangesFromPrinciple1(p1: string, parent: Range): Array<{ range: Range; twoDigitCount?: number; lines?: number; }> {
  const segs: Array<{ range: Range; twoDigitCount?: number; lines?: number; }> = [];
  const reRange = /Câu\s*(\d+)\s*[-–]\s*(\d+)\s*:\s*([\s\S]*?)(?=Câu\s*\d+\s*[-–]|$)/gi;
  let m: RegExpExecArray | null;
  while ((m = reRange.exec(p1)) !== null) {
    const start = parseInt(m[1], 10);
    const end = parseInt(m[2], 10);
    if (end < parent.start || start > parent.end) continue;
    const body = m[3];
    const c2 = body.match(/(2\s*chữ\s*số|Số\s*có\s*2\s*chữ\s*số)\s*xuất\s*hiện\s*(\d+)\s*lần\/\s*câu/i);
    const lines = body.match(/(\d+)\s*dòng/i);
    segs.push({
      range: { start, end },
      twoDigitCount: c2 ? parseInt(c2[2], 10) : undefined,
      lines: lines ? parseInt(lines[1], 10) : undefined,
    });
  }
  return segs;
}

function isMulDivForm(form: string): boolean {
  return /\bnhân\b/i.test(form) || /\bchia\b/i.test(form);
}

function parseMulDivGroup(form: string, title: string): MulDivGroupRule | null {
  const range = parseRangeFromTitle(title);
  if (/nhân/i.test(form)) {
    const m = form.match(/(\d+)\s*chữ\s*số\s*nhân\s*(\d+)\s*chữ\s*số/i);
    if (m) return { range, title, op: "mul", aDigits: parseInt(m[1], 10), bDigits: parseInt(m[2], 10) };
  }
  if (/chia/i.test(form)) {
    const m = form.match(/(\d+)\s*chữ\s*số\s*chia\s*(\d+)\s*chữ\s*số/i);
    if (m) return { range, title, op: "div", aDigits: parseInt(m[1], 10), bDigits: parseInt(m[2], 10), dividendDigits: parseInt(m[1], 10) };
  }
  return null;
}

/* ------------------------ Constraint helpers (add/sub) ----------------------- */
function digitRange(digits: number): [number, number] {
  if (digits <= 1) return [0, 9];
  const min = Math.pow(10, digits - 1);
  const max = Math.pow(10, digits) - 1;
  return [min, max];
}

function applyUCMAS50Guard(partial: number, nextTerm: number): boolean {
  const abs = Math.abs(nextTerm);
  if (partial === 5 && [6,7,8,9].includes(abs)) return false;
  if (partial === 6 && [6,7,8].includes(abs)) return false;
  if (partial === 7 && [6,7].includes(abs)) return false;
  if (partial === 8 && [6].includes(abs)) return false;

  const last = partial % 10;
  if (partial >= 10) {
    if (last === 1 && nextTerm === -6) return false;
    if (last === 2 && (nextTerm === -6 || nextTerm === -7)) return false;
    if (last === 3 && (nextTerm === -6 || nextTerm === -7 || nextTerm === -8)) return false;
    if (last === 4 && (nextTerm === -6 || nextTerm === -7 || nextTerm === -8 || nextTerm === -9 || nextTerm === 7 || nextTerm === 8 || nextTerm === 9)) return false;
  }
  return true;
}

function formatDecimalScaled(x: number, omitLeadingZero: boolean): string {
  const sign = x < 0 ? "-" : "";
  const v = Math.abs(x);
  const intPart = Math.floor(v / 100);
  const frac = v % 100;
  const fracStr = frac.toString().padStart(2, "0");
  if (intPart === 0 && omitLeadingZero) return `${sign}.${fracStr}`;
  return `${sign}${intPart}.${fracStr}`;
}

/* -------------------------- Generation core (add/sub) ------------------------ */
interface AddSubGenSpec {
  lines: number;
  digitSpec: DigitSpec;
  minusRequired: number;
  constraints: AddSubConstraints;
}

function pickIntegerWithDigits(rng: RNG, digits: number): number {
  const [min, max] = digitRange(digits);
  if (digits === 1) return rng.int(1, 9);
  return rng.int(min, max);
}

function pickDecimalScaled(rng: RNG, intDigitsMin: number, intDigitsMax: number, forceIntZero?: boolean): number {
  const intDigits = forceIntZero ? 1 : rng.int(intDigitsMin, intDigitsMax);
  let intPart = 0;
  if (!forceIntZero) {
    const min = (intDigits === 1) ? 1 : Math.pow(10, intDigits - 1);
    const max = Math.pow(10, intDigits) - 1;
    intPart = rng.int(min, max);
  }
  const frac = rng.int(0, 99);
  return intPart * 100 + frac;
}

function buildAllowedTermPool(rng: RNG, digitSpec: DigitSpec): number[] {
  const pool: number[] = [];
  const allowed = digitSpec.allowedDigitLens.length ? digitSpec.allowedDigitLens : [1];
  for (const d of allowed) {
    for (let i = 0; i < 50; i++) pool.push(pickIntegerWithDigits(rng, d));
  }
  if (digitSpec.twoDigitCount && digitSpec.twoDigitCount > 0) {
    for (let i = 0; i < 120; i++) pool.push(pickIntegerWithDigits(rng, 2));
  }
  return pool;
}

function termDigits(n: number): number {
  const abs = Math.abs(n);
  if (abs < 10) return 1;
  if (abs < 100) return 2;
  if (abs < 1000) return 3;
  if (abs < 10000) return 4;
  if (abs < 100000) return 5;
  return 6;
}

function generateAddSubQuestion(rng: RNG, qNo: number, spec: AddSubGenSpec): AddSubQuestion {
  const { lines, digitSpec, minusRequired, constraints } = spec;
  const isDecimal = !!digitSpec.decimal;
  const omitLeadingZero = digitSpec.decimal?.omitLeadingZero ?? false;

  // choose negative positions (except first term)
  const negPositions = new Set<number>();
  if (minusRequired > 0) {
    const candidates = Array.from({ length: lines - 1 }, (_, i) => i + 1);
    const picked = rng.shuffle(candidates).slice(0, Math.min(minusRequired, candidates.length));
    for (const p of picked) negPositions.add(p);
  }
  // repair consecutive minus
  if (constraints.noConsecutiveMinus) {
    for (let pos = 1; pos < lines; pos++) {
      if (negPositions.has(pos) && negPositions.has(pos - 1)) {
        negPositions.delete(pos);
      }
    }
  }

  const terms: number[] = [];
  const displayTerms: string[] = [];
  const maxExclusive = constraints.cumulativeMax;
  const maxTries = 4000;
  let tries = 0;
  let zeroLeft = digitSpec.decimal?.intPartZeroCount ?? 0;

  function violatesForbidden(partial: number, term: number): boolean {
    for (const f of constraints.forbiddenTransitions ?? []) {
      if (partial === f.whenPartial && term === f.forbidTerm) return true;
    }
    if (constraints.ucmas50Guard) {
      if (!applyUCMAS50Guard(partial, term)) return true;
    }
    return false;
  }

  function withinResultRange(sum: number): boolean {
    if (constraints.resultAlwaysPositive && sum <= 0) return false;
    if (constraints.resultMinExclusive !== undefined && sum <= constraints.resultMinExclusive) return false;
    if (constraints.resultMaxExclusive !== undefined && sum >= constraints.resultMaxExclusive) return false;
    return true;
  }

  function dfs(pos: number, partial: number): boolean {
    tries++;
    if (tries > maxTries) return false;
    if (pos === lines) return withinResultRange(partial);

    const sign = (pos === 0) ? +1 : (negPositions.has(pos) ? -1 : +1);

    if (isDecimal) {
      const dec = digitSpec.decimal!;
      const forceZero = (zeroLeft > 0) ? (rng.nextFloat() < (zeroLeft / (lines - pos))) : false;

      for (let k = 0; k < 160; k++) {
        const raw = pickDecimalScaled(rng, dec.intDigitsMin, dec.intDigitsMax, forceZero);
        const term = sign * raw;

        const next = partial + term;
        if (maxExclusive !== undefined) {
          if (!(next >= 0 && next < maxExclusive * 100)) continue;
        }
        if (pos === 0 && constraints.firstTermPositive && term <= 0) continue;

        terms.push(term);
        displayTerms.push(formatDecimalScaled(term, omitLeadingZero));
        const savedZero = zeroLeft;
        if (forceZero && Math.floor(raw/100) === 0 && zeroLeft > 0) zeroLeft--;

        if (dfs(pos + 1, next)) return true;

        zeroLeft = savedZero;
        terms.pop(); displayTerms.pop();
      }
      return false;
    }

    const pool = buildAllowedTermPool(rng, digitSpec);
    for (let k = 0; k < 260; k++) {
      const raw = rng.pick(pool);
      const term = sign * raw;

      if (pos === 0 && constraints.firstTermPositive && term <= 0) continue;
      if (constraints.noConsecutiveMinus && pos > 0 && term < 0 && terms[terms.length - 1] < 0) continue;

      // enforce exact 2-digit count if present
      if (digitSpec.twoDigitCount !== undefined) {
        const used2 = terms.filter(t => termDigits(t) === 2).length;
        const will2 = (termDigits(term) === 2) ? 1 : 0;
        const remaining = lines - pos - 1;
        const need = digitSpec.twoDigitCount;
        if (used2 + will2 > need) continue;
        if (used2 + will2 + remaining < need) continue;
      }

      if (maxExclusive !== undefined) {
        const next = partial + term;
        if (!(next >= 0 && next < maxExclusive)) continue;
      } else if (constraints.resultAlwaysPositive) {
        if (partial + term < 0) continue;
      }

      if (violatesForbidden(partial, term)) continue;

      terms.push(term);
      displayTerms.push(String(term));
      const next = partial + term;
      if (dfs(pos + 1, next)) return true;
      terms.pop(); displayTerms.pop();
    }
    return false;
  }

  const ok = dfs(0, 0);
  if (!ok) {
    throw new Error(`Failed to generate add/sub question #${qNo} (lines=${lines}, minus=${minusRequired})`);
  }

  const answer = terms.reduce((s, t) => s + t, 0);
  return {
    no: qNo,
    op: "addsub",
    terms,
    decimal: isDecimal,
    displayTerms,
    answer,
  };
}

/* -------------------------- Mul/Div generation -------------------------- */
function pickWithDigits(rng: RNG, digits: number, allowZero = false): number {
  const [min, max] = digitRange(digits);
  if (digits === 1) return allowZero ? rng.int(0, 9) : rng.int(1, 9);
  return rng.int(min, max);
}

function generateMulQuestion(rng: RNG, no: number, aDigits: number, bDigits: number): MulQuestion {
  const a = pickWithDigits(rng, aDigits);
  const b = pickWithDigits(rng, bDigits);
  return { no, op: "mul", a, b, answer: a * b };
}

function generateDivQuestion(rng: RNG, no: number, dividendDigits: number, divisorDigits: number): DivQuestion {
  const divisor = pickWithDigits(rng, divisorDigits);
  const [minD, maxD] = digitRange(dividendDigits);
  for (let t = 0; t < 3000; t++) {
    const qDigits = Math.max(1, dividendDigits - divisorDigits);
    const quotient = pickWithDigits(rng, qDigits);
    const dividend = divisor * quotient;
    if (dividend >= minD && dividend <= maxD) {
      return { no, op: "div", dividend, divisor, answer: quotient };
    }
  }
  const quotient = pickWithDigits(rng, Math.max(1, dividendDigits - divisorDigits));
  return { no, op: "div", dividend: divisor * quotient, divisor, answer: quotient };
}

/** Signature for duplicate check: không lặp lại câu giống y nhau trong cùng 1 bài. */
function questionSignature(q: GeneratedQuestion): string {
  if (q.op === "addsub") return `addsub:${q.displayTerms.join("|")}=${q.answer}`;
  if (q.op === "mul") return `mul:${q.a},${q.b}=${q.answer}`;
  return `div:${q.dividend},${q.divisor}=${q.answer}`;
}

/* -------------------------- Build parsed rules -------------------------- */
function buildLevelRules(level: LevelSymbol): ParsedLevelRules {
  const raw = RULEBOOK_RAW.find(r => r.symbol === level);
  if (!raw) throw new Error(`Unknown level: ${level}`);

  const addSubGroups: AddSubGroupRule[] = [];
  const mulDivGroups: MulDivGroupRule[] = [];

  for (const g of raw.groups) {
    const range = parseRangeFromTitle(g.title);
    const form = g.form || "";
    const p1 = g.principles["1"];
    const constraints = parseConstraints(g.principles);
    const minusFn = parseMinusCountFn(g.minus || "", range);

    if (isMulDivForm(form)) {
      const mg = parseMulDivGroup(form, g.title);
      if (mg) mulDivGroups.push(mg);
      continue;
    }

    const lines = parseLines(form) || 3;
    const digitSpec = parseDigitSpec(form, p1);

    const subs = p1 ? parseSubRangesFromPrinciple1(p1, range) : [];
    if (subs.length) {
      for (const s of subs) {
        addSubGroups.push({
          range: s.range,
          title: `${g.title} (sub)`,
          digitSpec: {
            ...digitSpec,
            twoDigitCount: s.twoDigitCount ?? digitSpec.twoDigitCount,
          },
          minusCountFn: minusFn,
          constraints,
          lines: s.lines ?? lines,
        });
      }
    } else {
      addSubGroups.push({
        range,
        title: g.title,
        digitSpec,
        minusCountFn: minusFn,
        constraints,
        lines,
      });
    }
  }

  return {
    vi: raw.level_vi,
    symbol: raw.symbol,
    english: raw.english,
    addSubGroups: addSubGroups.sort((a,b)=>a.range.start-b.range.start),
    mulDivGroups: mulDivGroups.sort((a,b)=>a.range.start-b.range.start),
  };
}

/* -------------------------- Public API -------------------------- */
export interface GenerateExamOptions {
  seed?: number | string;
  addSubOnly?: boolean;
}

const MAX_DEDUP_RETRIES = 500;

export function generateExam(level: LevelSymbol, options: GenerateExamOptions = {}): GeneratedExam {
  const rules = buildLevelRules(level);
  const seed = typeof options.seed === "string"
    ? seedFromString(options.seed)
    : (options.seed ?? seedFromString(`${level}-${Date.now()}`));
  const rng = new RNG(seed);

  const questions: GeneratedQuestion[] = [];
  const seenSignatures = new Set<string>();

  // 1) Add/Sub section: generate exactly as the doc question numbers; no duplicate câu trong cùng bài.
  for (const grp of rules.addSubGroups) {
    for (let qNo = grp.range.start; qNo <= grp.range.end; qNo++) {
      const minusRequired = grp.minusCountFn(qNo);
      const spec = { lines: grp.lines, digitSpec: grp.digitSpec, minusRequired, constraints: grp.constraints };
      let q = generateAddSubQuestion(rng, qNo, spec);
      for (let retry = 0; retry < MAX_DEDUP_RETRIES; retry++) {
        const sig = questionSignature(q);
        if (!seenSignatures.has(sig)) {
          seenSignatures.add(sig);
          break;
        }
        q = generateAddSubQuestion(rng, qNo, spec);
      }
      questions.push(q);
    }
  }

  // 2) Mul/Div section: appended after add/sub (since doc reuses 1-100 for that section); no duplicate.
  if (!options.addSubOnly) {
    let no = questions.length + 1;
    for (const grp of rules.mulDivGroups) {
      const count = grp.range.end - grp.range.start + 1;
      for (let i = 0; i < count; i++) {
        let q: MulQuestion | DivQuestion =
          grp.op === "mul"
            ? generateMulQuestion(rng, no, grp.aDigits, grp.bDigits)
            : generateDivQuestion(rng, no, grp.dividendDigits ?? grp.aDigits, grp.bDigits);
        for (let retry = 0; retry < MAX_DEDUP_RETRIES; retry++) {
          const sig = questionSignature(q);
          if (!seenSignatures.has(sig)) {
            seenSignatures.add(sig);
            break;
          }
          q = grp.op === "mul"
            ? generateMulQuestion(rng, no, grp.aDigits, grp.bDigits)
            : generateDivQuestion(rng, no, grp.dividendDigits ?? grp.aDigits, grp.bDigits);
        }
        questions.push(q);
        no++;
      }
    }
  }

  return {
    level: { vi: rules.vi, symbol: rules.symbol, english: rules.english },
    questions,
  };
}
