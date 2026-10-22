const taxonomyRules = [
  {
    subject: "Mathematics",
    topic: "Arithmetic",
    chapter: "Percentage",
    subtopic: "Percentage",
    keywords: ["percentage", "percent", "%", "profit", "loss", "discount", "marked price"]
  },
  {
    subject: "Mathematics",
    topic: "Arithmetic",
    chapter: "Profit Loss",
    subtopic: "Profit Loss Discount",
    keywords: ["profit", "loss", "discount", "marked price", "selling price", "cost price"]
  },
  {
    subject: "Mathematics",
    topic: "Arithmetic",
    chapter: "Simple & Compound Interest",
    subtopic: "Interest",
    keywords: ["simple interest", "compound interest", "rate of interest", "interest per annum"]
  },
  {
    subject: "Mathematics",
    topic: "Arithmetic",
    chapter: "Time and Work",
    subtopic: "Work Efficiency",
    keywords: ["complete the work", "work together", "work alone", "efficiency", "men can complete"]
  },
  {
    subject: "Mathematics",
    topic: "Arithmetic",
    chapter: "Time Speed Distance",
    subtopic: "Speed Distance Time",
    keywords: ["speed", "distance", "train", "km/h", "kmph", "average speed"]
  },
  {
    subject: "Mathematics",
    topic: "Arithmetic",
    chapter: "Ratio and Average",
    subtopic: "Ratio/Average",
    keywords: ["ratio", "proportion", "average", "mean"]
  },
  {
    subject: "Mathematics",
    topic: "Arithmetic",
    chapter: "Number System",
    subtopic: "Simplification",
    keywords: ["simplify", "divisible", "remainder", "lcm", "hcf", "multiple", "factor"]
  },
  {
    subject: "Mathematics",
    topic: "Data Interpretation",
    chapter: "Data Interpretation",
    subtopic: "Table Graph Chart",
    keywords: ["table", "bar graph", "pie chart", "line graph", "data", "percentage distribution"]
  },
  {
    subject: "Mathematics",
    topic: "Advance Math",
    chapter: "Algebra",
    subtopic: "Algebra",
    keywords: ["algebra", "equation", "expression", "polynomial", "x +", "x -"]
  },
  {
    subject: "Mathematics",
    topic: "Advance Math",
    chapter: "Geometry",
    subtopic: "Geometry",
    keywords: ["triangle", "circle", "angle", "square", "rectangle", "chord", "tangent", "mensuration"]
  },
  {
    subject: "Mathematics",
    topic: "Advance Math",
    chapter: "Trigonometry",
    subtopic: "Trigonometry",
    keywords: ["trigonometry", "sin", "cos", "tan", "cot", "sec", "cosec"]
  },
  {
    subject: "Reasoning",
    topic: "Verbal Reasoning",
    chapter: "Series",
    subtopic: "Series",
    keywords: ["series", "next number", "sequence"]
  },
  {
    subject: "Reasoning",
    topic: "Verbal Reasoning",
    chapter: "Coding Decoding",
    subtopic: "Coding",
    keywords: ["coded", "code", "coding", "decoding"]
  },
  {
    subject: "Reasoning",
    topic: "Verbal Reasoning",
    chapter: "Analogy",
    subtopic: "Analogy",
    keywords: ["analogy", "classification", "odd one"]
  },
  {
    subject: "English",
    topic: "Grammar",
    chapter: "Vocabulary",
    subtopic: "Vocabulary",
    keywords: ["synonym", "antonym", "spelt", "vocabulary", "idiom", "phrase"]
  },
  {
    subject: "General Awareness",
    topic: "Static GK",
    chapter: "Polity",
    subtopic: "Constitution",
    keywords: ["constitution", "parliament", "article", "president", "fundamental"]
  },
  {
    subject: "General Awareness",
    topic: "Static GK",
    chapter: "Economics",
    subtopic: "Economics",
    keywords: ["economics", "gdp", "inflation", "budget", "tax", "bank"]
  },
  {
    subject: "General Science",
    topic: "Science",
    chapter: "Biology",
    subtopic: "Biology",
    keywords: ["cell", "blood", "plant", "animal", "disease", "hormone", "biology"]
  },
  {
    subject: "General Science",
    topic: "Science",
    chapter: "Physics",
    subtopic: "Physics",
    keywords: ["motion", "force", "light", "sound", "electricity", "energy", "physics"]
  },
  {
    subject: "General Science",
    topic: "Science",
    chapter: "Chemistry",
    subtopic: "Chemistry",
    keywords: ["acid", "base", "metal", "compound", "reaction", "chemistry"]
  }
];

const normalize = (value = "") => String(value || "").trim().toLowerCase();

const titleCaseFallback = (value = "", fallback = "Mixed Practice") => {
  const cleaned = String(value || "").trim();
  return cleaned || fallback;
};

export const classifyMockQuestion = (question = {}, test = {}) => {
  const section = titleCaseFallback(question.section || test.topic || test.subject, "Mixed Practice");
  const haystack = normalize([
    question.question,
    question.section,
    question.topic,
    question.subtopic,
    question.chapter,
    test.title,
    test.subject,
    test.topic,
    test.category,
    test.sourcePdf
  ].filter(Boolean).join(" "));
  const matchedRule = taxonomyRules.find((rule) => rule.keywords.some((keyword) => haystack.includes(normalize(keyword))));

  return {
    // A chapter-specific taxonomy match is more reliable than the PDF's broad
    // subject label. This keeps Maths/Reasoning questions out of the GS folder
    // when an imported mixed PDF labelled every question as General Science.
    subject: titleCaseFallback(matchedRule?.subject || question.subject || test.subject || section, section),
    topic: titleCaseFallback(question.topic || matchedRule?.topic || test.topic || section, section),
    subtopic: titleCaseFallback(question.subtopic || matchedRule?.subtopic || matchedRule?.chapter || test.topic || section, section),
    chapter: titleCaseFallback(question.chapter || matchedRule?.chapter || test.topic || section, section)
  };
};

export const enrichMockTest = (test = {}) => ({
  ...test,
  questions: (Array.isArray(test.questions) ? test.questions : []).map((question) => ({
    ...question,
    ...classifyMockQuestion(question, test)
  }))
});

export const enrichMockTests = (tests = []) => (Array.isArray(tests) ? tests : []).map(enrichMockTest);

export const uniqueSorted = (items = []) =>
  Array.from(new Set(items.map((item) => String(item || "").trim()).filter(Boolean))).sort((a, b) => a.localeCompare(b));

export const mockMatchesBatch = (test = {}, course = {}) => {
  const haystack = normalize([
    test.title,
    test.category,
    test.subject,
    test.topic,
    test.sourcePdf,
    test.mockGroupTitle,
    ...(Array.isArray(test.questions) ? test.questions.flatMap((question) => [question.subject, question.topic, question.chapter]) : [])
  ].filter(Boolean).join(" "));
  if (course.includesMaths === true) {
    return /math|arithmetic|quantitative|quant\b|percentage|algebra|geometry|trigonometry/.test(haystack);
  }

  const terms = uniqueSorted([
    course.title,
    course.category,
    course.subject,
    ...(Array.isArray(course.classSections) ? course.classSections.map((section) => section.title || section.name) : [])
  ])
    .flatMap((value) => normalize(value).split(/[^a-z0-9]+/))
    .filter((term) => term.length >= 3);

  if (!terms.length) return true;
  return terms.some((term) => haystack.includes(term));
};

export const buildChapterMocksForBatch = (tests = [], course = {}) => {
  const chapters = new Map();
  enrichMockTests(tests)
    .filter((test) => mockMatchesBatch(test, course))
    .forEach((test) => {
      (Array.isArray(test.questions) ? test.questions : []).forEach((question) => {
        const key = question.chapter || question.topic || question.section || test.topic || "Mixed Practice";
        const current = chapters.get(key) || {
          title: `${key} Mock`,
          subject: question.subject || question.section || test.subject || "Mixed Practice",
          chapter: key,
          topic: question.topic || test.topic || key,
          subtopic: question.subtopic || key,
          duration: "Auto timer",
          status: "Available",
          questions: 0,
          testId: test.id || test.title
        };
        current.questions += 1;
        chapters.set(key, current);
      });
    });

  return Array.from(chapters.values()).sort((a, b) => b.questions - a.questions);
};

export const buildTypeWiseMocksForBatch = (tests = [], course = {}) => {
  const types = new Map();
  enrichMockTests(tests)
    .filter((test) => mockMatchesBatch(test, course))
    .forEach((test) => {
      (Array.isArray(test.questions) ? test.questions : []).forEach((question) => {
        const subject = question.subject || question.section || test.subject || "Mixed Practice";
        const chapter = question.chapter || question.topic || question.section || test.topic || "Maths";
        const topic = question.topic || test.topic || chapter;
        const subtopic = question.subtopic || question.type || chapter;
        const key = `${chapter}::${subtopic}`;
        const current = types.get(key) || {
          title: `${chapter} - ${subtopic} Type Mock`,
          subject,
          chapter,
          topic,
          subtopic,
          duration: "Type-wise timer",
          status: "Available",
          questions: 0,
          testId: test.id || test.title
        };
        current.questions += 1;
        types.set(key, current);
      });
    });

  return Array.from(types.values())
    .filter((mock) => mock.questions >= 2)
    .sort((a, b) => b.questions - a.questions);
};
