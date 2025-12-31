import mongoose from "mongoose";
import Course from "../models/Course.js";
import dotenv from "dotenv";

dotenv.config();

const courses = [
  {
    title: "Web Development Fundamentals",
    description:
      "Front-end and back-end basics using HTML, CSS, JavaScript, and Node.js.",
    duration: "10 weeks",
    department: "Computer Science",
    image:
      "https://images.unsplash.com/photo-1505685296765-3a2736de412f?q=80&w=1200&auto=format&fit=crop",
    institute: "Computer Science",
    instituteLogo:
      "https://images.unsplash.com/photo-1523050854058-8df90110c9f1?q=80&w=600",
    instructor: "Dr. Alice Johnson",
    instructorAvatar:
      "https://images.unsplash.com/photo-1544723795-3fb6469f5b39?q=80&w=400",
    assistants: [
      {
        name: "Samir",
        role: "TA",
        avatar:
          "https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=200",
      },
      {
        name: "Priya",
        role: "TA",
        avatar:
          "https://images.unsplash.com/photo-1531123897727-8f129e1688ce?q=80&w=200",
      },
    ],
  },
  {
    title: "Introduction to Psychology",
    description: "Explore human behavior, emotions, perception, and cognition.",
    duration: "8 weeks",
    department: "Humanities",
    image:
      "https://images.unsplash.com/photo-1638443436690-db587cc66f12?ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&q=80&w=1170",
    institute: "Humanities",
    instituteLogo:
      "https://images.unsplash.com/photo-1562774053-701939374585?q=80&w=600",
    instructor: "Prof. Brian Lee",
    instructorAvatar:
      "https://images.unsplash.com/photo-1607746882042-944635dfe10e?q=80&w=400",
    assistants: [
      {
        name: "Aisha",
        role: "TA",
        avatar:
          "https://images.unsplash.com/photo-1527980965255-d3b416303d12?q=80&w=200",
      },
    ],
  },
  {
    title: "Geopolitics and Global Affairs",
    description:
      "Study international relations, power structures, and global strategy.",
    duration: "10 weeks",
    department: "Political Science",
    image:
      "https://images.unsplash.com/photo-1727610542348-9636c3b65d2a?ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&q=80&w=1379",
    institute: "Political Science",
    instituteLogo:
      "https://images.unsplash.com/photo-1581091215367-59ab6d4323ff?q=80&w=600",
    instructor: "Dr. Chen Wei",
    instructorAvatar:
      "https://images.unsplash.com/photo-1556157382-97eda2d62296?q=80&w=400",
    assistants: [],
  },
  {
    title: "Music and Digital Production",
    description:
      "Learn sound design, mixing, and music composition using modern tools.",
    duration: "8 weeks",
    department: "Performing Arts",
    image:
      "https://images.unsplash.com/photo-1507874457470-272b3c8d8ee2?q=80&w=1200&auto=format&fit=crop",
    institute: "Performing Arts",
  },
  {
    title: "Blockchain and Web3 Fundamentals",
    description:
      "Understand blockchain architecture, smart contracts, and decentralized apps.",
    duration: "10 weeks",
    department: "Information Technology",
    image:
      "https://images.unsplash.com/photo-1639762681057-408e52192e55?ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&q=80&w=1332",
    institute: "Information Technology",
  },
  {
    title: "Human-Computer Interaction",
    description:
      "Principles of usability, accessibility, and user experience design.",
    duration: "9 weeks",
    department: "Design & Computing",
    image:
      "https://images.unsplash.com/photo-1555421689-491a97ff2040?q=80&w=1200&auto=format&fit=crop",
    institute: "Design & Computing",
  },
  {
    title: "Cognitive Science",
    description: "Study of how humans think, learn, and process information.",
    duration: "9 weeks",
    department: "Neuroscience",
    image:
      "https://images.unsplash.com/photo-1579154204601-01588f351e67?q=80&w=1200&auto=format&fit=crop",
    institute: "Neuroscience",
  },
  {
    title: "Sustainable Design and Innovation",
    description:
      "Create eco-friendly solutions blending engineering and environmental science.",
    duration: "10 weeks",
    department: "Environmental Studies",
    image:
      "https://images.unsplash.com/photo-1503387762-592deb58ef4e?q=80&w=1200&auto=format&fit=crop",
    institute: "Environmental Studies",
  },
  {
    title: "Entrepreneurship and Startup Culture",
    description:
      "Building startups, innovation frameworks, and market validation.",
    duration: "10 weeks",
    department: "Business Studies",
    image:
      "https://images.unsplash.com/photo-1521737604893-d14cc237f11d?q=80&w=1200&auto=format&fit=crop",
    institute: "Business Studies",
  },
  {
    title: "Digital Marketing and Analytics",
    description:
      "Learn SEO, social media strategy, and data-driven marketing campaigns.",
    duration: "8 weeks",
    department: "Marketing",
    image:
      "https://images.unsplash.com/photo-1504384308090-c894fdcc538d?q=80&w=1200&auto=format&fit=crop",
    institute: "Marketing",
  },
  {
    title: "Neuroscience of Creativity",
    description: "How the brain generates ideas and artistic inspiration.",
    duration: "8 weeks",
    department: "Neuroscience & Arts",
    image:
      "https://images.unsplash.com/photo-1732704573802-8ec393009148?ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&q=80&w=1332",
    institute: "Neuroscience & Arts",
  },
  {
    title: "Cybersecurity and Digital Privacy",
    description:
      "Network defense, cryptography basics, and ethical hacking practices.",
    duration: "10 weeks",
    department: "Cybersecurity",
    image:
      "https://images.unsplash.com/photo-1614064641938-3bbee52942c7?ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&q=80&w=1170",
    institute: "Cybersecurity",
  },
];

async function seedCourses() {
  try {
    const mongoUrl = process.env.MONGO_URL;
    if (!mongoUrl) {
      console.error("MONGO_URL is not set");
      process.exit(1);
    }

    console.log("Connecting to MongoDB...");
    await mongoose.connect(mongoUrl);
    console.log("Connected!");

    // Delete existing courses
    await Course.deleteMany({});
    console.log("Cleared existing courses");

    // Normalize and insert new courses (ensure faculty/institute/assistants fields exist)
    const normalized = courses.map((c) => ({
      ...c,
      institute: c.institute || c.department || "",
      instituteLogo: c.instituteLogo || c.image || "",
      instructor: c.instructor || "TBA",
      instructorAvatar:
        c.instructorAvatar ||
        "https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=400",
      assistants: Array.isArray(c.assistants) ? c.assistants : [],
    }));
    const result = await Course.insertMany(normalized);
    console.log(`✅ Seeded ${result.length} courses`);

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error("Seed error:", error);
    process.exit(1);
  }
}

seedCourses();
