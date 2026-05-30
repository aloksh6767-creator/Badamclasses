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
  const courseKeys = [course.routeId, course._id, course.id, course.slug, course.title]
    .map((item) => String(item || "").trim().toLowerCase())
    .filter(Boolean);

  return enrollments.some((item) => {
    const enrollmentKeys = [
      item?.courseRouteId,
      item?.courseId,
      item?.id,
      item?.course?._id,
      item?.course?.id,
      item?.course?.routeId,
      item?.course?.title,
      item?.courseTitle
    ].map((value) => String(value || "").trim().toLowerCase()).filter(Boolean);
    return enrollmentKeys.some((key) => courseKeys.includes(key));
  });
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

function defaultTests(course = {}) {
  return Array.isArray(course.tests) && course.tests.length
    ? course.tests
    : [
        { title: "Chapter Practice Test", duration: "30 mins", status: "Available soon" },
        { title: "Weekly Mock Test", duration: "60 mins", status: "Available soon" },
        { title: "Full Syllabus Test", duration: "120 mins", status: "Available soon" }
      ];
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
  const [selectedPdf, setSelectedPdf] = useState(null);

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
        const enrollments = await apiFetch("/enrollments/my");
        const allowed = Array.isArray(enrollments) && hasRemoteAccess(enrollments, course);
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

  const classSections = useMemo(() => normalizeClassSections(course || {}), [course]);
  const pdfResources = useMemo(() => normalizePdfs(course?.pdfResources || []), [course]);
  const tests = useMemo(() => defaultTests(course || {}), [course]);
  const featuredClasses = useMemo(() => classSections.flatMap((section) => section.items.map((item) => ({ ...item, section: section.title }))).slice(0, 8), [classSections]);

  useEffect(() => {
    setOpenSection(classSections[0]?.id || "");
  }, [classSections]);

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
    <main className="mx-auto w-[94%] max-w-7xl py-8 text-slate-100">
      <section className="overflow-hidden rounded-[34px] border border-white/10 bg-[#071023] shadow-[0_28px_90px_rgba(2,6,23,0.45)]">
        <div className="grid gap-0 lg:grid-cols-[0.38fr_0.62fr]">
          <div className="relative min-h-[320px] bg-slate-950">
            <img src={resolveCourseImage(course)} alt={course.title} className="absolute inset-0 h-full w-full object-cover opacity-50" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#071023] via-[#071023]/70 to-transparent" />
            <div className="relative z-10 flex h-full flex-col justify-end p-6">
              <p className="text-xs font-bold uppercase tracking-[0.28em] text-orange-300">Purchased Batch</p>
              <h1 className="mt-3 font-display text-4xl leading-tight text-white">{course.title}</h1>
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

          <div className="p-5 md:p-7">
            <div className="flex flex-wrap gap-3">
              {tabs.map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActiveTab(tab)}
                  className={`rounded-2xl px-5 py-3 text-base font-semibold transition ${
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
                <div className="mt-4 flex gap-4 overflow-x-auto pb-3">
                  {featuredClasses.map((item) => (
                    <article key={`${item.section}-${item.id}`} className="min-w-[240px] rounded-[24px] border border-white/10 bg-[#152349] p-5">
                      <p className="text-xs uppercase tracking-[0.22em] text-orange-300">{item.section}</p>
                      <h3 className="mt-3 text-xl font-semibold text-white">{item.title}</h3>
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
                    <div key={section.id} className="overflow-hidden rounded-2xl border border-white/10 bg-[#0b1328]">
                      <button
                        type="button"
                        onClick={() => setOpenSection((current) => (current === section.id ? "" : section.id))}
                        className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
                      >
                        <span className="text-lg font-semibold text-white">{section.title}</span>
                        <span className="text-orange-300">{openSection === section.id ? "Close" : "Open"}</span>
                      </button>
                      {openSection === section.id ? (
                        <div className="grid gap-3 border-t border-white/10 p-4 md:grid-cols-2">
                          {section.items.map((item) => (
                            <div key={item.id} className="rounded-xl bg-white/[0.045] p-4">
                              <h3 className="font-semibold text-white">{item.title}</h3>
                              <p className="mt-1 text-sm text-slate-300">{item.subtitle}</p>
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
              <div className="mt-6">
                <h2 className="text-2xl font-semibold text-white">Tests</h2>
                <div className="mt-4 grid gap-4 md:grid-cols-3">
                  {tests.map((test) => (
                    <article key={test.title} className="rounded-2xl border border-white/10 bg-[#152349] p-5">
                      <h3 className="text-lg font-semibold text-white">{test.title}</h3>
                      <p className="mt-2 text-sm text-slate-300">Duration: {test.duration || "Flexible"}</p>
                      <p className="mt-3 text-sm text-orange-200">{test.status || "Available soon"}</p>
                    </article>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </section>

      {selectedPdf ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
          <div className="flex h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-[28px] border border-white/10 bg-[#091224] shadow-[0_24px_80px_rgba(15,23,42,0.65)]">
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
