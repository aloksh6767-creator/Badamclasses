export const calculateObjectiveResult = ({ questions = [], answers = {}, marksPerQuestion = 1, negativeMarks = 0, timeTakenSeconds = 0 } = {}) => {
  const safeQuestions = Array.isArray(questions) ? questions : [];
  let correct = 0;
  let incorrect = 0;
  safeQuestions.forEach((question, index) => {
    const selected = answers?.[String(index)];
    if (selected === undefined || selected === null) return;
    if (Number(selected) === Number(question.answer)) correct += 1;
    else incorrect += 1;
  });
  const unanswered = Math.max(safeQuestions.length - correct - incorrect, 0);
  const maxMarks = safeQuestions.length * Math.max(Number(marksPerQuestion) || 0, 0);
  const score = Number((correct * Math.max(Number(marksPerQuestion) || 0, 0) - incorrect * Math.max(Number(negativeMarks) || 0, 0)).toFixed(2));
  const attempted = correct + incorrect;
  return {
    score,
    maxMarks,
    correct,
    incorrect,
    unanswered,
    accuracy: attempted ? Number(((correct / attempted) * 100).toFixed(2)) : 0,
    timeTakenSeconds: Math.max(0, Math.floor(Number(timeTakenSeconds) || 0))
  };
};

export const calculateRankStatsFromCounts = (participantCount, higherCount, tiedCount) => {
  return {
    rank: higherCount + 1,
    percentile: participantCount ? Number((((participantCount - higherCount - tiedCount / 2) / participantCount) * 100).toFixed(2)) : null,
    participantCount
  };
};

export const calculateRankStats = (scores = [], score = 0) => {
  const validScores = scores.map(Number).filter(Number.isFinite);
  const target = Number(score);
  return calculateRankStatsFromCounts(
    validScores.length,
    validScores.filter((value) => value > target).length,
    validScores.filter((value) => value === target).length
  );
};
