import express from "express";
import Like from "../models/Like.js";
import { authenticateToken } from "../middleware/auth.js";

const router = express.Router();

// GET /likes?count=1&targetType=post&targetId=... [&accountId=...]
router.get("/", async (req, res) => {
  try {
    const { targetType, targetId, accountId, count } = req.query;
    if (!targetType || !targetId) {
      return res
        .status(400)
        .json({ error: "targetType and targetId are required" });
    }
    const filter = {
      targetType: String(targetType),
      targetId: String(targetId),
    };
    if (accountId) filter.accountId = String(accountId);
    if (String(count) === "1") {
      const c = await Like.countDocuments(filter);
      return res.json({ count: c });
    }
    const list = await Like.find(filter).sort({ createdAt: -1 }).limit(200);
    res.json(list);
  } catch (err) {
    console.error("likes GET error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /likes { targetType, targetId, accountId }
router.post("/", authenticateToken, async (req, res) => {
  try {
    const { targetType, targetId, accountId } = req.body || {};
    if (!targetType || !targetId || !accountId) {
      return res
        .status(400)
        .json({ error: "targetType, targetId, accountId required" });
    }
    // ensure accountId matches token when available
    if (req.user?._id && String(req.user._id) !== String(accountId)) {
      return res.status(403).json({ error: "account mismatch" });
    }
    // Check if like already exists
    const existing = await Like.findOne({ targetType, targetId, accountId });
    const isNewLike = !existing;
    
    const created = await Like.findOneAndUpdate(
      { targetType, targetId, accountId },
      { $setOnInsert: { targetType, targetId, accountId } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    
    // Send notification if this is a new like
    if (isNewLike) {
      try {
        const Notification = (await import("../models/Notification.js")).default;
        const User = (await import("../models/User.js")).default;
        const Post = (await import("../models/Post.js")).default;
        
        // Get post owner if it's a post like
        if (targetType === "post") {
          const post = await Post.findById(targetId);
          if (post && String(post.accountId) !== String(accountId)) {
            const liker = await User.findById(accountId).select("username");
            const username = liker?.username || "Someone";
            
            await Notification.create({
              recipientId: String(post.accountId),
              type: "like",
              message: `${username} liked your post.`,
              relatedUserId: accountId,
              relatedUsername: username,
              relatedPostId: String(targetId),
            });
            
            // Send via WebSocket
            const { broadcastNotification } = await import("../utils/notificationBroadcaster.js");
            broadcastNotification(String(post.accountId), {
              recipientId: String(post.accountId),
              type: "like",
              message: `${username} liked your post.`,
              relatedUserId: accountId,
              relatedUsername: username,
              relatedPostId: String(targetId),
              isRead: false,
              createdAt: new Date(),
            });
          }
        }
      } catch (notifErr) {
        console.error("Notification error on like:", notifErr);
      }
    }
    
    return res.status(201).json(created);
  } catch (err) {
    if (err && err.code === 11000) {
      return res.status(200).json({ message: "already liked" });
    }
    console.error("likes POST error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// DELETE /likes { targetType, targetId } - Unlike (dislike)
router.delete("/", authenticateToken, async (req, res) => {
  try {
    const { targetType, targetId } = req.body || req.query || {};
    if (!targetType || !targetId) {
      return res.status(400).json({ error: "targetType and targetId required" });
    }
    const accountId = String(req.user._id);
    await Like.deleteOne({ targetType, targetId, accountId });
    res.json({ ok: true });
  } catch (err) {
    console.error("likes DELETE error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
