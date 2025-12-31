import express from "express";
import Notification from "../models/Notification.js";
import { authenticateToken } from "../middleware/auth.js";

const router = express.Router();

// GET /notifications/me - fetch current user's notifications
router.get("/me", authenticateToken, async (req, res) => {
  try {
    const list = await Notification.find({ recipientId: String(req.user._id) })
      .sort({ createdAt: -1 })
      .limit(50);
    res.json(list);
  } catch (err) {
    console.error("notifications GET error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// PUT /notifications/:id/read - mark as read
router.put("/:id/read", authenticateToken, async (req, res) => {
  try {
    const id = String(req.params.id);
    const n = await Notification.findById(id);
    if (!n || String(n.recipientId) !== String(req.user._id)) {
      return res.status(404).json({ error: "Notification not found" });
    }
    n.isRead = true;
    await n.save();
    res.json({ ok: true });
  } catch (err) {
    console.error("notifications PUT error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;


