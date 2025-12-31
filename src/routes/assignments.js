import express from "express";
import { authenticateToken } from "../middleware/auth.js";
import Assignment from "../models/Assignment.js";
import Post from "../models/Post.js";
import Comment from "../models/Comment.js";
import OpenAI from "openai";

const router = express.Router();

// Analyze assignment with Groq (via OpenAI client to Groq API)
async function analyzeAssignmentWithGroq(content, images = []) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error("Groq API key not configured");

  const client = new OpenAI({
    apiKey,
    baseURL: "https://api.groq.com/openai/v1",
  });

  // Build comprehensive prompt
  let prompt = `You are an expert assignment evaluator. Analyze this assignment submission:

${content || "[No text content]"}

${
  images.length > 0
    ? `\nNote: This submission includes ${images.length} image(s). Please analyze the text content and provide feedback based on what is written.`
    : ""
}

TASKS:
1. Grade the assignment (0-100 score) based on:
   - Quality of content
   - Understanding of concepts
   - Clarity and structure
   - Completeness

2. Check for plagiarism indicators:
   - Similarity to common knowledge
   - Potential copy-paste patterns
   - Unoriginal phrasing
   Provide a plagiarism score (0-100, where 0 is original and 100 is highly plagiarized)

3. Provide constructive feedback:
   - List 2-3 key strengths
   - List 2-3 areas for improvement
   - Give 2-3 actionable suggestions

Return ONLY valid JSON in this exact format (no markdown, no backticks):
{
  "score": 85,
  "feedback": "Overall good understanding...",
  "plagiarismScore": 15,
  "plagiarismDetails": "Low similarity detected, mostly original work",
  "strengths": ["Clear explanation", "Good examples"],
  "weaknesses": ["Could expand on X", "Minor grammar issues"],
  "suggestions": ["Add more examples", "Cite sources properly"]
}`;

  const resp = await client.responses.create({
    model: process.env.GROQ_MODEL || "openai/gpt-oss-20b",
    temperature: 0.7,
    input: `SYSTEM: You are an expert assignment evaluator. Return ONLY valid JSON with fields: score (0-100), feedback, plagiarismScore (0-100), plagiarismDetails, strengths[], weaknesses[], suggestions[]. No markdown, no backticks, no explanations outside JSON.\n\nUSER: ${prompt}`,
  });

  let txt = (resp.output_text || "").trim() || "{}";
  txt = txt
    .replace(/```json\n?/g, "")
    .replace(/```\n?/g, "")
    .replace(/^[^{]*/, "")
    .replace(/[^}]*$/, "")
    .trim();

  const analysis = JSON.parse(txt);
  return { analysis, provider: "groq" };
}

// Create assignment from post
router.post("/", authenticateToken, async (req, res) => {
  try {
    const { postId, courseId } = req.body;

    if (!postId || !courseId) {
      return res
        .status(400)
        .json({ error: "postId and courseId are required" });
    }

    // Get post content
    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({ error: "Post not found" });
    }

    const accountId = process.env.AI_EVALUATOR_ACCOUNT_ID || "evaluator";

    // Create assignment
    const assignment = new Assignment({
      courseId,
      postId,
      accountId,
      content: post.content || "",
      images: (post.images || []).map((img) => img.data || img),
      status: "pending",
    });

    await assignment.save();

    res.status(201).json({
      success: true,
      assignment: {
        _id: assignment._id,
        courseId: assignment.courseId,
        postId: assignment.postId,
        status: assignment.status,
        createdAt: assignment.createdAt,
      },
    });
  } catch (error) {
    console.error("Create assignment error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Analyze assignment
router.post("/:assignmentId/analyze", authenticateToken, async (req, res) => {
  try {
    const { assignmentId } = req.params;

    const assignment = await Assignment.findById(assignmentId);
    if (!assignment) {
      return res.status(404).json({ error: "Assignment not found" });
    }

    // Check permissions (only owner or admin)
    const accountId = req.user._id?.toString() || req.user.accountId;
    if (assignment.accountId !== accountId && req.user.role !== "admin") {
      return res.status(403).json({ error: "Unauthorized" });
    }

    // Update status
    assignment.status = "analyzing";
    await assignment.save();

    // Analyze with Groq
    try {
      const { analysis, provider } = await analyzeAssignmentWithGroq(
        assignment.content,
        assignment.images
      );
      assignment.analysis = { ...analysis, analyzedAt: new Date(), provider };
      assignment.status = "completed";
      await assignment.save();
      return res.json({ success: true, analysis: assignment.analysis });
    } catch (analysisError) {
      assignment.status = "failed";
      await assignment.save();
      throw analysisError;
    }
  } catch (error) {
    console.error("Analyze assignment error:", error);
    res.status(500).json({
      error: "Failed to analyze assignment",
      message: error.message,
    });
  }
});

// Quick analyze: create assignment and analyze in one call
router.post("/quick-analyze", authenticateToken, async (req, res) => {
  try {
    const { postId } = req.body || {};
    if (!postId) return res.status(400).json({ error: "postId is required" });

    // Load post
    const post = await Post.findById(postId);
    if (!post) return res.status(404).json({ error: "Post not found" });

    const accountId = "AI PLAGRISM CHECKER";

    // Analyze with Groq (no course requirement)
    const { analysis } = await analyzeAssignmentWithGroq(
      post.content || "",
      (post.images || []).map((img) => img.data || img)
    );

    // Format a concise comment from analysis
    const parts = [];
    if (typeof analysis.score === "number")
      parts.push(`Score: ${analysis.score}/100`);
    if (analysis.plagiarismScore !== undefined)
      parts.push(`Plagiarism: ${analysis.plagiarismScore}/100`);
    if (analysis.feedback) parts.push(`Feedback: ${analysis.feedback}`);
    if (Array.isArray(analysis.strengths) && analysis.strengths.length)
      parts.push(`Strengths: ${analysis.strengths.slice(0, 3).join(", ")}`);
    if (Array.isArray(analysis.weaknesses) && analysis.weaknesses.length)
      parts.push(`Weaknesses: ${analysis.weaknesses.slice(0, 3).join(", ")}`);
    if (Array.isArray(analysis.suggestions) && analysis.suggestions.length)
      parts.push(`Suggestions: ${analysis.suggestions.slice(0, 3).join(", ")}`);

    const content = parts.join("\n");

    // Create a comment on the post with the analysis
    const comment = await Comment.create({
      targetType: "post",
      targetId: String(postId),
      accountId,
      content: content.slice(0, 1000),
    });

    return res.json({ success: true, analysis, comment });
  } catch (error) {
    console.error("Quick analyze error:", error);
    return res
      .status(500)
      .json({ error: "Failed to quick analyze", message: error.message });
  }
});

// Get assignments for a course
router.get("/course/:courseId", authenticateToken, async (req, res) => {
  try {
    const { courseId } = req.params;
    const assignments = await Assignment.find({ courseId })
      .sort({ createdAt: -1 })
      .limit(100);

    res.json({ success: true, assignments });
  } catch (error) {
    console.error("Get assignments error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get user's assignments
router.get("/my-assignments", authenticateToken, async (req, res) => {
  try {
    const accountId = req.user._id?.toString() || req.user.accountId;
    const assignments = await Assignment.find({ accountId })
      .populate("courseId", "title")
      .populate("postId", "content images")
      .sort({ createdAt: -1 });

    res.json({ success: true, assignments });
  } catch (error) {
    console.error("Get my assignments error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get single assignment
router.get("/:assignmentId", authenticateToken, async (req, res) => {
  try {
    const assignment = await Assignment.findById(req.params.assignmentId)
      .populate("courseId", "title")
      .populate("postId", "content images");

    if (!assignment) {
      return res.status(404).json({ error: "Assignment not found" });
    }

    res.json({ success: true, assignment });
  } catch (error) {
    console.error("Get assignment error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
