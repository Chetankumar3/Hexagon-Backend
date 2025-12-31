import mongoose from "mongoose";

const PushSubscriptionSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true, index: true },
    endpoint: { type: String, required: true },
    keys: {
      p256dh: { type: String, required: true },
      auth: { type: String, required: true },
    },
  },
  { timestamps: true }
);

PushSubscriptionSchema.index({ userId: 1, endpoint: 1 }, { unique: true });

const PushSubscription =
  mongoose.models.PushSubscription || mongoose.model("PushSubscription", PushSubscriptionSchema);
export default PushSubscription;

