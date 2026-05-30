const faqItems = [
  {
    q: "How do I enroll in a batch?",
    a: "Open Home > Batches, choose your batch, click Enroll Now, complete payment, and access content in your dashboard."
  },
  {
    q: "How can I access recorded classes?",
    a: "After enrolling, open Student Dashboard to access recorded videos, PDFs, and practice material."
  },
  {
    q: "How do I reset my login password?",
    a: "Use the Login page reset flow. If you still cannot sign in, contact support with your registered email and phone number."
  },
  {
    q: "Do you provide PDF notes and study material?",
    a: "Yes. Enrolled students get PDF notes, study material, and practice resources from the dashboard."
  },
  {
    q: "Are mock tests included?",
    a: "Yes, batch plans include topic-wise and full-length mock tests for exam practice."
  },
  {
    q: "Can I watch classes on mobile?",
    a: "Yes. You can use the BadamClasses app and website to study on mobile anytime."
  }
];

const resultHighlights = [
  "Priya Sharma - Cleared SSC CGL",
  "Aman Kumar - Cleared Railway NTPC",
  "Neha Singh - Cleared Banking Exam"
];

const faqKeywords = ["faq", "question", "help", "how", "what", "when", "where", "why"];
const resultKeywords = ["result", "success", "selected", "cleared", "rank", "topper"];

export const buildFaqText = () => {
  return faqItems.map((item, idx) => `${idx + 1}. ${item.q} ${item.a}`).join("\\n");
};

export const buildResultsText = () => {
  return resultHighlights.map((line, idx) => `${idx + 1}. ${line}`).join("\\n");
};

const matchesAny = (text, words) => words.some((word) => text.includes(word));

export const getKnowledgeReply = (message) => {
  const normalized = (message || "").toLowerCase();

  if (matchesAny(normalized, resultKeywords)) {
    return `Recent student success highlights:\\n${buildResultsText()}\\n\\nYou can also open the Results section on the homepage for stories.`;
  }

  if (normalized.includes("faq") || (matchesAny(normalized, faqKeywords) && normalized.includes("batch"))) {
    return `Top FAQs:\\n${buildFaqText()}\\n\\nFor more, open the FAQ page.`;
  }

  if (normalized.includes("fees") || normalized.includes("price")) {
    return "Batch prices vary by exam and duration. Popular plans include Maths Special and Recorded Batch at INR 999. Open Batches to compare all options.";
  }

  return null;
};
