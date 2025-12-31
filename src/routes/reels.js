// routes/reels.js
import express from "express";
import Groq from "groq-sdk";
import Reel from "../models/Reel.js";
import ReelInteraction from "../models/ReelInteraction.js";
import { authenticateToken, optionalAuth } from "../middleware/auth.js";

const router = express.Router();

// Helper function to fetch images from Unsplash (no API key needed)
async function fetchUnsplashImage(query) {
  try {
    // Clean and prepare keywords
    const keywords = query
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, "")
      .split(" ")
      .filter((word) => word.length > 3)
      .slice(0, 3)
      .join(",");

    // Unsplash Source API - free, no authentication
    // Using 1080x1920 for vertical 9:16 format
    const timestamp = Date.now();
    const url = `https://source.unsplash.com/1080x1920/?${encodeURIComponent(
      keywords
    )}&${timestamp}`;

    const response = await fetch(url, {
      redirect: "follow",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
    });

    if (response.ok && response.url) {
      return response.url;
    }

    // Fallback to random portrait image
    const fallbackUrl = `https://source.unsplash.com/1080x1920/?portrait,vertical&${timestamp}`;
    const fallbackResponse = await fetch(fallbackUrl, { redirect: "follow" });
    return fallbackResponse.url || null;
  } catch (error) {
    console.error("Unsplash fetch error:", error.message);
    return null;
  }
}

// Alternative: Pexels API (requires free API key but better quality)
async function fetchPexelsImage(query, apiKey) {
  try {
    const cleanQuery = query
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, "")
      .trim();

    const randomPage = Math.floor(Math.random() * 5) + 1;
    const url = `https://api.pexels.com/v1/search?query=${encodeURIComponent(
      cleanQuery
    )}&orientation=portrait&per_page=1&page=${randomPage}`;

    const response = await fetch(url, {
      headers: {
        Authorization: apiKey,
        "User-Agent": "ReelGenerator/1.0",
      },
    });

    if (!response.ok) {
      throw new Error(`Pexels API error: ${response.status}`);
    }

    const data = await response.json();

    if (data.photos && data.photos.length > 0) {
      const photo = data.photos[0];
      return {
        url: photo.src.large2x || photo.src.large,
        photographer: photo.photographer,
        photographerUrl: photo.photographer_url,
        source: "Pexels",
      };
    }

    return null;
  } catch (error) {
    console.error("Pexels fetch error:", error.message);
    return null;
  }
}

// Generate AI-powered reels
router.post("/generate", async (req, res) => {
  try {
    const { prompt, concept } = req.body || {};
    const topic = (concept || prompt || "").toString().trim();

    if (!topic) {
      return res.status(400).json({
        success: false,
        error: "Prompt or concept is required",
      });
    }

    const groqApiKey = process.env.GROQ_API_KEY;
    if (!groqApiKey) {
      return res.status(500).json({
        success: false,
        error:
          "Groq API key not configured. Please add GROQ_API_KEY to your .env file",
      });
    }

    const groq = new Groq({ apiKey: groqApiKey });

    // Generate reel script using Groq
    console.log(`[REEL] 📝 Generating script for: "${topic}"`);

    const scriptPrompt = `Create a viral 15-20 second Instagram/TikTok reel script about: "${topic}"

Requirements:
- Total duration: 15-20 seconds when read aloud
- Start with an attention-grabbing hook (first 2 seconds)
- Clear, valuable message in the middle
- Strong call-to-action at the end
- Use simple, conversational language
- Create 3-4 distinct scenes

Return ONLY valid JSON (no markdown, no code blocks, no extra text):
{
  "title": "Catchy title (max 60 chars)",
  "script": "Full voiceover script with [Scene 1], [Scene 2] markers",
  "scenes": [
    {
      "duration": 4,
      "text": "Hook - grab attention",
      "description": "What should be visually shown",
      "voiceover": "Exact words to be spoken aloud",
      "imageKeywords": "coffee morning drink cup"
    },
    {
      "duration": 6,
      "text": "Main content - deliver value",
      "description": "What should be visually shown",
      "voiceover": "Exact words to be spoken aloud",
      "imageKeywords": "person working productive desk"
    },
    {
      "duration": 5,
      "text": "CTA - end with action",
      "description": "What should be visually shown",
      "voiceover": "Exact words to be spoken aloud",
      "imageKeywords": "success happy achievement celebrate"
    }
  ]
}

CRITICAL: Return ONLY the JSON object, nothing else.`;

    const scriptResponse = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content:
            "You are a viral social media content creator who creates engaging 15-20 second reels. You ONLY return valid JSON with no markdown formatting, no code blocks, and no additional text.",
        },
        {
          role: "user",
          content: scriptPrompt,
        },
      ],
      model: "llama-3.3-70b-versatile",
      temperature: 0.7,
      max_tokens: 2000,
      response_format: { type: "json_object" },
    });

    const scriptText = scriptResponse.choices[0].message.content.trim();
    console.log("[REEL] ✅ Script generated");

    // Parse JSON response
    let reelData;
    try {
      // Remove any markdown formatting if present
      const cleanJson = scriptText
        .replace(/```json\n?/g, "")
        .replace(/```\n?/g, "")
        .replace(/^[^{]*/, "")
        .replace(/[^}]*$/, "")
        .trim();

      reelData = JSON.parse(cleanJson);
    } catch (error) {
      console.error("[REEL] ❌ Failed to parse JSON");
      console.error("Raw response:", scriptText.slice(0, 300));
      return res.status(500).json({
        success: false,
        error: "Failed to parse AI response. Please try again.",
        details:
          process.env.NODE_ENV === "development"
            ? scriptText.slice(0, 500)
            : undefined,
      });
    }

    // Validate required fields
    if (
      !reelData.title ||
      !reelData.script ||
      !Array.isArray(reelData.scenes)
    ) {
      console.error("[REEL] ❌ Invalid script format");
      return res.status(500).json({
        success: false,
        error: "Invalid script format. Please try again.",
      });
    }

    // Ensure we have 3-4 scenes
    if (reelData.scenes.length < 2 || reelData.scenes.length > 5) {
      console.error("[REEL] ❌ Invalid scene count:", reelData.scenes.length);
      return res.status(500).json({
        success: false,
        error: "Invalid number of scenes. Please try again.",
      });
    }

    console.log(`[REEL] 🖼️  Fetching ${reelData.scenes.length} images...`);

    // Fetch images for each scene
    const pexelsApiKey = process.env.PEXELS_API_KEY;
    const imagePromises = [];

    for (let i = 0; i < reelData.scenes.length; i++) {
      const scene = reelData.scenes[i];

      // Ensure scene has required fields
      if (!scene.voiceover) scene.voiceover = scene.text;
      if (!scene.duration) scene.duration = 5;

      // Extract keywords for image search
      // Build strong, topic-aware keywords for better images
      const keywords = `${topic} ${scene.imageKeywords || ""} ${
        scene.description || ""
      } ${scene.text || ""}`
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, " ")
        .split(/\s+/)
        .filter((w) => w.length > 2)
        .slice(0, 8)
        .join(" ");

      console.log(`[REEL] 🔍 Scene ${i + 1}: Searching for "${keywords}"`);

      // Fetch image with fallback chain
      const imagePromise = (async () => {
        let imageData = null;

        // Try Pexels first if API key is available
        if (pexelsApiKey) {
          imageData = await fetchPexelsImage(keywords, pexelsApiKey);
          if (imageData) {
            console.log(`[REEL] ✅ Scene ${i + 1}: Pexels image found`);
            return {
              imageUrl: imageData.url,
              photographer: imageData.photographer,
              photographerUrl: imageData.photographerUrl,
              imageSource: "Pexels",
            };
          }
        }

        // Fallback to Unsplash (always available, no key needed)
        const unsplashUrl = await fetchUnsplashImage(keywords);
        if (unsplashUrl) {
          console.log(`[REEL] ✅ Scene ${i + 1}: Unsplash image found`);
          return {
            imageUrl: unsplashUrl,
            imageSource: "Unsplash",
          };
        }

        // Final fallback to placeholder
        console.log(`[REEL] ⚠️  Scene ${i + 1}: Using placeholder`);
        return {
          imageUrl: `https://placehold.co/1080x1920/6366f1/white?text=Scene+${
            i + 1
          }`,
          imageSource: "Placeholder",
        };
      })();

      imagePromises.push(imagePromise);

      // Add small delay between requests to avoid rate limits
      if (i < reelData.scenes.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 200));
      }
    }

    // Wait for all images to be fetched
    const imageResults = await Promise.all(imagePromises);

    // Attach images to scenes
    reelData.scenes.forEach((scene, i) => {
      Object.assign(scene, imageResults[i]);
    });

    // Calculate total duration
    const totalDuration = reelData.scenes.reduce(
      (sum, scene) => sum + (scene.duration || 0),
      0
    );

    console.log(
      `[REEL] 🎉 Successfully generated: "${reelData.title}" (${totalDuration}s, ${reelData.scenes.length} scenes)`
    );

    // Optional: refine continuous narration with Groq into a single read-out paragraph
    // Start from full script if present, fallback to scenes; strip markers
    let refinedNarration = (
      reelData.script ||
      reelData.scenes.map((s) => String(s.text || "")).join(". ")
    )
      .replace(/\[\s*scene\s*\d+\s*\]/gi, "")
      .replace(/scene\s*\d+\s*[:.-]?/gi, "")
      .replace(/\s{2,}/g, " ")
      .trim();
    try {
      if (process.env.GROQ_API_KEY) {
        const groqRes = await fetch(
          "https://api.groq.com/openai/v1/chat/completions",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
            },
            body: JSON.stringify({
              model: process.env.GROQ_MODEL || "llama-3.1-70b-versatile",
              messages: [
                {
                  role: "system",
                  content:
                    "You polish short-video scripts. Output ONE continuous voiceover paragraph (<=140 words). No scene markers, no bullets, no headings. Conversational and energetic.",
                },
                {
                  role: "user",
                  content: `Make a single continuous VO from these scene lines:\n${refinedNarration}`,
                },
              ],
              temperature: 0.7,
            }),
          }
        );
        const groqJson = await groqRes.json().catch(() => null);
        const text = groqJson?.choices?.[0]?.message?.content?.trim();
        if (text) refinedNarration = text;
      }
    } catch {}

    // Extract tags from topic and title
    const tags = [
      ...topic
        .toLowerCase()
        .split(/\s+/)
        .filter((t) => t.length > 3),
      ...reelData.title
        .toLowerCase()
        .split(/\s+/)
        .filter((t) => t.length > 3),
    ].slice(0, 5);

    // Save reel to database
    const reelDoc = await Reel.create({
      title: reelData.title,
      script: reelData.script,
      narration: refinedNarration,
      totalDuration,
      scenes: reelData.scenes.map((scene, idx) => ({
        duration: scene.duration,
        text: scene.text,
        description: scene.description,
        voiceover: scene.voiceover,
        imageUrl: scene.imageUrl,
        imageSource: scene.imageSource,
        photographer: scene.photographer,
        photographerUrl: scene.photographerUrl,
      })),
      topic,
      prompt: topic,
      tags,
      createdBy: req.user?._id || null,
    });

    // Return complete reel data with ID
    res.json({
      success: true,
      reel: {
        _id: reelDoc._id,
        title: reelData.title,
        script: reelData.script,
        narration: refinedNarration,
        totalDuration,
        scenes: reelData.scenes.map((scene, idx) => ({
          duration: scene.duration,
          text: scene.text,
          description: scene.description,
          voiceover: scene.voiceover,
          imageUrl: scene.imageUrl,
          imageSource: scene.imageSource,
          photographer: scene.photographer,
          photographerUrl: scene.photographerUrl,
        })),
        viewCount: 0,
        likeCount: 0,
        createdAt: reelDoc.createdAt,
      },
      metadata: {
        topic,
        scenesCount: reelData.scenes.length,
        generatedAt: new Date().toISOString(),
        imageProvider: pexelsApiKey ? "Pexels/Unsplash" : "Unsplash",
      },
    });
  } catch (error) {
    console.error("[REEL] ❌ Generation error:", error);

    // Handle specific error types
    if (error.status === 429) {
      return res.status(429).json({
        success: false,
        error: "Rate limit exceeded. Please wait a moment and try again.",
        retryAfter: 60,
      });
    }

    if (error.status === 401 || error.status === 403) {
      return res.status(500).json({
        success: false,
        error: "API authentication failed. Please check your API keys.",
      });
    }

    // Generic error
    res.status(500).json({
      success: false,
      error: "Failed to generate reel. Please try again.",
      details:
        process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
});

// Get reels with pagination and recommendations
router.get("/", optionalAuth, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const userId = req.user?._id || null;

    // Get recommended reels for authenticated users
    let reels;
    let total;

    if (userId) {
      // Get user's interaction history for recommendations
      const userInteractions = await ReelInteraction.find({ userId })
        .sort({ engagementScore: -1, viewedAt: -1 })
        .limit(50)
        .select("reelId engagementScore liked viewed completed");

      // Extract tags from user's liked/completed reels
      const likedReelIds = userInteractions
        .filter((i) => i.liked || i.completed)
        .map((i) => i.reelId);

      const userLikedReels = await Reel.find({
        _id: { $in: likedReelIds },
        isPublished: true,
        isDeleted: false,
      }).select("tags topic");

      // Build tag preferences
      const tagFrequency = {};
      userLikedReels.forEach((reel) => {
        reel.tags.forEach((tag) => {
          tagFrequency[tag] = (tagFrequency[tag] || 0) + 1;
        });
      });

      const preferredTags = Object.keys(tagFrequency)
        .sort((a, b) => tagFrequency[b] - tagFrequency[a])
        .slice(0, 5);

      // Get viewed reel IDs to exclude
      const viewedReelIds = userInteractions
        .filter((i) => i.viewed)
        .map((i) => i.reelId);

      // Build recommendation query
      const recommendationQuery = {
        isPublished: true,
        isDeleted: false,
        _id: { $nin: viewedReelIds },
      };

      // If user has preferences, prioritize matching tags
      if (preferredTags.length > 0) {
        reels = await Reel.find(recommendationQuery)
          .sort({
            viewCount: -1,
            likeCount: -1,
            createdAt: -1,
          })
          .skip(skip)
          .limit(limit)
          .lean();

        // Sort by tag relevance
        reels = reels.sort((a, b) => {
          const aScore = a.tags.filter((t) => preferredTags.includes(t)).length;
          const bScore = b.tags.filter((t) => preferredTags.includes(t)).length;
          if (aScore !== bScore) return bScore - aScore;
          return b.viewCount - a.viewCount;
        });
      } else {
        // New user - show popular reels
        reels = await Reel.find(recommendationQuery)
          .sort({ viewCount: -1, likeCount: -1, createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .lean();
      }

      total = await Reel.countDocuments(recommendationQuery);
    } else {
      // Unauthenticated - show popular reels
      reels = await Reel.find({
        isPublished: true,
        isDeleted: false,
      })
        .sort({ viewCount: -1, likeCount: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean();

      total = await Reel.countDocuments({
        isPublished: true,
        isDeleted: false,
      });
    }

    res.json({
      success: true,
      reels,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("[REEL] ❌ Fetch error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch reels",
    });
  }
});

// Get single reel
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const reel = await Reel.findById(id);

    if (!reel || reel.isDeleted || !reel.isPublished) {
      return res.status(404).json({ success: false, error: "Reel not found" });
    }

    res.json({ success: true, reel });
  } catch (error) {
    console.error("[REEL] ❌ Fetch error:", error);
    res.status(500).json({ success: false, error: "Failed to fetch reel" });
  }
});

// Track reel view
router.post("/:id/view", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;
    const { viewDuration, completed } = req.body;

    const reel = await Reel.findById(id);
    if (!reel) {
      return res.status(404).json({ success: false, error: "Reel not found" });
    }

    // Update or create interaction
    let interaction = await ReelInteraction.findOne({ reelId: id, userId });

    if (!interaction) {
      interaction = await ReelInteraction.create({
        reelId: id,
        userId,
        viewed: true,
        viewedAt: new Date(),
        viewDuration: viewDuration || 0,
        completed: completed || false,
      });

      // Increment view count
      await Reel.findByIdAndUpdate(id, { $inc: { viewCount: 1 } });
    } else {
      // Update existing interaction
      if (!interaction.viewed) {
        interaction.viewed = true;
        interaction.viewedAt = new Date();
        await Reel.findByIdAndUpdate(id, { $inc: { viewCount: 1 } });
      }

      if (viewDuration)
        interaction.viewDuration = Math.max(
          interaction.viewDuration,
          viewDuration
        );
      if (completed && !interaction.completed) {
        interaction.completed = true;
      }

      await interaction.save();
    }

    // Calculate engagement score
    let engagementScore = 0;
    if (interaction.viewed) engagementScore += 1;
    if (interaction.completed) engagementScore += 3;
    if (interaction.liked) engagementScore += 5;
    if (interaction.shared) engagementScore += 2;
    if (interaction.commented) engagementScore += 4;

    interaction.engagementScore = engagementScore;
    await interaction.save();

    res.json({ success: true, interaction });
  } catch (error) {
    console.error("[REEL] ❌ View tracking error:", error);
    res.status(500).json({ success: false, error: "Failed to track view" });
  }
});

// Like/Unlike reel
router.post("/:id/like", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const reel = await Reel.findById(id);
    if (!reel) {
      return res.status(404).json({ success: false, error: "Reel not found" });
    }

    let interaction = await ReelInteraction.findOne({ reelId: id, userId });

    if (!interaction) {
      interaction = await ReelInteraction.create({
        reelId: id,
        userId,
        liked: true,
        likedAt: new Date(),
      });
      await Reel.findByIdAndUpdate(id, { $inc: { likeCount: 1 } });
    } else {
      const wasLiked = interaction.liked;
      interaction.liked = !interaction.liked;
      interaction.likedAt = interaction.liked ? new Date() : null;

      await interaction.save();

      // Update like count
      if (wasLiked && !interaction.liked) {
        await Reel.findByIdAndUpdate(id, { $inc: { likeCount: -1 } });
      } else if (!wasLiked && interaction.liked) {
        await Reel.findByIdAndUpdate(id, { $inc: { likeCount: 1 } });
      }
    }

    // Update engagement score
    let engagementScore = 0;
    if (interaction.viewed) engagementScore += 1;
    if (interaction.completed) engagementScore += 3;
    if (interaction.liked) engagementScore += 5;
    if (interaction.shared) engagementScore += 2;
    if (interaction.commented) engagementScore += 4;

    interaction.engagementScore = engagementScore;
    await interaction.save();

    const updatedReel = await Reel.findById(id);
    res.json({
      success: true,
      liked: interaction.liked,
      likeCount: updatedReel.likeCount,
    });
  } catch (error) {
    console.error("[REEL] ❌ Like error:", error);
    res.status(500).json({ success: false, error: "Failed to like reel" });
  }
});

// Health check endpoint
router.get("/health", (req, res) => {
  res.json({
    success: true,
    status: "healthy",
    message: "Reels API is running",
    services: {
      groq: !!process.env.GROQ_API_KEY,
      pexels: !!process.env.PEXELS_API_KEY,
      unsplash: true, // Always available (no key needed)
    },
    timestamp: new Date().toISOString(),
  });
});

export default router;
