const CURRENT_BATCHES = new Map([
  ["ssc-foundation-batch-2027", "ssc foundation batch 2027"],
  ["ssc-foundation-batch", "ssc foundation batch"],
  ["maths-special", "maths special batch"],
  ["recorded-batch", "recorded batch 2.0"]
]);

const CURRENT_BATCH_TITLES = new Set(CURRENT_BATCHES.values());

const normalizeBatchKey = (value = "") => String(value || "").trim().toLowerCase();

export const isCurrentBatch = (batch = {}) => {
  const ids = [batch.id, batch._id, batch.slug, batch.routeId]
    .map(normalizeBatchKey)
    .filter(Boolean);

  const title = normalizeBatchKey(batch.title);
  const knownId = ids.find((id) => CURRENT_BATCHES.has(id));
  if (knownId) return CURRENT_BATCHES.get(knownId) === title;
  return CURRENT_BATCH_TITLES.has(title);
};
