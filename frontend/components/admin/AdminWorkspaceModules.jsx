"use client";

import { useEffect, useMemo, useState } from "react";
import { createAdminId } from "@/lib/adminWorkspace";
import { apiFetch } from "@/lib/api";

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
  examName: "",
  questions: "",
  duration: "",
  difficulty: "Medium",
  testUrl: "",
  fileName: "",
  fileDataUrl: "",
  status: "published"
};

export function OnlineMockTestManager({ workspace, setWorkspace }) {
  const [form, setForm] = useState(initialMockForm);
  const [notice, setNotice] = useState("");

  const mockTests = Array.isArray(workspace.mockTests) ? workspace.mockTests : [];

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

    setWorkspace((current) => ({
      ...current,
      mockTests: [
        {
          id: createAdminId("mock"),
          title: form.title.trim(),
          examName: form.examName.trim(),
          questions,
          duration: form.duration.trim(),
          difficulty: form.difficulty,
          testUrl: form.testUrl.trim() || form.fileDataUrl,
          fileName: form.fileName,
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
        item.id === id ? { ...item, status } : item
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

    const reader = new FileReader();
    reader.onload = () => {
      setForm((current) => ({
        ...current,
        fileName: file.name,
        fileDataUrl: String(reader.result || "")
      }));
      setNotice(`${file.name} upload ready hai. Save Mock Test dabane par publish hoga.`);
    };
    reader.onerror = () => setNotice("File read nahi ho payi. Link paste karke retry karein.");
    reader.readAsDataURL(file);
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
              <Input value={form.examName} onChange={(e) => setForm({ ...form, examName: e.target.value })} placeholder="SSC / Railway / Banking" />
            </Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Questions">
                <Input type="number" min="1" value={form.questions} onChange={(e) => setForm({ ...form, questions: e.target.value })} placeholder="100" />
              </Field>
              <Field label="Duration">
                <Input value={form.duration} onChange={(e) => setForm({ ...form, duration: e.target.value })} placeholder="60 min" />
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
                        {[item.examName, item.questions ? `${item.questions} questions` : "", item.duration, item.difficulty].filter(Boolean).join(" | ")}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">{item.fileName || item.testUrl || "No link/file added yet"}</p>
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
          <img src={settings.logoUrl || "/new-logo.png"} alt="Logo preview" className="h-16 w-16 rounded-2xl object-contain" />
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
