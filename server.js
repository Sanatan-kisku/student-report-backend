const express = require("express");
const multer = require("multer");
const mongoose = require("mongoose");
const xlsx = require("xlsx");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const app = express();
app.use(cors());
app.use(express.json());

// MongoDB Connection
mongoose.connect("mongodb://localhost:27017/reportCardDB", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const studentSchema = new mongoose.Schema({
  name: String,
  class: String,
  section: String,
  rollNumber: Number,
  dob: String,
  academicRecords: Object,
});

const Student = mongoose.model("Student", studentSchema);

// Multer Storage for File Uploads
const storage = multer.diskStorage({
  destination: "uploads/",
  filename: (req, file, cb) => {
    cb(null, file.fieldname + "-" + Date.now() + path.extname(file.originalname));
  },
});
const upload = multer({ storage: storage });

// Admin Upload API for Student Information & Academic Records
app.post("/upload", upload.fields([{ name: "studentInfo" }, { name: "academicProgress" }]), async (req, res) => {
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