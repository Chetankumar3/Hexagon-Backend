import mongoose from "mongoose";

const AssignmentSchema = new mongoose.Schema(
  {
    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      required: true,
      index: true,
    },
    postId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Post",
      required: true,
      index: true,
    },
    accountId: {
      type: String,
      required: true,
      index: true,
    },
    content: {
      type: String,
      default: "",
    },
    images: {
      type: [String], // URLs or base64
      default: [],
    },
    analysis: {
      score: { type: Number, min: 0, max: 100 },
      feedback: { type: String, default: "" },
      plagiarismScore: { type: Number, min: 0, max: 100 },
      plagiarismDetails: { type: String, default: "" },
      strengths: { type: [String], default: [] },
      weaknesses: { type: [String], default: [] },
      suggestions: { type: [String], default: [] },
      analyzedAt: { type: Date },
    },
    status: {
      type: String,
      enum: ["pending", "analyzing", "completed", "failed"],
      default: "pending",
    },
  },
  { timestamps: true }
);

AssignmentSchema.index({ courseId: 1, createdAt: -1 });
AssignmentSchema.index({ accountId: 1, createdAt: -1 });

const Assignment =
  mongoose.models.Assignment || mongoose.model("Assignment", AssignmentSchema);

export default Assignment;
