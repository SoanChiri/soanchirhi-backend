const express = require("express");
const fs = require("fs");
const bodyParser = require("body-parser");
const cors = require("cors");
const jwt = require("jsonwebtoken");

const app = express();
const PORT = 3000;
const SECRET_KEY = "soanchirhi_secret_key";

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static("public"));

// Load data with error handling for file reads
const readJsonFile = (filePath) => {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf-8"));
  } catch (err) {
    console.error(`Error reading file at ${filePath}:`, err);
    return {};
  }
};

let users = readJsonFile("./database/users.json");
const resources = readJsonFile("./database/resources.json");
const classes = readJsonFile("./database/classes.json");

// ✅ Load Admission Link from JSON
const getAdmissionLink = () => {
  try {
    const admission = JSON.parse(fs.readFileSync("./database/admission.json", "utf-8"));
    return admission.admissionLink || null;
  } catch (err) {
    return null;
  }
};

// 🔹 Route to Get Admission Link
app.get("/admission-link", (req, res) => {
  const link = getAdmissionLink();
  if (link) {
    res.json({ admissionLink: link });
  } else {
    res.status(404).json({ message: "Admission link not found." });
  }
});

// JWT Token Verification Middleware
const authenticateToken = (req, res, next) => {
  const token = req.headers['authorization']?.split(' ')[1]; // Bearer <token>

  if (!token) return res.status(401).json({ message: "Access denied. No token provided." });

  jwt.verify(token, SECRET_KEY, (err, user) => {
    if (err) return res.status(403).json({ message: "Invalid token." });
    req.user = user; // Attach the user to the request object
    next(); // Pass control to the next handler
  });
};

// Login Route
app.post("/login", (req, res) => {
  console.log("Login Attempt:", req.body.email, req.body.password);

  const { email, password } = req.body;

  const user =
    users.students.find(u => u.email === email && u.password === password) ||
    users.teachers.find(u => u.email === email && u.password === password) ||
    users.admin.find(u => u.email === email && u.password === password);

  if (!user) {
    return res.status(401).json({ success: false, message: "Invalid email or password" });
  }

  const role = user.role || "student";
  const token = jwt.sign({ email: user.email, role, level: user.level || null }, SECRET_KEY, {
    expiresIn: "2h",
  });

  res.json({ success: true, token, role, level: user.level || null });
});

// Resources by level (for students)
app.get("/resources/:level", authenticateToken, (req, res) => {
  const level = req.params.level.toLowerCase();
  const data = resources[level];
  if (data) {
    res.json(data);
  } else {
    res.status(404).json({ message: "No resources found for this level." });
  }
});

// All resources (for teachers)
app.get("/all-resources", authenticateToken, (req, res) => {
  if (req.user.role !== "teacher" && req.user.role !== "admin") {
    return res.status(403).json({ message: "Access denied. Only teachers and admins can access all resources." });
  }
  res.json(resources);
});

// Classes
app.get("/classes", authenticateToken, (req, res) => {
  res.json(classes);
});

// Password Change (for logged in users)
app.post("/change-password", authenticateToken, (req, res) => {
  const { oldPassword, newPassword } = req.body;
  const user = users[req.user.role].find(u => u.email === req.user.email);

  if (!user || user.password !== oldPassword) {
    return res.status(400).json({ success: false, message: "Incorrect old password." });
  }

  user.password = newPassword;
  fs.writeFileSync('./database/users.json', JSON.stringify(users, null, 2));
  res.json({ success: true });
});

// Admin-Initiated Password Reset (Forgot Password)
app.post("/forgot-password", authenticateToken, (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: "Access denied. Only admins can reset passwords." });
  }

  const { email, newPassword } = req.body;
  let userFound = false;

  ['students', 'teachers', 'admin'].forEach(role => {
    users[role].forEach(user => {
      if (user.email === email) {
        user.password = newPassword;
        user.firstLogin = false;
        user.resetToken = null;
        userFound = true;
      }
    });
  });

  if (userFound) {
    fs.writeFileSync('./database/users.json', JSON.stringify(users, null, 2));
    res.json({ success: true, message: "Password reset successful." });
  } else {
    res.json({ success: false, message: "Email not found." });
  }
});

// Start Server
app.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
});
