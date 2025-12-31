import mongoose from "mongoose";

const NotificationSchema = new mongoose.Schema(
  {
    recipientId: { type: String, required: true, index: true },
    type: { type: String, required: true }, // e.g., new_post
    message: { type: String, required: true },
    relatedUserId: { type: String, default: "" },
    relatedUsername: { type: String, default: "" }, // Username of the user who triggered the notification
    relatedPostId: { type: String, default: "" },
    isRead: { type: Boolean, default: false },
  },
  { timestamps: true }
);

NotificationSchema.index({ recipientId: 1, createdAt: -1 });

const Notification =
  mongoose.models.Notification || mongoose.model("Notification", NotificationSchema);
export default Notification;


