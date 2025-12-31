import mongoose from "mongoose";

const EnrollmentSchema = new mongoose.Schema(
  {
    studentId: { type: String, required: true, index: true },
    courseId: { type: String, required: true, index: true },
    status: {
      type: String,
      enum: ["enrolled", "completed", "dropped"],
      default: "enrolled",
    },
  },
  { timestamps: true }
);

EnrollmentSchema.index({ studentId: 1, courseId: 1 }, { unique: true });

const Enrollment =
  mongoose.models.Enrollment || mongoose.model("Enrollment", EnrollmentSchema);
export default Enrollment;
