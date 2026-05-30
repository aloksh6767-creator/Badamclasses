const nationalTopics = [
  "Union budget policy update announced",
  "New digital governance mission launched",
  "Cabinet approves skill development reforms",
  "Major infrastructure corridor project cleared",
  "National health outreach program expanded",
  "Education policy execution milestone achieved",
  "Agriculture technology adoption scheme scaled",
  "MSME support credit program enhanced"
];

const internationalTopics = [
  "Global climate summit delivered a new framework",
  "Major trade dialogue concluded with tariff roadmap",
  "Regional security cooperation talks progressed",
  "International energy forum released transition targets",
  "Cross-border digital rules discussion advanced",
  "Global finance body revised growth outlook"
];

const economyTopics = [
  "Inflation trend report published with policy cues",
  "Industrial production index showed positive momentum",
  "Employment data signaled sector expansion",
  "Banking liquidity measure updated by regulator",
  "Exports and services indicators remained stable",
  "Capital markets saw broad participation growth"
];

const quizBank = [
  {
    question: "Which section is most important for SSC/Railway current affairs prep?",
    options: ["National + Economy", "Entertainment only", "Sports gossip", "None"],
    answer: 0
  },
  {
    question: "Monthly revision is best done using:",
    options: ["Daily short notes + weekly tests", "Last day only", "Random videos", "No revision"],
    answer: 0
  },
  {
    question: "Current affairs questions in exams are usually from:",
    options: ["Recent months", "10 years old events", "Fiction", "Only static GK"],
    answer: 0
  },
  {
    question: "Best strategy to retain current affairs:",
    options: ["MCQ practice with explanations", "Memorize once", "Skip practice", "Ignore mistakes"],
    answer: 0
  }
];

const pickByIndex = (arr, seed) => arr[seed % arr.length];

const monthName = (date) =>
  date.toLocaleString("en-IN", {
    month: "long",
    year: "numeric"
  });

const makeDateLabel = (date) =>
  date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  });

export const getCurrentAffairsDashboard = () => {
  const now = new Date();
  const daySeed = Number(now.toISOString().slice(8, 10));
  const monthSeed = now.getMonth() + 1;

  const daily = [
    {
      category: "National",
      headline: pickByIndex(nationalTopics, daySeed),
      summary: "Focus on policy impact, implementation body, and target beneficiaries for objective questions."
    },
    {
      category: "International",
      headline: pickByIndex(internationalTopics, daySeed + 2),
      summary: "Note participating countries, agreements, and strategic outcomes asked in one-liners."
    },
    {
      category: "Economy",
      headline: pickByIndex(economyTopics, daySeed + 4),
      summary: "Track trend direction and key terms to solve exam-based economy MCQs quickly."
    }
  ];

  const monthly = [
    {
      bucket: "Government Schemes",
      highlights: [
        pickByIndex(nationalTopics, monthSeed),
        pickByIndex(nationalTopics, monthSeed + 3)
      ]
    },
    {
      bucket: "International Relations",
      highlights: [
        pickByIndex(internationalTopics, monthSeed + 1),
        pickByIndex(internationalTopics, monthSeed + 4)
      ]
    },
    {
      bucket: "Economy & Banking",
      highlights: [
        pickByIndex(economyTopics, monthSeed + 2),
        pickByIndex(economyTopics, monthSeed + 5)
      ]
    }
  ];

  const quiz = quizBank.map((item, idx) => ({
    id: idx + 1,
    question: item.question,
    options: item.options,
    answer: item.answer
  }));

  return {
    generatedAt: new Date().toISOString(),
    dailyLabel: makeDateLabel(now),
    monthlyLabel: monthName(now),
    daily,
    monthly,
    quiz
  };
};
