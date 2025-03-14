const express = require("express");
const multer = require("multer");
const mongoose = require("mongoose");
const xlsx = require("xlsx");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const app = express();
app.use(cors());
app.use(express.json());

const SECRET_KEY = "your_secret_key";

// MongoDB Connection
mongoose.connect("mongodb+srv://sanatankisku:MycAvlU36YSBbkKf@cluster0.7x9i3.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0")
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => console.error("MongoDB Connection Error:", err));

const studentSchema = new mongoose.Schema({
  name: String,
  class: String,
  section: String,
  rollNumber: Number,
  dob: String,
  academicRecords: Object,
});

const Student = mongoose.model("Student", studentSchema);

// Dummy admin credentials
const adminCredentials = {
  username: "admin",
  password: bcrypt.hashSync("password123", 10),
};

// Admin Login API
app.post("/admin/login", async (req, res) => {
  const { username, password } = req.body;
  if (username !== adminCredentials.username || !bcrypt.compareSync(password, adminCredentials.password)) {
    return res.status(401).json({ error: "Invalid credentials" });
  }
  const token = jwt.sign({ username }, SECRET_KEY, { expiresIn: "2h" });
  res.json({ token });
});

// Middleware to verify Admin
const verifyToken = (req, res, next) => {
  const token = req.headers.authorization;

  if (!token) return res.status(403).json({ error: "No token provided" });

  const tokenParts = token.split(" ");
  if (tokenParts.length !== 2 || tokenParts[0] !== "Bearer") {
    return res.status(403).json({ error: "Invalid token format" });
  }

  jwt.verify(tokenParts[1], SECRET_KEY, (err, decoded) => {
    if (err) return res.status(401).json({ error: "Invalid or expired token" });
    req.user = decoded;
    next();
  });
};

// Multer Storage for File Uploads
const storage = multer.diskStorage({
  destination: "uploads/",
  filename: (req, file, cb) => {
    cb(null, file.fieldname + "-" + Date.now() + path.extname(file.originalname));
  },
});
const upload = multer({ storage: storage });

// Admin Upload API for Student Information & Academic Records
app.post("/upload", verifyToken, upload.fields([{ name: "studentInfo" }, { name: "academicProgress" }]), async (req, res) => {
  try {
    if (!req.files || !req.files["studentInfo"] || !req.files["academicProgress"]) {
      return res.status(400).send("Both files are required");
    }

    // Read Student Info File
    const studentInfoPath = req.files["studentInfo"][0].path;
    const studentWorkbook = xlsx.readFile(studentInfoPath);
    const studentSheet = studentWorkbook.Sheets[studentWorkbook.SheetNames[0]];
    const studentData = xlsx.utils.sheet_to_json(studentSheet);

    // Read Academic Progress File
    const academicProgressPath = req.files["academicProgress"][0].path;
    const academicWorkbook = xlsx.readFile(academicProgressPath);
    const academicSheet = academicWorkbook.Sheets[academicWorkbook.SheetNames[0]];
    const academicData = xlsx.utils.sheet_to_json(academicSheet);

    // Delete existing records for the same class and section before inserting new data
    const className = studentData[0]?.Class;
    const sectionName = studentData[0]?.Section;
    if (className && sectionName) {
      await Student.deleteMany({ class: className, section: sectionName });
    }

    // Process Data & Store in MongoDB
    for (let student of studentData) {
      let academicRecord = academicData.find((rec) =>
        rec["Roll No."] == student.Roll && rec["Section"] == student.Section
      );

      await Student.updateOne(
        { rollNumber: student.Roll, class: student.Class, section: student.Section },
        {
          name: student.Name,
          dob: student["Date of Birth"],
          academicRecords: academicRecord || {},
        },
        { upsert: true }
      );
    }

    fs.unlinkSync(studentInfoPath);
    fs.unlinkSync(academicProgressPath);

    res.send("Files uploaded and processed successfully");
  } catch (error) {
    console.error("Error processing files:", error);
    res.status(500).send("Error processing files");
  }
});

// Student Report Retrieval API
app.post("/getReport", async (req, res) => {
  const { class: studentClass, section, rollNumber, dob } = req.body;
  const student = await Student.findOne({ class: studentClass, section, rollNumber, dob });

  if (!student) return res.status(404).send("Student not found");

  res.json(student.academicRecords);
});

// Start Server
app.listen(5000, () => console.log("Server running on port 5000"));