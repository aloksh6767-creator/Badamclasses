"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/api";
import { originalFreePracticeQuestions } from "@/lib/mockTestCatalog";
import { classifyMockQuestion, enrichMockTests, uniqueSorted } from "@/lib/mockQuestionFilters";

const attemptStorageKey = (testId, subject) => `badamclasses_mock_attempt_${testId}_${subject}`;

const readAttemptState = (testId, subject) => {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(attemptStorageKey(testId, subject));
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const writeAttemptState = (testId, subject, state) => {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(attemptStorageKey(testId, subject), JSON.stringify(state));
};

const buildFullMockId = (groupId) => `full:${groupId}`;
const examMatchTerms = {
  Railway: ["railway", "rrb", "ntpc", "alp", "technician", "paramedical"],
  SSC: ["ssc", "cgl", "mts", "chsl"],
  Banking: ["banking", "bank", "ibps", "sbi", "rbi", "po", "clerk"],
  Police: ["police", "constable"],
  Teaching: ["teaching", "tet", "ctet", "uptet", "cdp"],
  "State Exams": ["state exams", "state", "up constable", "up police", "constable"]
};

const mockMatchesExam = (test = {}, exam = "") => {
  const terms = examMatchTerms[exam] || [String(exam || "").toLowerCase()];
  const text = [test.title, test.category, test.subject, test.topic, test.sourcePdf, test.mockGroupTitle]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return terms.some((term) => text.includes(term));
};

function FieldlessFilter({ id, label, value, onChange, options, allLabel, countFor }) {
  return (
    <label className="block text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300" htmlFor={id}>
      {label}
      <select
        id={id}
        value={value}
        onChange={onChange}
        className="mt-3 w-full rounded-xl border border-white/10 bg-[#071126] px-4 py-3 text-sm normal-case tracking-normal text-white outline-none focus:border-cyan-300"
      >
        <option value="all">{allLabel}</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option} - {countFor(option)} Questions
          </option>
        ))}
      </select>
    </label>
  );
}

export default function FreePracticePage() {
  const searchParams = useSearchParams();
  const examParam = searchParams.get("exam") || "";
  const testParam = searchParams.get("test") || "";
  const subjectParam = searchParams.get("subject") || "";
  const topicParam = searchParams.get("topic") || "";
  const subtopicParam = searchParams.get("subtopic") || "";
  const chapterParam = searchParams.get("chapter") || "";
  const [pdfTests, setPdfTests] = useState([]);
  const [selectedTestId, setSelectedTestId] = useState("original");
  const [appliedQueryKey, setAppliedQueryKey] = useState("");
  const [selectedSubject, setSelectedSubject] = useState("all");
  const [selectedTopic, setSelectedTopic] = useState("all");
  const [selectedSubtopic, setSelectedSubtopic] = useState("all");
  const [selectedChapter, setSelectedChapter] = useState("all");
  const [languageMode, setLanguageMode] = useState("Hindi + English");
  const [answers, setAnswers] = useState({});
  const [bookmarks, setBookmarks] = useState({});
  const [reviewFlags, setReviewFlags] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [testStarted, setTestStarted] = useState(false);
  const [instructionAccepted, setInstructionAccepted] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(60 * 60);
  const [startedAt, setStartedAt] = useState("");
  const [questionZoom, setQuestionZoom] = useState(1);
  const [paletteOpen, setPaletteOpen] = useState(false);

  useEffect(() => {
    document.body.classList.toggle("mock-test-active", testStarted);
    return () => document.body.classList.remove("mock-test-active");
  }, [testStarted]);

  useEffect(() => {
    let active = true;
    const loadPdfTests = async () => {
      try {
        const response = await fetch("/mock-pdfs/mock-question-bank.json");
        const data = await response.json();
        let runtimeTests = [];
        try {
          const runtime = await apiFetch("/automation/public-pdf-mocks");
          runtimeTests = Array.isArray(runtime?.mockTests) ? runtime.mockTests : [];
        } catch {
          runtimeTests = [];
        }
        if (active) {
          const byId = new Map();
          [...(Array.isArray(data) ? data : []), ...runtimeTests].forEach((test) => {
            if (test?.id && !byId.has(test.id)) byId.set(test.id, test);
          });
          setPdfTests(enrichMockTests(Array.from(byId.values())));
        }
      } catch {
        try {
          const runtime = await apiFetch("/automation/public-pdf-mocks");
          if (active) {
            setPdfTests(enrichMockTests(Array.isArray(runtime?.mockTests) ? runtime.mockTests : []));
          }
        } catch {
          if (active) {
            setPdfTests([]);
          }
        }
      }
    };
    loadPdfTests();
    return () => {
      active = false;
    };
  }, []);

  const groupedFullMocks = useMemo(() => {
    const groups = new Map();
    pdfTests.forEach((test) => {
      if (!test.mockGroupId) return;
      const group = groups.get(test.mockGroupId) || {
        id: buildFullMockId(test.mockGroupId),
        groupId: test.mockGroupId,
        title: test.mockGroupTitle || `${test.subject || "Railway"} Full Mock`,
        category: test.category || "Railway",
        subject: test.subject || "Mixed Practice",
        language: test.language || "Hindi + English",
        mockType: "full",
        questions: []
      };
      group.questions.push(
        ...(Array.isArray(test.questions)
          ? test.questions.map((question) => ({
              ...question,
              section: question.section || test.topic || test.subject || "Mixed Practice"
            }))
          : [])
      );
      groups.set(test.mockGroupId, group);
    });
    return Array.from(groups.values()).filter((group) => group.questions.length);
  }, [pdfTests]);

  const allPdfQuestionsTest = useMemo(() => ({
    id: "all-pdf-questions",
    title: "SSC Maths 6500+ Chapterwise PYQ Question Bank",
    category: "SSC",
    subject: "Maths",
    language: "Hindi + English",
    mockType: "chapterwise",
    questions: pdfTests.flatMap((test) =>
      (Array.isArray(test.questions) ? test.questions : []).map((question, questionIndex) => ({
        ...question,
        sourceTestId: test.id,
        sourcePdf: question.sourcePdf || test.sourcePdf,
        section: question.section || test.topic || test.subject || "Mixed Practice"
      }))
    )
  }), [pdfTests]);

  const availableTests = useMemo(
    () => [allPdfQuestionsTest, ...groupedFullMocks, ...pdfTests],
    [allPdfQuestionsTest, groupedFullMocks, pdfTests]
  );

  useEffect(() => {
    const queryKey = `${examParam}|${testParam}|${subjectParam}|${topicParam}|${subtopicParam}|${chapterParam}`;
    if ((!examParam && !testParam && !subjectParam && !topicParam && !subtopicParam && !chapterParam) || !availableTests.length || appliedQueryKey === queryKey) return;
    const normalizedTestParam = String(testParam || "").trim().toLowerCase();
    const exactTest = normalizedTestParam
      ? availableTests.find((test) =>
          [test.id, test.title, test.topic, test.sourcePdf]
            .filter(Boolean)
            .some((value) => String(value).trim().toLowerCase() === normalizedTestParam)
        )
      : null;
    const requestedTitle = normalizedTestParam.replace(/\s+full\s+mock.*$/i, "").trim();
    const titleMatch = requestedTitle
      ? availableTests.find((test) => {
          const candidate = String(test.title || test.mockGroupTitle || "").trim().toLowerCase();
          return candidate.includes(requestedTitle) || requestedTitle.includes(candidate.replace(/\s+full\s+mock.*$/i, "").trim());
        })
      : null;
    const matchingTest = exactTest || titleMatch || (examParam ? availableTests.find((test) => mockMatchesExam(test, examParam)) : null);
    // PDF mocks load asynchronously. Do not consume the URL selection before
    // the requested Railway test is present, otherwise the default SSC mock
    // remains selected permanently.
    if (!matchingTest) return;
    setAppliedQueryKey(queryKey);
    if (selectedTestId === matchingTest.id) return;
    setSelectedTestId(matchingTest.id);
    setSelectedSubject(subjectParam || "all");
    setSelectedTopic(topicParam || "all");
    setSelectedSubtopic(subtopicParam || "all");
    setSelectedChapter(chapterParam || "all");
    setAnswers({});
    setBookmarks({});
    setReviewFlags({});
    setSubmitted(false);
    setTestStarted(false);
    setCurrentQuestionIndex(0);
    setStartedAt("");
  }, [appliedQueryKey, availableTests, chapterParam, examParam, selectedTestId, subjectParam, subtopicParam, testParam, topicParam]);

  const selectedTest = useMemo(() => {
    if (selectedTestId === "original") {
      return {
        id: "original",
        title: "BadamClasses Original Free SSC Practice",
        category: "SSC Practice",
        questions: originalFreePracticeQuestions.map((question) => ({
          ...question,
          ...classifyMockQuestion(question, { subject: question.section })
        }))
      };
    }
    return availableTests.find((test) => test.id === selectedTestId) || {
      id: "original",
      title: "BadamClasses Original Free SSC Practice",
      category: "SSC Practice",
      questions: originalFreePracticeQuestions.map((question) => ({
        ...question,
        ...classifyMockQuestion(question, { subject: question.section })
      }))
    };
  }, [availableTests, selectedTestId]);

  const allQuestions = selectedTest.questions || originalFreePracticeQuestions;
  const subjectOptions = useMemo(() => {
    return uniqueSorted(allQuestions.map((question) => question.subject || question.section || selectedTest.subject || "Mixed Practice"));
  }, [allQuestions, selectedTest.subject]);
  useEffect(() => {
    if (!subjectParam || !subjectOptions.includes(subjectParam) || selectedSubject === subjectParam) return;
    setSelectedSubject(subjectParam);
    setSelectedTopic(topicParam || "all");
    setSelectedSubtopic(subtopicParam || "all");
    setSelectedChapter(chapterParam || "all");
    setCurrentQuestionIndex(0);
  }, [chapterParam, selectedSubject, subjectOptions, subjectParam, subtopicParam, topicParam]);
  const subjectFilteredQuestions = useMemo(() => {
    if (selectedSubject === "all") return allQuestions;
    return allQuestions.filter((question) => (question.subject || question.section || selectedTest.subject || "Mixed Practice") === selectedSubject);
  }, [allQuestions, selectedSubject, selectedTest.subject]);
  const topicOptions = useMemo(() => uniqueSorted(subjectFilteredQuestions.map((question) => question.topic || question.section)), [subjectFilteredQuestions]);
  useEffect(() => {
    if (!topicParam || !topicOptions.includes(topicParam) || selectedTopic === topicParam) return;
    setSelectedTopic(topicParam);
    setSelectedSubtopic(subtopicParam || "all");
    setSelectedChapter(chapterParam || "all");
    setCurrentQuestionIndex(0);
  }, [chapterParam, selectedTopic, subtopicParam, topicOptions, topicParam]);
  const topicFilteredQuestions = useMemo(() => {
    if (selectedTopic === "all") return subjectFilteredQuestions;
    return subjectFilteredQuestions.filter((question) => (question.topic || question.section) === selectedTopic);
  }, [selectedTopic, subjectFilteredQuestions]);
  const subtopicOptions = useMemo(() => uniqueSorted(topicFilteredQuestions.map((question) => question.subtopic || question.topic || question.section)), [topicFilteredQuestions]);
  useEffect(() => {
    if (!subtopicParam || !subtopicOptions.includes(subtopicParam) || selectedSubtopic === subtopicParam) return;
    setSelectedSubtopic(subtopicParam);
    setSelectedChapter(chapterParam || "all");
    setCurrentQuestionIndex(0);
  }, [chapterParam, selectedSubtopic, subtopicOptions, subtopicParam]);
  const subtopicFilteredQuestions = useMemo(() => {
    if (selectedSubtopic === "all") return topicFilteredQuestions;
    return topicFilteredQuestions.filter((question) => (question.subtopic || question.topic || question.section) === selectedSubtopic);
  }, [selectedSubtopic, topicFilteredQuestions]);
  const chapterOptions = useMemo(() => uniqueSorted(subtopicFilteredQuestions.map((question) => question.chapter || question.topic || question.section)), [subtopicFilteredQuestions]);
  useEffect(() => {
    if (!chapterParam || !chapterOptions.includes(chapterParam) || selectedChapter === chapterParam) return;
    setSelectedChapter(chapterParam);
    setCurrentQuestionIndex(0);
  }, [chapterOptions, chapterParam, selectedChapter]);
  const questions = useMemo(() => {
    if (selectedChapter === "all") return subtopicFilteredQuestions;
    return subtopicFilteredQuestions.filter((question) => (question.chapter || question.topic || question.section) === selectedChapter);
  }, [selectedChapter, subtopicFilteredQuestions]);
  const testDurationSeconds = useMemo(() => Math.max(15 * 60, Math.min(60 * 60, questions.length * 60)), [questions.length]);
  const currentQuestion = questions[currentQuestionIndex] || questions[0];
  const score = useMemo(
    () =>
      questions.reduce((total, question) => {
        return answers[question.id] === question.answer ? total + 1 : total;
      }, 0),
    [answers, questions]
  );

  const attempted = Object.keys(answers).length;
  const knownAnswerCount = questions.filter((question) => Number.isInteger(question.answer)).length;
  const markedForReview = questions.filter((question) => reviewFlags[question.id]).length;
  const bookmarkedCount = questions.filter((question) => bookmarks[question.id]).length;
  const wrongCount = submitted && knownAnswerCount ? Math.max(attempted - score, 0) : 0;
  const unattemptedCount = Math.max(questions.length - attempted, 0);
  const accuracy = attempted ? Math.round((score / attempted) * 100) : 0;
  const timeTakenSeconds = submitted || testStarted ? Math.max(testDurationSeconds - timeLeft, 0) : 0;
  const speedSeconds = attempted ? Math.round(timeTakenSeconds / attempted) : 0;
  const topicBreakdown = useMemo(() => {
    const counts = new Map();
    questions.forEach((question) => {
      const topic = question.chapter || question.subtopic || question.topic || question.section || selectedTest.category || "General";
      const current = counts.get(topic) || { topic, count: 0, attempted: 0, correct: 0 };
      current.count += 1;
      if (answers[question.id] !== undefined) {
        current.attempted += 1;
      }
      if (answers[question.id] === question.answer) {
        current.correct += 1;
      }
      counts.set(topic, current);
    });
    return Array.from(counts.values()).slice(0, 8);
  }, [answers, questions, selectedTest.category]);
  const sectionGroups = useMemo(() => {
    const groups = new Map();
    questions.forEach((question, index) => {
      const section = question.section || selectedTest.subject || "Mixed Practice";
      const current = groups.get(section) || { section, total: 0, firstIndex: index };
      current.total += 1;
      groups.set(section, current);
    });
    return Array.from(groups.values());
  }, [questions, selectedTest.subject]);
  const currentSection = currentQuestion?.section || sectionGroups[0]?.section || "Mock Test";
  const currentSectionGroupIndex = sectionGroups.findIndex((group) => group.section === currentSection);
  const currentSectionQuestions = questions.filter((question) => (question.section || selectedTest.subject || "Mixed Practice") === currentSection);
  const currentSectionAnswered = currentSectionQuestions.filter((question) => answers[question.id] !== undefined).length;
  const aiRecommendation = useMemo(() => {
    const firstTopic = topicBreakdown[0]?.topic || selectedTest.category || "core topics";
    if (!submitted) {
      return `AI help: pehle ${firstTopic} ke easy questions attempt karein, phir marked questions review karein.`;
    }
    if (!knownAnswerCount) {
      return `AI help: ${attempted}/${questions.length} attempted. Answer key pending hai, ab unattempted questions ko second round me solve karein.`;
    }
    return accuracy >= 75
      ? "AI help: accuracy strong hai. Ab timer reduce karke same topic ka speed round karein."
      : "AI help: weak questions ko error-log me likhein aur formula/concept revision ke baad retest karein.";
  }, [accuracy, attempted, knownAnswerCount, questions.length, selectedTest.category, submitted, topicBreakdown]);

  const switchTest = (event) => {
    setSelectedTestId(event.target.value);
    setSelectedSubject("all");
    setSelectedTopic("all");
    setSelectedSubtopic("all");
    setSelectedChapter("all");
    setAnswers({});
    setBookmarks({});
    setReviewFlags({});
    setSubmitted(false);
    setTestStarted(false);
    setInstructionAccepted(false);
    setCurrentQuestionIndex(0);
    setStartedAt("");
  };

  const switchSubject = (event) => {
    setSelectedSubject(event.target.value);
    setSelectedTopic("all");
    setSelectedSubtopic("all");
    setSelectedChapter("all");
    setAnswers({});
    setBookmarks({});
    setReviewFlags({});
    setSubmitted(false);
    setTestStarted(false);
    setInstructionAccepted(false);
    setCurrentQuestionIndex(0);
    setStartedAt("");
  };

  const switchTopic = (event) => {
    setSelectedTopic(event.target.value);
    setSelectedSubtopic("all");
    setSelectedChapter("all");
    setAnswers({});
    setBookmarks({});
    setReviewFlags({});
    setSubmitted(false);
    setTestStarted(false);
    setInstructionAccepted(false);
    setCurrentQuestionIndex(0);
    setStartedAt("");
  };

  const switchSubtopic = (event) => {
    setSelectedSubtopic(event.target.value);
    setSelectedChapter("all");
    setAnswers({});
    setBookmarks({});
    setReviewFlags({});
    setSubmitted(false);
    setTestStarted(false);
    setInstructionAccepted(false);
    setCurrentQuestionIndex(0);
    setStartedAt("");
  };

  const switchChapter = (event) => {
    setSelectedChapter(event.target.value);
    setAnswers({});
    setBookmarks({});
    setReviewFlags({});
    setSubmitted(false);
    setTestStarted(false);
    setInstructionAccepted(false);
    setCurrentQuestionIndex(0);
    setStartedAt("");
  };

  useEffect(() => {
    const saved = readAttemptState(selectedTestId, selectedSubject);
    if (saved && saved.testStarted && !saved.submitted) {
      setAnswers(saved.answers || {});
      setBookmarks(saved.bookmarks || {});
      setReviewFlags(saved.reviewFlags || {});
      setSubmitted(false);
      setTestStarted(true);
      setCurrentQuestionIndex(Math.min(Number(saved.currentQuestionIndex || 0), Math.max(questions.length - 1, 0)));
      setTimeLeft(Math.max(Number(saved.timeLeft || testDurationSeconds), 0));
      setStartedAt(saved.startedAt || new Date().toISOString());
      return;
    }
    setTimeLeft(testDurationSeconds);
  }, [questions.length, selectedSubject, selectedTestId, testDurationSeconds]);

  useEffect(() => {
    if (!testStarted) return;
    writeAttemptState(selectedTestId, selectedSubject, {
      answers,
      bookmarks,
      reviewFlags,
      submitted,
      testStarted,
      currentQuestionIndex,
      timeLeft,
      startedAt,
      savedAt: new Date().toISOString()
    });
  }, [answers, bookmarks, currentQuestionIndex, reviewFlags, selectedSubject, selectedTestId, startedAt, submitted, testStarted, timeLeft]);

  useEffect(() => {
    if (!testStarted || submitted) return undefined;
    if (timeLeft <= 0) {
      setSubmitted(true);
      return undefined;
    }
    const timer = window.setTimeout(() => setTimeLeft((current) => Math.max(current - 1, 0)), 1000);
    return () => window.clearTimeout(timer);
  }, [submitted, testStarted, timeLeft]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  };

  const startTest = async () => {
    if (!instructionAccepted) return;
    setAnswers({});
    setBookmarks({});
    setReviewFlags({});
    setSubmitted(false);
    setCurrentQuestionIndex(0);
    setTimeLeft(testDurationSeconds);
    setStartedAt(new Date().toISOString());
    setQuestionZoom(1);
    setTestStarted(true);
    try {
      if (document.documentElement.requestFullscreen && !document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      }
    } catch {
      // Browser may block fullscreen; test still starts normally.
    }
  };

  const submitTest = () => {
    if (typeof window !== "undefined") {
      const confirmed = window.confirm(
        `Submit test now?\n\nAnswered: ${attempted}/${questions.length}\nMarked for review: ${markedForReview}\n\nYou will not be able to change your answers after submission.`
      );
      if (!confirmed) return;
    }
    setSubmitted(true);
    try {
      if (document.fullscreenElement && document.exitFullscreen) {
        document.exitFullscreen();
      }
    } catch {
      // Ignore fullscreen exit failures.
    }
  };

  const selectAnswer = (questionId, optionIndex) => {
    if (submitted) return;
    setAnswers((current) => ({ ...current, [questionId]: optionIndex }));
  };

  const toggleBookmark = (questionId) => {
    setBookmarks((current) => ({ ...current, [questionId]: !current[questionId] }));
  };

  const toggleReviewFlag = (questionId) => {
    setReviewFlags((current) => ({ ...current, [questionId]: !current[questionId] }));
  };

  const submitCurrentSection = () => {
    const nextSection = sectionGroups[currentSectionGroupIndex + 1];
    if (nextSection) {
      setCurrentQuestionIndex(nextSection.firstIndex);
    }
  };

  return (
    <main className={testStarted ? "mock-exam-console h-screen w-full overflow-hidden bg-white text-slate-950" : "mx-auto w-[96%] max-w-[96rem] py-8 text-slate-100"}>
      <div className={testStarted ? "hidden" : "mb-5 flex flex-wrap items-center justify-between gap-3"}>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-orange-300">BadamClasses Original Mock</p>
          <h1 className="mt-2 font-display text-4xl text-white">PDF Based Mock Test</h1>
          <p className="mt-2 text-sm text-slate-300">
            PDF ke questions ko website ke andar mock-test format me convert kiya gaya hai. No external test portal opens from this page.
          </p>
        </div>
        <Link href="/mock-tests" className="rounded-xl border border-white/20 px-4 py-2 text-sm font-semibold text-slate-100 hover:border-orange-300">
          Back to Mock Tests
        </Link>
      </div>

      <section className={testStarted ? "hidden" : "mb-5 rounded-2xl border border-white/10 bg-[#0d1a3a]/70 p-5"}>
        <label className="text-xs font-semibold uppercase tracking-[0.2em] text-orange-300" htmlFor="mock-select">
          Select Mock Test
        </label>
        <select
          id="mock-select"
          value={selectedTestId}
          onChange={switchTest}
          className="mt-3 w-full rounded-xl border border-white/10 bg-[#071126] px-4 py-3 text-sm text-white outline-none focus:border-orange-300"
        >
          <option value="original">BadamClasses Original Free SSC Practice - {originalFreePracticeQuestions.length} Questions</option>
          {availableTests.map((test) => (
            <option key={test.id} value={test.id}>
              {test.mockType === "full" ? "Full Mock: " : ""}
              {test.title} - {test.questions?.length || 0} Questions
            </option>
          ))}
        </select>
        <p className="mt-3 text-sm text-slate-300">
          Current: {selectedTest.title} | {selectedTest.category} | {questions.length} questions
        </p>
        <label className="mt-5 block text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300" htmlFor="language-select">
          Language Mode
        </label>
        <select
          id="language-select"
          value={languageMode}
          onChange={(event) => setLanguageMode(event.target.value)}
          className="mt-3 w-full rounded-xl border border-white/10 bg-[#071126] px-4 py-3 text-sm text-white outline-none focus:border-cyan-300"
        >
          <option value="Hindi + English">Hindi + English</option>
          <option value="Hindi">Hindi</option>
          <option value="English">English</option>
        </select>
        <label className="mt-5 block text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300" htmlFor="subject-select">
          Subject / Topic Filter
        </label>
        <select
          id="subject-select"
          value={selectedSubject}
          onChange={switchSubject}
          className="mt-3 w-full rounded-xl border border-white/10 bg-[#071126] px-4 py-3 text-sm text-white outline-none focus:border-cyan-300"
        >
          <option value="all">All Subjects - {allQuestions.length} Questions</option>
          {subjectOptions.map((subject) => (
            <option key={subject} value={subject}>
              {subject} - {allQuestions.filter((question) => (question.subject || question.section || selectedTest.subject || "Mixed Practice") === subject).length} Questions
            </option>
          ))}
        </select>
        <div className="mt-5 grid gap-3 lg:grid-cols-3">
          <FieldlessFilter
            id="topic-select"
            label="Topic Filter"
            value={selectedTopic}
            onChange={switchTopic}
            options={topicOptions}
            allLabel={`All Topics - ${subjectFilteredQuestions.length} Questions`}
            countFor={(topic) => subjectFilteredQuestions.filter((question) => (question.topic || question.section) === topic).length}
          />
          <FieldlessFilter
            id="subtopic-select"
            label="Subtopic Filter"
            value={selectedSubtopic}
            onChange={switchSubtopic}
            options={subtopicOptions}
            allLabel={`All Subtopics - ${topicFilteredQuestions.length} Questions`}
            countFor={(subtopic) => topicFilteredQuestions.filter((question) => (question.subtopic || question.topic || question.section) === subtopic).length}
          />
          <FieldlessFilter
            id="chapter-select"
            label="Chapter Filter"
            value={selectedChapter}
            onChange={switchChapter}
            options={chapterOptions}
            allLabel={`All Chapters - ${subtopicFilteredQuestions.length} Questions`}
            countFor={(chapter) => subtopicFilteredQuestions.filter((question) => (question.chapter || question.topic || question.section) === chapter).length}
          />
        </div>
        <div className="mt-4 rounded-xl border border-cyan-300/20 bg-cyan-500/10 px-4 py-3 text-sm text-cyan-50">
          {aiRecommendation}
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {topicBreakdown.map((item) => (
            <span key={item.topic} className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-slate-200">
              {item.topic}: {item.count}
            </span>
          ))}
        </div>
        {testStarted ? (
          <p className="mt-3 text-xs text-slate-400">
            Resume enabled for this test. Attempt state is saved locally in this browser.
          </p>
        ) : null}
      </section>

      {!testStarted ? (
        <section className="overflow-hidden rounded-3xl border border-orange-300/25 bg-[#0d1a3a]/80 shadow-2xl shadow-black/20">
          <div className="border-b border-white/10 bg-[#071126] px-5 py-4">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-orange-300">Instructions, Terms & Conditions</p>
            <h2 className="mt-2 font-display text-3xl text-white">{selectedTest.title}</h2>
          </div>
          <div className="grid gap-5 p-5 lg:grid-cols-[minmax(0,1fr)_320px]">
            <div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
                <h3 className="font-display text-2xl text-white">Exam Overview / Pariksha Vivaran</h3>
                <div className="mt-4 grid gap-3 text-sm text-slate-200 sm:grid-cols-2">
                  <p>Duration: <span className="font-semibold text-cyan-100">{formatTime(testDurationSeconds)}</span></p>
                  <p>Total Questions: <span className="font-semibold text-cyan-100">{questions.length}</span></p>
                  <p>Sections: <span className="font-semibold text-cyan-100">{sectionGroups.length || 1}</span></p>
                  <p>Negative Marking: <span className="font-semibold text-cyan-100">Practice based</span></p>
                </div>
                <div className="mt-5 overflow-hidden rounded-xl border border-white/10">
                  <div className="grid grid-cols-[1fr_90px] bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-300">
                    <span>Subject</span>
                    <span className="text-right">Questions</span>
                  </div>
                  {sectionGroups.map((group) => (
                    <button
                      key={group.section}
                      type="button"
                      onClick={() => setSelectedSubject(group.section)}
                      className="grid w-full grid-cols-[1fr_90px] border-t border-white/10 px-4 py-3 text-left text-sm text-slate-200 hover:bg-white/[0.04]"
                    >
                      <span>{group.section}</span>
                      <span className="text-right font-semibold text-white">{group.total}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.04] p-5">
                <h3 className="font-display text-2xl text-white">Question Palette Symbols</h3>
                <div className="mt-4 grid gap-3 text-sm text-slate-200 md:grid-cols-2">
                  {[
                    ["1", "Not visited", "border-white/10 bg-white/[0.04] text-slate-300"],
                    ["2", "Answered", "border-emerald-300/40 bg-emerald-500/15 text-emerald-100"],
                    ["3", "Marked for review", "border-violet-300/40 bg-violet-500/15 text-violet-100"],
                    ["4", "Bookmarked", "border-cyan-300/40 bg-cyan-500/15 text-cyan-100"]
                  ].map(([number, label, className]) => (
                    <div key={label} className="flex items-center gap-3 rounded-xl border border-white/10 bg-[#071126]/70 px-4 py-3">
                      <span className={`inline-flex h-9 w-9 items-center justify-center rounded-lg border text-sm font-semibold ${className}`}>{number}</span>
                      <span>{label}</span>
                    </div>
                  ))}
                </div>
                <ul className="mt-5 space-y-2 text-sm text-slate-300">
                  <li>Use Save & Next to move forward after selecting an answer.</li>
                  <li>Use Mark for Review when you want to revisit a question before submission.</li>
                  <li>Timer auto-submits the test when time ends; local resume is available before final submit.</li>
                </ul>
              </div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-[#071126] p-5">
              <p className="text-sm text-slate-400">Test Time</p>
              <p className="mt-1 font-display text-4xl text-orange-200">{formatTime(testDurationSeconds)}</p>
              <p className="mt-4 text-sm text-slate-400">Questions</p>
              <p className="mt-1 text-2xl font-semibold text-white">{questions.length}</p>
              <label className="mt-5 block text-xs font-semibold uppercase tracking-[0.16em] text-cyan-300" htmlFor="start-language-select">
                Select Test Language
              </label>
              <select
                id="start-language-select"
                value={languageMode}
                onChange={(event) => setLanguageMode(event.target.value)}
                className="mt-3 w-full rounded-xl border border-white/10 bg-[#0d1a3a] px-4 py-3 text-sm text-white outline-none focus:border-cyan-300"
              >
                <option value="Hindi + English">Hindi + English</option>
                <option value="Hindi">Hindi</option>
                <option value="English">English</option>
              </select>
              <label className="mt-5 flex items-start gap-3 rounded-xl border border-white/10 bg-white/[0.04] p-4 text-sm text-slate-200">
                <input
                  type="checkbox"
                  checked={instructionAccepted}
                  onChange={(event) => setInstructionAccepted(event.target.checked)}
                  className="mt-1 h-4 w-4 accent-orange-400"
                />
                <span>I have read the instructions carefully and agree to attempt this mock honestly.</span>
              </label>
              <button
                type="button"
                onClick={startTest}
                disabled={!instructionAccepted || !questions.length}
                className="btn-gradient btn-anim mt-6 w-full rounded-xl px-4 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                Start Test
              </button>
              <Link href="/mock-tests" className="mt-3 inline-flex w-full justify-center rounded-xl border border-white/15 px-4 py-3 text-sm font-semibold text-slate-100 hover:border-orange-300">
                Back
              </Link>
            </div>
          </div>
        </section>
      ) : (
        <>
          <section className="mock-exam-header shrink-0 border-b border-white/20 bg-[#0b1220] shadow-xl shadow-black/20">
            <div className="grid min-h-20 grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-3 py-3 lg:grid-cols-[240px_minmax(0,1fr)_270px] lg:items-start lg:gap-4 lg:py-2">
              <div className="flex gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full border border-cyan-300/40 bg-cyan-300/10 font-display text-lg text-cyan-100">
                  BC
                </div>
                <div>
                  <p className="text-xs font-semibold text-cyan-100">BadamClasses</p>
                  <p className="mt-1 text-sm font-semibold leading-tight text-white">{selectedTest.title}</p>
                  <p className="mt-1 text-xs text-slate-300">by BadamClasses</p>
                </div>
              </div>
              <div className="order-3 col-span-2 min-w-0 text-center lg:order-none lg:col-span-1">
                <div className="hidden flex-wrap justify-center gap-2 sm:flex">
                  <button type="button" onClick={() => setQuestionZoom((zoom) => Math.min(1.3, Number((zoom + 0.08).toFixed(2))))} className="rounded-md bg-cyan-100 px-5 py-2 text-sm font-bold text-slate-950">
                    Zoom (+)
                  </button>
                  <button type="button" onClick={() => setQuestionZoom((zoom) => Math.max(0.9, Number((zoom - 0.08).toFixed(2))))} className="rounded-md bg-cyan-100 px-5 py-2 text-sm font-bold text-slate-950">
                    Zoom (-)
                  </button>
                  <button type="button" onClick={() => document.documentElement.requestFullscreen?.()} className="rounded-md bg-cyan-100 px-5 py-2 text-sm font-bold text-slate-950">
                    Show Fullscreen
                  </button>
                </div>
                <h2 className="mt-1 truncate font-display text-lg text-white sm:mt-2 sm:text-2xl">{selectedTest.title}</h2>
                <p className="mt-1 truncate text-xs text-slate-200 sm:text-sm">Roll No: Practice User | Language: {languageMode}</p>
              </div>
              <div className="flex items-center justify-end gap-2 sm:gap-3 lg:items-start">
                <div className="rounded-md border border-white/10 p-2 text-center">
                  <p className="text-xs font-semibold text-white sm:text-sm">Time Left</p>
                  <p className={`mt-1 bg-yellow-100 px-2 py-1 font-mono text-lg font-bold tracking-[0.1em] sm:px-3 sm:text-2xl sm:tracking-[0.18em] ${timeLeft <= 300 ? "text-rose-600" : "text-red-600"}`}>{formatTime(timeLeft)}</p>
                </div>
                <div className="hidden h-14 w-24 grid-cols-2 gap-1 bg-white p-1 sm:grid">
                  <div className="rounded-full bg-slate-400/60" />
                  <div className="rounded-full bg-slate-400/60" />
                </div>
              </div>
            </div>
          </section>

          <div className="mock-exam-toolbar sticky top-0 z-40 flex items-center justify-between gap-2 border-b border-white/15 bg-[#07111f]/95 px-3 py-2 shadow-lg backdrop-blur sm:px-4">
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-cyan-200 sm:text-xs">Question {currentQuestionIndex + 1} of {questions.length}</p>
              <p className="mt-0.5 text-xs text-slate-300">Answered {attempted} · {formatTime(timeLeft)} left</p>
            </div>
            <div className="mock-primary-actions flex w-[72vw] min-w-0 shrink-0 gap-2 overflow-x-auto pb-1 [scrollbar-width:thin] sm:w-auto sm:max-w-[80vw]">
              <button
                type="button"
                onClick={() => setCurrentQuestionIndex((index) => Math.max(index - 1, 0))}
                disabled={currentQuestionIndex === 0}
                className="shrink-0 rounded-lg bg-cyan-100 px-3 py-2 text-xs font-bold text-slate-950 disabled:opacity-40 sm:px-4 sm:text-sm"
              >
                Previous
              </button>
              <button
                type="button"
                onClick={() => currentQuestion && toggleReviewFlag(currentQuestion.id)}
                disabled={submitted || !currentQuestion}
                className="shrink-0 rounded-lg bg-cyan-100 px-3 py-2 text-xs font-bold text-slate-950 disabled:opacity-40 sm:px-4 sm:text-sm"
              >
                Mark For Review
              </button>
              <button
                type="button"
                onClick={() => setCurrentQuestionIndex((index) => Math.min(index + 1, questions.length - 1))}
                disabled={submitted || !currentQuestion || currentQuestionIndex === questions.length - 1}
                className="shrink-0 rounded-lg bg-cyan-100 px-3 py-2 text-xs font-bold text-slate-950 disabled:opacity-40 sm:px-4 sm:text-sm"
              >
                Save & Next
              </button>
              <button
                type="button"
                onClick={() => setAnswers((current) => {
                  const updated = { ...current };
                  if (currentQuestion) delete updated[currentQuestion.id];
                  return updated;
                })}
                disabled={submitted || !currentQuestion}
                className="shrink-0 rounded-lg bg-cyan-100 px-3 py-2 text-xs font-bold text-slate-950 disabled:opacity-40 sm:px-4 sm:text-sm"
              >
                Clear
              </button>
              <button
                type="button"
                onClick={submitCurrentSection}
                disabled={submitted || currentSectionGroupIndex < 0 || currentSectionGroupIndex === sectionGroups.length - 1}
                className="shrink-0 rounded-lg bg-blue-300 px-3 py-2 text-xs font-bold text-white disabled:opacity-50 sm:px-4 sm:text-sm"
              >
                Submit Section
              </button>
              <button
                type="button"
                onClick={submitTest}
                disabled={submitted}
                className="shrink-0 rounded-lg bg-orange-500 px-3 py-2 text-xs font-bold text-white disabled:opacity-50 sm:px-4 sm:text-sm"
              >
                Submit Test
              </button>
              <button
                type="button"
                onClick={() => setPaletteOpen(true)}
                className="mock-palette-open shrink-0 rounded-lg border border-blue-600 bg-white px-3 py-2 text-xs font-bold text-blue-700 xl:hidden"
              >
                Palette
              </button>
            </div>
          </div>

          <div className="grid min-h-[calc(100dvh-9rem)] grid-cols-1 gap-0 overflow-visible xl:h-[calc(100vh-5rem)] xl:grid-cols-[minmax(0,1fr)_420px] xl:overflow-hidden">
            <section className="flex min-h-0 flex-col border-r border-white/15 bg-[#0b1220]">
              <div className="flex min-h-[3rem] shrink-0 flex-wrap items-center justify-between gap-2 border-b border-white/20 px-3 py-2 sm:flex-nowrap sm:gap-3 sm:px-4">
                <div className="flex items-center gap-3 sm:gap-4">
                  <button type="button" className="font-semibold uppercase text-orange-400 underline underline-offset-2">Symbols</button>
                  <button type="button" className="font-semibold uppercase text-orange-400 underline underline-offset-2">Instructions</button>
                </div>
                <p className="text-xs font-semibold text-white sm:text-sm">
                  Total Questions answered: <span className="bg-yellow-300 px-1 text-red-600">{attempted}</span>
                </p>
              </div>
              <div className="flex shrink-0 snap-x gap-2 overflow-x-auto px-3 py-3 [scrollbar-width:thin] sm:py-4">
                {sectionGroups.map((group) => (
                  <button
                    key={group.section}
                    type="button"
                    onClick={() => setCurrentQuestionIndex(group.firstIndex)}
                    className={`max-w-[15rem] shrink-0 snap-start truncate rounded-md px-4 py-2 text-sm font-bold ${
                      currentSection === group.section
                        ? "bg-green-500 text-slate-950"
                        : "border border-white/20 bg-white/[0.04] text-slate-100"
                    }`}
                  >
                    {group.section}
                  </button>
                ))}
              </div>
              <div className="shrink-0 px-3 py-3 text-xl font-semibold text-white">Question : {currentQuestionIndex + 1}</div>
              {currentQuestion ? (
                <article id={currentQuestion.id} className="mx-2 flex min-h-0 flex-1 flex-col overflow-visible border border-white/60 bg-[#0d1524]/90 sm:mx-3 xl:overflow-hidden">
                  <div className="flex shrink-0 flex-wrap items-center justify-end gap-2 border-b border-white/60 px-3 py-2 sm:px-4">
                    <label className="text-sm font-semibold text-white sm:text-base" htmlFor="live-language-select">Select Language:</label>
                    <select
                      id="live-language-select"
                      value={languageMode}
                      onChange={(event) => setLanguageMode(event.target.value)}
                      className="min-w-0 max-w-[11rem] rounded-md border border-white/20 bg-[#172033] px-2 py-2 text-sm font-semibold text-white outline-none sm:max-w-none sm:px-3"
                    >
                      <option value="Hindi + English">Hindi + English</option>
                      <option value="Hindi">Hindi</option>
                      <option value="English">English</option>
                    </select>
                    <button type="button" onClick={() => toggleBookmark(currentQuestion.id)} className="rounded-md bg-cyan-100 px-4 py-2 font-bold text-slate-950">
                      Save
                    </button>
                    <button type="button" onClick={() => toggleReviewFlag(currentQuestion.id)} className="rounded-md border border-rose-300 bg-cyan-100 px-4 py-2 font-bold text-slate-950">
                      Report
                    </button>
                  </div>
                  <div className="min-h-0 flex-1 overflow-visible xl:overflow-y-auto" style={{ fontSize: `${questionZoom}rem` }}>
                    <div className="border-b border-white/60 px-4 py-3 text-white">
                      <p className="leading-relaxed">{currentQuestion.question}</p>
                    </div>
                    {currentQuestion.options.map((option, optionIndex) => {
                      const isSelected = answers[currentQuestion.id] === optionIndex;
                      const isCorrect = submitted && currentQuestion.answer === optionIndex;
                      const isWrong = submitted && isSelected && currentQuestion.answer !== optionIndex;
                      return (
                        <button
                          key={option}
                          type="button"
                          onClick={() => selectAnswer(currentQuestion.id, optionIndex)}
                          className={`grid w-full grid-cols-[44px_minmax(0,1fr)] border-b border-white/60 text-left text-white transition ${
                            isCorrect
                              ? "bg-emerald-500/15"
                              : isWrong
                                ? "bg-rose-500/15"
                                : isSelected
                                  ? "bg-orange-500/15"
                                  : "hover:bg-white/[0.04]"
                          }`}
                        >
                          <span className="flex items-center justify-center border-r border-white/60 py-3">
                            <span className={`h-4 w-4 rounded-full border-2 ${isSelected ? "border-cyan-200 bg-cyan-300" : "border-white bg-white"}`} />
                          </span>
                          <span className="px-4 py-3">{option}</span>
                        </button>
                      );
                    })}
                  </div>
                  {submitted ? (
                    <p className="mt-4 rounded-xl border border-cyan-300/20 bg-cyan-500/10 px-4 py-3 text-sm text-cyan-50">
                      {Number.isInteger(currentQuestion.answer) ? `Explanation: ${currentQuestion.explanation}` : "Answer key pending expert review. Your selected response is saved for practice."}
                    </p>
                  ) : null}
                </article>
              ) : null}
              <div className="shrink-0 border-t border-white/15 bg-[#0b1220] px-3 py-3">
                <div className="flex flex-wrap items-center justify-center gap-3">
                <button type="button" onClick={() => setCurrentQuestionIndex((index) => Math.max(index - 1, 0))} disabled={currentQuestionIndex === 0} className="rounded-md bg-cyan-100 px-5 py-3 text-base font-bold text-slate-950 disabled:opacity-40">
                  Previous
                </button>
                <button type="button" onClick={() => currentQuestion && toggleReviewFlag(currentQuestion.id)} disabled={submitted || !currentQuestion} className="rounded-md bg-cyan-100 px-5 py-3 text-base font-bold text-slate-950 disabled:opacity-40">
                  Mark for Review
                </button>
                <button type="button" onClick={() => setCurrentQuestionIndex((index) => Math.min(index + 1, questions.length - 1))} disabled={currentQuestionIndex === questions.length - 1} className="rounded-md bg-cyan-100 px-5 py-3 text-base font-bold text-slate-950 disabled:opacity-40">
                  Save & Next
                </button>
                <button type="button" onClick={() => setAnswers((current) => {
                  const updated = { ...current };
                  if (currentQuestion) delete updated[currentQuestion.id];
                  return updated;
                })} disabled={submitted || !currentQuestion} className="rounded-md bg-cyan-100 px-5 py-3 text-base font-bold text-slate-950 disabled:opacity-40">
                  Clear
                </button>
                <button
                  type="button"
                  onClick={submitCurrentSection}
                  disabled={submitted || currentSectionGroupIndex < 0 || currentSectionGroupIndex === sectionGroups.length - 1}
                  className="rounded-md bg-blue-300 px-5 py-3 text-base font-bold text-white disabled:opacity-50"
                >
                  Submit Section
                </button>
                <button type="button" onClick={submitTest} className="rounded-md bg-cyan-100 px-5 py-3 text-base font-bold text-slate-950">
                  Submit Test
                </button>
                </div>
              </div>
            </section>

            <aside className={`mock-question-palette min-h-0 overflow-hidden bg-[#1d2735] px-3 py-5 sm:px-4 sm:py-8 ${paletteOpen ? "is-open" : ""}`}>
              <button type="button" onClick={() => setPaletteOpen(false)} className="mock-palette-close" aria-label="Close question palette">×</button>
              <div className="mb-8 text-center">
                <div className={`mx-auto mb-3 font-display text-3xl font-bold ${timeLeft <= 300 ? "text-rose-400" : "text-red-500"}`}>Last {Math.ceil(timeLeft / 60)} Minutes</div>
                <div className="text-2xl text-cyan-300">▶</div>
              </div>
              <h2 className="mb-5 text-center font-display text-2xl text-white">{currentSection}</h2>
              <div className="grid max-h-[20rem] grid-cols-5 gap-3 overflow-y-auto pr-1 sm:gap-x-7 sm:gap-y-6">
                {questions.map((question, index) => (
                  <button
                    key={question.id}
                    type="button"
                    onClick={() => {
                      setCurrentQuestionIndex(index);
                      setPaletteOpen(false);
                    }}
                    className={`inline-flex h-6 min-w-11 items-center justify-center rounded-md text-base font-semibold text-slate-950 ${
                      index === currentQuestionIndex
                        ? "bg-orange-300"
                        : reviewFlags[question.id]
                          ? "bg-violet-300"
                          : bookmarks[question.id]
                            ? "bg-cyan-200"
                        : answers[question.id] !== undefined
                          ? "bg-green-300"
                          : "bg-sky-300"
                    }`}
                  >
                    {index + 1}
                  </button>
                ))}
              </div>
              {submitted ? (
                <div className="mt-4 space-y-3">
                  <div className="rounded-xl border border-emerald-300/20 bg-emerald-500/10 p-4 text-sm text-emerald-50">
                    {knownAnswerCount ? `Result: ${score}/${questions.length} correct, ${accuracy}% accuracy.` : `${attempted}/${questions.length} attempted. Answer key pending expert review.`}
                  </div>
                    <div className="rounded-xl border border-white/10 bg-white/[0.04] p-4 text-xs text-slate-200">
                    Practice speed: {speedSeconds || 0}s/question. Verified rank and percentile appear only for submitted online tests.
                  </div>
                </div>
              ) : null}
              <div className="mt-12 bg-slate-300 py-3 text-center text-lg font-bold text-slate-950">{currentSection} Analysis</div>
              <div className="mx-auto mt-4 grid max-w-xs grid-cols-[1fr_40px] gap-3 text-lg font-semibold text-white">
                <span>Answered</span>
                <span className="bg-yellow-300 text-center text-red-600">{currentSectionAnswered}</span>
                <span>Not Answered</span>
                <span className="bg-yellow-300 text-center text-red-600">{Math.max(currentSectionQuestions.length - currentSectionAnswered, 0)}</span>
                <span>Review</span>
                <span className="bg-yellow-300 text-center text-red-600">{markedForReview}</span>
                <span>Bookmarks</span>
                <span className="bg-yellow-300 text-center text-red-600">{bookmarkedCount}</span>
              </div>
              <div className="mt-6 text-center">
                <button type="button" className="rounded-md bg-cyan-100 px-5 py-3 text-base font-bold text-slate-950">Show Camera</button>
              </div>
            </aside>
          </div>

          {submitted ? (
            <section className="mt-6 rounded-2xl border border-white/10 bg-[#0d1a3a]/80 p-5">
              <h2 className="font-display text-2xl text-white">Topic Analysis</h2>
              <div className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-4">
                {topicBreakdown.map((item) => {
                  const topicAccuracy = item.attempted ? Math.round((item.correct / item.attempted) * 100) : 0;
                  return (
                    <div key={item.topic} className="rounded-xl border border-white/10 bg-white/[0.04] p-4">
                      <p className="text-xs uppercase tracking-[0.18em] text-orange-300">{item.topic}</p>
                      <p className="mt-2 text-sm text-slate-200">{item.correct}/{item.count} correct</p>
                      <p className="mt-1 text-sm text-cyan-100">{topicAccuracy}% accuracy</p>
                    </div>
                  );
                })}
              </div>
            </section>
          ) : null}
        </>
      )}
    </main>
  );
}
