export const mockExamCategories = [
  {
    exam: "Railway",
    totalTests: 42,
    freeTests: 12,
    paidTests: 30,
    duration: "60-90 min",
    difficulty: "Exam Level",
    pattern: "CBT pattern",
    sections: "Maths, Reasoning, GK"
  },
  {
    exam: "SSC",
    totalTests: 28,
    freeTests: 12,
    paidTests: 16,
    duration: "15-60 min",
    difficulty: "Moderate",
    pattern: "Tier pattern",
    sections: "Quant, Reasoning, English, GS"
  },
  {
    exam: "Banking",
    totalTests: 36,
    freeTests: 8,
    paidTests: 28,
    duration: "60-120 min",
    difficulty: "Sectional",
    pattern: "Prelims + mains",
    sections: "Quant, Reasoning, English"
  },
  {
    exam: "Police",
    totalTests: 24,
    freeTests: 6,
    paidTests: 18,
    duration: "90 min",
    difficulty: "State Level",
    pattern: "State police pattern",
    sections: "Reasoning, GK, Maths"
  },
  {
    exam: "Teaching",
    totalTests: 28,
    freeTests: 7,
    paidTests: 21,
    duration: "150 min",
    difficulty: "TET Level",
    pattern: "TET pattern",
    sections: "CDP, Language, Maths, EVS"
  },
  {
    exam: "State Exams",
    totalTests: 31,
    freeTests: 9,
    paidTests: 22,
    duration: "90-120 min",
    difficulty: "Mixed",
    pattern: "State exam pattern",
    sections: "GK, Reasoning, Maths, Hindi"
  }
];

export const timerFeatureList = [
  "Full test countdown with sticky timer",
  "Section-wise timing ready",
  "10 min and 5 min warning states",
  "Auto-submit behavior when time ends",
  "No pause during live test mode",
  "Refresh-safe timing guidance"
];

export const resultAnalysisList = [
  "Score, correct, wrong and unattempted summary",
  "Accuracy, time taken, rank and percentile",
  "Section-wise performance view",
  "Solution and explanation support",
  "Weak topic analysis for next practice"
];

export const mockInterfaceActions = [
  "Save & Next",
  "Mark for Review",
  "Clear Response",
  "Previous",
  "Submit Test",
  "Question Palette"
];

export const topicWiseAiMocks = [
  {
    id: "topic-quant-arithmetic",
    title: "Arithmetic Practice Mock",
    examName: "SSC + Railway",
    questions: 25,
    marks: 50,
    duration: "20 min",
    sectionTiming: "Topic timer",
    negativeMarking: "0.50 mark",
    language: "Hindi + English",
    examMode: "Topic Mock",
    accessType: "Free",
    difficulty: "Foundation to Exam Level",
    resultVisibility: "Instant on BadamClasses",
    groupLabel: "Quantitative Aptitude",
    aiHint: "AI focus: percentage, profit-loss, average and geometry mistakes ko error-log me revise karein.",
    testUrl: "/mock-tests/free-practice",
    status: "published",
    summary: "Topic-wise arithmetic mock built from uploaded practice material and BadamClasses original questions."
  },
  {
    id: "topic-reasoning",
    title: "Reasoning Speed Mock",
    examName: "SSC + Railway",
    questions: 25,
    marks: 50,
    duration: "18 min",
    sectionTiming: "Topic timer",
    negativeMarking: "0.50 mark",
    language: "Hindi + English",
    examMode: "Topic Mock",
    accessType: "Free",
    difficulty: "Moderate",
    resultVisibility: "Instant on BadamClasses",
    groupLabel: "Reasoning",
    aiHint: "AI focus: series, coding-decoding, analogy aur direction sense me speed improve karein.",
    testUrl: "/mock-tests/free-practice",
    status: "published",
    summary: "Reasoning practice mock with question palette and attempt tracking inside BadamClasses."
  },
  {
    id: "topic-general-awareness",
    title: "General Awareness PYQ Mock",
    examName: "Railway + SSC",
    questions: 30,
    marks: 60,
    duration: "20 min",
    sectionTiming: "Topic timer",
    negativeMarking: "0.50 mark",
    language: "Hindi + English",
    examMode: "Topic Mock",
    accessType: "Free",
    difficulty: "Exam Level",
    resultVisibility: "Instant on BadamClasses",
    groupLabel: "General Awareness",
    aiHint: "AI focus: static GK, economics, science aur current pattern facts ko short notes me revise karein.",
    testUrl: "/mock-tests/free-practice",
    status: "published",
    summary: "General Awareness mock for Railway/SSC style revision from uploaded study material."
  },
  {
    id: "topic-english-vocabulary",
    title: "English Vocabulary Mock",
    examName: "SSC",
    questions: 25,
    marks: 50,
    duration: "15 min",
    sectionTiming: "Topic timer",
    negativeMarking: "0.50 mark",
    language: "English",
    examMode: "Topic Mock",
    accessType: "Free",
    difficulty: "Daily Practice",
    resultVisibility: "Instant on BadamClasses",
    groupLabel: "English",
    aiHint: "AI focus: spelling, antonym-synonym aur editorial vocabulary ko daily 15 minute revise karein.",
    testUrl: "/mock-tests/free-practice",
    status: "published",
    summary: "Short English topic mock for vocabulary and accuracy practice."
  }
];


export const originalFreePracticeQuestions = [
  {
    id: "q1",
    section: "Quantitative Aptitude",
    question: "If a number is increased by 20% and then decreased by 20%, what is the net percentage change?",
    options: ["4% increase", "4% decrease", "No change", "2% decrease"],
    answer: 1,
    explanation: "Let the number be 100. After 20% increase it becomes 120, then 20% decrease makes it 96. Net change is 4% decrease."
  },
  {
    id: "q2",
    section: "Reasoning",
    question: "In a certain code, BADAM is written as CBEBN. How will CLASS be written in the same code?",
    options: ["DMBTT", "DLCUT", "DKBRT", "DMBSU"],
    answer: 0,
    explanation: "Each letter is shifted one step forward: C->D, L->M, A->B, S->T, S->T."
  },
  {
    id: "q3",
    section: "English",
    question: "Choose the correctly spelt word.",
    options: ["Accomodate", "Acommodate", "Accommodate", "Accommadate"],
    answer: 2,
    explanation: "The correct spelling is Accommodate."
  },
  {
    id: "q4",
    section: "General Awareness",
    question: "The Constitution of India came into effect on which date?",
    options: ["15 August 1947", "26 January 1950", "2 October 1950", "26 November 1949"],
    answer: 1,
    explanation: "The Constitution came into effect on 26 January 1950."
  },
  {
    id: "q5",
    section: "Quantitative Aptitude",
    question: "A train covers 180 km in 3 hours. What is its average speed?",
    options: ["45 km/h", "50 km/h", "60 km/h", "75 km/h"],
    answer: 2,
    explanation: "Average speed = distance / time = 180 / 3 = 60 km/h."
  },
  {
    id: "q6",
    section: "Reasoning",
    question: "Find the next number in the series: 3, 6, 12, 24, 48, ?",
    options: ["72", "84", "96", "108"],
    answer: 2,
    explanation: "Each term is multiplied by 2, so the next term is 96."
  },
  {
    id: "q7",
    section: "English",
    question: "Select the antonym of 'expand'.",
    options: ["Extend", "Increase", "Contract", "Spread"],
    answer: 2,
    explanation: "Contract is the opposite of expand."
  },
  {
    id: "q8",
    section: "General Awareness",
    question: "Which gas is most abundant in Earth's atmosphere?",
    options: ["Oxygen", "Nitrogen", "Carbon dioxide", "Hydrogen"],
    answer: 1,
    explanation: "Nitrogen makes up about 78% of Earth's atmosphere."
  },
  {
    id: "q9",
    section: "Quantitative Aptitude",
    question: "The average of 5, 7, 9, 11 and 13 is:",
    options: ["8", "9", "10", "11"],
    answer: 1,
    explanation: "Sum is 45 and count is 5, so average is 9."
  },
  {
    id: "q10",
    section: "Reasoning",
    question: "If NORTH is coded as OPUI, then SOUTH will be coded as:",
    options: ["TPVUI", "TQVUJ", "TPVTH", "RPVUI"],
    answer: 0,
    explanation: "Each letter is shifted one step forward: S->T, O->P, U->V, T->U, H->I."
  }
];
