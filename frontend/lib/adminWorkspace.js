const ADMIN_WORKSPACE_KEY = "badamclasses_admin_workspace";

const createId = (prefix) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const defaultSubjects = [
  {
    id: "subject-mathematics",
    name: "Mathematics",
    categories: [
      {
        id: "category-arithmetic",
        name: "Arithmetic",
        topics: [
          {
            id: "topic-percentage",
            name: "Percentage",
            classes: [
              {
                id: "class-percentage-1",
                title: "Percentage Basics",
                dateTime: "Mon to Sat, 7:00 PM",
                viewUrl: "https://example.com/math-percentage-live",
                pdfUrl: "https://example.com/math-percentage-pdf"
              },
              {
                id: "class-percentage-2",
                title: "Profit and Loss Foundation",
                dateTime: "Tue, 8:00 PM",
                viewUrl: "https://example.com/profit-loss-live",
                pdfUrl: "https://example.com/profit-loss-pdf"
              }
            ]
          },
          {
            id: "topic-ratio",
            name: "Ratio",
            classes: [
              {
                id: "class-ratio-1",
                title: "Ratio and Proportion Intro",
                dateTime: "Wed, 7:30 PM",
                viewUrl: "https://example.com/ratio-live",
                pdfUrl: "https://example.com/ratio-pdf"
              }
            ]
          }
        ]
      },
      {
        id: "category-advance",
        name: "Advance",
        topics: [
          {
            id: "topic-algebra",
            name: "Algebra",
            classes: [
              {
                id: "class-algebra-1",
                title: "Algebra Expressions",
                dateTime: "Thu, 9:00 PM",
                viewUrl: "https://example.com/algebra-live",
                pdfUrl: "https://example.com/algebra-pdf"
              }
            ]
          }
        ]
      }
    ]
  },
  {
    id: "subject-reasoning",
    name: "Reasoning",
    categories: [
      {
        id: "category-verbal",
        name: "Verbal",
        topics: [
          {
            id: "topic-series",
            name: "Series",
            classes: [
              {
                id: "class-series-1",
                title: "Alphabet Series",
                dateTime: "Fri, 6:30 PM",
                viewUrl: "https://example.com/series-live",
                pdfUrl: "https://example.com/series-pdf"
              }
            ]
          }
        ]
      },
      {
        id: "category-non-verbal",
        name: "Non-Verbal",
        topics: [
          {
            id: "topic-figure",
            name: "Figure Classification",
            classes: [
              {
                id: "class-figure-1",
                title: "Mirror and Water Image",
                dateTime: "Sat, 5:00 PM",
                viewUrl: "https://example.com/figure-live",
                pdfUrl: "https://example.com/figure-pdf"
              }
            ]
          }
        ]
      }
    ]
  },
  {
    id: "subject-english",
    name: "English",
    categories: [
      {
        id: "category-grammar",
        name: "Grammar",
        topics: [
          {
            id: "topic-tense",
            name: "Tense",
            classes: [
              {
                id: "class-tense-1",
                title: "Present Tense Mastery",
                dateTime: "Sun, 10:00 AM",
                viewUrl: "https://example.com/tense-live",
                pdfUrl: "https://example.com/tense-pdf"
              }
            ]
          }
        ]
      }
    ]
  },
  { id: "subject-gs", name: "GS", categories: [] },
  { id: "subject-science", name: "Science", categories: [] },
  { id: "subject-computer", name: "Computer", categories: [] }
];

const defaultUsers = [
  {
    id: "user-1",
    name: "Aman Verma",
    email: "aman@example.com",
    phone: "9876543210",
    role: "student",
    status: "active",
    batch: "Udaan Batch Combo (Maths + Reasoning)"
  },
  {
    id: "user-2",
    name: "Harish Sir",
    email: "harish@example.com",
    phone: "9123456780",
    role: "teacher",
    status: "active",
    batch: "Science"
  },
  {
    id: "user-3",
    name: "Ritika Sharma",
    email: "ritika@example.com",
    phone: "9988776655",
    role: "student",
    status: "blocked",
    batch: "Arithmetic Special (Recorded)"
  }
];

const defaultOrders = [
  {
    id: "order-101",
    student: "Aman Verma",
    course: "Udaan Batch Combo (Maths + Reasoning)",
    amount: 1199,
    status: "paid",
    provider: "Razorpay",
    createdAt: "2026-04-26"
  },
  {
    id: "order-102",
    student: "Ritika Sharma",
    course: "Arithmetic Special (Recorded)",
    amount: 799,
    status: "pending",
    provider: "PhonePe",
    createdAt: "2026-04-27"
  }
];

const defaultCoupons = [
  { id: "coupon-ssc20", code: "SSC20", discountType: "percent", discountValue: 20, status: "active" },
  { id: "coupon-batch100", code: "BATCH100", discountType: "flat", discountValue: 100, status: "inactive" }
];

const defaultNotifications = [
  {
    id: "notice-1",
    title: "New Maths Batch Live",
    message: "Arithmetic and Advance classes unlocked this week.",
    channel: "in-app",
    audience: "all"
  }
];

const defaultMedia = [
  { id: "media-1", name: "Homepage Banner", type: "image", url: "/new-batch-starts-2026.png", tag: "banner" },
  { id: "media-2", name: "Arithmetic Notes PDF", type: "pdf", url: "https://example.com/arithmetic.pdf", tag: "notes" }
];

const defaultMockTests = [
  {
    id: "mock-ssc-cgl-1",
    title: "SSC CGL Full Mock 1",
    examName: "SSC CGL",
    questions: 100,
    duration: "60 min",
    difficulty: "Medium",
    testUrl: "",
    fileName: "",
    status: "published"
  },
  {
    id: "mock-ssc-chsl-1",
    title: "SSC CHSL Tier-1 Mock",
    examName: "SSC CHSL",
    questions: 100,
    duration: "60 min",
    difficulty: "Medium",
    testUrl: "",
    fileName: "",
    status: "draft"
  }
];

const defaultSettings = {
  logoUrl: "/new-logo.png",
  bannerTitle: "Prepare Smarter with BadamClasses",
  seoTitle: "BadamClasses - Courses & Live Batches",
  seoDescription: "Manage courses, batches, tests, and learning content from the admin panel.",
  supportEmail: "support@badamclasses.com"
};

const defaultAutomation = {
  aiAutoApply: false,
  lastAppliedAt: "",
  lastAppliedFields: []
};

export const buildDefaultAdminWorkspace = () => ({
  users: defaultUsers,
  subjects: defaultSubjects,
  orders: defaultOrders,
  coupons: defaultCoupons,
  notifications: defaultNotifications,
  media: defaultMedia,
  mockTests: defaultMockTests,
  settings: defaultSettings,
  automation: defaultAutomation
});

export const readAdminWorkspace = () => {
  if (typeof window === "undefined") {
    return buildDefaultAdminWorkspace();
  }
  try {
    const raw = window.localStorage.getItem(ADMIN_WORKSPACE_KEY);
    if (!raw) {
      return buildDefaultAdminWorkspace();
    }
    return {
      ...buildDefaultAdminWorkspace(),
      ...JSON.parse(raw)
    };
  } catch {
    return buildDefaultAdminWorkspace();
  }
};

export const writeAdminWorkspace = (workspace) => {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(ADMIN_WORKSPACE_KEY, JSON.stringify(workspace));
};

export const adminWorkspaceKey = ADMIN_WORKSPACE_KEY;
export const createAdminId = createId;
