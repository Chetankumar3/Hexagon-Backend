import express from "express";
import multer from "multer";
import Post from "../models/Post.js";
import { authenticateToken } from "../middleware/auth.js";
import Follow from "../models/Follow.js";
import Notification from "../models/Notification.js";
import User from "../models/User.js";
import { sendPushNotification } from "./push.js";
import { broadcastNotification } from "../utils/notificationBroadcaster.js";

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024, files: 6 },
});

// GET /posts?accountId=<id>
router.get("/", async (req, res) => {
  try {
    const { accountId } = req.query;
    const filter = {};
    if (accountId) filter.accountId = String(accountId);
    const posts = await Post.find(filter).sort({ createdAt: -1 }).limit(100);
    // Convert images to URL references
    const mapped = posts.map((p) => ({
      _id: String(p._id),
      id: String(p._id),
      accountId: p.accountId,
      content: p.content,
      images: (p.images || []).map((_, idx) => `/posts/image/${p._id}/${idx}`),
      likes: p.likesCount,
      comments: p.commentsCount,
      createdAt: p.createdAt,
    }));
    res.json(mapped);
  } catch (err) {
    console.error("posts GET error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /posts (multipart/form-data) fields: content, images[]
router.post(
  "/",
  authenticateToken,
  upload.array("images", 6),
  async (req, res) => {
    try {
      const accountId = String(req.user._id);
      const content = String(req.body.content || "").slice(0, 5000);
      const images = (req.files || []).map((f) => ({
        filename: f.originalname,
        contentType: f.mimetype,
        data: f.buffer.toString("base64"),
        size: f.size,
      }));
      const post = await Post.create({ accountId, content, images });

      // Notify followers asynchronously (no await for each to keep latency low)
      try {
        // Get the poster's username
        const poster = await User.findById(accountId).select("username");
        const username = poster?.username || "Someone";
        
        const followers = await Follow.find({ followingId: accountId }).select("followerId");
        const bulk = followers.map((f) => ({
          recipientId: String(f.followerId),
          type: "new_post",
          message: `${username} posted something new.`,
          relatedUserId: accountId,
          relatedUsername: username,
          relatedPostId: String(post._id),
        }));
        if (bulk.length) {
          const notifications = await Notification.insertMany(bulk, { ordered: false });
          
          // Send notifications via WebSocket and web push
          for (let i = 0; i < followers.length; i++) {
            const followerId = String(followers[i].followerId);
            const notification = notifications[i];
            
            // Send via WebSocket (real-time)
            if (notification) {
              broadcastNotification(followerId, notification);
            }
            
            // Send web push notification
            sendPushNotification(followerId, {
              title: "New Post",
              body: `${username} posted something new.`,
              icon: "/favicon.ico",
              badge: "/favicon.ico",
              data: {
                url: `/profile`,
                postId: String(post._id),
              },
            }).catch((err) => {
              console.error("Push notification error for user:", followerId, err);
            });
          }
        }
      } catch (e) {
        console.error("notify followers error:", e?.message || e);
      }
      res.status(201).json({
        _id: String(post._id),
        id: String(post._id),
        accountId: post.accountId,
        content: post.content,
        images: (post.images || []).map(
          (_, idx) => `/posts/image/${post._id}/${idx}`
        ),
        likes: post.likesCount,
        comments: post.commentsCount,
        createdAt: post.createdAt,
      });
    } catch (err) {
      console.error("posts POST error:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

// GET /posts/image/:postId/:index
router.get("/image/:postId/:index", async (req, res) => {
  try {
    const { postId, index } = req.params;
    const post = await Post.findById(postId);
    if (!post) return res.status(404).send();
    const idx = Number(index);
    const img = post.images?.[idx];
    if (!img) return res.status(404).send();
    const buffer = Buffer.from(img.data, "base64");
    res.set({
      "Content-Type": img.contentType || "application/octet-stream",
      "Content-Length": buffer.length,
      "Cache-Control": "public, max-age=31536000, immutable",
    });
    res.send(buffer);
  } catch (err) {
    console.error("posts image GET error:", err);
    res.status(500).send();
  }
});

// Optional: DELETE /posts/:id (owner only)
router.delete("/:id", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const post = await Post.findById(id);
    if (!post) return res.status(404).json({ error: "Not found" });
    if (String(post.accountId) !== String(req.user._id)) {
      return res.status(403).json({ error: "Forbidden" });
    }
    await Post.deleteOne({ _id: id });
    res.json({ ok: true });
  } catch (err) {
    console.error("posts DELETE error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
