import crypto from "crypto";
import Razorpay from "razorpay";
import Course from "../models/Course.js";
import Enrollment from "../models/Enrollment.js";
import { resolveEnrollmentCourse } from "../utils/enrollmentView.js";
import { getDatabaseStatus, isDatabaseConnected } from "../config/db.js";
import { findLocalEnrollment, upsertLocalEnrollment } from "../utils/localPersistence.js";

const getRazorpayEnv = () => {
  const keyId = process.env.RAZORPAY_KEY_ID || "";
  const keySecret = process.env.RAZORPAY_KEY_SECRET || "";
  const configured =
    Boolean(keyId && keySecret) &&
    !keyId.includes("replace_me") &&
    !keySecret.includes("replace_me");
  const mode = keyId.startsWith("rzp_test_") ? "test" : keyId.startsWith("rzp_live_") ? "live" : "unknown";

  return {
    keyId,
    keySecret,
    configured,
    mode
  };
};

const getRazorpayClient = () => {
  const { keyId, keySecret, configured } = getRazorpayEnv();
  if (!configured) {
    return null;
  }

  return new Razorpay({
    key_id: keyId,
    key_secret: keySecret
  });
};

const createRazorpayOrder = async (payload) => {
  return razorpayApiFetch("/v1/orders", {
    method: "POST",
    body: JSON.stringify(payload)
  });
};

const fetchRazorpayOrder = async (orderId) => {
  return razorpayApiFetch(`/v1/orders/${encodeURIComponent(orderId)}`, {
    method: "GET"
  });
};

export const getPaymentDebugSummary = () => {
  const database = getDatabaseStatus();
  const razorpayEnv = getRazorpayEnv();
  return {
    backend: "reachable",
    database: {
      status: database.connected ? "connected" : "disconnected",
      code: database.code,
      detail: database.detail
    },
    localPersistenceEnabled: !database.connected,
    razorpay: {
      configured: razorpayEnv.configured,
      mode: razorpayEnv.mode,
      keyIdAvailable: Boolean(razorpayEnv.keyId),
      keySecretAvailable: Boolean(razorpayEnv.keySecret)
    }
  };
};

const isObjectId = (value) => /^[a-f0-9]{24}$/i.test(String(value || "").trim());
const normalizeRouteId = (value) => String(value || "").trim();
const normalizeText = (value) => String(value || "").trim();
const normalizeCurrency = (value) => normalizeText(value || "INR").toUpperCase();
const QR_EXPIRY_SECONDS = 15 * 60;
const UPI_VPA_PATTERN = /^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}$/;

const buildBasicAuthHeader = () => {
  const { keyId, keySecret, configured } = getRazorpayEnv();
  if (!configured) {
    return null;
  }

  return `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString("base64")}`;
};

const razorpayApiFetch = async (path, options = {}) => {
  const authHeader = buildBasicAuthHeader();
  if (!authHeader) {
    throw new Error("Razorpay test mode is not configured yet.");
  }

  const response = await fetch(`https://api.razorpay.com${path}`, {
    ...options,
    headers: {
      Authorization: authHeader,
      "Content-Type": "application/json",
      ...(options.headers || {})
    }
  });

  const data = await response.json().catch(() => null);
  if (!response.ok) {
    const description = data?.error?.description || data?.description || data?.message;
    throw new Error(description || "Razorpay request failed.");
  }

  return data;
};

const buildSnapshotFromPayload = (payload = {}) => ({
  _id: normalizeRouteId(payload._id || payload.id || payload.routeId || payload.title),
  id: normalizeRouteId(payload.id || payload._id || payload.routeId || payload.title),
  routeId: normalizeRouteId(payload.routeId || payload._id || payload.id || payload.title),
  title: normalizeText(payload.title || "Course"),
  price: Number(payload.price || payload.priceValue || 0),
  image: normalizeText(payload.image),
  thumbnail: normalizeText(payload.thumbnail || payload.image),
  instructor: payload.instructor || "BadamClasses",
  duration: normalizeText(payload.duration || "Flexible"),
  batchTime: normalizeText(payload.batchTime),
  startDate: normalizeText(payload.startDate)
});

const resolveCourseForPayment = async (payload = {}) => {
  const directCourseId = normalizeRouteId(payload.courseId);

  if (isDatabaseConnected() && isObjectId(directCourseId)) {
    const course = await Course.findById(directCourseId).populate("instructor", "name");
    if (!course) return null;

    return {
      course,
      courseRouteId: String(course._id),
      courseTitle: course.title,
      amount: Number(course.price || 0),
      snapshot: {
        _id: String(course._id),
        id: String(course._id),
        routeId: String(course._id),
        title: course.title,
        price: Number(course.price || 0),
        image: course.thumbnail || "",
        thumbnail: course.thumbnail || "",
        instructor: course.instructor?.name || "BadamClasses",
        duration: "",
        batchTime: "",
        startDate: ""
      }
    };
  }

  const snapshot = buildSnapshotFromPayload(payload.course || payload);
  if (!snapshot.routeId || !snapshot.title || !Number.isFinite(snapshot.price) || snapshot.price <= 0) {
    return null;
  }

  return {
    course: null,
    courseRouteId: snapshot.routeId,
    courseTitle: snapshot.title,
    amount: snapshot.price,
    snapshot
  };
};

const findExistingEnrollment = async (studentId, courseRouteId) =>
  isDatabaseConnected()
    ? Enrollment.findOne({
        student: studentId,
        courseRouteId
      })
    : findLocalEnrollment({
        studentId,
        courseRouteId
      });

const saveEnrollment = async ({ userId, resolved, paymentId, orderId = "", currency = "INR", paymentProvider = "razorpay" }) => {
  const enrollmentPayload = {
    student: userId,
    course: resolved.course?._id || null,
    courseRouteId: resolved.courseRouteId,
    courseTitle: resolved.courseTitle,
    courseSnapshot: resolved.snapshot,
    paymentId,
    orderId,
    paymentProvider,
    amount: resolved.amount,
    currency: normalizeCurrency(currency)
  };

  return isDatabaseConnected()
    ? Enrollment.findOneAndUpdate(
        { student: userId, courseRouteId: resolved.courseRouteId },
        enrollmentPayload,
        { upsert: true, new: true, setDefaultsOnInsert: true }
      ).populate({
        path: "course",
        populate: { path: "instructor", select: "name" }
      })
    : upsertLocalEnrollment(enrollmentPayload);
};

export const createCheckoutSession = async (req, res) => {
  if (!getRazorpayClient()) {
    return res.status(503).json({ message: "Razorpay test mode is not configured yet." });
  }

  const resolved = await resolveCourseForPayment(req.body);
  if (!resolved) {
    return res.status(404).json({ message: "Course not found" });
  }

  const existingEnrollment = await findExistingEnrollment(req.user._id, resolved.courseRouteId);
  if (existingEnrollment) {
    return res.status(400).json({ message: "Already enrolled" });
  }

  let order;
  try {
    order = await createRazorpayOrder({
      amount: Math.round(resolved.amount * 100),
      currency: "INR",
      receipt: `course_${String(req.user._id).slice(-6)}_${Date.now()}`,
      notes: {
        studentId: String(req.user._id),
        courseRouteId: resolved.courseRouteId,
        courseTitle: resolved.courseTitle,
        dbCourseId: resolved.course ? String(resolved.course._id) : ""
      }
    });
  } catch (error) {
    return res.status(503).json({ message: error.message || "Unable to create Razorpay order right now." });
  }

  res.json({
    keyId: getRazorpayEnv().keyId,
    orderId: order.id,
    amount: order.amount,
    currency: order.currency,
    course: resolved.snapshot,
    user: {
      name: req.user.name,
      email: req.user.email,
      phone: req.user.phone || req.user.mobile || ""
    }
  });
};

export const createQrCheckoutSession = async (req, res) => {
  const resolved = await resolveCourseForPayment(req.body);
  if (!resolved) {
    return res.status(404).json({ message: "Course not found" });
  }

  const existingEnrollment = await findExistingEnrollment(req.user._id, resolved.courseRouteId);
  if (existingEnrollment) {
    return res.status(400).json({ message: "Already enrolled" });
  }

  const closeBy = Math.floor(Date.now() / 1000) + QR_EXPIRY_SECONDS;

  try {
    const qrCode = await razorpayApiFetch("/v1/payments/qr_codes", {
      method: "POST",
      body: JSON.stringify({
        type: "upi_qr",
        name: `BadamClasses ${resolved.courseTitle}`.slice(0, 50),
        usage: "single_use",
        fixed_amount: true,
        payment_amount: Math.round(resolved.amount * 100),
        description: `Course purchase for ${resolved.courseTitle}`.slice(0, 255),
        close_by: closeBy,
        notes: {
          studentId: String(req.user._id),
          courseRouteId: resolved.courseRouteId,
          courseTitle: resolved.courseTitle,
          amount: String(Math.round(resolved.amount * 100)),
          dbCourseId: resolved.course ? String(resolved.course._id) : ""
        }
      })
    });

    return res.json({
      qrId: qrCode.id,
      imageUrl: qrCode.image_url,
      closeBy: qrCode.close_by,
      status: qrCode.status,
      amount: qrCode.payment_amount,
      currency: "INR",
      course: resolved.snapshot
    });
  } catch (error) {
    const normalizedMessage = String(error.message || "").toLowerCase();
    return res.status(503).json({
      message:
        normalizedMessage.includes("feature") || normalizedMessage.includes("requested url was not found")
          ? "Razorpay QR is not enabled on this account yet. Please use standard checkout for now."
          : error.message || "QR payment is unavailable right now."
    });
  }
};

export const confirmPaymentAndEnroll = async (req, res) => {
  if (!getRazorpayClient()) {
    return res.status(503).json({ message: "Razorpay test mode is not configured yet." });
  }

  const {
    razorpay_order_id: orderId,
    razorpay_payment_id: paymentId,
    razorpay_signature: signature,
    course
  } = req.body || {};

  if (!orderId || !paymentId || !signature) {
    return res.status(400).json({ message: "Missing payment verification fields." });
  }

  const expectedSignature = crypto
    .createHmac("sha256", getRazorpayEnv().keySecret)
    .update(`${orderId}|${paymentId}`)
    .digest("hex");

  if (expectedSignature !== signature) {
    return res.status(400).json({ message: "Payment signature verification failed." });
  }

  let order;
  try {
    order = await fetchRazorpayOrder(orderId);
  } catch (error) {
    return res.status(503).json({ message: error.message || "Unable to verify Razorpay order right now." });
  }
  if (!order || order.status !== "paid") {
    return res.status(400).json({ message: "Payment is not marked as paid yet." });
  }

  if (String(order.notes?.studentId || "") !== String(req.user._id)) {
    return res.status(403).json({ message: "This payment does not belong to the logged-in user." });
  }

  const resolved = await resolveCourseForPayment({
    courseId: order.notes?.dbCourseId || course?.courseId || course?._id,
    courseRouteId: order.notes?.courseRouteId || course?.routeId,
    title: order.notes?.courseTitle || course?.title,
    ...(course || {})
  });

  if (!resolved) {
    return res.status(404).json({ message: "Purchased course could not be resolved." });
  }

  const enrollment = await saveEnrollment({
    userId: req.user._id,
    resolved,
    paymentId,
    orderId,
    currency: order.currency || "INR",
    paymentProvider: "razorpay"
  });

  res.json({ message: "Course unlocked", enrollment: resolveEnrollmentCourse(enrollment) });
};

export const confirmCheckoutSessionAndEnroll = confirmPaymentAndEnroll;

export const getQrCheckoutStatus = async (req, res) => {
  const qrId = normalizeText(req.params.qrId);
  if (!qrId) {
    return res.status(400).json({ message: "QR session id is required." });
  }

  try {
    const qrCode = await razorpayApiFetch(`/v1/payments/qr_codes/${encodeURIComponent(qrId)}`);
    const qrNotes = qrCode.notes || {};

    if (String(qrNotes.studentId || "") !== String(req.user._id)) {
      return res.status(403).json({ message: "This QR session does not belong to the logged-in user." });
    }

    const paymentsResponse = await razorpayApiFetch(`/v1/payments/qr_codes/${encodeURIComponent(qrId)}/payments`);
    const items = Array.isArray(paymentsResponse?.items) ? paymentsResponse.items : [];
    const capturedPayment =
      items.find((payment) => payment?.captured && payment?.status === "captured") ||
      items.find((payment) => payment?.status === "authorized");

    if (!capturedPayment) {
      const expired = qrCode.status === "closed" && qrCode.close_reason !== "paid";
      return res.json({
        paid: false,
        status: expired ? "expired" : qrCode.status || "pending",
        qrStatus: qrCode.status || "active",
        closeReason: qrCode.close_reason || null,
        amountReceived: Number(qrCode.payments_amount_received || 0)
      });
    }

    const resolved = await resolveCourseForPayment({
      courseId: capturedPayment.notes?.dbCourseId || qrNotes.dbCourseId,
      routeId: qrNotes.courseRouteId,
      courseRouteId: qrNotes.courseRouteId,
      title: qrNotes.courseTitle,
      price: Number(qrNotes.amount || 0) / 100
    });

    if (!resolved) {
      return res.status(404).json({ message: "Purchased course could not be resolved." });
    }

    const enrollment = await saveEnrollment({
      userId: req.user._id,
      resolved,
      paymentId: capturedPayment.id,
      orderId: "",
      currency: capturedPayment.currency || "INR",
      paymentProvider: "razorpay_qr"
    });

    return res.json({
      paid: true,
      status: "paid",
      qrStatus: qrCode.status || "closed",
      closeReason: qrCode.close_reason || "paid",
      enrollment: resolveEnrollmentCourse(enrollment),
      course: resolved.snapshot
    });
  } catch (error) {
    return res.status(503).json({ message: error.message || "Unable to verify QR payment right now." });
  }
};

export const validateUpiId = async (req, res) => {
  const vpa = normalizeText(req.body?.vpa).toLowerCase();
  if (!vpa) {
    return res.status(400).json({ message: "UPI ID is required." });
  }

  if (!UPI_VPA_PATTERN.test(vpa)) {
    return res.status(400).json({ message: "Invalid UPI ID format." });
  }

  try {
    const result = await razorpayApiFetch("/v1/payments/validate/vpa", {
      method: "POST",
      body: JSON.stringify({ vpa })
    });

    return res.json({
      success: true,
      vpa,
      valid: Boolean(result?.success),
      customerName: result?.customer_name || "",
      message: result?.success ? "UPI ID looks valid." : "UPI ID could not be verified."
    });
  } catch (error) {
    const normalizedMessage = String(error.message || "").toLowerCase();
    return res.status(503).json({
      success: false,
      valid: false,
      message:
        normalizedMessage.includes("deprecat") || normalizedMessage.includes("not found")
          ? "UPI ID validation is not enabled on this Razorpay account right now."
          : error.message || "Unable to validate UPI ID right now."
    });
  }
};

export const getPaymentDebug = async (req, res) => {
  res.json({
    status: "ok",
    ...getPaymentDebugSummary()
  });
};
