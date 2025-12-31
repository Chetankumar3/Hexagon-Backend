import mongoose from "mongoose";

const LikeSchema = new mongoose.Schema(
  {
    targetType: { type: String, required: true },
    targetId: { type: String, required: true },
    accountId: { type: String, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

LikeSchema.index(
  { targetType: 1, targetId: 1, accountId: 1 },
  { unique: true }
);
LikeSchema.index({ targetType: 1, targetId: 1 });

const Like = mongoose.models.Like || mongoose.model("Like", LikeSchema);
export default Like;
