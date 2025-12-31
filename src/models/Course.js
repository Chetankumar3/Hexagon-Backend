import mongoose from "mongoose";

const MilestoneSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    content: { type: String, default: "" },
  },
  { _id: false }
);

const CourseSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true },
    duration: { type: String, required: true },
    department: { type: String, required: true },
    image: { type: String, default: "" },
    instituteLogo: { type: String, default: "" },
    professor: { type: String, default: "" },
    instructor: { type: String, default: "" }, // Alternative field for instructor info
    instructorAvatar: { type: String, default: "" },
    institute: { type: String, default: "" },
    enrolledCount: { type: Number, default: 0 },
    milestones: { type: [MilestoneSchema], default: [] },
    curriculum: {
      type: [
        new mongoose.Schema(
          {
            chapterTitle: { type: String, required: true },
            topics: { type: [String], default: [] },
          },
          { _id: false }
        ),
      ],
      default: [],
    },
    weeklyPlan: {
      type: [
        new mongoose.Schema(
          {
            week: { type: Number, required: true },
            title: { type: String, default: "" },
            topics: { type: [String], default: [] },
          },
          { _id: false }
        ),
      ],
      default: [],
    },
    assistants: {
      type: [
        new mongoose.Schema(
          {
            name: { type: String, required: true },
            role: { type: String, default: "TA" },
            avatar: { type: String, default: "" },
          },
          { _id: false }
        ),
      ],
      default: [],
    },
  },
  { timestamps: true }
);

CourseSchema.index({ title: 1 });
CourseSchema.index({ department: 1 });

const Course = mongoose.models.Course || mongoose.model("Course", CourseSchema);
export default Course;
