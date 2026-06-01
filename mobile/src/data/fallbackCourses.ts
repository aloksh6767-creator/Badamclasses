export type Course = {
  id: string;
  routeId?: string;
  title: string;
  instructor: string;
  duration: string;
  category: string;
  priceValue: number;
  offerPrice?: number;
  image?: string;
  liveClassEnabled?: boolean;
  liveClassUrl?: string;
  description?: string;
  highlights: string[];
};

export const fallbackCourses: Course[] = [
  {
    id: "phoolbagh-branch-new-batch-2026",
    routeId: "phoolbagh-branch-new-batch-2026",
    title: "Phoolbagh Branch New Batch 2.0",
    instructor: "Badam Sir",
    duration: "12 Months",
    category: "SSC",
    priceValue: 1199,
    liveClassEnabled: true,
    liveClassUrl: "https://www.youtube.com/channel/UC9KopMZXd5is7KvOzhamTYw/live",
    description: "SSC, Railway, SI, Police, MP Middle School Teacher aur competitive exams ke liye live + recorded course.",
    highlights: ["Live + recorded chapters", "Daily notes PDFs", "Bilingual study material", "Regular tests", "Personalized attention"]
  },
  {
    id: "udan-batch",
    routeId: "udan-batch",
    title: "Udaan Batch Combo",
    instructor: "Badam Sir",
    duration: "15 Months",
    category: "SSC",
    priceValue: 1199,
    highlights: ["Live + recorded classes", "Daily PDFs", "Bilingual support"]
  },
  {
    id: "arithmetic-special",
    routeId: "arithmetic-special",
    title: "Arithmetic Special",
    instructor: "Badam Sir",
    duration: "8 Months",
    category: "SSC",
    priceValue: 799,
    highlights: ["Recorded classes", "Notes and booklets", "Class PDFs"]
  },
  {
    id: "recorded-batch",
    routeId: "recorded-batch",
    title: "Recorded Batch",
    instructor: "Badam Sir",
    duration: "12 Months",
    category: "General",
    priceValue: 599,
    highlights: ["Recorded lectures", "PDF notes", "Mock tests"]
  },
  {
    id: "mp-police",
    routeId: "mp-police",
    title: "MP Police Batch",
    instructor: "Ankit Sir",
    duration: "8 Months",
    category: "State",
    priceValue: 999,
    highlights: ["Physical + written prep", "Daily quizzes", "Doubt support"]
  }
];

export const homeStats = [
  { label: "Students Trust Us", value: "50,000+" },
  { label: "Video Lectures", value: "500+" },
  { label: "Test Attempts", value: "10,000+" },
  { label: "Success Rate", value: "95%" }
];

export const mockTests = [
  { id: "ssc-cgl-free", title: "SSC CGL Free Mock Test", questions: 100, duration: "60 min" },
  { id: "railway-ntpc", title: "Railway NTPC Practice Test", questions: 80, duration: "45 min" },
  { id: "mp-police", title: "MP Police Foundation Test", questions: 100, duration: "90 min" }
];
