const PHOOLBAGH_BATCH_IMAGE = "/phoolbagh-new-batch-2026.png";
const RECORDED_BATCH_IMAGE = "/recorded-batch.jpg";
const SSC_COMPLETE_IMAGE = "/ssc-complete.jpg";
const GENERAL_COURSE_BANNER = "/railway-batch-banner-2026.png";

const fallbackCourses = [
  {
    _id: "phoolbagh-branch-new-batch-2026",
    id: "phoolbagh-branch-new-batch-2026",
    title: "Phoolbagh Branch New Batch 2.0",
    description:
      "New Phoolbagh branch batch for SSC, Railway, SI, Police, MP Middle School Teacher, and other competitive exams with live and recorded classes, daily PDFs, and regular tests.",
    price: 1199,
    instructor: {
      name: "Badam Sir",
      email: "support@badamclasses.com"
    },
    thumbnail: PHOOLBAGH_BATCH_IMAGE,
    category: "SSC",
    duration: "12 Months",
    batchTime: "08:00 AM",
    startDate: "May 12, 2026",
    liveClassEnabled: true,
    liveClassUrl: "https://www.youtube.com/channel/UC9KopMZXd5is7KvOzhamTYw/live",
    liveClassTitle: "Badam Singh Classes YouTube Live",
    ratingAverage: 4.8,
    ratingCount: 240,
    createdAt: "2026-04-28T00:00:00.000Z"
  },
  {
    _id: "udan-batch",
    id: "udan-batch",
    title: "Udaan Batch Combo (Maths + Reasoning)",
    description: "Focused SSC combo batch with live classes, recorded revision, and daily PDFs.",
    price: 1199,
    instructor: {
      name: "Badam Sir",
      email: "support@badamclasses.com"
    },
    thumbnail: GENERAL_COURSE_BANNER,
    category: "SSC",
    duration: "15 Months",
    batchTime: "07:00 AM",
    startDate: "May 15, 2026",
    ratingAverage: 4.8,
    ratingCount: 220,
    createdAt: "2026-04-27T00:00:00.000Z"
  },
  {
    _id: "arithmetic-special",
    id: "arithmetic-special",
    title: "Arithmetic Special (Recorded)",
    description: "Recorded arithmetic mastery batch with notes, booklets, and class PDFs.",
    price: 799,
    instructor: {
      name: "Badam Sir",
      email: "support@badamclasses.com"
    },
    thumbnail: RECORDED_BATCH_IMAGE,
    category: "SSC",
    duration: "8 Months",
    ratingAverage: 4.7,
    ratingCount: 180,
    createdAt: "2026-04-26T00:00:00.000Z"
  },
  {
    _id: "recorded-batch",
    id: "recorded-batch",
    title: "Recorded Batch",
    description: "Recorded lectures, PDF notes, and mock tests for self-paced preparation.",
    price: 599,
    instructor: {
      name: "Badam Sir",
      email: "support@badamclasses.com"
    },
    thumbnail: RECORDED_BATCH_IMAGE,
    category: "General",
    duration: "12 Months",
    ratingAverage: 4.6,
    ratingCount: 160,
    createdAt: "2026-04-25T00:00:00.000Z"
  },
  {
    _id: "mp-police",
    id: "mp-police",
    title: "MP Police Batch",
    description: "MP Police preparation batch with daily quizzes and doubt support.",
    price: 999,
    instructor: {
      name: "Ankit Sir",
      email: "support@badamclasses.com"
    },
    thumbnail: GENERAL_COURSE_BANNER,
    category: "State",
    duration: "8 Months",
    ratingAverage: 4.7,
    ratingCount: 140,
    createdAt: "2026-04-24T00:00:00.000Z"
  },
  {
    _id: "maths-special",
    id: "maths-special",
    title: "Maths Special Batch",
    description: "Complete arithmetic batch with practice sheets and weekly tests.",
    price: 999,
    instructor: {
      name: "Badam Sir",
      email: "support@badamclasses.com"
    },
    thumbnail: SSC_COMPLETE_IMAGE,
    category: "SSC",
    duration: "1 Year",
    ratingAverage: 4.8,
    ratingCount: 200,
    createdAt: "2026-04-23T00:00:00.000Z"
  },
  {
    _id: "reasoning-batch",
    id: "reasoning-batch",
    title: "Reasoning Batch",
    description: "Verbal and non-verbal reasoning batch with daily quizzes and practice.",
    price: 899,
    instructor: {
      name: "Badam Sir",
      email: "support@badamclasses.com"
    },
    thumbnail: GENERAL_COURSE_BANNER,
    category: "SSC",
    duration: "10 Months",
    ratingAverage: 4.7,
    ratingCount: 170,
    createdAt: "2026-04-22T00:00:00.000Z"
  },
  {
    _id: "ssc-complete",
    id: "ssc-complete",
    title: "SSC Complete Batch",
    description: "Full syllabus batch with concept videos, mocks, and structured guidance.",
    price: 4999,
    instructor: {
      name: "Amit Sir",
      email: "support@badamclasses.com"
    },
    thumbnail: SSC_COMPLETE_IMAGE,
    category: "SSC",
    duration: "12 Months",
    ratingAverage: 4.9,
    ratingCount: 260,
    createdAt: "2026-04-21T00:00:00.000Z"
  },
  {
    _id: "banking-foundation",
    id: "banking-foundation",
    title: "Banking Foundation Batch",
    description: "Banking basics, quants mastery, and daily quizzes for foundation prep.",
    price: 4299,
    instructor: {
      name: "Vikas Sir",
      email: "support@badamclasses.com"
    },
    thumbnail: GENERAL_COURSE_BANNER,
    category: "Banking",
    duration: "9 Months",
    ratingAverage: 4.8,
    ratingCount: 190,
    createdAt: "2026-04-20T00:00:00.000Z"
  }
];

export default fallbackCourses;
