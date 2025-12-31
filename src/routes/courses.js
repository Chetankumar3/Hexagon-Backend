import express from "express";
import Course from "../models/Course.js";
import { authenticateToken, authorizeRoles } from "../middleware/auth.js";
import { cache, cacheKeys } from "../utils/redis.js";

const router = express.Router();

// GET /courses - Get all courses (with caching)
router.get("/", async (req, res) => {
  try {
    const cacheKey = cacheKeys.courses.all();
    
    const courses = await cache.getOrSet(
      cacheKey,
      async () => {
        return await Course.find({}).sort({ createdAt: -1 }).lean();
      },
      300 // Cache for 5 minutes
    );
    
    res.json(courses);
  } catch (err) {
    console.error("courses GET error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /courses/:id - Get a single course (with caching)
router.get("/:id", async (req, res) => {
  try {
    const cacheKey = cacheKeys.courses.byId(req.params.id);
    
    const course = await cache.getOrSet(
      cacheKey,
      async () => {
        const found = await Course.findById(req.params.id).lean();
        return found;
      },
      600 // Cache for 10 minutes (individual courses change less frequently)
    );
    
    if (!course) {
      return res.status(404).json({ error: "Course not found" });
    }
    
    res.json(course);
  } catch (err) {
    console.error("courses GET by id error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /courses - Create a new course (admin only)
router.post("/", async (req, res) => {
  try {
    const {
      title,
      description,
      duration,
      department,
      image,
      professor,
      instructor,
      institute,
      enrolledCount,
      milestones,
      curriculum,
      weeklyPlan,
    } = req.body;

    if (!title || !description || !duration || !department) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const course = await Course.create({
      title,
      description,
      duration,
      department,
      image: image || "",
      professor: professor || "",
      instructor: instructor || "",
      institute: institute || "",
      enrolledCount: Number.isFinite(enrolledCount) ? Number(enrolledCount) : 0,
      milestones: Array.isArray(milestones) ? milestones : [],
      curriculum: Array.isArray(curriculum) ? curriculum : [],
      weeklyPlan: Array.isArray(weeklyPlan) ? weeklyPlan : [],
    });

    // Invalidate cache
    await cache.deletePattern('courses:*');

    res.status(201).json(course);
  } catch (err) {
    console.error("courses POST error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// PUT /courses/:id - Update a course (admin only)
router.put(
  "/:id",
  authenticateToken,
  authorizeRoles(["admin"]),
  async (req, res) => {
    try {
      const {
        title,
        description,
        duration,
        department,
        image,
        professor,
        instructor,
        institute,
        enrolledCount,
        milestones,
        curriculum,
        weeklyPlan,
      } = req.body;

      const course = await Course.findById(req.params.id);
      if (!course) {
        return res.status(404).json({ error: "Course not found" });
      }

      // Update only provided fields
      if (title) course.title = title;
      if (description) course.description = description;
      if (duration) course.duration = duration;
      if (department) course.department = department;
      if (image !== undefined) course.image = image;
      if (professor !== undefined) course.professor = professor;
      if (instructor !== undefined) course.instructor = instructor;
      if (institute !== undefined) course.institute = institute;
      if (enrolledCount !== undefined && Number.isFinite(Number(enrolledCount)))
        course.enrolledCount = Number(enrolledCount);
      if (Array.isArray(milestones)) course.milestones = milestones;
      if (Array.isArray(curriculum)) course.curriculum = curriculum;
      if (Array.isArray(weeklyPlan)) course.weeklyPlan = weeklyPlan;

      await course.save();
      
      // Invalidate cache for this course and all courses list
      await cache.delete(cacheKeys.courses.byId(req.params.id));
      await cache.delete(cacheKeys.courses.all());
      
      res.json(course);
    } catch (err) {
      console.error("courses PUT error:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

// DELETE /courses/:id - Delete a course (admin only)
router.delete(
  "/:id",
  authenticateToken,
  authorizeRoles(["admin"]),
  async (req, res) => {
    try {
      const course = await Course.findById(req.params.id);
      if (!course) {
        return res.status(404).json({ error: "Course not found" });
      }

      await Course.deleteOne({ _id: req.params.id });
      
      // Invalidate cache
      await cache.delete(cacheKeys.courses.byId(req.params.id));
      await cache.delete(cacheKeys.courses.all());
      
      res.json({ ok: true });
    } catch (err) {
      console.error("courses DELETE error:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

export default router;
