const STUDENT_BATCH_IMAGE = "/students-carrying-bags.svg";

export const batches = [
  {
    id: "phoolbagh-branch-new-batch-2026",
    title: "Phoolbagh Branch New Batch 2.0",
    instructor: "Badam Sir",
    duration: "12 Months",
    months: 12,
    category: "SSC",
    priceValue: 1199,
    isLatest: true,
    image: STUDENT_BATCH_IMAGE,
    startDate: "May 12, 2026",
    batchTime: "08:00 AM",
    classTiming: "08:00 AM",
    liveClassEnabled: true,
    liveClassUrl: "https://www.youtube.com/channel/UC9KopMZXd5is7KvOzhamTYw/live",
    liveClassTitle: "Badam Singh Classes YouTube Live",
    description:
      "New Phoolbagh branch batch for SSC, Railway, SI, Police, MP Middle School Teacher, and other competitive exams with live + recorded classes, daily PDFs, and regular tests.",
    highlights: [
      "Live + recorded chapters",
      "Daily notes PDFs",
      "Bilingual study material",
      "Regular tests and performance analysis",
      "Personalized attention"
    ],
    classSections: [
      {
        title: "Mathematics",
        items: [
          {
            title: "Arithmetic Foundation",
            subtitle: "08:00 AM | Daily Live Class",
            href: "",
            actionLabel: "View Now",
            pdfUrl: "",
            icon: "📘"
          },
          {
            title: "Advance Maths Practice",
            subtitle: "08:00 AM | Recorded + Live Support",
            href: "",
            actionLabel: "View Now",
            pdfUrl: "",
            icon: "🧮"
          }
        ]
      },
      {
        title: "Reasoning",
        items: [
          {
            title: "Reasoning Core Session",
            subtitle: "08:00 AM | Daily Class",
            href: "",
            actionLabel: "View Now",
            pdfUrl: "",
            icon: "🧠"
          }
        ]
      },
      {
        title: "English",
        items: [
          {
            title: "English Grammar & Vocabulary",
            subtitle: "08:00 AM | Bilingual Session",
            href: "",
            actionLabel: "View Now",
            pdfUrl: "",
            icon: "📖"
          }
        ]
      },
      {
        title: "General Studies (GS)",
        items: [
          {
            title: "GS Daily Concepts",
            subtitle: "08:00 AM | Smart Learning Session",
            href: "",
            actionLabel: "View Now",
            pdfUrl: "",
            icon: "🌍"
          }
        ]
      }
    ]
  },
  {
    id: "udan-batch",
    title: "Udaan Batch Combo (Maths + Reasoning)",
    instructor: "Badam Sir",
    duration: "15 Months",
    months: 15,
    category: "SSC",
    priceValue: 1199,
    isLatest: true,
    image: STUDENT_BATCH_IMAGE,
    highlights: ["Live + recorded classes", "Daily PDFs", "Bilingual support"]
  },
  {
    id: "arithmetic-special",
    title: "Arithmetic Special (Recorded)",
    instructor: "Badam Sir",
    duration: "8 Months",
    months: 8,
    category: "SSC",
    priceValue: 799,
    image: STUDENT_BATCH_IMAGE,
    highlights: ["Recorded classes", "Notes & booklets", "Class PDFs"]
  },
  {
    id: "recorded-batch",
    title: "Recorded Batch",
    instructor: "Badam Sir",
    duration: "12 Months",
    months: 12,
    category: "General",
    priceValue: 599,
    image: STUDENT_BATCH_IMAGE,
    highlights: ["Recorded lectures", "PDF notes", "Mock tests"]
  },
  {
    id: "mp-police",
    title: "MP Police Batch",
    instructor: "Ankit Sir",
    duration: "8 Months",
    months: 8,
    category: "State",
    priceValue: 999,
    image: STUDENT_BATCH_IMAGE,
    highlights: ["Physical + written prep", "Daily quizzes", "Doubt support"]
  },
  {
    id: "maths-special",
    title: "Maths Special Batch",
    instructor: "Badam Sir",
    duration: "1 Year",
    months: 12,
    category: "SSC",
    priceValue: 999,
    image: STUDENT_BATCH_IMAGE,
    highlights: ["Complete arithmetic", "Practice sheets", "Weekly tests"]
  },
  {
    id: "reasoning-batch",
    title: "Reasoning Batch",
    instructor: "Badam Sir",
    duration: "10 Months",
    months: 10,
    category: "SSC",
    priceValue: 899,
    image: STUDENT_BATCH_IMAGE,
    highlights: ["Verbal reasoning", "Non-verbal practice", "Daily quizzes"]
  },
  {
    id: "ssc-complete",
    title: "SSC Complete Batch",
    instructor: "Amit Sir",
    duration: "12 Months",
    months: 12,
    category: "SSC",
    priceValue: 4999,
    image: STUDENT_BATCH_IMAGE,
    highlights: ["Full syllabus", "Mock tests", "Concept videos"]
  },
  {
    id: "railway-foundation",
    title: "Railway Foundation Batch",
    instructor: "Badam Sir",
    duration: "12 Months",
    months: 12,
    category: "Railway",
    priceValue: 1199,
    image: STUDENT_BATCH_IMAGE,
    highlights: ["Railway syllabus", "Live + recorded classes", "Daily PDFs"]
  }
];

export const features = [
  { icon: "live", title: "Live Interactive Classes", text: "Attend engaging live sessions with top educators." },
  { icon: "recorded", title: "Recorded Lectures", text: "Revise anytime with high-quality recordings." },
  { icon: "daily", title: "Daily Practice Questions", text: "Practice every day with topic-wise assignments." },
  { icon: "pdf", title: "PDF Notes & Study Material", text: "Download concise notes and exam resources." },
  { icon: "doubt", title: "Doubt Solving Support", text: "Get quick help from mentors and support teams." },
  { icon: "analytics", title: "Performance Analytics", text: "Track progress and improve with smart insights." }
];

export const exams = [
  { label: "SSC CGL", icon: "ssc-cgl" },
  { label: "SSC CHSL", icon: "ssc-chsl" },
  { label: "Railway NTPC", icon: "railway-ntpc" },
  { label: "Railway ALP", icon: "railway-alp" },
  { label: "Banking", icon: "banking" },
  { label: "State Exams", icon: "state-exams" }
];

export const testimonials = [
  {
    name: "Priya Sharma",
    exam: "SSC CGL",
    review: "Mock tests and classes helped me clear SSC CGL in my first attempt.",
    image: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=300&q=80"
  },
  {
    name: "Aman Kumar",
    exam: "Railway NTPC",
    review: "The daily quizzes and revision plan were extremely useful for NTPC.",
    image: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=300&q=80"
  },
  {
    name: "Neha Singh",
    exam: "Banking",
    review: "Best platform for banking preparation with structured live classes.",
    image: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=300&q=80"
  }
];

export const faqs = [
  { q: "How do I buy a batch?", a: "Open Batches, pick your course, click Enroll Now, complete payment." },
  { q: "Do I get recorded classes?", a: "Yes, every enrolled batch includes recorded access and PDFs." },
  { q: "How to access purchased classes?", a: "Login and open Dashboard to view all purchased content." },
  { q: "Do you provide mock tests?", a: "Yes, topic-wise and full-length mocks are included." }
];

export const resultsSnapshot = [
  { name: "Priya Sharma", exam: "SSC CGL", year: "2026" },
  { name: "Aman Kumar", exam: "Railway NTPC", year: "2026" },
  { name: "Neha Singh", exam: "Banking", year: "2026" },
  { name: "Rohit Patel", exam: "SSC CHSL", year: "2026" }
];
