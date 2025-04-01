const express = require("express");
const mongoose = require("mongoose");
const PDFDocument = require("pdfkit");
const fs = require("fs");
const path = require("path");
const Student = require("../models/Student"); // Ensure correct model import

const router = express.Router();

// Route to bulk download student report cards as a single PDF
router.get("/bulkDownload/:class/:section", async (req, res) => {
  const { class: studentClass, section } = req.params;

  try {
    const students = await Student.find({ class: studentClass, section });

    if (students.length === 0) {
      return res.status(404).json({ message: "No students found!" });
    }

    const pdfPath = path.join(__dirname, `Class_${studentClass}_Section_${section}_Report.pdf`);
    const doc = new PDFDocument({ margin: 30 });

    const stream = fs.createWriteStream(pdfPath);
    doc.pipe(stream);

    students.forEach((student, index) => {
      if (index > 0) doc.addPage(); // Add new page per student

      // 🔹 Header
      doc.fontSize(18).text("Odisha Adarsha Vidyalaya, Surada, Ganjam", { align: "center" });
      doc.fontSize(12).text("Affiliated to CBSE, New Delhi | School No: 17193", { align: "center" });
      doc.moveDown();

      // 🔹 Student Information
      doc.fontSize(14).text(`Name: ${student.name}`);
      doc.text(`Roll No: ${student.rollNumber}`);
      doc.text(`Class: ${student.class}`);
      doc.text(`Section: ${student.section}`);
      doc.moveDown();

      // 🔹 Marks Table
      const tableStartY = doc.y;
      const tableWidth = 400;
      const colWidth = tableWidth / 7;

      doc.fontSize(12).text("SCHOLASTIC DETAILS", { underline: true });
      doc.moveDown(0.5);

      // Table Headers
      doc.text("Subjects", 60, doc.y);
      doc.text("PT1", 200, doc.y);
      doc.text("PT2", 250, doc.y);
      doc.text("HY", 300, doc.y);
      doc.text("PT3", 350, doc.y);
      doc.text("PT4", 400, doc.y);
      doc.text("Annual", 450, doc.y);
      doc.moveDown(0.5);
      doc.strokeColor("black").lineWidth(1).moveTo(50, doc.y).lineTo(500, doc.y).stroke();
      doc.moveDown(0.5);

      // Subject-wise Marks
      student.marks.forEach((subject) => {
        doc.text(subject.name, 60, doc.y);
        doc.text(subject.pt1.toString(), 200, doc.y);
        doc.text(subject.pt2.toString(), 250, doc.y);
        doc.text(subject.hy.toString(), 300, doc.y);
        doc.text(subject.pt3.toString(), 350, doc.y);
        doc.text(subject.pt4.toString(), 400, doc.y);
        doc.text(subject.annual.toString(), 450, doc.y);
        doc.moveDown(0.5);
      });

      doc.strokeColor("black").lineWidth(1).moveTo(50, doc.y).lineTo(500, doc.y).stroke();
      doc.moveDown(1);

      // 🔹 Summary Section
      doc.fontSize(12).text(`Total Marks: ${student.totalMarks}`);
      doc.text(`Percentage: ${student.percentage}%`);
      doc.text(`Rank: ${student.rank}`);
      doc.text(`Result: ${student.result}`);
      doc.moveDown();

      // 🔹 Signatures
      doc.text("Class Teacher: ____________", 60, doc.y);
      doc.text("Exam Incharge: ____________", 250, doc.y);
      doc.text("Principal: ____________", 400, doc.y);
    });

    doc.end();

    stream.on("finish", () => {
      res.download(pdfPath, `Class_${studentClass}_Section_${section}_Report.pdf`, () => {
        fs.unlinkSync(pdfPath); // Delete file after download
      });
    });

  } catch (error) {
    console.error("Error generating reports:", error);
    res.status(500).json({ error: "Error generating reports" });
  }
});

module.exports = router;
