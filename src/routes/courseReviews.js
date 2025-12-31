import express from "express";
import { authenticateToken } from "../middleware/auth.js";
import CourseReview from "../models/CourseReview.js";

const router = express.Router();

// List reviews for a course
router.get("/:courseId", async (req, res) => {
  try {
    const { courseId } = req.params;
    const reviews = await CourseReview.find({ courseId })
      .sort({ createdAt: -1 })
      .limit(200);
    res.json(reviews);
  } catch (e) {
    res.status(500).json({ error: "Failed to load reviews" });
  }
});

// Create a review (enrolled-only policy can be enforced later if needed)
router.post("/:courseId", authenticateToken, async (req, res) => {
  try {
    const { courseId } = req.params;
    const { rating, content, images } = req.body || {};
    const accountId = req.user._id?.toString() || req.user.accountId;

    const r = new CourseReview({
      courseId,
      accountId,
      rating: Number(rating || 0),
      content: String(content || "").trim(),
      images: Array.isArray(images) ? images.slice(0, 6) : [],
    });
    await r.save();
    res.status(201).json(r);
  } catch (e) {
    res.status(500).json({ error: "Failed to create review" });
  }
});

export default router;
