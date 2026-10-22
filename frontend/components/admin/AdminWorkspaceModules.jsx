"use client";

import { useEffect, useMemo, useState } from "react";
import { createAdminId } from "@/lib/adminWorkspace";
import { apiFetch } from "@/lib/api";
import { aiMockPipelineSteps, enterpriseExamModes, examPatternDefaults } from "@/lib/mockTestCatalog";
import { testimonials } from "@/lib/fixtures";

function panelCardClass(extra = "") {
  return `rounded-3xl border border-white/10 bg-[#0b1634]/70 p-5 ${extra}`.trim();
}

function formatStableDateTime(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Kolkata"
  }).format(date);
}

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

function Select(props) {
  return <select {...props} className={`rounded-xl border border-white/10 bg-[#081127] px-3 py-2 text-sm text-white outline-none ${props.className || ""}`} />;
}

function Textarea(props) {
  return <textarea {...props} className={`rounded-xl border border-white/10 bg-[#081127] px-3 py-2 text-sm text-white outline-none ${props.className || ""}`} />;
}

function normalizeText(value) {
  return String(value || "").trim().toLowerCase();
}

function getSubjectKeywords(subjectName) {
  const name = normalizeText(subjectName);
  if (name.includes("math")) return ["math", "maths", "mathematics", "quant", "arithmetic", "advance", "algebra"];
  if (name.includes("reason")) return ["reasoning", "verbal", "non-verbal", "puzzle", "series", "coding"];
  if (name.includes("english")) return ["english", "grammar", "vocabulary", "tense"];
  if (name === "gs" || name.includes("general studies")) return ["gs", "general studies", "general awareness", "current affairs", "history", "polity"];
  if (name.includes("science")) return ["science", "biology", "physics", "chemistry"];
  if (name.includes("computer")) return ["computer", "ms office", "typing", "digital"];
  return [name];
}

function batchMatchesSubject(batch, subjectName) {
  const keywords = getSubjectKeywords(subjectName);
  const sectionNames = Array.isArray(batch?.classSections)
    ? batch.classSections.map((section) => normalizeText(section?.title || section?.name))
    : [];
  const haystack = [
    normalizeText(batch?.title),
    normalizeText(batch?.category),
    normalizeText(batch?.description),
    ...sectionNames
  ].join(" ");
  return keywords.some((keyword) => haystack.includes(keyword));
}

function formatBatchLabel(batch) {
  return [batch?.title, batch?.category, batch?.batchTime].filter(Boolean).join(" | ");
}

export function DashboardAnalytics({ workspace }) {
  const stats = useMemo(() => {
    const totalRevenue = workspace.orders.reduce((sum, order) => sum + Number(order.amount || 0), 0);
    const paidRevenue = workspace.orders
      .filter((order) => order.status === "paid")
      .reduce((sum, order) => sum + Number(order.amount || 0), 0);
    const totalClasses = workspace.subjects.reduce(
      (sum, subject) =>
        sum +
        subject.categories.reduce(
          (categorySum, category) =>
            categorySum +
            category.topics.reduce((topicSum, topic) => topicSum + (topic.classes?.length || 0), 0),
          0
        ),
      0
    );
    return {
      totalUsers: workspace.users.length,
      activeUsers: workspace.users.filter((user) => user.status === "active").length,
      blockedUsers: workspace.users.filter((user) => user.status === "blocked").length,
      totalRevenue,
      paidRevenue,
      totalOrders: workspace.orders.length,
      paidOrders: workspace.orders.filter((order) => order.status === "paid").length,
      totalSubjects: workspace.subjects.length,
      totalClasses
    };
  }, [workspace]);

  return (
    <div className="grid gap-4 xl:grid-cols-4">
      {[
        { label: "Users", value: stats.totalUsers, meta: `${stats.activeUsers} active • ${stats.blockedUsers} blocked` },
        { label: "Revenue", value: `₹${stats.totalRevenue.toLocaleString("en-IN")}`, meta: `₹${stats.paidRevenue.toLocaleString("en-IN")} paid` },
        { label: "Orders", value: stats.totalOrders, meta: `${stats.paidOrders} paid orders` },
        { label: "Content", value: stats.totalClasses, meta: `${stats.totalSubjects} subjects live` }
      ].map((card) => (
        <div key={card.label} className={panelCardClass()}>
          <p className="text-xs uppercase tracking-[0.24em] text-slate-400">{card.label}</p>
          <p className="mt-3 font-display text-3xl text-white">{card.value}</p>
          <p className="mt-2 text-sm text-slate-300">{card.meta}</p>
        </div>
      ))}
    </div>
  );
}

export function UserManagement({ workspace, setWorkspace }) {
  const [form, setForm] = useState({ name: "", email: "", phone: "", role: "student", batch: "" });

  const saveUser = () => {
    if (!form.name.trim() || !form.email.trim()) return;
    setWorkspace((current) => ({
      ...current,
      users: [
        {
          id: createAdminId("user"),
          status: "active",
          ...form
        },
        ...current.users
      ]
    }));
    setForm({ name: "", email: "", phone: "", role: "student", batch: "" });
  };

  const toggleStatus = (id) => {
    setWorkspace((current) => ({
      ...current,
      users: current.users.map((user) =>
        user.id === id ? { ...user, status: user.status === "blocked" ? "active" : "blocked" } : user
      )
    }));
  };

  const deleteUser = (id) => {
    setWorkspace((current) => ({
      ...current,
      users: current.users.filter((user) => user.id !== id)
    }));
  };

  return (
    <div className="grid gap-5 xl:grid-cols-[380px_minmax(0,1fr)]">
      <div className={panelCardClass()}>
        <h3 className="font-display text-2xl text-white">Add User</h3>
        <div className="mt-4 grid gap-3">
          <Field label="Name"><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Student / Teacher name" /></Field>
          <Field label="Email"><Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="name@example.com" /></Field>
          <Field label="Phone"><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="9876543210" /></Field>
          <Field label="Role">
            <Select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
              <option value="student">Student</option>
              <option value="teacher">Teacher</option>
              <option value="admin">Admin</option>
            </Select>
          </Field>
          <Field label="Assigned Batch"><Input value={form.batch} onChange={(e) => setForm({ ...form, batch: e.target.value })} placeholder="Udaan Batch / English / GS" /></Field>
          <button onClick={saveUser} className="rounded-xl bg-orange-500 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-400">
            Save User
          </button>
        </div>
      </div>

      <div className={panelCardClass()}>
        <h3 className="font-display text-2xl text-white">Users</h3>
        <div className="mt-4 overflow-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="text-xs uppercase text-slate-400">
              <tr>
                <th className="py-2">Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Batch</th>
                <th>Status</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {workspace.users.map((user) => (
                <tr key={user.id} className="border-t border-white/10 text-slate-200">
                  <td className="py-3">{user.name}</td>
                  <td>{user.email}</td>
                  <td className="capitalize">{user.role}</td>
                  <td>{user.batch || "-"}</td>
                  <td>
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${user.status === "blocked" ? "bg-rose-500/15 text-rose-200" : "bg-emerald-500/15 text-emerald-200"}`}>
                      {user.status}
                    </span>
                  </td>
                  <td className="text-right">
                    <div className="flex justify-end gap-2">
                      <button onClick={() => toggleStatus(user.id)} className="rounded-lg border border-white/10 px-3 py-1 text-xs text-white/90 hover:border-orange-300/40">
                        {user.status === "blocked" ? "Unblock" : "Block"}
                      </button>
                      <button onClick={() => deleteUser(user.id)} className="rounded-lg border border-rose-300/30 px-3 py-1 text-xs text-rose-200 hover:bg-rose-500/15">
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export function SubjectCourseManager({ workspace, setWorkspace, batches = [] }) {
  const [selectedSubjectId, setSelectedSubjectId] = useState(workspace.subjects[0]?.id || "");
  const [newSubject, setNewSubject] = useState("");
  const [newCategory, setNewCategory] = useState("");
  const [newTopic, setNewTopic] = useState("");
  const [newClass, setNewClass] = useState({ title: "", dateTime: "", viewUrl: "", pdfUrl: "" });
  const [openCategoryId, setOpenCategoryId] = useState("");
  const [activeTopicId, setActiveTopicId] = useState("");
  const [selectedBatchId, setSelectedBatchId] = useState("");

  const selectedSubject = workspace.subjects.find((subject) => subject.id === selectedSubjectId) || workspace.subjects[0] || null;
  const currentCategories = selectedSubject?.categories || [];

  const activeCategory = currentCategories.find((category) => category.id === openCategoryId) || currentCategories[0] || null;
  const currentTopics = activeCategory?.topics || [];
  const activeTopic = currentTopics.find((topic) => topic.id === activeTopicId) || currentTopics[0] || null;
  const subjectBatches = useMemo(
    () => batches.filter((batch) => batchMatchesSubject(batch, selectedSubject?.name || "")),
    [batches, selectedSubject]
  );
  const selectedBatch =
    subjectBatches.find((batch) => String(batch._id || batch.id) === selectedBatchId) ||
    subjectBatches[0] ||
    null;
  const filteredClasses = useMemo(() => {
    if (!Array.isArray(activeTopic?.classes)) return [];
    if (!selectedBatchId) return activeTopic.classes;
    return activeTopic.classes.filter(
      (item) =>
        !item.batchId ||
        item.batchId === selectedBatchId ||
        (Array.isArray(item.batchIds) && item.batchIds.includes(selectedBatchId))
    );
  }, [activeTopic, selectedBatchId]);

  useEffect(() => {
    if (!subjectBatches.length) {
      setSelectedBatchId("");
      return;
    }
    setSelectedBatchId((current) => {
      if (current && subjectBatches.some((batch) => String(batch._id || batch.id) === current)) {
        return current;
      }
      return String(subjectBatches[0]._id || subjectBatches[0].id || "");
    });
  }, [subjectBatches]);

  const updateSubjects = (updater) => {
    setWorkspace((current) => ({
      ...current,
      subjects: updater(current.subjects)
    }));
  };

  const addSubject = () => {
    if (!newSubject.trim()) return;
    const id = createAdminId("subject");
    updateSubjects((subjects) => [...subjects, { id, name: newSubject.trim(), categories: [] }]);
    setSelectedSubjectId(id);
    setNewSubject("");
  };

  const addCategory = () => {
    if (!selectedSubject || !newCategory.trim()) return;
    const categoryId = createAdminId("category");
    updateSubjects((subjects) =>
      subjects.map((subject) =>
        subject.id === selectedSubject.id
          ? {
              ...subject,
              categories: [...subject.categories, { id: categoryId, name: newCategory.trim(), topics: [] }]
            }
          : subject
      )
    );
    setOpenCategoryId(categoryId);
    setNewCategory("");
  };

  const addTopic = () => {
    if (!selectedSubject || !activeCategory || !newTopic.trim()) return;
    const topicId = createAdminId("topic");
    updateSubjects((subjects) =>
      subjects.map((subject) =>
        subject.id === selectedSubject.id
          ? {
              ...subject,
              categories: subject.categories.map((category) =>
                category.id === activeCategory.id
                  ? { ...category, topics: [...category.topics, { id: topicId, name: newTopic.trim(), classes: [] }] }
                  : category
              )
            }
          : subject
      )
    );
    setActiveTopicId(topicId);
    setNewTopic("");
  };

  const addClass = () => {
    if (!selectedSubject || !activeCategory || !activeTopic || !newClass.title.trim()) return;
    if (subjectBatches.length && !selectedBatch) return;
    const classId = createAdminId("class");
    updateSubjects((subjects) =>
      subjects.map((subject) =>
        subject.id === selectedSubject.id
          ? {
              ...subject,
              categories: subject.categories.map((category) =>
                category.id === activeCategory.id
                  ? {
                      ...category,
                      topics: category.topics.map((topic) =>
                        topic.id === activeTopic.id
                          ? {
                              ...topic,
                              classes: [
                                ...topic.classes,
                                {
                                  id: classId,
                                  title: newClass.title.trim(),
                                  dateTime: newClass.dateTime.trim(),
                                  viewUrl: newClass.viewUrl.trim(),
                                  pdfUrl: newClass.pdfUrl.trim(),
                                  batchId: selectedBatch ? String(selectedBatch._id || selectedBatch.id) : "",
                                  batchTitle: selectedBatch?.title || "",
                                  batchLabel: selectedBatch ? formatBatchLabel(selectedBatch) : ""
                                }
                              ]
                            }
                          : topic
                      )
                    }
                  : category
              )
            }
          : subject
      )
    );
    setNewClass({ title: "", dateTime: "", viewUrl: "", pdfUrl: "" });
  };

  const removeClass = (classId) => {
    if (!selectedSubject || !activeCategory || !activeTopic) return;
    updateSubjects((subjects) =>
      subjects.map((subject) =>
        subject.id === selectedSubject.id
          ? {
              ...subject,
              categories: subject.categories.map((category) =>
                category.id === activeCategory.id
                  ? {
                      ...category,
                      topics: category.topics.map((topic) =>
                        topic.id === activeTopic.id
                          ? { ...topic, classes: topic.classes.filter((item) => item.id !== classId) }
                          : topic
                      )
                    }
                  : category
              )
            }
          : subject
      )
    );
  };

  const subjectStats = useMemo(
    () =>
      workspace.subjects.map((subject) => ({
        id: subject.id,
        name: subject.name,
        categories: subject.categories.length,
        topics: subject.categories.reduce((sum, category) => sum + category.topics.length, 0),
        classes: subject.categories.reduce(
          (sum, category) => sum + category.topics.reduce((topicSum, topic) => topicSum + topic.classes.length, 0),
          0
        )
      })),
    [workspace.subjects]
  );

  const selectedSubjectPreview = useMemo(
    () => JSON.stringify(selectedSubject || {}, null, 2),
    [selectedSubject]
  );

  return (
    <div className="space-y-5">
      <div className="grid gap-4 xl:grid-cols-4">
        {subjectStats.map((subject) => (
          <button
            key={subject.id}
            type="button"
            onClick={() => setSelectedSubjectId(subject.id)}
            className={`rounded-2xl border p-4 text-left transition ${
              selectedSubjectId === subject.id ? "border-orange-300/40 bg-orange-500/10" : "border-white/10 bg-[#0b1634]/70 hover:border-orange-300/30"
            }`}
          >
            <p className="font-display text-xl text-white">{subject.name}</p>
            <p className="mt-2 text-sm text-slate-300">{subject.categories} categories • {subject.topics} topics • {subject.classes} classes</p>
          </button>
        ))}
      </div>

      <div className="grid gap-5 xl:grid-cols-[320px_minmax(0,1fr)]">
        <div className={panelCardClass("space-y-5")}>
          <div>
            <h3 className="font-display text-2xl text-white">Subjects</h3>
            <p className="mt-2 text-sm text-slate-300">One reusable system for Mathematics, Reasoning, English, GS, Science, and Computer.</p>
          </div>

          <Field label="Select Subject">
            <Select value={selectedSubjectId} onChange={(e) => setSelectedSubjectId(e.target.value)}>
              {workspace.subjects.map((subject) => (
                <option key={subject.id} value={subject.id}>{subject.name}</option>
              ))}
            </Select>
          </Field>

          <Field label="Target Batch">
            <Select value={selectedBatchId} onChange={(e) => setSelectedBatchId(e.target.value)} disabled={!subjectBatches.length}>
              {subjectBatches.length ? (
                subjectBatches.map((batch) => (
                  <option key={String(batch._id || batch.id)} value={String(batch._id || batch.id)}>
                    {formatBatchLabel(batch)}
                  </option>
                ))
              ) : (
                <option value="">No matching batch found</option>
              )}
            </Select>
          </Field>

          <div className="rounded-2xl border border-orange-300/15 bg-orange-500/10 p-4 text-sm text-orange-100">
            PDF aur class selected batch ke andar save honge. Same subject ke multiple batches hon to pehle yahi se batch choose karein.
          </div>

          <Field label="Add Subject">
            <div className="flex gap-2">
              <Input value={newSubject} onChange={(e) => setNewSubject(e.target.value)} placeholder="New subject name" />
              <button onClick={addSubject} className="rounded-xl bg-orange-500 px-4 py-2 text-sm font-semibold text-white">Add</button>
            </div>
          </Field>

          <Field label="Add Category">
            <div className="flex gap-2">
              <Input value={newCategory} onChange={(e) => setNewCategory(e.target.value)} placeholder="Arithmetic / Advance / Grammar" />
              <button onClick={addCategory} className="rounded-xl border border-white/10 px-4 py-2 text-sm text-white">Add</button>
            </div>
          </Field>

          <Field label="Add Topic">
            <div className="flex gap-2">
              <Input value={newTopic} onChange={(e) => setNewTopic(e.target.value)} placeholder="Percentage / Ratio / Tense" />
              <button onClick={addTopic} className="rounded-xl border border-white/10 px-4 py-2 text-sm text-white">Add</button>
            </div>
          </Field>
        </div>

        <div className="space-y-5">
          <div className={panelCardClass()}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.22em] text-cyan-200/70">Selected Subject</p>
                <h3 className="mt-2 font-display text-3xl text-white">{selectedSubject?.name || "No subject selected"}</h3>
              </div>
              <div className="rounded-full border border-cyan-300/20 bg-cyan-400/10 px-4 py-2 text-sm text-cyan-100">
                Subject → Category → Topic → Classes
              </div>
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-3">
              <div className="rounded-2xl border border-white/10 bg-[#081127] p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Selected Batch</p>
                <p className="mt-2 text-base font-semibold text-white">{selectedBatch?.title || "Choose batch from sidebar"}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-[#081127] p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Batch Time</p>
                <p className="mt-2 text-base font-semibold text-white">{selectedBatch?.batchTime || "Timing not set"}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-[#081127] p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Start Date</p>
                <p className="mt-2 text-base font-semibold text-white">{selectedBatch?.startDate || "Start date not set"}</p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            {currentCategories.map((category, categoryIndex) => {
              const isOpen = openCategoryId ? openCategoryId === category.id : categoryIndex === 0;
              return (
                <div key={category.id} className="overflow-hidden rounded-3xl border border-white/10 bg-[#0b1634]/70">
                  <button
                    type="button"
                    onClick={() => {
                      setOpenCategoryId((current) => (current === category.id ? "" : category.id));
                      setActiveTopicId(category.topics[0]?.id || "");
                    }}
                    className="flex w-full items-center justify-between px-5 py-4 text-left"
                  >
                    <div>
                      <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Category</p>
                      <h4 className="mt-2 font-display text-2xl text-white">{category.name}</h4>
                    </div>
                    <span className={`text-2xl text-white transition ${isOpen ? "rotate-180" : ""}`}>⌄</span>
                  </button>

                  <div className={`grid transition-all duration-300 ${isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}>
                    <div className="overflow-hidden border-t border-white/10">
                      <div className="px-5 py-5">
                        <div className="flex flex-wrap gap-3">
                          {category.topics.map((topic) => (
                            <button
                              key={topic.id}
                              type="button"
                              onClick={() => {
                                setOpenCategoryId(category.id);
                                setActiveTopicId(topic.id);
                              }}
                              className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                                (activeTopicId ? activeTopicId === topic.id : category.topics[0]?.id === topic.id) && (openCategoryId ? openCategoryId === category.id : categoryIndex === 0)
                                  ? "bg-cyan-300 text-slate-950"
                                  : "border border-white/15 bg-white/5 text-slate-200 hover:border-cyan-300/40"
                              }`}
                            >
                              {topic.name}
                            </button>
                          ))}
                        </div>

                        {activeCategory?.id === category.id && activeTopic ? (
                          <div className="mt-5 grid gap-4 xl:grid-cols-[380px_minmax(0,1fr)]">
                            <div className="rounded-2xl border border-white/10 bg-[#081127] p-4">
                              <h5 className="font-display text-xl text-white">Add Class</h5>
                              <div className="mt-4 grid gap-3">
                                <Field label="Title"><Input value={newClass.title} onChange={(e) => setNewClass({ ...newClass, title: e.target.value })} placeholder="Class title" /></Field>
                                <Field label="Date & Time"><Input value={newClass.dateTime} onChange={(e) => setNewClass({ ...newClass, dateTime: e.target.value })} placeholder="Mon, 7:00 PM" /></Field>
                                <Field label="View URL"><Input value={newClass.viewUrl} onChange={(e) => setNewClass({ ...newClass, viewUrl: e.target.value })} placeholder="https://..." /></Field>
                                <Field label="PDF URL"><Input value={newClass.pdfUrl} onChange={(e) => setNewClass({ ...newClass, pdfUrl: e.target.value })} placeholder="https://..." /></Field>
                                <div className="rounded-2xl border border-cyan-300/20 bg-cyan-400/10 px-4 py-3 text-xs text-cyan-100">
                                  This class and PDF will be added to: <span className="font-semibold text-white">{selectedBatch?.title || "No batch selected"}</span>
                                </div>
                                <button onClick={addClass} disabled={subjectBatches.length > 0 && !selectedBatch} className="rounded-xl bg-cyan-300 px-4 py-2 text-sm font-semibold text-slate-950 disabled:cursor-not-allowed disabled:opacity-50">
                                  Add Class
                                </button>
                              </div>
                            </div>

                            <div className="grid gap-4 md:grid-cols-2">
                              {filteredClasses.map((item) => (
                                <div key={item.id} className="rounded-2xl border border-white/10 bg-[#081127] p-4">
                                  <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Class Card</p>
                                  <h5 className="mt-3 text-lg font-semibold text-white">{item.title}</h5>
                                  <p className="mt-2 text-sm text-slate-300">{item.dateTime || "Schedule pending"}</p>
                                  <p className="mt-2 text-xs text-cyan-100">{item.batchLabel || item.batchTitle || "All matching batches"}</p>
                                  <div className="mt-4 flex flex-wrap gap-2">
                                    <a href={item.viewUrl || "#"} target="_blank" rel="noreferrer" className="rounded-xl bg-cyan-300 px-3 py-2 text-xs font-semibold text-slate-950">
                                      View Now
                                    </a>
                                    <a href={item.pdfUrl || "#"} target="_blank" rel="noreferrer" className="rounded-xl border border-orange-300/30 px-3 py-2 text-xs font-semibold text-orange-100">
                                      PDF
                                    </a>
                                    <button onClick={() => removeClass(item.id)} className="rounded-xl border border-rose-300/30 px-3 py-2 text-xs text-rose-200">
                                      Remove
                                    </button>
                                  </div>
                                </div>
                              ))}
                              {!filteredClasses.length ? (
                                <div className="rounded-2xl border border-dashed border-white/10 bg-[#081127] p-4 text-sm text-slate-400">
                                  No classes added for this topic and batch yet.
                                </div>
                              ) : null}
                            </div>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
            {!currentCategories.length ? (
              <div className="rounded-3xl border border-dashed border-white/10 bg-[#0b1634]/70 p-6 text-sm text-slate-400">
                Add a category to start building this subject structure.
              </div>
            ) : null}
          </div>

          <div className={panelCardClass()}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.22em] text-slate-400">API / JSON Ready Structure</p>
                <h4 className="mt-2 font-display text-2xl text-white">Structured Subject Data</h4>
              </div>
              <span className="rounded-full border border-cyan-300/20 bg-cyan-400/10 px-3 py-1 text-xs font-semibold text-cyan-100">
                Reusable for all subjects
              </span>
            </div>
            <pre className="mt-4 overflow-auto rounded-2xl border border-white/10 bg-[#081127] p-4 text-xs text-slate-300">
              {selectedSubjectPreview}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}

export function OrdersAndPayments({ workspace, setWorkspace }) {
  const updateOrderStatus = (id, status) => {
    setWorkspace((current) => ({
      ...current,
      orders: current.orders.map((order) => (order.id === id ? { ...order, status } : order))
    }));
  };

  return (
    <div className={panelCardClass()}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="font-display text-2xl text-white">Orders & Payments</h3>
        <div className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-300">Razorpay / PhonePe ready view</div>
      </div>
      <div className="mt-5 overflow-auto">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="text-xs uppercase text-slate-400">
            <tr>
              <th className="py-2">Order</th>
              <th>Student</th>
              <th>Course</th>
              <th>Amount</th>
              <th>Status</th>
              <th>Provider</th>
              <th className="text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {workspace.orders.map((order) => (
              <tr key={order.id} className="border-t border-white/10 text-slate-200">
                <td className="py-3">{order.id}</td>
                <td>{order.student}</td>
                <td>{order.course}</td>
                <td>₹{Number(order.amount || 0).toLocaleString("en-IN")}</td>
                <td className="capitalize">{order.status}</td>
                <td>{order.provider}</td>
                <td className="text-right">
                  <Select value={order.status} onChange={(e) => updateOrderStatus(order.id, e.target.value)} className="w-32">
                    <option value="paid">Paid</option>
                    <option value="pending">Pending</option>
                    <option value="failed">Failed</option>
                    <option value="refunded">Refunded</option>
                  </Select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function CouponManager({ workspace, setWorkspace }) {
  const [form, setForm] = useState({ code: "", discountType: "percent", discountValue: "" });

  const saveCoupon = () => {
    if (!form.code.trim() || !form.discountValue) return;
    setWorkspace((current) => ({
      ...current,
      coupons: [
        ...current.coupons,
        { id: createAdminId("coupon"), code: form.code.trim().toUpperCase(), discountType: form.discountType, discountValue: Number(form.discountValue), status: "active" }
      ]
    }));
    setForm({ code: "", discountType: "percent", discountValue: "" });
  };

  const toggleCoupon = (id) => {
    setWorkspace((current) => ({
      ...current,
      coupons: current.coupons.map((coupon) =>
        coupon.id === id ? { ...coupon, status: coupon.status === "active" ? "inactive" : "active" } : coupon
      )
    }));
  };

  return (
    <div className="grid gap-5 xl:grid-cols-[360px_minmax(0,1fr)]">
      <div className={panelCardClass()}>
        <h3 className="font-display text-2xl text-white">Create Coupon</h3>
        <div className="mt-4 grid gap-3">
          <Field label="Coupon Code"><Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="SSC20" /></Field>
          <Field label="Discount Type">
            <Select value={form.discountType} onChange={(e) => setForm({ ...form, discountType: e.target.value })}>
              <option value="percent">Percent</option>
              <option value="flat">Flat</option>
            </Select>
          </Field>
          <Field label="Discount Value"><Input type="number" value={form.discountValue} onChange={(e) => setForm({ ...form, discountValue: e.target.value })} placeholder="20" /></Field>
          <button onClick={saveCoupon} className="rounded-xl bg-orange-500 px-4 py-2 text-sm font-semibold text-white">Save Coupon</button>
        </div>
      </div>
      <div className={panelCardClass()}>
        <h3 className="font-display text-2xl text-white">Coupon List</h3>
        <div className="mt-4 grid gap-3">
          {workspace.coupons.map((coupon) => (
            <div key={coupon.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-[#081127] p-4">
              <div>
                <p className="text-lg font-semibold text-white">{coupon.code}</p>
                <p className="text-sm text-slate-300">{coupon.discountType === "percent" ? `${coupon.discountValue}% OFF` : `₹${coupon.discountValue} OFF`}</p>
              </div>
              <button onClick={() => toggleCoupon(coupon.id)} className="rounded-xl border border-white/10 px-3 py-2 text-xs text-white">
                {coupon.status === "active" ? "Deactivate" : "Activate"}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function OfflineTestManager() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState("");
  const [savingId, setSavingId] = useState("");

  const loadItems = async () => {
    setLoading(true);
    setNotice("");
    try {
      const data = await apiFetch("/offline-tests/admin");
      setItems(Array.isArray(data) ? data : []);
    } catch (error) {
      setNotice(error.message || "Offline test registrations load nahi ho paye.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadItems();
  }, []);

  const updateField = (id, field, value) => {
    setItems((current) => current.map((item) => (item._id === id ? { ...item, [field]: value } : item)));
  };

  const saveResult = async (item) => {
    setSavingId(item._id);
    setNotice("");
    try {
      const response = await apiFetch(`/offline-tests/admin/${item._id}/result`, {
        method: "PATCH",
        body: JSON.stringify({
          marksObtained: item.marksObtained,
          totalMarks: item.totalMarks,
          rank: item.rank,
          resultNotes: item.resultNotes,
          status: item.status
        })
      });
      const updated = response?.registration;
      if (updated) {
        setItems((current) => current.map((entry) => (entry._id === updated._id ? updated : entry)));
      }
      const sms = response?.sms;
      const smsMessage =
        sms?.sent
          ? " SMS student ke phone number par send ho gaya."
          : sms?.reason === "sms_not_configured"
            ? " SMS send skip hua kyunki SMS provider env configured nahi hai."
            : sms?.reason === "phone_missing"
              ? " SMS send skip hua kyunki valid phone number missing hai."
              : sms?.error
                ? ` SMS error: ${sms.error}`
                : "";
      setNotice(`${response?.message || "Result updated."}${smsMessage}`);
    } catch (error) {
      setNotice(error.message || "Result save nahi hua.");
    } finally {
      setSavingId("");
    }
  };

  return (
    <div className="space-y-5">
      <div className={panelCardClass()}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-display text-2xl text-white">Offline Test Registrations</h3>
            <p className="mt-2 text-sm text-slate-300">Student registrations yahan aayengi. Test ke baad marks, rank, aur notes yahi se publish karein.</p>
          </div>
          <button onClick={loadItems} className="rounded-xl border border-white/10 px-4 py-2 text-sm text-white hover:border-orange-300/40">
            Refresh
          </button>
        </div>
        {notice ? <div className="mt-4 rounded-xl border border-orange-300/30 bg-orange-500/10 px-4 py-3 text-sm text-orange-100">{notice}</div> : null}
      </div>

      {loading ? (
        <div className={panelCardClass()}>Loading offline test registrations...</div>
      ) : items.length ? (
        <div className="grid gap-4">
          {items.map((item) => (
            <div key={item._id} className={panelCardClass()}>
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="font-display text-2xl text-white">{item.studentName}</p>
                  <p className="mt-2 text-sm text-slate-300">{item.examName}</p>
                  <p className="mt-1 text-xs uppercase tracking-[0.2em] text-orange-300">Roll No: {item.rollNumber}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-200">
                  <p>Phone: {item.phone}</p>
                  <p className="mt-1">Batch: {item.batchName || "-"}</p>
                  <p className="mt-1">Center: {item.center || "-"}</p>
                </div>
              </div>

              <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
                <Field label="Marks Obtained">
                  <Input
                    type="number"
                    value={item.marksObtained ?? ""}
                    onChange={(e) => updateField(item._id, "marksObtained", e.target.value)}
                    placeholder="Marks"
                  />
                </Field>
                <Field label="Total Marks">
                  <Input
                    type="number"
                    value={item.totalMarks ?? ""}
                    onChange={(e) => updateField(item._id, "totalMarks", e.target.value)}
                    placeholder="Total"
                  />
                </Field>
                <Field label="Rank">
                  <Input value={item.rank || ""} onChange={(e) => updateField(item._id, "rank", e.target.value)} placeholder="Rank" />
                </Field>
                <Field label="Status">
                  <Select value={item.status || "registered"} onChange={(e) => updateField(item._id, "status", e.target.value)}>
                    <option value="registered">Registered</option>
                    <option value="results_published">Results Published</option>
                  </Select>
                </Field>
                <div className="flex items-end">
                  <button
                    onClick={() => saveResult(item)}
                    disabled={savingId === item._id}
                    className="w-full rounded-xl bg-orange-500 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-400 disabled:opacity-70"
                  >
                    {savingId === item._id ? "Saving..." : "Save Result"}
                  </button>
                </div>
              </div>

              <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1fr)_220px]">
                <Field label="Result Notes">
                  <Textarea
                    rows={3}
                    value={item.resultNotes || ""}
                    onChange={(e) => updateField(item._id, "resultNotes", e.target.value)}
                    placeholder="Attendance, section performance, next action"
                  />
                </Field>
                <div className="rounded-2xl border border-white/10 bg-[#081127] p-4 text-sm text-slate-300">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Published Preview</p>
                  <p className="mt-3 text-white">
                    {item.marksObtained !== null && item.totalMarks !== null && item.totalMarks !== ""
                      ? `${item.marksObtained}/${item.totalMarks}`
                      : "Pending"}
                  </p>
                  <p className="mt-2">Rank: {item.rank || "Pending"}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className={panelCardClass()}>Abhi tak koi offline test registration nahi aayi hai.</div>
      )}
    </div>
  );
}

const initialMockForm = {
  title: "",
  examName: "SSC",
  questions: "",
  marks: "",
  duration: "",
  sectionTiming: "",
  negativeMarking: "",
  language: "Hindi + English",
  examMode: "Full Test",
  accessType: "Free",
  difficulty: "Medium",
  schedule: "",
  resultVisibility: "Instant",
  testUrl: "",
  fileName: "",
  fileDataUrl: "",
  pipelineStage: "Admin Review",
  reviewStatus: "pending",
  sourceType: "manual",
  topicsDetected: "",
  duplicateCheck: "pending",
  validationStatus: "needs review",
  status: "published"
};

export function OnlineMockTestManager({ workspace, setWorkspace }) {
  const [form, setForm] = useState(initialMockForm);
  const [notice, setNotice] = useState("");
  const [selectedMockFile, setSelectedMockFile] = useState(null);
  const [autoUploadBusy, setAutoUploadBusy] = useState(false);
  const [courseMocks, setCourseMocks] = useState([]);
  const [adminCourses, setAdminCourses] = useState([]);
  const [assignmentForm, setAssignmentForm] = useState({ courseRouteId: "", mockId: "" });
  const [assignmentBusy, setAssignmentBusy] = useState(false);
  const [assignmentNotice, setAssignmentNotice] = useState("");

  const mockTests = Array.isArray(workspace.mockTests) ? workspace.mockTests : [];

  useEffect(() => {
    let cancelled = false;
    Promise.all([apiFetch("/automation/public-pdf-mocks"), apiFetch("/courses")])
      .then(([mockResponse, courseResponse]) => {
        if (cancelled) return;
        const mocks = Array.isArray(mockResponse?.mockTests) ? mockResponse.mockTests : [];
        const courses = Array.isArray(courseResponse?.courses) ? courseResponse.courses : Array.isArray(courseResponse) ? courseResponse : [];
        setCourseMocks(mocks);
        setAdminCourses(courses);
        setAssignmentForm((current) => ({
          ...current,
          mockId: current.mockId || String(mocks[0]?.id || ""),
          courseRouteId: current.courseRouteId || String(courses[0]?.routeId || courses[0]?.slug || courses[0]?._id || courses[0]?.id || "")
        }));
      })
      .catch((error) => !cancelled && setAssignmentNotice(error.message || "Course mock options load nahi ho paye."));
    return () => { cancelled = true; };
  }, []);

  const assignMockToCourse = async () => {
    if (!assignmentForm.courseRouteId || !assignmentForm.mockId) return;
    setAssignmentBusy(true);
    try {
      await apiFetch("/course-mocks/admin/mocks/" + encodeURIComponent(assignmentForm.mockId) + "/assign-courses", {
        method: "POST",
        body: JSON.stringify({ courseRouteIds: [assignmentForm.courseRouteId], isPublished: true, isLocked: false })
      });
      setAssignmentNotice("Mock test selected course ke Tests tab me add ho gaya.");
    } catch (error) {
      setAssignmentNotice(error.message || "Mock assign nahi ho paya.");
    } finally {
      setAssignmentBusy(false);
    }
  };
  const applyExamDefaults = (examName) => {
    const defaults = examPatternDefaults[examName] || {};
    setForm((current) => ({
      ...current,
      examName,
      questions: current.questions || String(defaults.questions || ""),
      marks: current.marks || String(defaults.marks || ""),
      duration: current.duration || defaults.duration || "",
      sectionTiming: current.sectionTiming || defaults.sectionTiming || "",
      negativeMarking: current.negativeMarking || defaults.negativeMarking || ""
    }));
  };

  const saveMockTest = () => {
    if (!form.title.trim()) {
      setNotice("Mock test title required hai.");
      return;
    }

    const questions = form.questions === "" ? "" : Number(form.questions);
    if (questions !== "" && (!Number.isFinite(questions) || questions < 1)) {
      setNotice("Questions count valid number hona chahiye.");
      return;
    }

    const marks = form.marks === "" ? "" : Number(form.marks);
    if (marks !== "" && (!Number.isFinite(marks) || marks < 1)) {
      setNotice("Total marks valid number hona chahiye.");
      return;
    }

    setWorkspace((current) => ({
      ...current,
      mockTests: [
        {
          id: createAdminId("mock"),
          title: form.title.trim(),
          examName: form.examName.trim(),
          questions,
          marks,
          duration: form.duration.trim(),
          sectionTiming: form.sectionTiming.trim(),
          negativeMarking: form.negativeMarking.trim(),
          language: form.language,
          examMode: form.examMode,
          accessType: form.accessType,
          difficulty: form.difficulty,
          schedule: form.schedule.trim(),
          resultVisibility: form.resultVisibility,
          testUrl: form.testUrl.trim() || form.fileDataUrl,
          fileName: form.fileName,
          pipelineStage: form.pipelineStage,
          reviewStatus: form.reviewStatus,
          sourceType: form.sourceType,
          topicsDetected: form.topicsDetected
            .split(",")
            .map((item) => item.trim())
            .filter(Boolean)
            .slice(0, 12),
          duplicateCheck: form.duplicateCheck,
          validationStatus: form.validationStatus,
          version: 1,
          createdAt: new Date().toISOString(),
          status: form.status
        },
        ...(Array.isArray(current.mockTests) ? current.mockTests : [])
      ]
    }));
    setForm(initialMockForm);
    setNotice("Online mock test save ho gaya.");
  };

  const updateMockStatus = (id, status) => {
    setWorkspace((current) => ({
        ...current,
        mockTests: (Array.isArray(current.mockTests) ? current.mockTests : []).map((item) =>
        item.id === id
          ? {
              ...item,
              status,
              pipelineStage: status === "published" ? "Publish" : item.pipelineStage || "Admin Review",
              reviewStatus: status === "published" ? "approved" : item.reviewStatus || "pending"
            }
          : item
      )
    }));
  };

  const deleteMockTest = (id) => {
    setWorkspace((current) => ({
      ...current,
      mockTests: (Array.isArray(current.mockTests) ? current.mockTests : []).filter((item) => item.id !== id)
    }));
  };

  const handleFileUpload = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setSelectedMockFile(file);

    const reader = new FileReader();
    reader.onload = () => {
      setForm((current) => ({
        ...current,
        fileName: file.name,
        fileDataUrl: String(reader.result || ""),
        sourceType: file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf") ? "pdf" : "file",
        pipelineStage: "Question Extraction",
        reviewStatus: "pending",
        validationStatus: "needs review"
      }));
      setNotice(`${file.name} upload ready hai. Save Mock Test dabane par publish hoga.`);
    };
    reader.onerror = () => setNotice("File read nahi ho payi. Link paste karke retry karein.");
    reader.readAsDataURL(file);
  };

  const uploadPdfToMockEngine = async () => {
    if (!selectedMockFile) {
      setNotice("Pehle PDF file select karein.");
      return;
    }
    if (!selectedMockFile.name.toLowerCase().endsWith(".pdf") && selectedMockFile.type !== "application/pdf") {
      setNotice("AI mock engine ke liye PDF file required hai.");
      return;
    }

    setAutoUploadBusy(true);
    setNotice("AI PDF filter PDF read kar raha hai. Large PDF me thoda time lag sakta hai.");
    try {
      const body = new FormData();
      body.append("file", selectedMockFile);
      body.append("examName", form.examName || "");
      body.append("subjectName", "");
      const response = await apiFetch("/automation/pdf-mocks/upload", {
        method: "POST",
        body,
        timeoutMs: 120000
      });
      const summary = response?.summary || {};
      setNotice(
        `AI PDF filter complete: ${summary.questions || 0} questions, ${summary.topics || 0} topic mocks, full mock "${response?.groupTitle || "generated"}" ready.`
      );
      setForm((current) => ({
        ...current,
        title: response?.groupTitle || current.title,
        sourceType: "pdf",
        pipelineStage: "Publish",
        reviewStatus: "approved",
        duplicateCheck: "clear",
        validationStatus: "auto extracted",
        status: "published"
      }));
    } catch (error) {
      setNotice(error.message || "AI PDF filter failed. PDF text format check karein.");
    } finally {
      setAutoUploadBusy(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="grid gap-5 xl:grid-cols-[380px_minmax(0,1fr)]">
        <div className={panelCardClass()}>
          <h3 className="font-display text-2xl text-white">Upload Online Mock Test</h3>
          <p className="mt-2 text-sm text-slate-300">
            Yahan se online mock ka link ya PDF/file upload karke Mock Tests page par publish karein.
          </p>

          <div className="mt-5 grid gap-3">
            <Field label="Mock Test Title">
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="SSC CGL Full Mock 2" />
            </Field>
            <Field label="Exam Name">
              <Select value={form.examName} onChange={(e) => applyExamDefaults(e.target.value)}>
                {Object.keys(examPatternDefaults).map((examName) => (
                  <option key={examName} value={examName}>{examName}</option>
                ))}
                <option value="State PSC">State PSC</option>
              </Select>
            </Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Questions">
                <Input type="number" min="1" value={form.questions} onChange={(e) => setForm({ ...form, questions: e.target.value })} placeholder="100" />
              </Field>
              <Field label="Total Marks">
                <Input type="number" min="1" value={form.marks} onChange={(e) => setForm({ ...form, marks: e.target.value })} placeholder="200" />
              </Field>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Duration">
                <Input value={form.duration} onChange={(e) => setForm({ ...form, duration: e.target.value })} placeholder="60 min" />
              </Field>
              <Field label="Section Timing">
                <Input value={form.sectionTiming} onChange={(e) => setForm({ ...form, sectionTiming: e.target.value })} placeholder="Maths 20m, Reasoning 20m" />
              </Field>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Negative Marking">
                <Input value={form.negativeMarking} onChange={(e) => setForm({ ...form, negativeMarking: e.target.value })} placeholder="0.50 mark" />
              </Field>
              <Field label="Question Language">
                <Select value={form.language} onChange={(e) => setForm({ ...form, language: e.target.value })}>
                  <option value="Hindi + English">Hindi + English</option>
                  <option value="Hindi">Hindi</option>
                  <option value="English">English</option>
                </Select>
              </Field>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Exam Mode">
                <Select value={form.examMode} onChange={(e) => setForm({ ...form, examMode: e.target.value })}>
                  {enterpriseExamModes.map((mode) => (
                    <option key={mode} value={mode}>{mode}</option>
                  ))}
                </Select>
              </Field>
              <Field label="Access">
                <Select value={form.accessType} onChange={(e) => setForm({ ...form, accessType: e.target.value })}>
                  <option value="Free">Free</option>
                  <option value="Paid">Paid</option>
                </Select>
              </Field>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Difficulty">
                <Select value={form.difficulty} onChange={(e) => setForm({ ...form, difficulty: e.target.value })}>
                  <option value="Easy">Easy</option>
                  <option value="Medium">Medium</option>
                  <option value="Hard">Hard</option>
                </Select>
              </Field>
              <Field label="Result Visibility">
                <Select value={form.resultVisibility} onChange={(e) => setForm({ ...form, resultVisibility: e.target.value })}>
                  <option value="Instant">Instant</option>
                  <option value="After Schedule">After Schedule</option>
                  <option value="Manual Publish">Manual Publish</option>
                </Select>
              </Field>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Test Schedule">
                <Input value={form.schedule} onChange={(e) => setForm({ ...form, schedule: e.target.value })} placeholder="Sunday 10:00 AM" />
              </Field>
              <Field label="Status">
                <Select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                  <option value="published">Published</option>
                  <option value="draft">Draft</option>
                </Select>
              </Field>
            </div>
            <Field label="Online Test Link">
              <Input value={form.testUrl} onChange={(e) => setForm({ ...form, testUrl: e.target.value })} placeholder="Google Form / test portal URL" />
            </Field>
            <Field label="Upload File">
              <input
                type="file"
                accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.txt"
                onChange={handleFileUpload}
                className="rounded-xl border border-white/10 bg-[#081127] px-3 py-2 text-sm text-white outline-none file:mr-3 file:rounded-lg file:border-0 file:bg-orange-500 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-white"
              />
            </Field>
            <button
              type="button"
              onClick={uploadPdfToMockEngine}
              disabled={autoUploadBusy || !selectedMockFile}
              className="rounded-xl border border-cyan-300/30 bg-cyan-400/10 px-4 py-2 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-400/15 disabled:opacity-60"
            >
              {autoUploadBusy ? "AI Filter Processing..." : "AI Auto Generate Full + Topic Mocks"}
            </button>
            <p className="text-xs text-slate-400">
              PDF upload karte hi engine exam, subject, topic, questions, options aur answer key detect karke full mock + section mocks publish karega.
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Source Type">
                <Select value={form.sourceType} onChange={(e) => setForm({ ...form, sourceType: e.target.value })}>
                  <option value="manual">Manual</option>
                  <option value="pdf">PDF</option>
                  <option value="ocr">Scanned PDF / OCR</option>
                  <option value="file">Uploaded File</option>
                </Select>
              </Field>
              <Field label="AI Pipeline Stage">
                <Select value={form.pipelineStage} onChange={(e) => setForm({ ...form, pipelineStage: e.target.value })}>
                  {aiMockPipelineSteps.map((step) => (
                    <option key={step} value={step}>{step}</option>
                  ))}
                </Select>
              </Field>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Review Status">
                <Select value={form.reviewStatus} onChange={(e) => setForm({ ...form, reviewStatus: e.target.value })}>
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="needs edits">Needs Edits</option>
                </Select>
              </Field>
              <Field label="Duplicate Check">
                <Select value={form.duplicateCheck} onChange={(e) => setForm({ ...form, duplicateCheck: e.target.value })}>
                  <option value="pending">Pending</option>
                  <option value="clear">Clear</option>
                  <option value="possible duplicates">Possible Duplicates</option>
                </Select>
              </Field>
            </div>
            <Field label="Detected Topics">
              <Input value={form.topicsDetected} onChange={(e) => setForm({ ...form, topicsDetected: e.target.value })} placeholder="Percentage, Series, GK, English" />
            </Field>
            <Field label="Answer Validation">
              <Input value={form.validationStatus} onChange={(e) => setForm({ ...form, validationStatus: e.target.value })} placeholder="needs review / answer-key verified" />
            </Field>
            {form.fileName ? <p className="text-xs text-cyan-200">Selected file: {form.fileName}</p> : null}
            <button onClick={saveMockTest} className="rounded-xl bg-orange-500 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-400">
              Save Mock Test
            </button>
            {notice ? (
              <div className="rounded-xl border border-orange-300/30 bg-orange-500/10 px-4 py-3 text-sm text-orange-100">
                {notice}
              </div>
            ) : null}
          </div>
        </div>

        <div className={panelCardClass("xl:col-span-2")}>
          <h3 className="font-display text-2xl text-white">Assign Mock to Course</h3>
          <p className="mt-2 text-sm text-slate-300">Published AI/PDF mock ko purchased course ke Tests tab me add karein.</p>
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            <Field label="Course">
              <Select value={assignmentForm.courseRouteId} onChange={(e) => setAssignmentForm({ ...assignmentForm, courseRouteId: e.target.value })}>
                <option value="">Choose course</option>
                {adminCourses.map((course) => {
                  const routeId = String(course.routeId || course.slug || course._id || course.id || "");
                  return <option key={routeId} value={routeId}>{course.title || routeId}</option>;
                })}
              </Select>
            </Field>
            <Field label="Published Mock">
              <Select value={assignmentForm.mockId} onChange={(e) => setAssignmentForm({ ...assignmentForm, mockId: e.target.value })}>
                <option value="">Choose mock</option>
                {courseMocks.map((mock) => <option key={mock.id} value={mock.id}>{mock.title} ({mock.questions?.length || 0} questions)</option>)}
              </Select>
            </Field>
          </div>
          <button type="button" onClick={assignMockToCourse} disabled={assignmentBusy || !assignmentForm.courseRouteId || !assignmentForm.mockId} className="mt-4 w-full rounded-xl bg-cyan-500 px-4 py-3 text-sm font-bold text-slate-950 disabled:opacity-50">
            {assignmentBusy ? "Assigning..." : "Add Mock to Course"}
          </button>
          {assignmentNotice ? <p className="mt-3 rounded-xl border border-white/10 bg-[#081127] px-3 py-2 text-sm text-slate-200">{assignmentNotice}</p> : null}
        </div>
        <div className={panelCardClass()}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="font-display text-2xl text-white">Online Mock Tests</h3>
              <p className="mt-2 text-sm text-slate-300">Published tests student Mock Tests page par dikhenge. Draft tests admin panel mein hi rahenge.</p>
            </div>
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-300">
              {mockTests.length} total
            </span>
          </div>

          <div className="mt-5 grid gap-3">
            {mockTests.length ? (
              mockTests.map((item) => (
                <div key={item.id} className="rounded-2xl border border-white/10 bg-[#081127] p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-white">{item.title}</p>
                      <p className="mt-1 text-sm text-slate-300">
                        {[item.examName, item.questions ? `${item.questions} questions` : "", item.marks ? `${item.marks} marks` : "", item.duration, item.difficulty, item.accessType].filter(Boolean).join(" | ")}
                      </p>
                      <p className="mt-1 text-xs text-slate-400">
                        {[item.sectionTiming, item.negativeMarking, item.language, item.resultVisibility].filter(Boolean).join(" | ")}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">{item.fileName || item.testUrl || "No link/file added yet"}</p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {[item.pipelineStage, item.reviewStatus, item.sourceType, item.duplicateCheck, item.validationStatus]
                          .filter(Boolean)
                          .map((tag) => (
                            <span key={tag} className="rounded-full border border-cyan-300/20 bg-cyan-400/10 px-3 py-1 text-[11px] text-cyan-100">
                              {tag}
                            </span>
                          ))}
                      </div>
                      {Array.isArray(item.topicsDetected) && item.topicsDetected.length ? (
                        <p className="mt-2 text-xs text-slate-400">Topics: {item.topicsDetected.join(", ")}</p>
                      ) : null}
                    </div>
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${item.status === "published" ? "bg-emerald-500/15 text-emerald-200" : "bg-slate-500/15 text-slate-200"}`}>
                      {item.status === "published" ? "Published" : "Draft"}
                    </span>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      onClick={() => updateMockStatus(item.id, item.status === "published" ? "draft" : "published")}
                      className="rounded-lg border border-white/10 px-3 py-2 text-xs text-white hover:border-orange-300/40"
                    >
                      {item.status === "published" ? "Move to Draft" : "Publish"}
                    </button>
                    {item.testUrl ? (
                      <a href={item.testUrl} target="_blank" rel="noreferrer" className="rounded-lg border border-cyan-300/30 px-3 py-2 text-xs text-cyan-100 hover:bg-cyan-400/10">
                        Open
                      </a>
                    ) : null}
                    <button
                      onClick={() => deleteMockTest(item.id)}
                      className="rounded-lg border border-rose-300/30 px-3 py-2 text-xs text-rose-200 hover:bg-rose-500/15"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-white/15 bg-[#081127] p-5 text-sm text-slate-400">
                Abhi koi online mock test add nahi hua hai.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export function NotificationCenter({ workspace, setWorkspace }) {
  const [form, setForm] = useState({ title: "", message: "", channel: "in-app", audience: "all" });

  const saveNotification = () => {
    if (!form.title.trim() || !form.message.trim()) return;
    setWorkspace((current) => ({
      ...current,
      notifications: [{ id: createAdminId("notice"), ...form }, ...current.notifications]
    }));
    setForm({ title: "", message: "", channel: "in-app", audience: "all" });
  };

  return (
    <div className="grid gap-5 xl:grid-cols-[360px_minmax(0,1fr)]">
      <div className={panelCardClass()}>
        <h3 className="font-display text-2xl text-white">Send Notification</h3>
        <div className="mt-4 grid gap-3">
          <Field label="Title"><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="New batch launched" /></Field>
          <Field label="Message"><Textarea rows={4} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} placeholder="Write student facing message" /></Field>
          <Field label="Channel">
            <Select value={form.channel} onChange={(e) => setForm({ ...form, channel: e.target.value })}>
              <option value="in-app">In-App</option>
              <option value="email">Email</option>
              <option value="both">Email + In-App</option>
            </Select>
          </Field>
          <Field label="Audience">
            <Select value={form.audience} onChange={(e) => setForm({ ...form, audience: e.target.value })}>
              <option value="all">All</option>
              <option value="students">Students</option>
              <option value="teachers">Teachers</option>
            </Select>
          </Field>
          <button onClick={saveNotification} className="rounded-xl bg-orange-500 px-4 py-2 text-sm font-semibold text-white">Send</button>
        </div>
      </div>
      <div className={panelCardClass()}>
        <h3 className="font-display text-2xl text-white">Recent Notifications</h3>
        <div className="mt-4 grid gap-3">
          {workspace.notifications.map((item) => (
            <div key={item.id} className="rounded-2xl border border-white/10 bg-[#081127] p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-lg font-semibold text-white">{item.title}</p>
                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-300">{item.channel}</span>
              </div>
              <p className="mt-2 text-sm text-slate-300">{item.message}</p>
              <p className="mt-3 text-xs uppercase tracking-[0.18em] text-slate-500">Audience: {item.audience}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const TICKER_STORAGE_KEY = "badamclasses_site_notice";
const emptyEnquiryPopupForm = {
  enabled: false,
  title: "Start your preparation with expert guidance",
  subtitle: "Share your details and our academic team will help you choose the right course.",
  buttonLabel: "Send enquiry",
  delaySeconds: 3
};

export function EnquiryPopupEditor() {
  const [form, setForm] = useState(emptyEnquiryPopupForm);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    apiFetch("/automation/dashboard")
      .then((data) => {
        const saved = data?.dashboard?.siteContent?.enquiryPopup;
        if (active && saved && typeof saved === "object") setForm({ ...emptyEnquiryPopupForm, ...saved, enabled: saved.enabled === true });
      })
      .catch(() => {});
    return () => { active = false; };
  }, []);

  const submitForApproval = async () => {
    setSaving(true);
    setMessage("");
    try {
      const payload = {
        ...form,
        title: form.title.trim(),
        subtitle: form.subtitle.trim(),
        buttonLabel: form.buttonLabel.trim(),
        delaySeconds: Math.max(3, Number(form.delaySeconds) || 3)
      };
      await apiFetch("/automation/content/propose", {
        method: "POST",
        body: JSON.stringify({
          target: "enquiryPopup",
          payload,
          summary: `${payload.enabled ? "Show" : "Hide"} homepage enquiry popup`
        })
      });
      setMessage(payload.enabled ? "Popup update submitted for approval." : "Hide request submitted for approval.");
    } catch (error) {
      setMessage(error.message || "Popup update submit nahi hua.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={panelCardClass()}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-orange-300">Homepage enquiry</p>
          <h3 className="mt-2 font-display text-2xl text-white">Mobile Enquiry Popup</h3>
          <p className="mt-2 text-sm text-slate-300">Popup form ko publish, hide, ya content update karein. Changes approval ke baad live honge.</p>
        </div>
        <label className="flex min-h-11 items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-200">
          <input type="checkbox" checked={form.enabled} onChange={(event) => setForm((current) => ({ ...current, enabled: event.target.checked }))} className="h-5 w-5 accent-orange-500" />
          Show popup
        </label>
      </div>
      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <Field label="Popup title"><Input value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} disabled={!form.enabled} /></Field>
        <Field label="Button label"><Input value={form.buttonLabel} onChange={(event) => setForm((current) => ({ ...current, buttonLabel: event.target.value }))} disabled={!form.enabled} /></Field>
        <Field label="Popup message"><Textarea rows={3} value={form.subtitle} onChange={(event) => setForm((current) => ({ ...current, subtitle: event.target.value }))} disabled={!form.enabled} /></Field>
        <Field label="Show after (seconds)"><Input type="number" min="3" max="30" value={form.delaySeconds} onChange={(event) => setForm((current) => ({ ...current, delaySeconds: event.target.value }))} disabled={!form.enabled} /></Field>
      </div>
      <div className="mt-5 flex flex-wrap gap-3">
        <button type="button" onClick={submitForApproval} disabled={saving} className="min-h-11 rounded-xl bg-orange-500 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">
          {saving ? "Submitting..." : form.enabled ? "Submit popup update" : "Submit hide request"}
        </button>
      </div>
      {message ? <p className="mt-4 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-200" role="status">{message}</p> : null}
    </div>
  );
}

const emptyTickerForm = {
  enabled: true,
  title: "",
  message: "",
  priority: "Update",
  linkLabel: "Details",
  link: ""
};

export function AnnouncementTickerEditor() {
  const [form, setForm] = useState(emptyTickerForm);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    try {
      const saved = JSON.parse(window.localStorage.getItem(TICKER_STORAGE_KEY) || "null");
      if (saved && typeof saved === "object") {
        setForm({ ...emptyTickerForm, ...saved, enabled: saved.enabled !== false });
      }
    } catch {
      setForm(emptyTickerForm);
    }
  }, []);

  const previewTicker = () => {
    if (form.enabled && !form.title.trim() && !form.message.trim()) {
      setMessage("Title ya message enter karein.");
      return;
    }
    window.localStorage.setItem(TICKER_STORAGE_KEY, JSON.stringify(form));
    window.dispatchEvent(new Event("storage"));
    setMessage(form.enabled ? "Ticker preview saved on this browser." : "Ticker hidden on this browser.");
  };

  const submitForApproval = async () => {
    if (form.enabled && !form.title.trim() && !form.message.trim()) {
      setMessage("Title ya message enter karein.");
      return;
    }
    setSaving(true);
    setMessage("");
    try {
      const response = await apiFetch("/automation/content/propose", {
        method: "POST",
        body: JSON.stringify({
          target: "notice",
          payload: form,
          summary: `${form.enabled ? "Publish" : "Hide"} announcement ticker: ${form.title || "Untitled"}`
        })
      });
      previewTicker();
      setMessage(`Approval request created: ${response?.pendingChange?.id || "pending"}. Approvals section se publish karein.`);
    } catch (error) {
      setMessage(error.message || "Ticker approval request create nahi hua.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={panelCardClass()}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-orange-300">Website Header</p>
          <h3 className="mt-2 font-display text-2xl text-white">Announcement Ticker Editor</h3>
          <p className="mt-2 text-sm text-slate-300">Top scrolling announcement, badge aur action button edit karein.</p>
        </div>
        <label className="flex min-h-11 items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-200">
          <input
            type="checkbox"
            checked={form.enabled}
            onChange={(event) => setForm((current) => ({ ...current, enabled: event.target.checked }))}
            className="h-5 w-5 accent-orange-500"
          />
          Show ticker
        </label>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <Field label="Badge / Priority">
          <Input value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })} placeholder="Fixed / New / Alert" />
        </Field>
        <Field label="Title">
          <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Account Update" />
        </Field>
        <Field label="Message">
          <Textarea rows={3} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} placeholder="Announcement message" />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Button Label">
            <Input value={form.linkLabel} onChange={(e) => setForm({ ...form, linkLabel: e.target.value })} placeholder="Register" />
          </Field>
          <Field label="Button Link">
            <Input value={form.link} onChange={(e) => setForm({ ...form, link: e.target.value })} placeholder="/signup" />
          </Field>
        </div>
      </div>

      <div className="mt-5 overflow-hidden rounded-xl border border-white/10 bg-[#081127]">
        <div className="flex min-h-11 items-center gap-3 px-4 text-sm">
          <span className="rounded-full border border-cyan-300/30 bg-cyan-500/10 px-3 py-1 text-xs font-bold uppercase text-cyan-100">{form.priority || "Info"}</span>
          <p className="min-w-0 flex-1 truncate text-slate-100">
            <span className="font-bold text-orange-300">{form.title || "Announcement title"}</span>
            {form.message ? ` - ${form.message}` : ""}
          </p>
          {form.link && form.linkLabel ? <span className="rounded-lg border border-white/15 px-3 py-2 text-xs font-semibold text-white">{form.linkLabel}</span> : null}
        </div>
      </div>

      <div className="mt-5 flex flex-wrap gap-3">
        <button type="button" onClick={previewTicker} className="min-h-11 rounded-xl border border-orange-300/35 bg-orange-500/10 px-4 py-2 text-sm font-semibold text-orange-100">
          Save Local Preview
        </button>
        <button type="button" onClick={submitForApproval} disabled={saving} className="min-h-11 rounded-xl bg-orange-500 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">
          {saving ? "Submitting..." : "Submit for Publishing"}
        </button>
      </div>
      {message ? <p className="mt-4 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-200" role="status">{message}</p> : null}
    </div>
  );
}

export function MediaLibrary({ workspace, setWorkspace }) {
  const [form, setForm] = useState({ name: "", type: "image", url: "", tag: "" });

  const saveMedia = () => {
    if (!form.name.trim() || !form.url.trim()) return;
    setWorkspace((current) => ({
      ...current,
      media: [{ id: createAdminId("media"), ...form }, ...current.media]
    }));
    setForm({ name: "", type: "image", url: "", tag: "" });
  };

  return (
    <div className="grid gap-5 xl:grid-cols-[360px_minmax(0,1fr)]">
      <div className={panelCardClass()}>
        <h3 className="font-display text-2xl text-white">Add Media</h3>
        <div className="mt-4 grid gap-3">
          <Field label="Name"><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Banner / Notes / Thumbnail" /></Field>
          <Field label="Type">
            <Select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
              <option value="image">Image</option>
              <option value="pdf">PDF</option>
              <option value="video">Video</option>
            </Select>
          </Field>
          <Field label="URL"><Input value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} placeholder="https://..." /></Field>
          <Field label="Tag"><Input value={form.tag} onChange={(e) => setForm({ ...form, tag: e.target.value })} placeholder="banner / notes / seo" /></Field>
          <button onClick={saveMedia} className="rounded-xl bg-orange-500 px-4 py-2 text-sm font-semibold text-white">Save Media</button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {workspace.media.map((item) => (
          <div key={item.id} className={panelCardClass()}>
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">{item.type}</p>
            <h3 className="mt-2 text-lg font-semibold text-white">{item.name}</h3>
            <p className="mt-2 break-all text-sm text-slate-300">{item.url}</p>
            <p className="mt-3 text-xs uppercase tracking-[0.18em] text-orange-200">{item.tag || "general"}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export function SuccessStoriesManager() {
  const [stories, setStories] = useState(() =>
    testimonials.map((story, index) => ({ ...story, id: story.id || "story_default_" + (index + 1) }))
  );
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingId, setUploadingId] = useState("");

  useEffect(() => {
    let active = true;
    apiFetch("/automation/dashboard")
      .then((data) => {
        const published = data?.siteContent?.successStories;
        if (active && Array.isArray(published) && published.length) {
          setStories(published.map((story, index) => ({ ...story, id: story.id || "story_published_" + (index + 1) })));
        }
      })
      .catch((error) => {
        if (active) setMessage(error.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const updateStory = (id, field, value) => {
    setStories((current) => current.map((story) => (story.id === id ? { ...story, [field]: value } : story)));
  };

  const addStory = () => {
    setStories((current) => [
      ...current,
      { id: createAdminId("story"), name: "", exam: "", review: "", image: "" }
    ]);
  };

  const removeStory = (id) => {
    setStories((current) => current.filter((story) => story.id !== id));
  };

  const uploadPoster = async (id, file) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setMessage("Please select a JPG, PNG, WEBP, or GIF image.");
      return;
    }
    setUploadingId(id);
    setMessage("");
    try {
      const body = new FormData();
      body.append("file", file);
      const result = await apiFetch("/upload", { method: "POST", body, timeoutMs: 30000 });
      updateStory(id, "image", result.url || "");
      setMessage("Poster uploaded. Submit for approval to publish it.");
    } catch (error) {
      setMessage(error.message);
    } finally {
      setUploadingId("");
    }
  };

  const submitForApproval = async () => {
    const cleaned = stories
      .map((story) => ({
        id: String(story.id || createAdminId("story")),
        name: String(story.name || "").trim(),
        exam: String(story.exam || "").trim(),
        review: String(story.review || "").trim(),
        image: String(story.image || "").trim()
      }))
      .filter((story) => story.name || story.exam || story.image);

    if (!cleaned.length || cleaned.some((story) => !story.name || !story.exam || !story.image)) {
      setMessage("Every story needs a student name, exam, and poster image.");
      return;
    }

    setSubmitting(true);
    setMessage("");
    try {
      await apiFetch("/automation/content/propose", {
        method: "POST",
        body: JSON.stringify({
          target: "successStories",
          payload: cleaned,
          summary: `Update ${cleaned.length} homepage success stories`
        })
      });
      setStories(cleaned);
      setMessage("Success Stories update submitted. Approve it from Advanced AI Features > Pending approvals.");
    } catch (error) {
      setMessage(error.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={panelCardClass()}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-orange-300">Homepage content</p>
          <h3 className="mt-2 font-display text-2xl text-white">Student Success Stories</h3>
          <p className="mt-2 max-w-2xl text-sm text-slate-300">Add student selection posters here. Changes enter the existing approval queue before going live.</p>
        </div>
        <button type="button" onClick={addStory} className="rounded-xl border border-orange-300/40 px-4 py-2 text-sm font-semibold text-orange-200">+ Add Story</button>
      </div>

      {loading ? <p className="mt-5 text-sm text-slate-400">Loading published stories...</p> : null}
      <div className="mt-5 grid gap-4 xl:grid-cols-2">
        {stories.map((story, index) => (
          <div key={story.id || index} className="grid gap-4 rounded-2xl border border-white/10 bg-[#081127]/70 p-4 sm:grid-cols-[9rem_1fr]">
            <div>
              <div className="aspect-[4/5] overflow-hidden rounded-xl border border-white/10 bg-white">
                {story.image ? <img src={story.image} alt={story.name || "Success poster preview"} className="h-full w-full object-contain" /> : <div className="grid h-full place-items-center px-3 text-center text-xs text-slate-500">Poster preview</div>}
              </div>
              <label className="mt-3 block cursor-pointer rounded-xl border border-white/15 px-3 py-2 text-center text-xs font-semibold text-slate-200">
                {uploadingId === story.id ? "Uploading..." : "Upload Poster"}
                <input type="file" accept="image/png,image/jpeg,image/webp,image/gif" className="hidden" disabled={uploadingId === story.id} onChange={(event) => uploadPoster(story.id, event.target.files?.[0])} />
              </label>
            </div>
            <div className="grid content-start gap-3">
              <Field label="Student Name"><Input value={story.name || ""} onChange={(event) => updateStory(story.id, "name", event.target.value)} placeholder="Student name" /></Field>
              <Field label="Exam / Selection"><Input value={story.exam || ""} onChange={(event) => updateStory(story.id, "exam", event.target.value)} placeholder="MP Police Sub Inspector (SI)" /></Field>
              <Field label="Short note (optional)"><Textarea rows={2} value={story.review || ""} onChange={(event) => updateStory(story.id, "review", event.target.value)} placeholder="Selected as..." /></Field>
              <Field label="Poster URL"><Input value={story.image || ""} onChange={(event) => updateStory(story.id, "image", event.target.value)} placeholder="Upload or paste image URL" /></Field>
              <button type="button" onClick={() => removeStory(story.id)} className="justify-self-start text-xs font-semibold text-red-300 hover:text-red-200">Remove story</button>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <button type="button" onClick={submitForApproval} disabled={submitting || Boolean(uploadingId)} className="rounded-xl bg-orange-500 px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50">
          {submitting ? "Submitting..." : "Submit for approval"}
        </button>
        <span className="text-xs text-slate-400">Maximum 24 stories. Published order matches this list.</span>
      </div>
      {message ? <div className="mt-4 rounded-xl border border-orange-300/30 bg-orange-500/10 px-4 py-3 text-sm text-orange-100">{message}</div> : null}
    </div>
  );
}
export function WebsiteSettings({ workspace, setWorkspace }) {
  const settings = workspace.settings || {};

  const updateSetting = (field, value) => {
    setWorkspace((current) => ({
      ...current,
      settings: {
        ...current.settings,
        [field]: value
      }
    }));
  };

  return (
    <div className="grid gap-5 xl:grid-cols-2">
      <div className={panelCardClass()}>
        <h3 className="font-display text-2xl text-white">Website Settings</h3>
        <div className="mt-4 grid gap-3">
          <Field label="Logo URL"><Input value={settings.logoUrl || ""} onChange={(e) => updateSetting("logoUrl", e.target.value)} /></Field>
          <Field label="Banner Title"><Input value={settings.bannerTitle || ""} onChange={(e) => updateSetting("bannerTitle", e.target.value)} /></Field>
          <Field label="SEO Title"><Input value={settings.seoTitle || ""} onChange={(e) => updateSetting("seoTitle", e.target.value)} /></Field>
          <Field label="SEO Description"><Textarea rows={4} value={settings.seoDescription || ""} onChange={(e) => updateSetting("seoDescription", e.target.value)} /></Field>
          <Field label="Support Email"><Input value={settings.supportEmail || ""} onChange={(e) => updateSetting("supportEmail", e.target.value)} /></Field>
        </div>
      </div>
      <div className={panelCardClass()}>
        <h3 className="font-display text-2xl text-white">Live Preview</h3>
        <div className="mt-4 rounded-3xl border border-white/10 bg-[#081127] p-5">
          <img src={settings.logoUrl || "/new-logo.webp"} alt="Logo preview" className="h-16 w-16 rounded-2xl object-contain" />
          <h4 className="mt-4 font-display text-3xl text-white">{settings.bannerTitle || "Banner title"}</h4>
          <p className="mt-3 text-sm text-slate-300">{settings.seoDescription || "SEO description will appear here."}</p>
          <p className="mt-4 text-xs uppercase tracking-[0.18em] text-orange-200">{settings.supportEmail || "support@example.com"}</p>
        </div>
      </div>
    </div>
  );
}

export function WebsiteMaintenanceAssistant({ workspace, metrics, notice, automation = {}, onApplySuggestions, onToggleAutoApply }) {
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [applying, setApplying] = useState(false);
  const [reply, setReply] = useState("");
  const [health, setHealth] = useState(null);
  const [suggestedUpdates, setSuggestedUpdates] = useState({ settings: {}, notice: {} });
  const [applyStatus, setApplyStatus] = useState("");

  const hasSuggestions = useMemo(() => {
    const settings = suggestedUpdates?.settings || {};
    const nextNotice = suggestedUpdates?.notice || {};
    return Object.values(settings).some(Boolean) || Object.values(nextNotice).some(Boolean);
  }, [suggestedUpdates]);

  const autoApplyEnabled = Boolean(automation?.aiAutoApply);
  const lastAppliedSummary = useMemo(() => {
    if (!automation?.lastAppliedAt) {
      return "";
    }
    const fields = Array.isArray(automation?.lastAppliedFields) ? automation.lastAppliedFields : [];
    const fieldText = fields.length ? ` (${fields.join(", ")})` : "";
    return `Last applied: ${formatStableDateTime(automation.lastAppliedAt)}${fieldText}`;
  }, [automation]);

  const applySuggestions = async (updates, modeLabel = "Applied") => {
    if (!updates) return;
    setApplying(true);
    try {
      const result = await onApplySuggestions?.(updates);
      if (result?.applied) {
        setApplyStatus(`${modeLabel} AI updates: ${result.fields.join(", ")}`);
      } else {
        setApplyStatus("No new AI update fields were available to apply.");
      }
    } catch {
      setApplyStatus("AI suggestions could not be applied right now.");
    } finally {
      setApplying(false);
    }
  };

  const runAssistant = async () => {
    if (!message.trim()) return;
    setLoading(true);
    setApplyStatus("");
    try {
      const response = await apiFetch("/chatbot/admin-assistant", {
        method: "POST",
        body: JSON.stringify({
          message,
          workspace: {
            settings: workspace.settings || {},
            metrics,
            notice
          },
          history: reply ? [{ role: "assistant", content: reply }] : []
        })
      });

      setReply(response?.reply || "");
      setHealth(response?.health || null);
      const nextUpdates = response?.suggestedUpdates || { settings: {}, notice: {} };
      setSuggestedUpdates(nextUpdates);
      if (autoApplyEnabled) {
        const settings = nextUpdates?.settings || {};
        const nextNotice = nextUpdates?.notice || {};
        const hasAutoApplyContent = Object.values(settings).some(Boolean) || Object.values(nextNotice).some(Boolean);
        if (hasAutoApplyContent) {
          await applySuggestions(nextUpdates, "Auto-applied");
        } else {
          setApplyStatus("AI reviewed the request, but there were no safe admin-side updates to auto-apply.");
        }
      }
    } catch (error) {
      setReply(error.message || "AI assistant could not complete the request right now.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
        <div className={panelCardClass()}>
          <h3 className="font-display text-2xl text-white">Website Maintenance AI Assistant</h3>
          <p className="mt-3 text-sm text-slate-300">
            Ask for health review, SEO/banner improvements, homepage notice suggestions, or safe admin-side website updates.
          </p>
          <div className="mt-4 grid gap-3">
            <Textarea
              rows={5}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Example: review website health and suggest homepage SEO + notice update"
            />
            <div className="flex flex-wrap gap-3">
              <button
                onClick={runAssistant}
                disabled={loading}
                className="rounded-xl bg-orange-500 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-400 disabled:opacity-70"
              >
                {loading ? "Reviewing..." : "Run AI Assistant"}
              </button>
              {hasSuggestions ? (
                <button
                  onClick={() => applySuggestions(suggestedUpdates)}
                  disabled={applying}
                  className="rounded-xl border border-cyan-300/30 bg-cyan-400/10 px-4 py-2 text-sm font-semibold text-cyan-100 disabled:opacity-70"
                >
                  {applying ? "Applying..." : "Apply Suggested Updates"}
                </button>
              ) : null}
            </div>
            <label className="flex items-center gap-3 text-sm text-slate-200">
              <input
                type="checkbox"
                checked={autoApplyEnabled}
                onChange={(e) => onToggleAutoApply?.(e.target.checked)}
              />
              Auto-apply safe AI updates after review
            </label>
          </div>
          {reply ? (
            <div className="mt-5 rounded-2xl border border-white/10 bg-[#081127] p-4">
              <p className="text-xs uppercase tracking-[0.22em] text-orange-300">Assistant Reply</p>
              <p className="mt-3 text-sm text-slate-200">{reply}</p>
            </div>
          ) : null}
          {applyStatus ? (
            <div className="rounded-2xl border border-emerald-300/20 bg-emerald-500/10 p-4 text-sm text-emerald-100">
              {applyStatus}
            </div>
          ) : null}
          {lastAppliedSummary ? <p className="text-xs text-slate-400">{lastAppliedSummary}</p> : null}
        </div>

        <div className="space-y-5">
          <div className={panelCardClass()}>
            <h3 className="font-display text-2xl text-white">Health Snapshot</h3>
            <div className="mt-4 grid gap-3">
              {[
                `Backend: ${health?.backend || "Unknown"}`,
                `Database: ${health?.database?.status || "Unknown"}`,
                `Razorpay configured: ${health?.payment?.razorpayConfigured ? "Yes" : "No"}`,
                `Mode: ${health?.payment?.mode || "Unknown"}`
              ].map((item) => (
                <div key={item} className="rounded-2xl border border-white/10 bg-[#081127] p-4 text-sm text-slate-200">
                  {item}
                </div>
              ))}
            </div>
          </div>

          <div className={panelCardClass()}>
            <h3 className="font-display text-2xl text-white">Suggested Website Updates</h3>
            <div className="mt-4 grid gap-3 text-sm text-slate-200">
              <div className="rounded-2xl border border-white/10 bg-[#081127] p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Banner</p>
                <p className="mt-2">{suggestedUpdates?.settings?.bannerTitle || "No banner suggestion yet."}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-[#081127] p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-400">SEO</p>
                <p className="mt-2">{suggestedUpdates?.settings?.seoTitle || "No SEO title suggestion yet."}</p>
                <p className="mt-2 text-slate-300">{suggestedUpdates?.settings?.seoDescription || "No SEO description suggestion yet."}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-[#081127] p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Notice</p>
                <p className="mt-2">{suggestedUpdates?.notice?.title || "No notice title suggestion yet."}</p>
                <p className="mt-2 text-slate-300">{suggestedUpdates?.notice?.message || "No notice message suggestion yet."}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function AutomationOpsPanel() {
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [busyId, setBusyId] = useState("");

  const loadDashboard = async () => {
    setLoading(true);
    try {
      const response = await apiFetch("/automation/dashboard");
      setDashboard(response?.dashboard || null);
      setMessage("");
    } catch (error) {
      setMessage(error.message || "Automation dashboard could not be loaded.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  const toggleFlag = async (flagName, value) => {
    setBusyId(flagName);
    try {
      await apiFetch("/automation/feature-flags", {
        method: "PATCH",
        body: JSON.stringify({ [flagName]: value })
      });
      await loadDashboard();
      setMessage(`Updated ${flagName} to ${value ? "ON" : "OFF"}.`);
    } catch (error) {
      setMessage(error.message || "Feature flag update failed.");
    } finally {
      setBusyId("");
    }
  };

  const approveChange = async (pendingId) => {
    setBusyId(pendingId);
    try {
      await apiFetch(`/automation/content/approve/${pendingId}`, {
        method: "POST",
        body: JSON.stringify({})
      });
      await loadDashboard();
      setMessage(`Approved ${pendingId}.`);
    } catch (error) {
      setMessage(error.message || "Approval failed.");
    } finally {
      setBusyId("");
    }
  };

  const rejectChange = async (pendingId) => {
    setBusyId(pendingId);
    try {
      await apiFetch(`/automation/content/reject/${pendingId}`, {
        method: "POST",
        body: JSON.stringify({})
      });
      await loadDashboard();
      setMessage(`Rejected ${pendingId}.`);
    } catch (error) {
      setMessage(error.message || "Reject action failed.");
    } finally {
      setBusyId("");
    }
  };

  const runBackup = async () => {
    setBusyId("backup");
    try {
      await apiFetch("/automation/backups/run", {
        method: "POST",
        body: JSON.stringify({})
      });
      await loadDashboard();
      setMessage("Manual backup created successfully.");
    } catch (error) {
      setMessage(error.message || "Backup could not be created.");
    } finally {
      setBusyId("");
    }
  };

  const undoLastChange = async () => {
    setBusyId("undo");
    try {
      await apiFetch("/automation/content/undo", {
        method: "POST",
        body: JSON.stringify({})
      });
      await loadDashboard();
      setMessage("Last approved content change was undone.");
    } catch (error) {
      setMessage(error.message || "Undo failed.");
    } finally {
      setBusyId("");
    }
  };

  return (
    <div className="space-y-5">
      <div className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
        <div className={panelCardClass()}>
          <h3 className="font-display text-2xl text-white">Phase 1 Automation Controls</h3>
          <p className="mt-3 text-sm text-slate-300">
            Safe automation only: Telegram content bot, approval-first publishing, backups, undo, logs, and health visibility.
          </p>
          <div className="mt-5 grid gap-3">
            {Object.entries(dashboard?.featureFlags || {}).map(([flagName, flagValue]) => (
              <label key={flagName} className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-[#081127] p-4 text-sm text-slate-200">
                <span>{flagName}</span>
                <input
                  type="checkbox"
                  checked={Boolean(flagValue)}
                  onChange={(event) => toggleFlag(flagName, event.target.checked)}
                  disabled={busyId === flagName}
                />
              </label>
            ))}
          </div>
          <div className="mt-5 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={runBackup}
              disabled={busyId === "backup"}
              className="rounded-xl border border-cyan-300/30 bg-cyan-400/10 px-4 py-2 text-sm font-semibold text-cyan-100 disabled:opacity-70"
            >
              {busyId === "backup" ? "Creating Backup..." : "Run Backup"}
            </button>
            <button
              type="button"
              onClick={undoLastChange}
              disabled={busyId === "undo"}
              className="rounded-xl border border-orange-300/30 bg-orange-500/10 px-4 py-2 text-sm font-semibold text-orange-100 disabled:opacity-70"
            >
              {busyId === "undo" ? "Undoing..." : "Undo Last Publish"}
            </button>
            <button
              type="button"
              onClick={loadDashboard}
              disabled={loading}
              className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white disabled:opacity-70"
            >
              {loading ? "Refreshing..." : "Refresh Dashboard"}
            </button>
          </div>
          {message ? (
            <div className="mt-4 rounded-2xl border border-emerald-300/20 bg-emerald-500/10 p-4 text-sm text-emerald-100">
              {message}
            </div>
          ) : null}
        </div>

        <div className="space-y-5">
          <div className={panelCardClass()}>
            <h3 className="font-display text-2xl text-white">Health Monitor</h3>
            <div className="mt-4 grid gap-3">
              {[
                `Backend: ${dashboard?.health?.backend || "Unknown"}`,
                `Database: ${dashboard?.health?.database?.status || "Unknown"}`,
                `Database Code: ${dashboard?.health?.database?.code || "Unknown"}`,
                `Razorpay Configured: ${dashboard?.health?.payment?.razorpayConfigured ? "Yes" : "No"}`,
                `Mode: ${dashboard?.health?.payment?.mode || "Unknown"}`
              ].map((item) => (
                <div key={item} className="rounded-2xl border border-white/10 bg-[#081127] p-4 text-sm text-slate-200">
                  {item}
                </div>
              ))}
            </div>
          </div>

          <div className={panelCardClass()}>
            <h3 className="font-display text-2xl text-white">Telegram Bot Status</h3>
            <div className="mt-4 grid gap-3 text-sm text-slate-200">
              <div className="rounded-2xl border border-white/10 bg-[#081127] p-4">
                Configured: {dashboard?.telegram?.configured ? "Yes" : "No"}
              </div>
              <div className="rounded-2xl border border-white/10 bg-[#081127] p-4">
                Authorized chat: {dashboard?.telegram?.authorizedChatId || "missing"}
              </div>
              <div className="rounded-2xl border border-white/10 bg-[#081127] p-4">
                Last command: {dashboard?.telegram?.lastCommandText || "No command received yet."}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <div className={panelCardClass()}>
          <div className="flex items-center justify-between gap-3">
            <h3 className="font-display text-2xl text-white">Pending Approvals</h3>
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-300">
              {dashboard?.pendingChanges?.length || 0} pending
            </span>
          </div>
          <div className="mt-4 grid gap-3">
            {dashboard?.pendingChanges?.length ? (
              dashboard.pendingChanges.map((item) => (
                <div key={item.id} className="rounded-2xl border border-white/10 bg-[#081127] p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-400">{item.target}</p>
                  <p className="mt-2 text-sm font-semibold text-white">{item.summary}</p>
                  <p className="mt-2 text-xs text-slate-400">Source: {item.source} | Actor: {item.actor}</p>
                  <div className="mt-4 flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={() => approveChange(item.id)}
                      disabled={busyId === item.id}
                      className="rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-white disabled:opacity-70"
                    >
                      {busyId === item.id ? "Working..." : "Approve"}
                    </button>
                    <button
                      type="button"
                      onClick={() => rejectChange(item.id)}
                      disabled={busyId === item.id}
                      className="rounded-xl border border-rose-300/30 bg-rose-500/10 px-4 py-2 text-sm font-semibold text-rose-100 disabled:opacity-70"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-2xl border border-white/10 bg-[#081127] p-4 text-sm text-slate-300">
                No pending approval requests right now.
              </div>
            )}
          </div>
        </div>

        <div className={panelCardClass()}>
          <h3 className="font-display text-2xl text-white">Activity & Backup Feed</h3>
          <div className="mt-4 grid gap-3">
            {(dashboard?.activityLogs || []).slice(0, 6).map((item) => (
              <div key={item.id} className="rounded-2xl border border-white/10 bg-[#081127] p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-400">{item.action}</p>
                <p className="mt-2 text-sm text-white">{item.detail}</p>
                <p className="mt-2 text-xs text-slate-400">{item.actor} | {formatStableDateTime(item.createdAt)}</p>
              </div>
            ))}
            {!(dashboard?.activityLogs || []).length ? (
              <div className="rounded-2xl border border-white/10 bg-[#081127] p-4 text-sm text-slate-300">
                No automation activity recorded yet.
              </div>
            ) : null}
            {(dashboard?.backups || []).slice(0, 3).map((item) => (
              <div key={item.id} className="rounded-2xl border border-cyan-300/20 bg-cyan-400/10 p-4 text-sm text-cyan-100">
                Backup {item.id} | {item.reason} | {formatStableDateTime(item.createdAt)}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function SscAnswerKeyAutomationPanel() {
  const [dashboard, setDashboard] = useState(null);
  const [preview, setPreview] = useState(null);
  const [previewPage, setPreviewPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const loadDashboard = async ({ quiet = false } = {}) => {
    if (!quiet) setLoading(true);
    try {
      const response = await apiFetch("/ssc-answer-keys/admin/dashboard");
      setDashboard(response || null);
      setError("");
      return response;
    } catch (loadError) {
      setError(loadError.message || "SSC answer-key dashboard could not be loaded.");
      return null;
    } finally {
      if (!quiet) setLoading(false);
    }
  };

  useEffect(() => {
    let active = true;
    apiFetch("/ssc-answer-keys/admin/dashboard")
      .then((response) => { if (active) { setDashboard(response || null); setError(""); } })
      .catch((loadError) => { if (active) setError(loadError.message || "SSC answer-key dashboard could not be loaded."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const runDryRun = async () => {
    setBusy("sync");
    setMessage("");
    setError("");
    try {
      const response = await apiFetch("/ssc-answer-keys/admin/sync", {
        method: "POST",
        timeoutMs: 120000,
        body: JSON.stringify({ dryRun: true })
      });
      const run = response?.run;
      setMessage(run?.status === "succeeded"
        ? `Dry-run completed: ${run.noticesFound || 0} notices, ${run.recordsParsed || 0} answer rows reviewed. Nothing was published.`
        : `Dry-run ended with status: ${run?.status || "unknown"}. Review the errors below.`);
      await loadDashboard({ quiet: true });
    } catch (runError) {
      setError(runError.message || "Manual SSC dry-run failed.");
    } finally {
      setBusy("");
    }
  };

  const togglePublishing = async () => {
    const nextEnabled = !dashboard?.publishingEnabled;
    if (nextEnabled) {
      if (!dashboard?.lastDryRunSucceededAt) {
        setError("Run a successful dry-run before enabling publishing.");
        return;
      }
      const confirmed = window.confirm("Enable automatic publication of validated answer labels from publicly linked SSC PDFs? Candidate response sheets will remain excluded.");
      if (!confirmed) return;
    }
    setBusy("publishing");
    setMessage("");
    setError("");
    try {
      await apiFetch("/ssc-answer-keys/admin/publishing", {
        method: "PATCH",
        body: JSON.stringify({ enabled: nextEnabled })
      });
      setMessage(nextEnabled ? "Automatic answer-key publishing is enabled." : "Automatic publishing is disabled; scheduled runs will use dry-run mode.");
      await loadDashboard({ quiet: true });
    } catch (updateError) {
      setError(updateError.message || "Publishing setting could not be updated.");
    } finally {
      setBusy("");
    }
  };

  const loadPreview = async (noticeKey, page = 1) => {
    setBusy("preview");
    setError("");
    try {
      const response = await apiFetch(`/ssc-answer-keys/admin/previews/${encodeURIComponent(noticeKey)}?page=${page}&limit=100`);
      setPreview(response?.preview || null);
      setPreviewPage(page);
    } catch (previewError) {
      setError(previewError.message || "Dry-run preview could not be loaded.");
    } finally {
      setBusy("");
    }
  };

  const metricCards = [
    { label: "Published answers", value: dashboard?.summary?.answerCount ?? "—" },
    { label: "Notices tracked", value: dashboard?.summary?.noticeCount ?? "—" },
    { label: "Unavailable / restricted", value: dashboard?.summary?.unavailableCount ?? "—" },
    { label: "Failed imports", value: dashboard?.summary?.failedCount ?? "—" }
  ];

  if (loading && !dashboard) {
    return <div className={panelCardClass()}>Loading SSC answer-key monitor…</div>;
  }

  return (
    <div className="space-y-5">
      {error ? <div role="alert" className="rounded-2xl border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">{error}</div> : null}
      {message ? <div role="status" className="rounded-2xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">{message}</div> : null}

      <section className={panelCardClass("space-y-4")} aria-labelledby="ssc-answer-key-source-title">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-300">Official source monitor</p>
            <h2 id="ssc-answer-key-source-title" className="mt-2 text-xl font-semibold text-white">SSC answer-key automation</h2>
            <a href={dashboard?.sourceUrl || "https://ssc.gov.in/home/answer-key"} target="_blank" rel="noreferrer" className="mt-1 inline-flex break-all text-sm text-sky-300 underline decoration-sky-300/40 underline-offset-4">
              {dashboard?.sourceUrl || "https://ssc.gov.in/home/answer-key"}
            </a>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className={`rounded-full border px-3 py-1.5 text-xs font-medium ${dashboard?.pollingEnabled ? "border-emerald-300/25 bg-emerald-400/10 text-emerald-200" : "border-amber-300/25 bg-amber-400/10 text-amber-100"}`}>
              {dashboard?.pollingEnabled ? "Polling enabled" : "Polling paused"} · every 6 hours · {dashboard?.timezone || "Asia/Kolkata"}
            </span>
            <span className={`rounded-full border px-3 py-1.5 text-xs font-medium ${dashboard?.ocrConfigured ? "border-sky-300/25 bg-sky-400/10 text-sky-100" : "border-amber-300/25 bg-amber-400/10 text-amber-100"}`}>
              OCR {dashboard?.ocrConfigured ? "available" : "not installed"}
            </span>
          </div>
        </div>
        <div className="flex flex-col gap-3 border-t border-white/10 pt-4 sm:flex-row sm:items-center">
          <button type="button" onClick={runDryRun} disabled={Boolean(busy)} className="rounded-xl bg-indigo-500 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-950/30 transition hover:bg-indigo-400 disabled:cursor-wait disabled:opacity-60">
            {busy === "sync" ? "Checking official source…" : "Run dry-run now"}
          </button>
          <button type="button" onClick={togglePublishing} disabled={Boolean(busy) || (!dashboard?.publishingEnabled && !dashboard?.lastDryRunSucceededAt)} className={`rounded-xl border px-4 py-2.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${dashboard?.publishingEnabled ? "border-rose-300/30 bg-rose-500/10 text-rose-100 hover:bg-rose-500/20" : "border-emerald-300/30 bg-emerald-500/10 text-emerald-100 hover:bg-emerald-500/20"}`}>
            {busy === "publishing" ? "Saving…" : dashboard?.publishingEnabled ? "Disable publishing" : "Enable publishing"}
          </button>
          <p className="text-xs leading-5 text-slate-400">
            Mode: <strong className="text-slate-200">{dashboard?.publishingEnabled ? "automatic publishing" : "dry-run only"}</strong>
            {dashboard?.lastDryRunSucceededAt ? ` · Last successful dry-run ${formatStableDateTime(dashboard.lastDryRunSucceededAt)}` : " · A successful dry-run is required before publishing"}
          </p>
        </div>
      </section>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {metricCards.map((card) => (
          <div key={card.label} className={panelCardClass("!rounded-2xl !p-4")}>
            <p className="text-xs uppercase tracking-[0.14em] text-slate-400">{card.label}</p>
            <p className="mt-2 text-2xl font-semibold text-white">{card.value}</p>
          </div>
        ))}
      </div>

      <section className={panelCardClass("overflow-hidden !p-0")} aria-labelledby="ssc-answer-key-runs-title">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-5 py-4">
          <div>
            <h3 id="ssc-answer-key-runs-title" className="font-semibold text-white">Recent sync runs</h3>
            <p className="mt-1 text-xs text-slate-400">Scheduled checks use the six-hour cron; manual checks always start as dry-runs.</p>
          </div>
          <span className="text-xs text-slate-400">Latest: {formatStableDateTime(dashboard?.latestRun?.finishedAt) || "No completed run"}</span>
        </div>
        {(dashboard?.runs || []).length ? (
          <div className="overflow-x-auto">
            <table className="min-w-[760px] w-full text-left text-sm">
              <thead className="bg-white/[0.03] text-xs uppercase tracking-wider text-slate-400"><tr><th className="px-5 py-3">Started</th><th className="px-5 py-3">Trigger / mode</th><th className="px-5 py-3">Status</th><th className="px-5 py-3">Notices</th><th className="px-5 py-3">Parsed / published</th><th className="px-5 py-3">Issues</th></tr></thead>
              <tbody className="divide-y divide-white/5">
                {dashboard.runs.map((run) => <tr key={run._id}>
                  <td className="px-5 py-3 text-slate-300">{formatStableDateTime(run.startedAt) || "—"}</td>
                  <td className="px-5 py-3 text-slate-300">{run.trigger} · {run.dryRun ? "dry-run" : "publish"}</td>
                  <td className="px-5 py-3"><span className="rounded-full border border-white/10 px-2.5 py-1 text-xs text-slate-200">{run.status}</span></td>
                  <td className="px-5 py-3 text-slate-300">{run.noticesFound ?? 0}</td>
                  <td className="px-5 py-3 text-slate-300">{run.recordsParsed ?? 0} / {run.recordsPublished ?? 0}</td>
          <td className="px-5 py-3 text-slate-300">{run.issues?.length || 0} · {run.unavailableCount ?? 0} unavailable</td>
                </tr>)}
              </tbody>
            </table>
          </div>
        ) : <p className="px-5 py-8 text-sm text-slate-400">No sync runs recorded yet.</p>}
        {(dashboard?.latestRun?.issues || []).length ? <div className="border-t border-white/10 p-4">
          <h4 className="text-sm font-semibold text-amber-100">Latest run issues</h4>
          <ul className="mt-2 space-y-2 text-sm text-amber-50/80">{dashboard.latestRun.issues.slice(0, 8).map((item, index) => <li key={`${item.code}-${index}`} className="break-words">{item.code}: {item.message} {item.url ? <a className="text-sky-300 underline" href={item.url} target="_blank" rel="noreferrer">Source</a> : null}</li>)}</ul>
        </div> : null}
      </section>

      <section className={panelCardClass("overflow-hidden !p-0")} aria-labelledby="ssc-answer-key-notices-title">
        <div className="border-b border-white/10 px-5 py-4">
          <h3 id="ssc-answer-key-notices-title" className="font-semibold text-white">Official notices and answer data</h3>
          <p className="mt-1 text-xs text-slate-400">Notices without a public bulk PDF are recorded as unavailable. Candidate response sheets are not imported.</p>
        </div>
        {(dashboard?.notices || []).length ? <div className="divide-y divide-white/5">
          {dashboard.notices.map((notice) => {
            const noticePreview = (dashboard.previews || []).find((item) => item.noticeKey === notice.noticeKey);
            return <article key={notice.noticeKey} className="flex flex-col gap-3 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="min-w-0">
                <p className="break-words font-medium text-white">{notice.title}</p>
                <p className="mt-1 text-xs text-slate-400">{[notice.exam, notice.year, notice.tier, notice.examDate, notice.shift].filter(Boolean).join(" · ") || "Exam details not identified"}</p>
                <p className="mt-1 text-xs text-slate-500">{notice.recordCount || 0} rows · verified {formatStableDateTime(notice.lastVerifiedAt) || "not yet"}{notice.fileHash ? ` · SHA-256 ${notice.fileHash.slice(0, 12)}…` : ""}</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-white/10 px-2.5 py-1 text-xs text-slate-200">{notice.answerDataStatus}</span>
                {noticePreview ? <button type="button" onClick={() => loadPreview(notice.noticeKey)} disabled={Boolean(busy)} className="rounded-lg border border-sky-300/20 px-3 py-2 text-xs font-semibold text-sky-200 hover:bg-sky-400/10 disabled:opacity-50">Review {noticePreview.recordCount || 0} rows</button> : null}
                {notice.pdfUrl ? <a href={notice.pdfUrl} target="_blank" rel="noreferrer" className="rounded-lg border border-white/10 px-3 py-2 text-xs text-slate-200 hover:bg-white/5">Official PDF</a> : null}
                <a href={notice.sourceUrl || dashboard?.sourceUrl} target="_blank" rel="noreferrer" className="rounded-lg border border-white/10 px-3 py-2 text-xs text-slate-200 hover:bg-white/5">Notice source</a>
              </div>
              {notice.lastError ? <p className="text-xs text-amber-200 lg:basis-full">{notice.lastError}</p> : null}
            </article>;
          })}
        </div> : <p className="px-5 py-8 text-sm text-slate-400">No official SSC notices have been imported yet. Run a dry-run after backend and MongoDB setup.</p>}
      </section>

      {preview ? <section className={panelCardClass("space-y-4")} aria-labelledby="ssc-answer-key-preview-title">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-cyan-300">Admin-only dry-run data</p>
            <h3 id="ssc-answer-key-preview-title" className="mt-1 font-semibold text-white">{preview.exam} {preview.year} · {preview.keyStatus}</h3>
            <p className="mt-1 text-xs text-slate-400">{preview.pagination?.total || 0} extracted rows · no question text or options · source hash {preview.fileHash?.slice(0, 16)}…</p>
          </div>
          <button type="button" onClick={() => setPreview(null)} className="rounded-lg border border-white/10 px-3 py-2 text-xs text-slate-300 hover:bg-white/5">Close preview</button>
        </div>
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
          {(preview.records || []).map((record) => <div key={`${record.questionId}-${record.answerLabel}`} className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-[#081127]/70 px-3 py-2 text-sm"><span className="truncate text-slate-300">{record.questionId}</span><strong className="shrink-0 text-white">{record.answerLabel}</strong></div>)}
        </div>
        <div className="flex items-center justify-between text-xs text-slate-400">
          <span>Page {preview.pagination?.page || previewPage} of {preview.pagination?.pages || 1}</span>
          <div className="flex gap-2">
            <button type="button" disabled={previewPage <= 1 || busy === "preview"} onClick={() => loadPreview(preview.noticeKey, previewPage - 1)} className="rounded-lg border border-white/10 px-3 py-1.5 disabled:opacity-40">Previous</button>
            <button type="button" disabled={previewPage >= (preview.pagination?.pages || 1) || busy === "preview"} onClick={() => loadPreview(preview.noticeKey, previewPage + 1)} className="rounded-lg border border-white/10 px-3 py-1.5 disabled:opacity-40">Next</button>
          </div>
        </div>
      </section> : null}

      <section className={panelCardClass("overflow-hidden !p-0")} aria-labelledby="ssc-answer-key-audit-title">
        <div className="border-b border-white/10 px-5 py-4"><h3 id="ssc-answer-key-audit-title" className="font-semibold text-white">Audit history</h3><p className="mt-1 text-xs text-slate-400">Notice changes, file changes, corrected answers, and publishing setting changes.</p></div>
        {(dashboard?.audits || []).length ? <div className="max-h-80 divide-y divide-white/5 overflow-auto">{dashboard.audits.map((item) => <div key={item._id} className="px-5 py-3"><div className="flex flex-wrap justify-between gap-2 text-sm"><strong className="text-slate-100">{item.action}</strong><span className="text-xs text-slate-500">{formatStableDateTime(item.createdAt)}</span></div><p className="mt-1 break-words text-xs text-slate-400">{item.summary} · by {item.actor || "system"}</p></div>)}</div> : <p className="px-5 py-8 text-sm text-slate-400">No audit events yet.</p>}
      </section>
    </div>
  );
}

export function AIInsightsPanel({ workspace, mergedBatches = [] }) {
  const insights = useMemo(() => {
    const blockedUsers = workspace.users.filter((user) => user.status === "blocked");
    const pendingOrders = workspace.orders.filter((order) => order.status === "pending");
    const failedOrders = workspace.orders.filter((order) => order.status === "failed");
    const subjectsWithoutClasses = workspace.subjects.filter(
      (subject) =>
        !subject.categories.some((category) =>
          category.topics.some((topic) => (topic.classes || []).length)
        )
    );
    const batchesWithoutSections = mergedBatches.filter(
      (batch) => !Array.isArray(batch.classSections) || !batch.classSections.length
    );
    const revenueByCourse = workspace.orders.reduce((map, order) => {
      map.set(order.course, (map.get(order.course) || 0) + Number(order.amount || 0));
      return map;
    }, new Map());
    const topCourse = Array.from(revenueByCourse.entries()).sort((a, b) => b[1] - a[1])[0];
    const inactiveCoupons = workspace.coupons.filter((coupon) => coupon.status !== "active");

    return [
      {
        title: "Lead Recovery Opportunity",
        severity: pendingOrders.length ? "high" : "normal",
        body: pendingOrders.length
          ? `${pendingOrders.length} payment(s) are pending. Automated reminders can recover these conversions quickly.`
          : "No pending payments right now. Payment funnel is stable."
      },
      {
        title: "User Risk Detection",
        severity: blockedUsers.length ? "medium" : "normal",
        body: blockedUsers.length
          ? `${blockedUsers.length} user(s) are blocked. Review whether they are fraud, sharing content, or need support follow-up.`
          : "No blocked users detected in current admin workspace."
      },
      {
        title: "Content Gap Signal",
        severity: subjectsWithoutClasses.length ? "medium" : "normal",
        body: subjectsWithoutClasses.length
          ? `${subjectsWithoutClasses.map((subject) => subject.name).join(", ")} still have no class content. These subjects can be expanded next.`
          : "All configured subjects already contain at least one class path."
      },
      {
        title: "Batch Completion Insight",
        severity: batchesWithoutSections.length ? "medium" : "normal",
        body: batchesWithoutSections.length
          ? `${batchesWithoutSections.length} batch(es) still do not have structured sections. Add sections to improve course navigation and engagement.`
          : "Every tracked batch already has structured sections."
      },
      {
        title: "Top Revenue Driver",
        severity: "normal",
        body: topCourse
          ? `${topCourse[0]} is the top revenue course in current data with ₹${Number(topCourse[1]).toLocaleString("en-IN")}.`
          : "Revenue trend will appear once order data grows."
      },
      {
        title: "Coupon Optimization",
        severity: inactiveCoupons.length ? "low" : "normal",
        body: inactiveCoupons.length
          ? `${inactiveCoupons.length} coupon(s) are inactive. AI-led campaigns can reactivate them during low-conversion periods.`
          : "All coupons are active or no inactive campaign needs review."
      },
      {
        title: "Failure Monitoring",
        severity: failedOrders.length ? "high" : "normal",
        body: failedOrders.length
          ? `${failedOrders.length} failed payment(s) detected. Use AI support prompts to guide users back into checkout.`
          : "No failed orders detected right now."
      }
    ];
  }, [mergedBatches, workspace]);

  const automations = [
    "AI support assistant for login, payment, batch timing, and course access questions",
    "AI personalized course recommendation based on exam, budget, and weak subject",
    "AI weak-topic detection from class and test progress",
    "AI admin alerts for pending payments, inactive users, and missing content"
  ];

  return (
    <div className="space-y-5">
      <div className="grid gap-4 xl:grid-cols-3">
        {insights.map((insight) => (
          <div
            key={insight.title}
            className={panelCardClass(
              insight.severity === "high"
                ? "border-orange-300/30"
                : insight.severity === "medium"
                  ? "border-cyan-300/20"
                  : ""
            )}
          >
            <p className="text-xs uppercase tracking-[0.22em] text-slate-400">
              {insight.severity === "high" ? "Priority Insight" : insight.severity === "medium" ? "Action Insight" : "AI Observation"}
            </p>
            <h3 className="mt-3 font-display text-2xl text-white">{insight.title}</h3>
            <p className="mt-3 text-sm text-slate-300">{insight.body}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <div className={panelCardClass()}>
          <h3 className="font-display text-2xl text-white">Recommended AI Automations</h3>
          <div className="mt-4 grid gap-3">
            {automations.map((item) => (
              <div key={item} className="rounded-2xl border border-white/10 bg-[#081127] p-4 text-sm text-slate-200">
                {item}
              </div>
            ))}
          </div>
        </div>
        <div className={panelCardClass()}>
          <h3 className="font-display text-2xl text-white">AI Rollout Priority</h3>
          <div className="mt-4 space-y-3 text-sm text-slate-300">
            <p>1. AI course assistant for student support and admissions.</p>
            <p>2. AI recommendations using subject, pricing, and batch-fit data.</p>
            <p>3. AI insights for admin recovery on pending payments and content gaps.</p>
            <p>4. AI learning analytics for weak-topic detection across Maths, Reasoning, English, GS, Science, and Computer.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
