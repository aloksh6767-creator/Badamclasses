"use client";

import { useEffect, useMemo, useState } from "react";
import {
  deleteLocalCourse,
  getCourseStorageKey,
  hideLocalCourse,
  isCourseDeleted,
  normalizeLocalCourseRecord,
  parseClassSectionsText,
  parseLineItems,
  DEFAULT_LIVE_CLASS_URL,
  readLocalCourses,
  showLocalCourse,
  stringifyClassSections,
  upsertLocalCourse
} from "@/lib/localCourseState";
import { apiFetch } from "@/lib/api";
import { parseYouTubeUrl } from "@/lib/youtubeEmbed";

const emptyForm = {
  _id: "",
  title: "",
  subtitle: "",
  subject: "General",
  status: "active",
  price: "",
  offerPrice: "",
  thumbnail: "",
  description: "",
  liveClassEnabled: false,
  liveClassUrl: "",
  liveClassTitle: "",
  recordedVideoUrl: "",
  videoSourcesText: "",
  pdfResourcesText: "",
  classSectionsText: ""
};

function Field({ label, children }) {
  return (
    <label className="grid gap-2 text-sm text-slate-200">
      <span className="text-xs uppercase tracking-[0.2em] text-slate-400">{label}</span>
      {children}
    </label>
  );
}

function Input(props) {
  return <input {...props} className={`rounded-xl border border-white/10 bg-[#081127] px-3 py-2 text-sm text-white outline-none ${props.className || ""}`} />;
}

function Textarea(props) {
  return <textarea {...props} className={`min-h-24 rounded-xl border border-white/10 bg-[#081127] px-3 py-2 text-sm text-white outline-none ${props.className || ""}`} />;
}

function Select(props) {
  return <select {...props} className={`rounded-xl border border-white/10 bg-[#081127] px-3 py-2 text-sm text-white outline-none ${props.className || ""}`} />;
}

function courseToForm(course) {
  const normalized = normalizeLocalCourseRecord(course);
  return {
    _id: normalized._id,
    title: normalized.title || "",
    subtitle: normalized.subtitle || "",
    subject: normalized.subject || normalized.category || "General",
    status: isCourseDeleted(normalized) ? "hidden" : normalized.status || "active",
    price: normalized.price ? String(normalized.price) : "",
    offerPrice: normalized.offerPrice ? String(normalized.offerPrice) : "",
    thumbnail: normalized.thumbnail || normalized.image || "",
    description: normalized.description || "",
    liveClassEnabled: Boolean(normalized.liveClassEnabled),
    liveClassUrl: normalized.liveClassUrl || DEFAULT_LIVE_CLASS_URL,
    liveClassTitle: normalized.liveClassTitle || "",
    recordedVideoUrl: normalized.recordedVideoUrl || "",
    videoSourcesText: (normalized.videoSources || [])
      .map((source) => `${source.quality || source.label || "Auto"} | ${source.url || ""}`)
      .join("\n"),
    pdfResourcesText: (normalized.pdfResources || [])
      .map((pdf) => `${pdf.title || "PDF"} | ${pdf.url || pdf.pdfUrl || ""}`)
      .join("\n"),
    classSectionsText: stringifyClassSections(normalized.classSections || [])
  };
}

function buildCourseFromForm(form) {
  const videoSources = parseLineItems(form.videoSourcesText, ["quality", "url"]).map((item) => ({
    quality: item.quality || "Auto",
    label: item.quality || "Auto",
    url: item.url
  }));
  const pdfResources = parseLineItems(form.pdfResourcesText, ["title", "url"]).map((item, index) => ({
    id: `pdf-${index}`,
    title: item.title || `PDF ${index + 1}`,
    url: item.url
  }));

  return normalizeLocalCourseRecord({
    _id: form._id || undefined,
    id: form._id || undefined,
    title: form.title,
    subtitle: form.subtitle,
    subject: form.subject,
    category: form.subject,
    status: form.status,
    price: Number(form.price || 0),
    offerPrice: Number(form.offerPrice || 0),
    thumbnail: form.thumbnail,
    description: form.description,
    liveClassEnabled: Boolean(form.liveClassEnabled),
    liveClassUrl: form.liveClassUrl,
    liveClassTitle: form.liveClassTitle,
    recordedVideoUrl: form.recordedVideoUrl,
    videoSources,
    pdfResources,
    classSections: parseClassSectionsText(form.classSectionsText)
  });
}

function isMongoObjectId(value = "") {
  return /^[a-f\d]{24}$/i.test(String(value || "").trim());
}

function buildServerCoursePayload(course) {
  return {
    title: course.title,
    description: course.description || course.subtitle || "Course details will be updated soon.",
    price: Number(course.price || course.priceValue || 0),
    offerPrice: course.offerPrice || null,
    category: course.category || course.subject || "General",
    thumbnail: course.thumbnail || course.image || "",
    liveClassEnabled: Boolean(course.liveClassEnabled),
    liveClassUrl: course.liveClassUrl || DEFAULT_LIVE_CLASS_URL,
    liveClassTitle: course.liveClassTitle || "",
    batchTime: course.batchTime || "",
    startDate: course.startDate || "",
    duration: course.duration || "Flexible",
    recordedVideoUrl: course.recordedVideoUrl || "",
    classSections: course.classSections || [],
    pdfResources: (course.pdfResources || []).map((pdf) => ({
      title: pdf.title || "PDF",
      pdfUrl: pdf.pdfUrl || pdf.url || ""
    })).filter((pdf) => pdf.pdfUrl),
    videos: course.videos || []
  };
}

function validateLiveClassUrl(value = "") {
  const raw = String(value || "").trim();
  if (!raw) return { ok: true, url: DEFAULT_LIVE_CLASS_URL };
  if (!/^https?:\/\//i.test(raw)) {
    return { ok: false, message: "Live URL must start with http:// or https://." };
  }
  const parsed = parseYouTubeUrl(raw);
  if (!parsed) {
    return { ok: false, message: "Use a valid YouTube channel, @handle/live, watch?v=, youtu.be, shorts, or embed URL." };
  }
  return { ok: true, url: raw };
}

export default function LocalCourseManager({ onCoursesChange, publicCourses = [] }) {
  const [courses, setCourses] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [liveDrafts, setLiveDrafts] = useState({});
  const [message, setMessage] = useState("");

  const refreshCourses = () => {
    const nextCourses = readLocalCourses();
    setCourses(nextCourses);
    onCoursesChange?.(nextCourses);
  };

  useEffect(() => {
    refreshCourses();
  }, []);

  const subjects = useMemo(() => {
    const values = new Set(["General", "Mathematics", "Reasoning", "English", "GS", "Science", "Computer"]);
    courses.forEach((course) => values.add(course.subject || course.category || "General"));
    return Array.from(values).filter(Boolean);
  }, [courses]);

  const updateForm = (key, value) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const resetForm = () => {
    setForm(emptyForm);
    setMessage("");
  };

  const saveCourse = async (event) => {
    event.preventDefault();
    if (!form.title.trim()) {
      setMessage("Course title is required.");
      return;
    }
    if (form.liveClassEnabled || form.liveClassUrl.trim()) {
      const liveValidation = validateLiveClassUrl(form.liveClassUrl);
      if (!liveValidation.ok) {
        setMessage(liveValidation.message);
        return;
      }
    }

    const course = buildCourseFromForm({
      ...form,
      liveClassUrl: validateLiveClassUrl(form.liveClassUrl).url
    });
    let savedCourse = course;
    let serverSynced = false;
    let syncError = "";

    try {
      const payload = buildServerCoursePayload(course);
      savedCourse = form._id && isMongoObjectId(form._id)
        ? await apiFetch(`/instructor/courses/${encodeURIComponent(form._id)}`, {
            method: "PATCH",
            body: JSON.stringify(payload)
          })
        : await apiFetch("/instructor/courses", {
            method: "POST",
            body: JSON.stringify(payload)
          });
      serverSynced = true;
    } catch (error) {
      syncError = error.message;
    }

    upsertLocalCourse(course);
    if (serverSynced && savedCourse?._id) {
      upsertLocalCourse({ ...course, ...savedCourse });
    }
    refreshCourses();
    setForm(emptyForm);
    setMessage(serverSynced ? `${course.title} saved locally and on server.` : `${course.title} saved locally. Server sync skipped: ${syncError}`);
  };

  const editCourse = (course) => {
    setForm(courseToForm(course));
    setMessage(`Editing ${course.title}.`);
  };

  const toggleHidden = (course) => {
    if (isCourseDeleted(course)) {
      showLocalCourse(course);
      upsertLocalCourse({ ...course, status: "active" });
      setMessage(`${course.title} is visible again.`);
    } else {
      hideLocalCourse(course);
      upsertLocalCourse({ ...course, status: "hidden" });
      setMessage(`${course.title} is hidden from public course pages.`);
    }
    refreshCourses();
  };

  const removeCourse = (course) => {
    const confirmed = typeof window === "undefined" ? false : window.confirm(`Delete "${course.title}" from local courses?`);
    if (!confirmed) return;
    deleteLocalCourse(course);
    refreshCourses();
    if (form._id === course._id) {
      setForm(emptyForm);
    }
    setMessage(`${course.title} deleted locally.`);
  };

  const removePublicCourse = (course) => {
    const confirmed =
      typeof window === "undefined"
        ? false
        : window.confirm(`Delete "${course.title}" from public course pages?`);
    if (!confirmed) return;

    const localCourse = courses.find((item) => getCourseStorageKey(item) === getCourseStorageKey(course));
    if (localCourse) {
      deleteLocalCourse(localCourse);
      if (form._id === localCourse._id) {
        setForm(emptyForm);
      }
    } else {
      hideLocalCourse(course);
    }

    refreshCourses();
    setMessage(`${course.title} removed from public course pages.`);
  };

  const updateLiveDraft = (course, key, value) => {
    const storageKey = getCourseStorageKey(course);
    setLiveDrafts((current) => ({
      ...current,
      [storageKey]: {
        liveClassUrl: course.liveClassUrl || DEFAULT_LIVE_CLASS_URL,
        liveClassTitle: course.liveClassTitle || "",
        ...current[storageKey],
        [key]: value
      }
    }));
  };

  const setPublicCourseLive = async (course, enabled) => {
    const existing = courses.find((item) => getCourseStorageKey(item) === getCourseStorageKey(course));
    const draft = liveDrafts[getCourseStorageKey(course)] || {};
    const liveValidation = validateLiveClassUrl(draft.liveClassUrl || course.liveClassUrl || existing?.liveClassUrl || DEFAULT_LIVE_CLASS_URL);
    if (!liveValidation.ok) {
      setMessage(`${course.title}: ${liveValidation.message}`);
      return;
    }
    const nextCourse = normalizeLocalCourseRecord({
      ...course,
      ...existing,
      _id: course._id || course.id || existing?._id,
      id: course.id || course._id || existing?.id,
      liveClassEnabled: enabled,
      liveClassUrl: liveValidation.url,
      liveClassTitle: String(draft.liveClassTitle || course.liveClassTitle || existing?.liveClassTitle || "").trim()
    });
    upsertLocalCourse(nextCourse);
    try {
      await apiFetch(`/instructor/courses/live/${encodeURIComponent(getCourseStorageKey(course))}`, {
        method: "PATCH",
        body: JSON.stringify({
          liveClassEnabled: enabled,
          liveClassUrl: nextCourse.liveClassUrl || DEFAULT_LIVE_CLASS_URL,
          liveClassTitle: nextCourse.liveClassTitle || ""
        })
      });
      setMessage(`${course.title} live class ${enabled ? "enabled" : "disabled"} on server.`);
    } catch (error) {
      setMessage(`${course.title} live class ${enabled ? "enabled" : "disabled"} locally. Server sync skipped: ${error.message}`);
    }
    refreshCourses();
  };

  const visiblePublicCourses = useMemo(() => {
    const seen = new Set();
    return (Array.isArray(publicCourses) ? publicCourses : [])
      .filter((course) => course && !isCourseDeleted(course))
      .filter((course) => {
        const key = getCourseStorageKey(course);
        if (!key || seen.has(key)) return false;
        seen.add(key);
        return true;
      });
  }, [publicCourses, courses]);

  useEffect(() => {
    setLiveDrafts((current) => {
      const nextDrafts = { ...current };
      visiblePublicCourses.forEach((course) => {
        const key = getCourseStorageKey(course);
        if (!key || nextDrafts[key]) return;
        nextDrafts[key] = {
          liveClassUrl: course.liveClassUrl || DEFAULT_LIVE_CLASS_URL,
          liveClassTitle: course.liveClassTitle || ""
        };
      });
      return nextDrafts;
    });
  }, [visiblePublicCourses]);

  return (
    <div className="grid gap-5 xl:grid-cols-[420px_minmax(0,1fr)]">
      <form onSubmit={saveCourse} className="rounded-3xl border border-white/10 bg-[#0b1634]/70 p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="font-display text-2xl text-white">{form._id ? "Edit Course" : "Add Course"}</h3>
            <p className="mt-2 text-sm text-slate-300">Saved courses appear on public course pages in this browser.</p>
          </div>
          {form._id ? (
            <button type="button" onClick={resetForm} className="rounded-xl border border-white/10 px-3 py-2 text-xs text-slate-200">
              New
            </button>
          ) : null}
        </div>

        <div className="mt-5 grid gap-3">
          <Field label="Title"><Input value={form.title} onChange={(e) => updateForm("title", e.target.value)} placeholder="Course title" /></Field>
          <Field label="Subtitle"><Input value={form.subtitle} onChange={(e) => updateForm("subtitle", e.target.value)} placeholder="Short subtitle" /></Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Subject">
              <Select value={form.subject} onChange={(e) => updateForm("subject", e.target.value)}>
                {subjects.map((subject) => <option key={subject} value={subject}>{subject}</option>)}
              </Select>
            </Field>
            <Field label="Status">
              <Select value={form.status} onChange={(e) => updateForm("status", e.target.value)}>
                <option value="active">Active</option>
                <option value="draft">Draft</option>
                <option value="hidden">Hidden</option>
              </Select>
            </Field>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Price"><Input type="number" min="0" value={form.price} onChange={(e) => updateForm("price", e.target.value)} placeholder="999" /></Field>
            <Field label="Offer Price"><Input type="number" min="0" value={form.offerPrice} onChange={(e) => updateForm("offerPrice", e.target.value)} placeholder="799" /></Field>
          </div>
          <Field label="Thumbnail"><Input value={form.thumbnail} onChange={(e) => updateForm("thumbnail", e.target.value)} placeholder="/course.jpg or https://..." /></Field>
          <Field label="Description"><Textarea value={form.description} onChange={(e) => updateForm("description", e.target.value)} placeholder="Course summary" /></Field>
          <label className="flex items-center justify-between gap-3 rounded-2xl border border-red-300/20 bg-red-500/10 p-4 text-sm text-red-100">
            <span>
              <span className="block font-semibold text-white">Show Live Class</span>
              <span className="text-xs text-red-100/80">Enable this only for the batch that should show the YouTube live player.</span>
            </span>
            <input
              type="checkbox"
              checked={Boolean(form.liveClassEnabled)}
              onChange={(e) => updateForm("liveClassEnabled", e.target.checked)}
            />
          </label>
          <Field label="Live Class URL">
            <Input
              value={form.liveClassUrl}
              onChange={(e) => updateForm("liveClassUrl", e.target.value)}
              placeholder={DEFAULT_LIVE_CLASS_URL}
            />
          </Field>
          <Field label="Live Class Title">
            <Input
              value={form.liveClassTitle}
              onChange={(e) => updateForm("liveClassTitle", e.target.value)}
              placeholder="Today live class title"
            />
          </Field>
          <Field label="Recorded Video URL"><Input value={form.recordedVideoUrl} onChange={(e) => updateForm("recordedVideoUrl", e.target.value)} placeholder="https://..." /></Field>
          <Field label="Video Sources">
            <Textarea value={form.videoSourcesText} onChange={(e) => updateForm("videoSourcesText", e.target.value)} placeholder={"720p | https://video-url\n360p | https://video-url"} />
          </Field>
          <Field label="PDF Resources">
            <Textarea value={form.pdfResourcesText} onChange={(e) => updateForm("pdfResourcesText", e.target.value)} placeholder={"Class Notes | https://pdf-url\nPractice Sheet | https://pdf-url"} />
          </Field>
          <Field label="Class Sections">
            <Textarea value={form.classSectionsText} onChange={(e) => updateForm("classSectionsText", e.target.value)} placeholder={"Advance | Algebra Class 1 | 7 PM | https://class-url | Open Class\nArithmetic | Percentage PDF | Sheet | https://pdf-url | Open PDF"} />
          </Field>
          <button type="submit" className="rounded-xl bg-orange-500 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-400">
            {form._id ? "Update Course" : "Save Course"}
          </button>
          {message ? <p className="rounded-xl border border-emerald-300/20 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-100">{message}</p> : null}
        </div>
      </form>

      <div className="rounded-3xl border border-white/10 bg-[#0b1634]/70 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-display text-2xl text-white">Managed Courses</h3>
            <p className="mt-2 text-sm text-slate-300">Edit, hide, show, or delete local admin-created courses.</p>
          </div>
          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-300">
            {courses.length} local
          </span>
        </div>

        <div className="mt-5 overflow-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="text-xs uppercase text-slate-400">
              <tr>
                <th className="py-2">Course</th>
                <th>Subject</th>
                <th>Price</th>
                <th>Status</th>
                <th>Assets</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {courses.map((course) => {
                const hidden = isCourseDeleted(course);
                return (
                  <tr key={course._id || course.id} className="border-t border-white/10 text-slate-200">
                    <td className="max-w-[260px] py-3">
                      <p className="font-semibold text-white">{course.title}</p>
                      <p className="mt-1 truncate text-xs text-slate-400">{course.subtitle || course.description || "No subtitle"}</p>
                    </td>
                    <td>{course.subject || course.category || "General"}</td>
                    <td>
                      <span className="text-orange-200">Rs {Number(course.offerPrice || course.price || 0).toLocaleString("en-IN")}</span>
                      {course.offerPrice ? <span className="ml-2 text-xs text-slate-500 line-through">Rs {Number(course.price || 0).toLocaleString("en-IN")}</span> : null}
                    </td>
                    <td>
                      <span className={`rounded-full px-3 py-1 text-xs font-semibold ${hidden ? "bg-rose-500/15 text-rose-200" : "bg-emerald-500/15 text-emerald-200"}`}>
                        {hidden ? "hidden" : course.status || "active"}
                      </span>
                    </td>
                    <td className="text-xs text-slate-400">
                      {course.classSections?.length || 0} sections | {course.pdfResources?.length || 0} PDFs | {course.videoSources?.length || (course.recordedVideoUrl ? 1 : 0)} videos | {course.liveClassEnabled ? "live on" : "live off"}
                    </td>
                    <td className="py-3 text-right">
                      <div className="flex flex-wrap justify-end gap-2">
                        <button type="button" onClick={() => editCourse(course)} className="rounded-lg border border-orange-300/40 px-3 py-1 text-xs text-orange-200 hover:bg-orange-500/15">
                          Edit
                        </button>
                        <button type="button" onClick={() => toggleHidden(course)} className="rounded-lg border border-cyan-300/40 px-3 py-1 text-xs text-cyan-200 hover:bg-cyan-500/15">
                          {hidden ? "Show" : "Hide"}
                        </button>
                        <button
                          type="button"
                          onClick={() => setPublicCourseLive(course, !course.liveClassEnabled)}
                          className={`rounded-lg border px-3 py-1 text-xs font-semibold ${
                            course.liveClassEnabled
                              ? "border-red-300/40 text-red-200 hover:bg-red-500/15"
                              : "border-emerald-300/40 text-emerald-200 hover:bg-emerald-500/15"
                          }`}
                        >
                          {course.liveClassEnabled ? "Live End" : "Live Start"}
                        </button>
                        <button type="button" onClick={() => removeCourse(course)} className="rounded-lg border border-rose-300/40 px-3 py-1 text-xs text-rose-200 hover:bg-rose-500/15">
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {!courses.length ? (
            <div className="rounded-2xl border border-dashed border-white/15 bg-white/5 p-6 text-sm text-slate-300">
              No local admin courses yet. Add the first course from the form.
            </div>
          ) : null}
        </div>

        <div className="mt-5 rounded-2xl border border-rose-300/20 bg-rose-500/5 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h4 className="font-display text-xl text-white">Public Course Controls</h4>
              <p className="mt-1 text-sm text-slate-300">Start or stop YouTube live for existing batches, or remove a visible course.</p>
            </div>
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-300">
              {visiblePublicCourses.length} visible
            </span>
          </div>
          <div className="mt-4 grid gap-2">
            {visiblePublicCourses.map((course) => {
              const storageKey = getCourseStorageKey(course);
              const draft = liveDrafts[storageKey] || {
                liveClassUrl: course.liveClassUrl || DEFAULT_LIVE_CLASS_URL,
                liveClassTitle: course.liveClassTitle || ""
              };

              return (
                <div key={storageKey} className="grid gap-3 rounded-xl border border-white/10 bg-[#081127] px-3 py-3 lg:grid-cols-[minmax(160px,0.8fr)_minmax(180px,1fr)_minmax(220px,1.4fr)_auto] lg:items-center">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-white">{course.title}</p>
                    <p className="text-xs text-slate-400">{course.subject || course.category || "General"}</p>
                  </div>
                  <Input
                    value={draft.liveClassTitle}
                    onChange={(event) => updateLiveDraft(course, "liveClassTitle", event.target.value)}
                    placeholder="Live title"
                    className="w-full"
                  />
                  <Input
                    value={draft.liveClassUrl}
                    onChange={(event) => updateLiveDraft(course, "liveClassUrl", event.target.value)}
                    placeholder="YouTube channel/live or video URL"
                    className="w-full"
                  />
                  <div className="flex flex-wrap gap-2 lg:justify-end">
                    <button
                      type="button"
                      onClick={() => setPublicCourseLive(course, !course.liveClassEnabled)}
                      className={`rounded-lg border px-3 py-1 text-xs font-semibold ${
                        course.liveClassEnabled
                          ? "border-red-300/40 text-red-200 hover:bg-red-500/15"
                          : "border-emerald-300/40 text-emerald-200 hover:bg-emerald-500/15"
                      }`}
                    >
                      {course.liveClassEnabled ? "Live End" : "Live Start"}
                    </button>
                    <button
                      type="button"
                      onClick={() => removePublicCourse(course)}
                      className="rounded-lg border border-rose-300/40 px-3 py-1 text-xs font-semibold text-rose-200 hover:bg-rose-500/15"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              );
            })}
            {!visiblePublicCourses.length ? (
              <p className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-300">
                No public courses are currently visible.
              </p>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
