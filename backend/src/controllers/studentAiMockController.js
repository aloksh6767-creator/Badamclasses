import { generateStudentAiMock, getStudentAiMockOptions, listStudentAiMocks } from "../utils/studentAiMockService.js";

export const getStudentAiMockConfig = async (req, res) => res.json(await getStudentAiMockOptions(req.studentId || req.user?._id));

export const getMyStudentAiMocks = async (req, res) => res.json({ mocks: await listStudentAiMocks(req.studentId || req.user?._id) });

export const createStudentAiMock = async (req, res) => {
  try {
    const result = await generateStudentAiMock({ ownerId: req.studentId || req.user?._id, body: req.body || {}, requestId: req.body?.requestId });
    return res.status(result.reused ? 200 : 201).json(result);
  } catch (error) {
    const status = Number(error.statusCode) || 500;
    const lowered = String(error.message || "").toLowerCase();
    const message = status < 500 ? error.message
      : /timed out|timeout/.test(lowered) ? "AI question generation took too long. Please retry."
        : /api key|not configured/.test(lowered) ? "AI generation is not configured on the server yet."
          : /database|mongo/.test(lowered) ? "AI mock storage is temporarily unavailable. Please retry."
            : "AI could not validate a complete mock this time. Try another topic and retry.";
    return res.status(status).json({ message });
  }
};
