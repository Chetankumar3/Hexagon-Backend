import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import dotenv from "dotenv";
import mongoose from "mongoose";
import session from "express-session";
import MongoStore from "connect-mongo";
import { createServer } from "http";
import { Server } from "socket.io";
import os from "os";

// ⚠️ REDIS: Commented out to prevent crash on free Render tier
// import redis from "./utils/redis.js"; 

// Import routes
import authRoutes from "./routes/auth.js";
import userRoutes from "./routes/users.js";
import profileRoutes from "./routes/profiles.js";
import followRoutes from "./routes/follow.js";
import likeRoutes from "./routes/likes.js";
import commentRoutes from "./routes/comments.js";
import postRoutes from "./routes/posts.js";
import courseRoutes from "./routes/courses.js";
import enrollmentRoutes from "./routes/enrollments.js";
import reelsRoutes from "./routes/reels.js";
import courseReviewRoutes from "./routes/courseReviews.js";
import assignmentRoutes from "./routes/assignments.js";
import notificationsRoutes from "./routes/notifications.js";
import pushRoutes from "./routes/push.js";
import vrRoutes, { setupVRSocket } from "./routes/vr.js";
import { setupNotificationsSocket } from "./sockets/notifications.js";
import { setNotificationsSocket } from "./utils/notificationBroadcaster.js";

// Load environment variables
dotenv.config();

const app = express();
const httpServer = createServer(app);
const PORT = process.env.PORT || 5003; 

// Initialize Socket.IO with permissive CORS
const socketIOCorsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin
    if (!origin) return callback(null, true);

    const allowedOrigins = [
      "http://localhost:5173",
      "http://localhost:3000",
      "https://hexagon-eran.vercel.app",
      "https://hexagon-steel.vercel.app",
      "https://hexagon.vercel.app",
      "https://hexagon-frontend-chi.vercel.app/",
      // ⚠️ MAKE SURE YOUR VERCEL URL IS HERE
    ];

    // In development/testing, allow local network IPs
    if (process.env.NODE_ENV !== "production") {
      const localNetworkRegex =
        /^https?:\/\/(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2[0-9]|3[0-1])\.\d+\.\d+)(:\d+)?$/;
      if (localNetworkRegex.test(origin)) {
        return callback(null, true);
      }
    }

    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    // Optional: Log blocked origins for debugging
    console.log("Blocked by CORS:", origin);
    callback(new Error("Not allowed by CORS"));
  },
  credentials: true,
  transports: ["websocket", "polling"], // Ensure polling is enabled as fallback
};

const io = new Server(httpServer, {
  cors: socketIOCorsOptions,
});

// Setup VR Socket.IO namespace
setupVRSocket(io);

// Setup Notifications Socket.IO namespace
const notificationsSocket = setupNotificationsSocket(io);
setNotificationsSocket(notificationsSocket);

// Trust proxy for Render/Vercel load balancers
app.set("trust proxy", 1);

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
  })
);

// CORS for Express Routes
const corsOptions = {
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);

    const allowedOrigins = [
      "http://localhost:5173",
      "http://localhost:3000",
      "https://hexagon-eran.vercel.app",
      "https://hexagon-steel.vercel.app",
      "https://hexagon.vercel.app",
      "https://hexagon-frontend-chi.vercel.app",
    ];

    if (process.env.NODE_ENV !== "production") {
      const localNetworkRegex =
        /^https?:\/\/(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2[0-9]|3[0-1])\.\d+\.\d+)(:\d+)?$/;
      if (localNetworkRegex.test(origin)) {
        return callback(null, true);
      }
    }

    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    callback(null, true); // Fallback for safety in early dev
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};

app.use(cors(corsOptions));
app.options("*", cors(corsOptions));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Session configuration
app.use(
  session({
    secret: process.env.SESSION_SECRET || "dev-secret-change",
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
      mongoUrl: process.env.MONGO_URL, // Will use Env Var
      // Fallback only for local dev if needed, but risky for prod
    }),
    cookie: {
      secure: process.env.NODE_ENV === "production", // Secure cookies in prod
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000, 
      sameSite: process.env.NODE_ENV === "production" ? 'none' : 'lax' // Important for cross-site cookies
    },
  })
);

// MongoDB connection
const connectDB = async () => {
  try {
    const mongoUrl = process.env.MONGO_URL;

    if (!mongoUrl) {
      console.error("❌ MONGO_URL environment variable is not set");
      // Don't exit process, let it try to stay alive for logs
      return; 
    }

    console.log("🔗 Connecting to MongoDB...");
    await mongoose.connect(mongoUrl);
    console.log("✅ MongoDB connected successfully");
  } catch (error) {
    console.error("❌ MongoDB connection error:", error);
  }
};

// Routes
app.use("/auth", authRoutes);
app.use("/users", userRoutes);
app.use("/profiles", profileRoutes);
app.use("/follow", followRoutes);
app.use("/likes", likeRoutes);
app.use("/comments", commentRoutes);
app.use("/posts", postRoutes);
app.use("/courses", courseRoutes);
app.use("/enrollments", enrollmentRoutes);
app.use("/reels", reelsRoutes);
app.use("/course-reviews", courseReviewRoutes);
app.use("/assignments", assignmentRoutes);
app.use("/notifications", notificationsRoutes);
app.use("/push", pushRoutes);
app.use("/vr", vrRoutes);

// Health check endpoint
app.get("/", (req, res) => {
  res.json({
    status: "ok",
    message: "Hexagon Backend Running on Render",
    timestamp: new Date().toISOString(),
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error("Error:", err);
  res.status(err.status || 500).json({
    error: err.message || "Internal Server Error",
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
});

app.use("*", (req, res) => {
  res.status(404).json({ error: "Route not found" });
});

// Start server
const startServer = async () => {
  await connectDB();
  
  // Redis check removed for safety
  
  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📍 Health check: /`);
  });
};

// Always start the server in Node environment (Render/Local)
startServer().catch(console.error);

export { io };
export default app;