import mongoose from "mongoose";

const CourseReviewSchema = new mongoose.Schema(
  {
    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      required: true,
      index: true,
    },
    accountId: { type: String, required: true, index: true },
    rating: { type: Number, min: 1, max: 5, required: true },
    content: { type: String, default: "", maxlength: 2000 },
    images: { type: [String], default: [] },
  },
  { timestamps: true }
);

CourseReviewSchema.index({ courseId: 1, createdAt: -1 });

const CourseReview =
  mongoose.models.CourseReview ||
  mongoose.model("CourseReview", CourseReviewSchema);
export default CourseReview;
