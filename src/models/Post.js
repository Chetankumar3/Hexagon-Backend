import mongoose from "mongoose";

const ImageSchema = new mongoose.Schema(
  {
    filename: { type: String },
    contentType: { type: String, required: true },
    data: { type: String, required: true }, // base64 string
    size: { type: Number },
  },
  { _id: false }
);

const PostSchema = new mongoose.Schema(
  {
    accountId: { type: String, required: true, index: true },
    content: { type: String, default: "", maxlength: 5000 },
    images: { type: [ImageSchema], default: [] },
    likesCount: { type: Number, default: 0 },
    commentsCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

PostSchema.index({ createdAt: -1 });

const Post = mongoose.models.Post || mongoose.model("Post", PostSchema);
export default Post;
