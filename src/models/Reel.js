import mongoose from "mongoose";

const SceneSchema = new mongoose.Schema(
  {
    duration: { type: Number, required: true },
    text: { type: String, required: true },
    description: { type: String, default: "" },
    voiceover: { type: String, default: "" },
    imageUrl: { type: String, default: "" },
    imageSource: { type: String, default: "" },
    photographer: { type: String, default: "" },
    photographerUrl: { type: String, default: "" },
  },
  { _id: false }
);

const ReelSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    script: { type: String, required: true },
    narration: { type: String, default: "" },
    totalDuration: { type: Number, default: 0 },
    scenes: { type: [SceneSchema], default: [] },

    // Metadata
    topic: { type: String, default: "" },
    prompt: { type: String, default: "" },
    generatedAt: { type: Date, default: Date.now },

    // Creator info
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    // Engagement metrics
    viewCount: { type: Number, default: 0 },
    likeCount: { type: Number, default: 0 },
    shareCount: { type: Number, default: 0 },
    commentCount: { type: Number, default: 0 },

    // Tags for recommendation
    tags: { type: [String], default: [] },

    // Status
    isPublished: { type: Boolean, default: true },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Indexes for faster queries
ReelSchema.index({ createdAt: -1 });
ReelSchema.index({ viewCount: -1 });
ReelSchema.index({ likeCount: -1 });
ReelSchema.index({ topic: 1 });
ReelSchema.index({ tags: 1 });
ReelSchema.index({ isPublished: 1, isDeleted: 1 });

export default mongoose.model("Reel", ReelSchema);
