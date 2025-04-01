const express = require("express");
const mongoose = require("mongoose");
const PDFDocument = require("pdfkit");
const fs = require("fs");
const path = require("path");

const router = express.Router();
const Student = require("../models/Student"); // Adjust based on your project structure

// Route to bulk download student report cards as a single PDF
router.get("/bulkDownload/:class/:section", async (req, res) => {
  const { class: studentClass, section } = req.params;

  try {
    const students = await Student.find({ class: studentClass, section });

    if (students.length === 0) {
      return res.status(404).json({ message: "No students found!" });
    }

    const pdfPath = path.join(__dirname, `Class_${studentClass}_Section_${section}_Report.pdf`);
    const doc = new PDFDocument({ margin: 50 });

    const stream = fs.createWriteStream(pdfPath);
    doc.pipe(stream);

    students.forEach((student, index) => {
      if (index > 0) doc.addPage(); // New page for each student

      doc.fontSize(20).text("Student Report Card", { align: "center" });
      doc.moveDown();
      doc.fontSize(14).text(`Name: ${student.name}`);
      doc.text(`Roll No: ${student.rollNumber}`);
      doc.text(`Class: ${student.class}`);
      doc.text(`Section: ${student.section}`);
      doc.text(`Total Marks: ${student.totalMarks}`);
      doc.text(`Percentage: ${student.percentage}%`);
      doc.text(`Result: ${student.result}`);
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
