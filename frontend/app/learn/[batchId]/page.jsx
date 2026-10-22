"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import PdfViewer from "@/components/PdfViewer";
import { apiFetch } from "@/lib/api";
import { getToken, getUser, isAdminUser } from "@/lib/auth";
import { resolveCourseImage } from "@/lib/courseImages";
import { buildCourseRouteId, matchCourseByRoute, normalizeCourseForRoute } from "@/lib/courseIdentity";
import { batches } from "@/lib/fixtures";
import { filterDeletedCourses, filterDeletedCoursesFromStorage, readLocalCourses } from "@/lib/localCourseState";
import { buildChapterMocksForBatch, buildTypeWiseMocksForBatch, enrichMockTests, mockMatchesBatch } from "@/lib/mockQuestionFilters";
import { hasLocalPurchase } from "@/lib/purchaseState";

const tabs = ["Classes", "Sheets", "Tests"];

function sanitizeExternalUrl(value) {
  const raw = String(value || "").trim();
  if (!raw || !/^https?:\/\//i.test(raw)) return "";
  try {
    return new URL(raw).href;
  } catch {
    return "";
  }
}

function hasRemoteAccess(enrollments = [], course = {}) {
  const courseKeys = buildAccessKeys(course);

  return enrollments.some((item) => {
    const enrollmentKeys = [
      item?.courseRouteId,
      item?.courseId,
      item?.id,
      item?.course?._id,
      item?.course?.id,
      item?.course?.routeId,
      item?.course?.slug,
      item?.course?.routeSlug,
      item?.course ? buildCourseRouteId(item.course) : "",
      item?.course?.title,
      item?.courseTitle
    ].map(normalizeAccessKey).filter(Boolean);
    return enrollmentKeys.some((key) => courseKeys.includes(key));
  });
}

function normalizeAccessKey(value = "") {
  return String(value || "").trim().toLowerCase();
}

function buildAccessKeys(course = {}) {
  return Array.from(new Set([
    course.routeId,
    course._id,
    course.id,
    course.slug,
    course.routeSlug,
    course.title,
    buildCourseRouteId(course)
  ].map(normalizeAccessKey).filter(Boolean)));
}

function normalizeBatch(batch, index) {
  return normalizeCourseForRoute(
    {
      _id: batch.id,
      id: batch.id,
      slug: batch.id,
      title: batch.title,
      instructor: batch.instructor,
      price: batch.priceValue,
      priceValue: batch.priceValue,
      image: batch.image,
      thumbnail: batch.image,
      duration: batch.duration,
      category: batch.category,
      batchTime: batch.batchTime,
      startDate: batch.startDate,
      classTiming: batch.classTiming,
      liveClassEnabled: Boolean(batch.liveClassEnabled),
      liveClassUrl: batch.liveClassUrl,
      liveClassTitle: batch.liveClassTitle,
      classSections: batch.classSections || [],
      pdfResources: batch.pdfResources || [],
      tests: batch.tests || []
    },
    index
  );
}

function normalizeClassItems(items = []) {
  return (Array.isArray(items) ? items : [])
    .map((item, index) => ({
      id: item?.id || `${String(item?.title || "class").toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${index}`,
      title: item?.title || `Class ${index + 1}`,
      subtitle: item?.subtitle || item?.dateTime || "Class material will be updated",
      dateTime: item?.dateTime || item?.subtitle || "",
      note: item?.note || item?.update || item?.importantUpdate || item?.updateMessage || "",
      href: sanitizeExternalUrl(item?.href || item?.viewUrl),
      pdfUrl: sanitizeExternalUrl(item?.pdfUrl || item?.pdf || item?.notesUrl),
      actionLabel: item?.actionLabel || (item?.href ? "Open Class" : "Coming Soon")
    }))
    .filter((item) => item.title || item.href || item.pdfUrl);
}

function autoClassSections(course = {}) {
  const title = course.title || "Batch";
  const schedule = course.classTiming || course.batchTime || "Schedule will be updated";
  const category = String(course.category || course.subject || "").toLowerCase();

  const makeItem = (itemTitle, subtitle) => ({
    title: `${title} ${itemTitle}`,
    subtitle: `${schedule} | ${subtitle}`,
    note: "Class timing and important updates will appear here.",
    href: "",
    pdfUrl: "",
    actionLabel: "Coming Soon"
  });

  if (category.includes("ssc") || String(title).toLowerCase().includes("ssc")) {
    return [
      { title: "Arithmetic", items: [makeItem("Number System", "Foundation class"), makeItem("Percentage", "Advance practice")] },
      { title: "Advance", items: [makeItem("Geometry", "Concept class"), makeItem("Mensuration", "Practice session")] },
      { title: "Reasoning", items: [makeItem("Series", "Daily practice")] },
      { title: "English", items: [makeItem("Grammar", "Vocabulary + rules")] }
    ];
  }

  return [
    { title: "Core Classes", items: [makeItem("Main Session", "Class access"), makeItem("Practice Session", "Revision")] },
    { title: "Sheets", items: [makeItem("Daily Sheet", "PDF notes")] },
    { title: "Tests", items: [makeItem("Weekly Test", "Practice test")] }
  ];
}

function normalizeClassSections(course = {}) {
  const source = Array.isArray(course.classSections) && course.classSections.length
    ? course.classSections
    : autoClassSections(course);

  return source
    .map((section, index) => ({
      id: section?.id || `${String(section?.title || "section").toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${index}`,
      title: section?.title || `Section ${index + 1}`,
      items: normalizeClassItems(section?.items || [])
    }))
    .filter((section) => section.items.length);
}

function normalizePdfs(items = []) {
  return (Array.isArray(items) ? items : [])
    .map((item, index) => {
      const url = sanitizeExternalUrl(item?.url || item?.pdfUrl || item?.href);
      if (!url) return null;
      return {
        id: item?.id || `pdf-${index}`,
        title: item?.title || `Sheet ${index + 1}`,
        url
      };
    })
    .filter(Boolean);
}

function buildWeeklyMocksForBatch(tests = [], course = {}) {
  return enrichMockTests(tests)
    .filter((test) => mockMatchesBatch(test, course))
    .map((test) => {
      const questions = Array.isArray(test.questions) ? test.questions : [];
      const primarySubject = questions[0]?.subject || test.subject || "Mixed Practice";
      return {
        title: `${test.mockGroupTitle || test.title || primarySubject} Weekly Mock`,
        subject: primarySubject,
        chapter: "Weekly Mocks",
        topic: "Weekly Practice",
        subtopic: test.title || "Mixed Practice",
        kind: "weekly",
        duration: "Weekly timer",
        status: `${questions.length} questions | Weekly Practice`,
        label: "Start Weekly Mock",
        href: `/mock-tests/free-practice?test=${encodeURIComponent(test.id || test.title)}`,
        questionCount: questions.length
      };
    })
    .filter((mock) => mock.questionCount >= 5)
    .slice(0, 12);
}

function defaultTests(course = {}, chapterMocks = [], typeWiseMocks = [], weeklyMocks = []) {
  if (chapterMocks.length || typeWiseMocks.length || weeklyMocks.length) {
    return [
      ...chapterMocks.map((mock) => ({
        title: mock.title,
        subject: mock.subject || "",
        chapter: mock.chapter || mock.topic || "Revision",
        topic: mock.topic || mock.chapter || "Revision",
        subtopic: mock.subtopic || "Full Chapter Revision",
        kind: "chapter",
        duration: mock.duration,
        status: `${mock.questions} questions | ${mock.topic}`,
        label: "Start Chapter Mock",
        href: `/mock-tests/free-practice?test=all-pdf-questions&subject=${encodeURIComponent(mock.subject || "")}&topic=${encodeURIComponent(mock.topic || "")}&chapter=${encodeURIComponent(mock.chapter)}`
      })),
      ...typeWiseMocks.map((mock) => ({
        title: mock.title,
        subject: mock.subject || "",
        chapter: mock.chapter || mock.topic || "Maths",
        topic: mock.topic || mock.chapter || "Maths",
        subtopic: mock.subtopic || mock.topic || mock.chapter || "Topic Practice",
        kind: "topic",
        duration: mock.duration,
        status: `${mock.questions} questions | ${mock.subtopic}`,
        label: "Start Type Mock",
        href: `/mock-tests/free-practice?test=all-pdf-questions&subject=${encodeURIComponent(mock.subject || "")}&topic=${encodeURIComponent(mock.topic || "")}&subtopic=${encodeURIComponent(mock.subtopic || "")}&chapter=${encodeURIComponent(mock.chapter || "")}`
      })),
      ...weeklyMocks
    ];
  }
  return Array.isArray(course.tests) && course.tests.length
    ? course.tests
    : [
        { title: "Chapter Practice Test", duration: "30 mins", status: "Available soon" },
        { title: "Weekly Mock Test", duration: "60 mins", status: "Available soon" },
        { title: "Full Syllabus Test", duration: "120 mins", status: "Available soon" }
      ];
}

function normalizeSubjectFolder(subject = "") {
  const value = String(subject || "").trim();
  const key = value.toLowerCase();
  if (key.includes("math")) return "Maths";
  if (key.includes("reason")) return "Reasoning";
  if (
    key.includes("general awareness") ||
    key.includes("general science") ||
    key.includes("science") ||
    key.includes("static") ||
    key.includes("gk") ||
    key.includes("history") ||
    key.includes("geography") ||
    key.includes("polity") ||
    key.includes("economics") ||
    key.includes("current")
  ) {
    return "GS";
  }
  if (key.includes("english")) return "English";
  if (key.includes("computer")) return "Computer";
  return value || "Mixed Practice";
}

function detectSubjectFoldersFromText(text = "") {
  const value = String(text || "").toLowerCase();
  const folders = new Set();
  if (value.includes("math")) folders.add("Maths");
  if (value.includes("reason")) folders.add("Reasoning");
  if (
    value.includes("gs") ||
    value.includes("gk") ||
    value.includes("general awareness") ||
    value.includes("general science") ||
    value.includes("science") ||
    value.includes("history") ||
    value.includes("geography") ||
    value.includes("polity") ||
    value.includes("economics") ||
    value.includes("current")
  ) {
    folders.add("GS");
  }
  if (value.includes("english")) folders.add("English");
  if (value.includes("computer")) folders.add("Computer");
  return folders;
}

function courseSubjectFolders(course = {}) {
  const sources = [
    course.subject,
    course.includesMaths ? "Maths" : "",
    course.title,
    course.category,
    ...(Array.isArray(course.classSections) ? course.classSections.map((section) => section.title || section.name) : [])
  ];
  const folders = new Set();
  sources.forEach((source) => {
    detectSubjectFoldersFromText(source).forEach((folder) => folders.add(folder));
  });
  return Array.from(folders);
}

function subjectMatchesCourse(subjectTitle = "", allowedFolders = []) {
  if (!allowedFolders.length) return true;
  return allowedFolders.includes(subjectTitle);
}

function groupTestsBySubjectChapter(tests = [], course = {}) {
  const subjects = new Map();
  const allowedFolders = courseSubjectFolders(course);

  tests.forEach((test, index) => {
    const subjectTitle = normalizeSubjectFolder(test.subject || test.topic || test.chapter);
    if (!subjectMatchesCourse(subjectTitle, allowedFolders)) return;
    const subject = subjects.get(subjectTitle) || {
      id: `${subjectTitle.toLowerCase().replace(/[^a-z0-9]+/g, "-") || "subject"}-${subjects.size}`,
      title: subjectTitle,
      chapterCount: 0,
      mockCount: 0,
      questionCount: 0,
      chapters: new Map()
    };
    const chapterTitle = test.chapter || test.topic || test.title || "Practice Tests";
    const chapter = subject.chapters.get(chapterTitle) || {
      id: `${chapterTitle.toLowerCase().replace(/[^a-z0-9]+/g, "-") || "chapter"}-${subject.chapters.size}`,
      title: chapterTitle,
      topicCount: 0,
      questionCount: 0,
      tests: []
    };
    const questionMatch = String(test.status || "").match(/(\d+)\s+questions/i);
    const questionCount = questionMatch ? Number(questionMatch[1]) : 0;

    chapter.topicCount += test.kind === "topic" ? 1 : 0;
    chapter.questionCount += questionCount;
    chapter.tests.push({ ...test, sortIndex: index });
    subject.mockCount += 1;
    subject.questionCount += questionCount;
    subject.chapters.set(chapterTitle, chapter);
    subjects.set(subjectTitle, subject);
  });

  return Array.from(subjects.values())
    .map((subject) => {
      const chapters = Array.from(subject.chapters.values())
        .map((chapter) => ({
          ...chapter,
          tests: chapter.tests.sort((a, b) => {
            if (a.kind === b.kind) return a.sortIndex - b.sortIndex;
            const priority = { chapter: 0, topic: 1, weekly: 2 };
            return (priority[a.kind] ?? 3) - (priority[b.kind] ?? 3);
          })
        }))
        .sort((a, b) => b.questionCount - a.questionCount || a.title.localeCompare(b.title));
      return {
        ...subject,
        chapterCount: chapters.length,
        chapters
      };
    })
    .sort((a, b) => {
      const priority = { Maths: 0, GS: 1, Reasoning: 2, English: 3, Computer: 4 };
      return (priority[a.title] ?? 10) - (priority[b.title] ?? 10) || b.questionCount - a.questionCount || a.title.localeCompare(b.title);
    });
}

function ScheduleIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
      <path d="M7.25 3.5v3M16.75 3.5v3" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      <path d="M5.75 5h12.5A2.25 2.25 0 0 1 20.5 7.25v10.5A2.25 2.25 0 0 1 18.25 20H5.75A2.25 2.25 0 0 1 3.5 17.75V7.25A2.25 2.25 0 0 1 5.75 5Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
      <path d="M4 9h16" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      <path d="M12 12.25v2.5l1.75 1" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="12" cy="14.5" r="4" stroke="currentColor" strokeWidth="1.7" />
    </svg>
  );
}

export default function LearnBatchPage() {
  const params = useParams();
  const router = useRouter();
  const batchId = params?.batchId || "";
  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [access, setAccess] = useState("checking");
  const [activeTab, setActiveTab] = useState("Classes");
  const [openSection, setOpenSection] = useState("");
  const [openTestSubject, setOpenTestSubject] = useState("");
  const [openTestChapter, setOpenTestChapter] = useState("");
  const [selectedPdf, setSelectedPdf] = useState(null);
  const [pdfMockTests, setPdfMockTests] = useState([]);

  const fallbackCourses = useMemo(() => filterDeletedCourses(batches).map(normalizeBatch), []);

  useEffect(() => {
    let cancelled = false;

    const loadCourse = async () => {
      setLoading(true);
      const localCourses = filterDeletedCoursesFromStorage(readLocalCourses()).map((item, index) =>
        normalizeCourseForRoute({ ...item, image: resolveCourseImage(item), thumbnail: resolveCourseImage(item) }, index)
      );
      const fallbackMatch = matchCourseByRoute([...localCourses, ...fallbackCourses], batchId);
      if (fallbackMatch && !cancelled) setCourse(fallbackMatch);

      try {
        const data = await apiFetch(`/courses/${encodeURIComponent(batchId)}`);
        const remoteCourse = normalizeCourseForRoute(data?.course || data);
        if (!cancelled) setCourse({ ...fallbackMatch, ...remoteCourse });
      } catch {
        if (!fallbackMatch && !cancelled) setCourse(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadCourse();
    return () => {
      cancelled = true;
    };
  }, [batchId, fallbackCourses]);

  useEffect(() => {
    let cancelled = false;

    const checkAccess = async () => {
      if (!course) return;
      const redirectPath = `/learn/${encodeURIComponent(batchId)}`;
      const user = getUser();
      const token = getToken();

      if (!user || !token) {
        setAccess("denied");
        router.replace(`/login?redirect=${encodeURIComponent(redirectPath)}`);
        return;
      }

      if (isAdminUser(user) || hasLocalPurchase(course)) {
        setAccess("allowed");
        return;
      }

      try {
        const [enrollmentResult, dashboardResult] = await Promise.allSettled([
          apiFetch("/enrollments/my"),
          apiFetch("/student/dashboard")
        ]);
        const enrollments = enrollmentResult.status === "fulfilled" && Array.isArray(enrollmentResult.value)
          ? enrollmentResult.value
          : [];
        const dashboardEnrollments =
          dashboardResult.status === "fulfilled" && Array.isArray(dashboardResult.value?.purchasedCourses)
            ? dashboardResult.value.purchasedCourses
            : [];
        const allowed = hasRemoteAccess([...enrollments, ...dashboardEnrollments], course);
        if (cancelled) return;
        setAccess(allowed ? "allowed" : "denied");
        if (!allowed) {
          router.replace(`/courses/${encodeURIComponent(course.routeId || batchId)}`);
        }
      } catch {
        if (cancelled) return;
        setAccess("denied");
        router.replace(`/courses/${encodeURIComponent(course.routeId || batchId)}`);
      }
    };

    checkAccess();
    return () => {
      cancelled = true;
    };
  }, [batchId, course, router]);

  useEffect(() => {
    let cancelled = false;

    const loadPdfMocks = async () => {
      let tests = [];
      try {
        const runtime = await apiFetch(`/course-mocks/courses/${encodeURIComponent(course?.routeId || batchId)}`);
        tests = Array.isArray(runtime?.mockTests) ? runtime.mockTests : [];
      } catch {
        try {
          const response = await fetch("/mock-pdfs/mock-question-bank.json");
          const data = await response.json();
          tests = Array.isArray(data) ? data : [];
        } catch {
          tests = [];
        }
      }

      if (!cancelled) {
        setPdfMockTests(enrichMockTests(tests));
      }
    };

    loadPdfMocks();
    return () => {
      cancelled = true;
    };
  }, [batchId, course]);

  const classSections = useMemo(() => normalizeClassSections(course || {}), [course]);
  const pdfResources = useMemo(() => normalizePdfs(course?.pdfResources || []), [course]);
  const chapterMocks = useMemo(() => buildChapterMocksForBatch(pdfMockTests, course || {}), [course, pdfMockTests]);
  const typeWiseMocks = useMemo(() => buildTypeWiseMocksForBatch(pdfMockTests, course || {}), [course, pdfMockTests]);
  const weeklyMocks = useMemo(() => buildWeeklyMocksForBatch(pdfMockTests, course || {}), [course, pdfMockTests]);
  const tests = useMemo(() => defaultTests(course || {}, chapterMocks, typeWiseMocks, weeklyMocks), [chapterMocks, course, typeWiseMocks, weeklyMocks]);
  const testSubjects = useMemo(() => groupTestsBySubjectChapter(tests, course || {}), [course, tests]);
  const activeTestSubject = testSubjects.find((subject) => subject.id === openTestSubject) || testSubjects[0] || null;
  const activeTestChapter = activeTestSubject?.chapters.find((chapter) => chapter.id === openTestChapter) || activeTestSubject?.chapters[0] || null;
  const featuredClasses = useMemo(() => classSections.flatMap((section) => section.items.map((item) => ({ ...item, section: section.title }))).slice(0, 8), [classSections]);

  useEffect(() => {
    setOpenSection(classSections[0]?.id || "");
  }, [classSections]);

  useEffect(() => {
    setOpenTestSubject(testSubjects[0]?.id || "");
  }, [testSubjects]);

  useEffect(() => {
    setOpenTestChapter(activeTestSubject?.chapters[0]?.id || "");
  }, [activeTestSubject]);

  if (loading || access === "checking") {
    return (
      <main className="mx-auto w-[92%] max-w-6xl py-10 text-slate-100">
        <div className="rounded-[30px] border border-white/10 bg-[#0b1634]/80 p-8">Loading batch access...</div>
      </main>
    );
  }

  if (!course) {
    return (
      <main className="mx-auto w-[92%] max-w-5xl py-10 text-slate-100">
        <div className="rounded-[28px] border border-white/10 bg-[#0b1634]/80 p-8 text-center">
          <h1 className="font-display text-3xl text-white">Batch not found</h1>
          <Link href="/courses" className="mt-5 inline-flex rounded-xl bg-orange-500 px-5 py-3 text-sm font-semibold text-white">
            Browse Courses
          </Link>
        </div>
      </main>
    );
  }

  if (access !== "allowed") {
    return (
      <main className="mx-auto w-[92%] max-w-5xl py-10 text-slate-100">
        <div className="rounded-[28px] border border-orange-300/30 bg-orange-500/10 p-8 text-center">
          Checking enrollment and redirecting...
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-[1440px] overflow-x-clip px-3 py-4 text-slate-100 sm:w-[94%] sm:px-0 sm:py-6 md:py-10">
      <section className="overflow-hidden rounded-[22px] border border-white/10 bg-[#071023] sm:rounded-[28px] lg:rounded-[34px] shadow-[0_28px_90px_rgba(2,6,23,0.45)]">
        <div className="grid min-w-0 gap-0 lg:grid-cols-[320px_minmax(0,1fr)] xl:grid-cols-[350px_minmax(0,1fr)]">
          <div className="relative min-h-[250px] overflow-hidden bg-slate-950 sm:min-h-[290px] lg:min-h-[680px]">
            <img src={resolveCourseImage(course)} alt={course.title} className="absolute inset-0 h-full w-full object-cover opacity-50" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#071023] via-[#071023]/70 to-transparent" />
            <div className="relative z-10 flex h-full min-h-[250px] flex-col justify-end p-5 sm:min-h-[290px] sm:p-6 lg:min-h-[680px]">
              <p className="text-xs font-bold uppercase tracking-[0.28em] text-orange-300">Purchased Batch</p>
              <h1 className="mt-2 font-display text-3xl leading-tight text-white sm:mt-3 sm:text-4xl">{course.title}</h1>
              <p className="mt-3 text-sm text-slate-200">Instructor: {course.instructor?.name || course.instructor || "BadamClasses"}</p>
              <div className="mt-5 flex flex-wrap gap-2">
                {course.liveClassEnabled ? (
                  <Link href={`/live/${encodeURIComponent(course.routeId || batchId)}`} className="rounded-xl bg-red-500 px-4 py-2 text-sm font-semibold text-white">
                    Join Live
                  </Link>
                ) : null}
                <Link href={`/courses/${encodeURIComponent(course.routeId || batchId)}?details=1`} className="rounded-xl border border-white/20 px-4 py-2 text-sm font-semibold text-white">
                  View Details
                </Link>
              </div>
            </div>
          </div>

          <div className="min-w-0 overflow-hidden p-4 sm:p-5 md:p-7 lg:p-8">
            <div className="grid grid-cols-3 gap-2 sm:flex sm:flex-wrap sm:gap-3">
              {tabs.map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActiveTab(tab)}
                  className={`min-w-0 rounded-xl px-2 py-2.5 text-sm font-semibold transition sm:rounded-2xl sm:px-5 sm:py-3 sm:text-base ${
                    activeTab === tab
                      ? "bg-white text-slate-950"
                      : "border border-white/15 bg-white/[0.04] text-white hover:border-orange-300/60"
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            {activeTab === "Classes" ? (
              <div className="mt-6">
                <h2 className="text-2xl font-semibold text-white">Classes</h2>
                <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {featuredClasses.map((item) => (
                    <article key={`${item.section}-${item.id}`} className="relative flex min-h-[200px] min-w-0 flex-col rounded-[18px] border sm:min-h-[220px] sm:rounded-[22px] border-white/10 bg-[#121f40] p-4 pr-14 transition sm:p-5 sm:pr-16 hover:border-orange-300/30 hover:bg-[#16264d]">
                      <details className="group absolute right-4 top-4 z-10">
                        <summary
                          className="flex h-10 w-10 cursor-pointer list-none items-center justify-center rounded-full border border-amber-300/35 bg-amber-400/15 text-amber-100 transition hover:border-amber-200 hover:bg-amber-400/25 [&::-webkit-details-marker]:hidden"
                          aria-label={`${item.title} timing and important update`}
                          title="Schedule and important update"
                        >
                          <ScheduleIcon className="h-5 w-5" />
                        </summary>
                        <div className="absolute right-0 top-12 w-[min(16rem,calc(100vw-3rem))] rounded-2xl border border-amber-300/30 bg-[#091224] p-4 text-left shadow-[0_18px_48px_rgba(2,8,23,0.55)]">
                          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-amber-200">Schedule / Update</p>
                          <p className="mt-2 text-sm font-semibold leading-5 text-white">{item.dateTime || item.subtitle || "Timing will be updated soon."}</p>
                          <p className="mt-2 text-xs leading-5 text-slate-300">
                            {item.note || "No important update yet. New notice will appear here."}
                          </p>
                        </div>
                      </details>
                      <p className="text-xs uppercase tracking-[0.22em] text-orange-300">{item.section}</p>
                      <h3 className="mt-3 break-words text-lg font-semibold leading-6 text-white sm:text-xl">{item.title}</h3>
                      <p className="mt-2 text-sm leading-6 text-slate-300">{item.subtitle}</p>
                      {item.href ? (
                        <a href={item.href} target="_blank" rel="noreferrer" className="mt-4 inline-flex rounded-xl border border-orange-300/40 bg-orange-500/10 px-4 py-2 text-sm font-semibold text-orange-100">
                          {item.actionLabel}
                        </a>
                      ) : item.pdfUrl ? (
                        <button type="button" onClick={() => setSelectedPdf({ title: item.title, url: item.pdfUrl })} className="mt-4 inline-flex rounded-xl border border-orange-300/40 bg-orange-500/10 px-4 py-2 text-sm font-semibold text-orange-100">
                          Open Sheet
                        </button>
                      ) : (
                        <span className="mt-4 inline-flex rounded-xl border border-white/10 px-4 py-2 text-sm text-slate-400">
                          {item.actionLabel}
                        </span>
                      )}
                    </article>
                  ))}
                </div>

                <div className="mt-5 grid gap-3">
                  {classSections.map((section) => (
                    <div key={section.id} className="overflow-visible rounded-2xl border border-white/10 bg-[#0b1328]">
                      <button
                        type="button"
                        onClick={() => setOpenSection((current) => (current === section.id ? "" : section.id))}
                        className="flex w-full items-center justify-between gap-3 px-4 py-4 text-left sm:gap-4 sm:px-5"
                      >
                        <span className="text-base font-semibold text-white sm:text-lg">{section.title}</span>
                        <span className="text-orange-300">{openSection === section.id ? "Close" : "Open"}</span>
                      </button>
                      {openSection === section.id ? (
                        <div className="grid gap-3 border-t border-white/10 p-4 md:grid-cols-2">
                          {section.items.map((item) => (
                            <div key={item.id} className="flex items-start justify-between gap-3 rounded-xl bg-white/[0.045] p-4">
                              <div>
                                <h3 className="font-semibold text-white">{item.title}</h3>
                                <p className="mt-1 text-sm text-slate-300">{item.subtitle}</p>
                              </div>
                              <details className="group relative shrink-0">
                                <summary
                                  className="flex h-9 w-9 cursor-pointer list-none items-center justify-center rounded-full border border-amber-300/35 bg-amber-400/15 text-amber-100 transition hover:border-amber-200 hover:bg-amber-400/25 [&::-webkit-details-marker]:hidden"
                                  aria-label={`${item.title} timing and important update`}
                                  title="Schedule and important update"
                                >
                                  <ScheduleIcon className="h-4 w-4" />
                                </summary>
                                <div className="absolute right-0 top-11 z-20 w-[min(16rem,calc(100vw-3rem))] rounded-2xl border border-amber-300/30 bg-[#091224] p-4 text-left shadow-[0_18px_48px_rgba(2,8,23,0.55)]">
                                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-amber-200">Schedule / Update</p>
                                  <p className="mt-2 text-sm font-semibold leading-5 text-white">{item.dateTime || item.subtitle || "Timing will be updated soon."}</p>
                                  <p className="mt-2 text-xs leading-5 text-slate-300">
                                    {item.note || "No important update yet. New notice will appear here."}
                                  </p>
                                </div>
                              </details>
                            </div>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {activeTab === "Sheets" ? (
              <div className="mt-6">
                <h2 className="text-2xl font-semibold text-white">Sheets</h2>
                {pdfResources.length ? (
                  <div className="mt-4 grid gap-3">
                    {pdfResources.map((pdf) => (
                      <div key={pdf.id} className="flex flex-col justify-between gap-3 rounded-2xl border border-white/10 bg-[#152349] p-4 md:flex-row md:items-center">
                        <div>
                          <h3 className="font-semibold text-white">{pdf.title}</h3>
                          <p className="text-sm text-slate-300">Batch PDF sheet</p>
                        </div>
                        <button type="button" onClick={() => setSelectedPdf(pdf)} className="rounded-xl border border-orange-300/40 bg-orange-500/10 px-4 py-2 text-sm font-semibold text-orange-100">
                          Open PDF
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="mt-4 rounded-2xl border border-dashed border-white/15 bg-[#152349] p-6 text-slate-300">
                    Sheets will appear here after upload.
                  </div>
                )}
              </div>
            ) : null}

            {activeTab === "Tests" ? (
              <div className="mt-7">
                <div className="mb-6">
                  <p className="text-xs font-bold uppercase tracking-[0.24em] text-cyan-300">Practice Centre</p>
                  <h2 className="mt-2 text-3xl font-bold tracking-tight text-white">Tests</h2>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
                    Choose a subject and chapter, then start a focused mock aligned with your course.
                  </p>
                </div>

                <div className="grid min-w-0 overflow-hidden rounded-[18px] border border-white/10 sm:rounded-[24px] bg-[#081226]/90 shadow-[0_24px_70px_rgba(2,8,23,0.32)] lg:grid-cols-[260px_minmax(300px,0.9fr)_minmax(360px,1.2fr)]">
                  <aside className="min-w-0 border-b border-white/10 bg-[#07101f]/80 p-3 sm:p-4 lg:border-b-0 lg:border-r">
                    <p className="mb-3 px-2 text-[11px] font-bold uppercase tracking-[0.24em] text-cyan-300">Subjects</p>
                    <div className="space-y-1.5">
                      {testSubjects.map((subject) => (
                        <button
                          key={subject.id}
                          type="button"
                          onClick={() => setOpenTestSubject(subject.id)}
                          className={`group w-full rounded-xl border px-4 py-3.5 text-left transition duration-200 ${
                            activeTestSubject?.id === subject.id
                              ? "border-cyan-300/60 bg-cyan-400/[0.12] text-white shadow-[inset_3px_0_0_#22d3ee]"
                              : "border-transparent text-slate-300 hover:border-white/10 hover:bg-white/[0.04] hover:text-white"
                          }`}
                        >
                          <span className="block text-sm font-semibold">{subject.title} Mock Folder</span>
                          <span className="mt-1.5 block text-xs text-slate-400">
                            {subject.chapterCount} chapters <span className="px-1 text-slate-600">Ã¢â‚¬Â¢</span> {subject.mockCount} mocks
                          </span>
                        </button>
                      ))}
                    </div>
                  </aside>

                  <section className="min-w-0 border-b border-white/10 p-3 sm:p-4 lg:border-b-0 lg:border-r lg:p-5">
                    <div className="border-b border-white/10 pb-4">
                      <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-cyan-300">
                        Chapters in {activeTestSubject?.title || "Subject"} Mock Folder
                      </p>
                      <h3 className="mt-2 text-xl font-semibold text-white">Select a chapter</h3>
                    </div>
                    <div className="mt-2 max-h-[560px] space-y-1 overflow-y-auto pr-1 [scrollbar-color:#334155_transparent] [scrollbar-width:thin]">
                      {(activeTestSubject?.chapters || []).map((chapter) => (
                        <button
                          key={chapter.id}
                          type="button"
                          onClick={() => setOpenTestChapter(chapter.id)}
                          className={`flex w-full items-center justify-between gap-4 rounded-xl border px-4 py-4 text-left transition duration-200 ${
                            activeTestChapter?.id === chapter.id
                              ? "border-orange-300/50 bg-orange-400/[0.10] text-white shadow-[inset_3px_0_0_#fb923c]"
                              : "border-transparent text-slate-300 hover:border-white/10 hover:bg-white/[0.04] hover:text-white"
                          }`}
                        >
                          <span className="min-w-0">
                            <span className="block truncate text-sm font-semibold">{chapter.title}</span>
                            <span className="mt-1.5 block text-xs text-slate-400">
                              {chapter.tests.length} mocks <span className="px-1 text-slate-600">Ã¢â‚¬Â¢</span> {chapter.questionCount || 0} questions
                            </span>
                          </span>
                              <span aria-hidden="true">&rsaquo;</span>
                        </button>
                      ))}
                    </div>
                  </section>

                  <section className="min-w-0 p-3 sm:p-4 lg:p-6">
                    <div className="flex flex-col gap-2 border-b border-white/10 pb-5 sm:flex-row sm:items-end sm:justify-between">
                      <div>
                        <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-orange-300">
                          {activeTestSubject?.title || "Subject"} / Selected Chapter
                        </p>
                        <h3 className="mt-2 text-2xl font-semibold text-white">{activeTestChapter?.title || "Practice Tests"}</h3>
                      </div>
                      <p className="max-w-xs text-sm leading-5 text-slate-400">Choose the mock format that fits your current practice goal.</p>
                    </div>

                    <div className="mt-5 grid gap-4 xl:grid-cols-2">
                      {(activeTestChapter?.tests || []).map((test, index) => (
                        <article
                          key={`${test.title}-${test.href || test.sortIndex}`}
                          className={`flex min-h-[250px] flex-col rounded-2xl border p-5 transition duration-200 ${
                            index === 0
                              ? "border-orange-300/35 bg-[#13234a] shadow-[inset_3px_0_0_#fb923c]"
                              : "border-cyan-300/25 bg-[#10203f] shadow-[inset_3px_0_0_#22d3ee]"
                          }`}
                        >
                          <p className={`text-[11px] font-bold uppercase tracking-[0.22em] ${index === 0 ? "text-orange-300" : "text-cyan-300"}`}>
                            {test.kind === "chapter" ? "Chapter Mock" : test.kind === "weekly" ? "Weekly Mock" : "Type Mock"}
                          </p>
                          <h4 className="mt-4 text-xl font-semibold leading-7 text-white">{test.title}</h4>
                          <div className="mt-4 space-y-2 text-sm text-slate-300">
                            <p>Duration <span className="ml-1 font-medium text-white">{test.duration || "Flexible"}</span></p>
                            <p className={index === 0 ? "text-orange-200" : "text-cyan-200"}>{test.status || "Available soon"}</p>
                          </div>
                          {test.href ? (
                            <Link
                              href={test.href}
                              target="_blank"
                              className={`mt-auto inline-flex items-center justify-between rounded-xl border px-4 py-3 text-sm font-semibold transition ${
                                index === 0
                                  ? "border-cyan-300/45 bg-cyan-400/[0.12] text-cyan-50 hover:bg-cyan-400/20"
                                  : "border-cyan-300/35 text-cyan-100 hover:bg-cyan-400/[0.10]"
                              }`}
                            >
                              <span>{test.label || "Start Mock"}</span>
                              <span aria-hidden="true">&rsaquo;</span>
                            </Link>
                          ) : (
                            <span className="mt-auto text-sm text-slate-500">Available soon</span>
                          )}
                        </article>
                      ))}
                    </div>
                  </section>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </section>

      {selectedPdf ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-2 sm:p-4 backdrop-blur-sm">
          <div className="flex h-[96dvh] w-full max-w-6xl flex-col overflow-hidden rounded-[18px] sm:h-[92vh] sm:rounded-[28px] border border-white/10 bg-[#091224] shadow-[0_24px_80px_rgba(15,23,42,0.65)]">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-5 py-4">
              <h3 className="text-xl font-semibold text-white">{selectedPdf.title || "Course PDF"}</h3>
              <button type="button" onClick={() => setSelectedPdf(null)} className="rounded-xl border border-white/15 px-4 py-2 text-sm font-semibold text-white">
                Close
              </button>
            </div>
            <div className="min-h-0 flex-1">
              <PdfViewer sourceUrl={selectedPdf.url} title={selectedPdf.title || "Course PDF"} />
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
