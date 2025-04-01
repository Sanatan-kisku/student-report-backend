const express = require("express");
const PDFDocument = require("pdfkit");
const getStudentModel = require("../server"); // Import getStudentModel function

const router = express.Router();

// Route to bulk download student report cards as a single PDF
router.get("/bulkDownload/:class/:section", async (req, res) => {
  const { class: studentClass, section } = req.params;

  try {
    const Student = getStudentModel(`Class${studentClass}`); // Get the correct model
    const students = await Student.find({ section });

    if (students.length === 0) {
      return res.status(404).json({ message: "No students found!" });
    }

    const doc = new PDFDocument({ margin: 50 });
    let buffers = [];

    doc.on("data", (chunk) => buffers.push(chunk));
    doc.on("end", () => {
      const pdfData = Buffer.concat(buffers);
      res.setHeader("Content-Disposition", `attachment; filename=Class_${studentClass}_Section_${section}_Report.pdf`);
      res.setHeader("Content-Type", "application/pdf");
      res.send(pdfData);
    });

    students.forEach((student, index) => {
      if (index > 0) doc.addPage(); // New page for each student

      doc.fontSize(20).text("Student Report Card", { align: "center" });
      doc.moveDown();
      doc.fontSize(14).text(`Name: ${student.name}`);
      doc.text(`Roll No: ${student.rollNumber}`);
      doc.text(`Class: ${studentClass}`);
      doc.text(`Section: ${section}`);
      doc.text(`Total Marks: ${student.totalMarks}`);
      doc.text(`Percentage: ${student.percentage}%`);
      doc.text(`Result: ${student.result}`);
    });

    doc.end();
  } catch (error) {
    console.error("Error generating reports:", error);
    res.status(500).json({ error: "Error generating reports" });
  }
});

module.exports = router;