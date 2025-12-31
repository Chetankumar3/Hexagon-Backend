import mongoose from "mongoose";

const FollowSchema = new mongoose.Schema(
  {
    followerId: { type: String, required: true, index: true },
    followingId: { type: String, required: true, index: true },
  },
  { timestamps: true }
);

FollowSchema.index({ followerId: 1, followingId: 1 }, { unique: true });

const Follow = mongoose.models.Follow || mongoose.model("Follow", FollowSchema);
export default Follow;
