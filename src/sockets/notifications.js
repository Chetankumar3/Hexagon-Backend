import jwt from "jsonwebtoken";
import User from "../models/User.js";
import Notification from "../models/Notification.js";

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change";

// Store connected users: userId -> socket
const connectedUsers = new Map();

// Socket authentication middleware
const authenticateSocket = async (socket, next) => {
  try {
    const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.split(" ")[1];

    if (!token) {
      return next(new Error("Authentication token required"));
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findById(decoded.userId).select("-password");

    if (!user || !user.isActive) {
      return next(new Error("Invalid token or user not found"));
    }

    socket.userId = String(user._id);
    socket.user = user;
    next();
  } catch (error) {
    if (error.name === "JsonWebTokenError" || error.name === "TokenExpiredError") {
      return next(new Error("Invalid or expired token"));
    }
    return next(new Error("Authentication failed"));
  }
};

// Setup notifications socket namespace
export const setupNotificationsSocket = (io) => {
  const notificationsNamespace = io.of("/notifications");

  // Apply authentication middleware
  notificationsNamespace.use(authenticateSocket);

  notificationsNamespace.on("connection", async (socket) => {
    const userId = socket.userId;
    console.log(`[Notifications] User connected: ${userId}`);

    // Store user connection
    connectedUsers.set(userId, socket);

    // Send existing notifications on connect
    try {
      const existingNotifications = await Notification.find({ recipientId: userId })
        .sort({ createdAt: -1 })
        .limit(50);
      socket.emit("notifications", existingNotifications);
    } catch (error) {
      console.error("Error fetching notifications on connect:", error);
    }

    // Handle marking notification as read
    socket.on("markRead", async (data) => {
      try {
        const { notificationId } = data;
        const notification = await Notification.findById(notificationId);
        
        if (notification && String(notification.recipientId) === userId) {
          notification.isRead = true;
          await notification.save();
          socket.emit("notificationRead", { notificationId, isRead: true });
        }
      } catch (error) {
        console.error("Error marking notification as read:", error);
        socket.emit("error", { message: "Failed to mark notification as read" });
      }
    });

    // Handle disconnect
    socket.on("disconnect", () => {
      console.log(`[Notifications] User disconnected: ${userId}`);
      connectedUsers.delete(userId);
    });
  });

  // Return function to send notification to a user
  return {
    sendNotification: (userId, notification) => {
      const socket = connectedUsers.get(String(userId));
      if (socket) {
        socket.emit("newNotification", notification);
      }
    },
  };
};

