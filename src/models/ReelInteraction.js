import mongoose from "mongoose";

const ReelInteractionSchema = new mongoose.Schema(
  {
    reelId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Reel",
      required: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    // Interaction types
    viewed: { type: Boolean, default: false },
    viewedAt: { type: Date },
    viewDuration: { type: Number, default: 0 }, // in seconds
    completed: { type: Boolean, default: false }, // watched to end

    liked: { type: Boolean, default: false },
    likedAt: { type: Date },

    shared: { type: Boolean, default: false },
    sharedAt: { type: Date },

    commented: { type: Boolean, default: false },
    commentedAt: { type: Date },

    // For recommendation algorithm
    engagementScore: { type: Number, default: 0 }, // calculated score
  },
  { timestamps: true }
);

// Compound index for unique user-reel interactions
ReelInteractionSchema.index({ reelId: 1, userId: 1 }, { unique: true });
ReelInteractionSchema.index({ userId: 1, viewedAt: -1 });
ReelInteractionSchema.index({ reelId: 1, engagementScore: -1 });

export default mongoose.model("ReelInteraction", ReelInteractionSchema);
