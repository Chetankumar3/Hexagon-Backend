import express from "express";
import Comment from "../models/Comment.js";
import { authenticateToken } from "../middleware/auth.js";

const router = express.Router();

// GET /comments?targetType=post&targetId=... [&count=1]
router.get("/", async (req, res) => {
  try {
    const { targetType, targetId, count } = req.query;
    if (!targetType || !targetId) {
      return res
        .status(400)
        .json({ error: "targetType and targetId are required" });
    }
    const filter = {
      targetType: String(targetType),
      targetId: String(targetId),
    };
    if (String(count) === "1") {
      const c = await Comment.countDocuments(filter);
      return res.json({ count: c });
    }
    const list = await Comment.find(filter).sort({ createdAt: -1 }).limit(200);
    res.json(list);
  } catch (err) {
    console.error("comments GET error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /comments { targetType, targetId, accountId, content }
router.post("/", authenticateToken, async (req, res) => {
  try {
    const { targetType, targetId, accountId, content } = req.body || {};
    if (!targetType || !targetId || !accountId || !content) {
      return res
        .status(400)
        .json({ error: "targetType, targetId, accountId, content required" });
    }
    if (req.user?._id && String(req.user._id) !== String(accountId)) {
      return res.status(403).json({ error: "account mismatch" });
    }
    const created = await Comment.create({
      targetType,
      targetId,
      accountId,
      content: String(content).slice(0, 1000),
    });
    
    // Send notification for comments
    try {
      const Notification = (await import("../models/Notification.js")).default;
      const User = (await import("../models/User.js")).default;
      const Post = (await import("../models/Post.js")).default;
      
      // Get post owner if it's a post comment
      if (targetType === "post") {
        const post = await Post.findById(targetId);
        if (post && String(post.accountId) !== String(accountId)) {
          const commenter = await User.findById(accountId).select("username");
          const username = commenter?.username || "Someone";
          
          await Notification.create({
            recipientId: String(post.accountId),
            type: "comment",
            message: `${username} commented on your post.`,
            relatedUserId: accountId,
            relatedUsername: username,
            relatedPostId: String(targetId),
          });
          
          // Send via WebSocket
          const { broadcastNotification } = await import("../utils/notificationBroadcaster.js");
          broadcastNotification(String(post.accountId), {
            recipientId: String(post.accountId),
            type: "comment",
            message: `${username} commented on your post.`,
            relatedUserId: accountId,
            relatedUsername: username,
            relatedPostId: String(targetId),
            isRead: false,
            createdAt: new Date(),
          });
        }
      }
    } catch (notifErr) {
      console.error("Notification error on comment:", notifErr);
    }
    
    res.status(201).json(created);
  } catch (err) {
    console.error("comments POST error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
