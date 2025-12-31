import mongoose from "mongoose";

const CommentSchema = new mongoose.Schema(
  {
    targetType: { type: String, required: true },
    targetId: { type: String, required: true },
    accountId: { type: String, required: true },
    content: { type: String, required: true, maxlength: 1000 },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

CommentSchema.index({ targetType: 1, targetId: 1, createdAt: -1 });

const Comment =
  mongoose.models.Comment || mongoose.model("Comment", CommentSchema);
export default Comment;
