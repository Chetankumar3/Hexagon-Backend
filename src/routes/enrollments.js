import express from "express";
import Enrollment from "../models/Enrollment.js";
import Course from "../models/Course.js";
import { authenticateToken } from "../middleware/auth.js";

const router = express.Router();

// GET /enrollments/me - Get current user's enrollments
router.get("/me", authenticateToken, async (req, res) => {
  try {
    const studentId = String(req.user._id);
    const enrollments = await Enrollment.find({ studentId }).sort({
      createdAt: -1,
    });
    res.json(enrollments);
  } catch (err) {
    console.error("enrollments GET me error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /enrollments?courseId=<id> - Get all students enrolled in a course
router.get("/", authenticateToken, async (req, res) => {
  try {
    const { courseId } = req.query;
    if (!courseId) return res.status(400).json({ error: "courseId required" });
    const enrollments = await Enrollment.find({
      courseId: String(courseId),
    }).sort({ createdAt: -1 });
    res.json(enrollments);
  } catch (err) {
    console.error("enrollments GET error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /enrollments/status?courseId=<id> - Check if user is enrolled
router.get("/status", authenticateToken, async (req, res) => {
  try {
    const { courseId } = req.query;
    if (!courseId) return res.status(400).json({ error: "courseId required" });
    const studentId = String(req.user._id);
    const enrollment = await Enrollment.findOne({
      studentId,
      courseId: String(courseId),
    });
    res.json({ enrolled: !!enrollment, status: enrollment?.status || null });
  } catch (err) {
    console.error("enrollments status error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /enrollments { courseId } - Enroll in a course
router.post("/", authenticateToken, async (req, res) => {
  try {
    const studentId = String(req.user._id);
    const courseId = String(req.body?.courseId || "");
    if (!courseId) return res.status(400).json({ error: "courseId required" });

    // Check if course exists
    const course = await Course.findById(courseId);
    if (!course) return res.status(404).json({ error: "Course not found" });

    // Create enrollment
    const enrollment = await Enrollment.findOneAndUpdate(
      { studentId, courseId },
      { $setOnInsert: { studentId, courseId } },
      { upsert: true, new: true }
    );

    // Increment course enrollment count
    await Course.updateOne({ _id: courseId }, { $inc: { enrolledCount: 1 } });

    res.status(201).json(enrollment);
  } catch (err) {
    console.error("enrollments create error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// DELETE /enrollments { courseId } - Drop a course
router.delete("/", authenticateToken, async (req, res) => {
  try {
    const studentId = String(req.user._id);
    const courseId = String(req.body?.courseId || req.query.courseId || "");
    if (!courseId) return res.status(400).json({ error: "courseId required" });

    await Enrollment.deleteOne({ studentId, courseId });

    // Decrement course enrollment count
    await Course.updateOne({ _id: courseId }, { $inc: { enrolledCount: -1 } });

    res.json({ ok: true });
  } catch (err) {
    console.error("enrollments delete error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
