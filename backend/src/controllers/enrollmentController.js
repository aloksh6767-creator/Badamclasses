import PDFDocument from "pdfkit";
import Enrollment from "../models/Enrollment.js";
import { isDatabaseConnected } from "../config/db.js";
import { resolveEnrollmentCourse, resolveEnrollmentList } from "../utils/enrollmentView.js";
import { findLocalEnrollment, listLocalEnrollmentsByStudent, updateLocalEnrollment } from "../utils/localPersistence.js";

export const getMyEnrollments = async (req, res) => {
  const enrollments = isDatabaseConnected()
    ? await Enrollment.find({ student: req.user._id }).populate({
        path: "course",
        populate: { path: "instructor", select: "name" }
      })
    : listLocalEnrollmentsByStudent(req.user._id);

  res.json(resolveEnrollmentList(enrollments));
};

export const updateProgress = async (req, res) => {
  const { progress } = req.body;
  const enrollment = isDatabaseConnected()
    ? await Enrollment.findOne({ _id: req.params.id, student: req.user._id })
    : findLocalEnrollment({ enrollmentId: req.params.id, studentId: req.user._id });

  if (!enrollment) {
    return res.status(404).json({ message: "Enrollment not found" });
  }

  const nextProgress = Math.min(100, Math.max(0, Number(progress || 0)));
  const completed = nextProgress >= 100;
  const certificateUrl = completed
    ? enrollment.certificateUrl || `https://badamsinghclasses.com/certificates/${enrollment._id}`
    : enrollment.certificateUrl || "";

  if (isDatabaseConnected()) {
    enrollment.progress = nextProgress;
    enrollment.completed = completed;
    enrollment.certificateUrl = certificateUrl;
    await enrollment.save();
    return res.json(enrollment);
  }

  const updated = updateLocalEnrollment(req.params.id, req.user._id, {
    progress: nextProgress,
    completed,
    certificateUrl
  });
  res.json(updated);
};

export const downloadInvoice = async (req, res) => {
  const rawEnrollment = isDatabaseConnected()
    ? await Enrollment.findOne({ _id: req.params.id, student: req.user._id }).populate({
        path: "course",
        populate: { path: "instructor", select: "name" }
      })
    : findLocalEnrollment({ enrollmentId: req.params.id, studentId: req.user._id });

  if (!rawEnrollment) {
    return res.status(404).json({ message: "Enrollment not found" });
  }

  const enrollment = resolveEnrollmentCourse(rawEnrollment);
  const course = enrollment.course;
  const amount = Number(enrollment.amount || course?.price || 0);
  const invoiceNo = `INV-${String(enrollment._id).slice(-8).toUpperCase()}`;

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename=invoice-${course?.title || "course"}.pdf`);

  const doc = new PDFDocument({ margin: 50 });
  doc.pipe(res);

  doc.fontSize(24).text("BadamClasses Invoice", { align: "left" });
  doc.moveDown(0.5);
  doc.fontSize(12).fillColor("#555").text(`Invoice No: ${invoiceNo}`);
  doc.text(`Date: ${new Date().toLocaleDateString("en-IN")}`);
  doc.text(`Payment ID: ${enrollment.paymentId || "manual-confirm"}`);

  doc.moveDown();
  doc.fillColor("#111").fontSize(14).text("Billed To");
  doc.fontSize(12).text(req.user.name || "Student");
  doc.text(req.user.email || "-");

  doc.moveDown();
  doc.fontSize(14).text("Course Details");
  doc.fontSize(12).text(`Course: ${course?.title || "-"}`);
  doc.text(`Instructor: ${course?.instructor?.name || course?.instructor || "Badam Sir"}`);
  doc.text(`Enrollment ID: ${enrollment._id}`);

  doc.moveDown();
  doc.fontSize(14).text("Amount");
  doc.fontSize(20).fillColor("#0d47a1").text(`INR ${amount.toLocaleString("en-IN")}`);

  doc.moveDown();
  doc.fontSize(11).fillColor("#444").text("Thank you for learning with BadamClasses.");

  doc.end();
};
