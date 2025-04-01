const mongoose = require("mongoose");

const studentSchema = new mongoose.Schema({
  name: String,
  rollNumber: Number,
  class: String,
  section: String,
  marks: [
    {
      name: String,
      pt1: Number,
      pt2: Number,
      hy: Number,
      pt3: Number,
      pt4: Number,
      annual: Number,
    },
  ],
  totalMarks: Number,
  percentage: Number,
  rank: Number,
  result: String,
});

module.exports = mongoose.model("Student", studentSchema);
