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
            note: "Daily class timing 08:00 AM hai. Schedule change ya important notice yahin update hoga.",
            href: "",
            actionLabel: "View Now",
            pdfUrl: "",
            icon: "📘"
          },
          {
            title: "Advance Maths Practice",
            subtitle: "08:00 AM | Recorded + Live Support",
            note: "Recorded class ke saath live support 08:00 AM slot me milega. Extra update yahin dikhega.",
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
            note: "Reasoning session daily 08:00 AM par planned hai. Important update yahin milega.",
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
            note: "Bilingual English session ka timing 08:00 AM hai. Notes aur class notice yahin update honge.",
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
            note: "GS class timing 08:00 AM hai. Topic ya timing change ka notice yahin dikhega.",
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
    recordedVideoUrl: "https://www.youtube.com/watch?v=1mYQW3Tp55I",
    recordedClassTitle: "ESB Mensuration Class 02",
    demoVideoUrl: "https://www.youtube.com/watch?v=1mYQW3Tp55I",
    demoVideoTitle: "Demo Class: ESB Mensuration Class 02",
    videoSources: [
      {
        label: "Auto",
        quality: "Auto",
        url: "https://www.youtube.com/watch?v=1mYQW3Tp55I"
      }
    ],
    highlights: ["Recorded classes", "Notes & booklets", "Class PDFs"]
  },
  {
    id: "recorded-batch",
    title: "Recorded Batch",
    instructor: "Badam Sir",
    duration: "12 Months",
    months: 12,
    category: "General",
    includesMaths: true,
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
    highlights: ["Complete arithmetic", "Practice sheets", "6500+ chapterwise PYQs"],
    tests: [
      {
        title: "SSC Maths Chapterwise 6500+ PYQs",
        duration: "Self-paced",
        status: "Available",
        questions: "6500+",
        exam: "SSC exams",
        shift: "Exam and shift mentioned with each question in the PDF",
        pdfUrl: "/mock-pdfs/ssc-maths-chapterwise-6500-pyqs-3rd-edition-english.pdf"
      }
    ]
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
    name: 'Rahul Gurjar',
    exam: 'Uttar Pradesh Police 2025 - Sub Inspector (SI)',
    review: 'Selected as Sub Inspector in Uttar Pradesh Police.',
    image: '/success-stories/rahul-gurjar-up-police-si-2025-clean.jpg'
  },
  {
    name: 'Manish Jatav',
    exam: 'RPF Constable 2025',
    review: 'Selected as RPF Constable.',
    image: '/success-stories/manish-jatav-rpf-constable-2025-clean.jpg'
  },
  {
    name: "Akshay Morya",
    exam: "Madhya Pradesh Police Sub Inspector (SI)",
    review: "Selected in Madhya Pradesh Police as Sub Inspector.",
    image: "/success-stories/akshay-morya-mp-police-si.webp"
  },
  {
    name: "Rohit Singh & Akshay Morya",
    exam: "Madhya Pradesh Police 2025 - Sub Inspector (SI)",
    review: "Congratulations on being selected as Sub Inspectors in Madhya Pradesh Police.",
    image: "/success-stories/rohit-singh-akshay-morya-mp-police-si.webp"
  },
  {
    name: "Shruti Rajawat",
    exam: "RPF Constable",
    review: "Selected as RPF Constable.",
    image: "/success-stories/shruti-rajawat-rpf-constable.webp"
  },
  {
    name: "Jayraj Yadav",
    exam: "Madhya Pradesh Police 2025 - Sub Inspector (SI)",
    review: "Selected in Madhya Pradesh Police as Sub Inspector.",
    image: "/success-stories/jayraj-yadav-mp-police-si.webp"
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
