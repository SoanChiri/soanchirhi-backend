const express = require("express");
const fs = require("fs");
const path = require("path");
const bodyParser = require("body-parser");
const cors = require("cors");
const jwt = require("jsonwebtoken");

const app = express();
const PORT = 3000;
const SECRET_KEY = "soanchirhi_secret_key";

// ✅ Allow CORS from frontend
app.use(cors({
  origin: "https://soanchiri.org",
  methods: ["GET", "POST"],
  credentials: true
}));

app.use(bodyParser.json());
app.use(express.static("public"));

// Load data
let users = JSON.parse(fs.readFileSync("./database/users.json", "utf-8"));
const resources = JSON.parse(fs.readFileSync("./database/resources.json", "utf-8"));

// 🔹 Helper: Load admission link
const getAdmissionLink = () => {
  try {
    const admission = JSON.parse(fs.readFileSync("./database/admission.json", "utf-8"));
    return admission.admissionLink || null;
  } catch (err) {
    return null;
  }
};

// 🔹 GET: Admission link
app.get("/admission-link", (req, res) => {
  const link = getAdmissionLink();
  link ? res.json({ admissionLink: link }) : res.status(404).json({ message: "Admission link not found." });
});

// 🔹 POST: Update admission link
app.post("/update-admission-link", (req, res) => {
  const { newLink } = req.body;
  try {
    fs.writeFileSync("./database/admission.json", JSON.stringify({ admissionLink: newLink }, null, 2));
    res.json({ success: true, message: "Admission link updated." });
  } catch {
    res.status(500).json({ success: false, message: "Failed to update admission link." });
  }
});

// 🔹 POST: Login
app.post("/login", (req, res) => {
  const { email, password } = req.body;
  const user =
    users.students.find(u => u.email === email && u.password === password) ||
    users.teachers.find(u => u.email === email && u.password === password) ||
    users.admin.find(u => u.email === email && u.password === password);

  if (!user) return res.status(401).json({ success: false, message: "Invalid email or password" });

  const role = user.role || "student";
  const token = jwt.sign({ email: user.email, role, level: user.level || null }, SECRET_KEY, { expiresIn: "2h" });
  res.json({ success: true, token, role, level: user.level || null, firstLogin: user.firstLogin || false });
});

// 🔹 GET: Student resources by level
app.get("/resources/:level", (req, res) => {
  const level = req.params.level.toLowerCase();
  resources[level] ? res.json(resources[level]) : res.status(404).json({ message: "No resources found for this level." });
});

// 🔹 GET: All resources (teacher)
app.get("/all-resources", (req, res) => res.json(resources));

// 🔹 GET: Class info
app.get("/classes", (req, res) => {
  try {
    const data = JSON.parse(fs.readFileSync("./database/classes.json", "utf-8"));
    res.json(data);
  } catch {
    res.status(500).json({ message: "Failed to load class info." });
  }
});

// 🔹 POST: Update class schedule
app.post("/update-classes", (req, res) => {
  const { schedule } = req.body;
  try {
    const classes = JSON.parse(fs.readFileSync("./database/classes.json", "utf-8"));
    classes.schedule = schedule;
    fs.writeFileSync("./database/classes.json", JSON.stringify(classes, null, 2));
    res.json({ success: true, message: "Class info updated." });
  } catch {
    res.status(500).json({ success: false, message: "Failed to update class info." });
  }
});

// 🔹 POST: Update class map
app.post("/update-class-map", (req, res) => {
  const { url } = req.body;
  try {
    const classes = JSON.parse(fs.readFileSync("./database/classes.json", "utf-8"));
    classes.map = url;
    fs.writeFileSync("./database/classes.json", JSON.stringify(classes, null, 2));
    res.json({ success: true, message: "Class map updated." });
  } catch {
    res.status(500).json({ success: false, message: "Failed to update class map." });
  }
});

// 🔹 GET: Team info
app.get("/team", (req, res) => {
  try {
    const team = JSON.parse(fs.readFileSync("./database/team.json", "utf-8"));
    res.json(team);
  } catch {
    res.status(500).json({ message: "Failed to load team info." });
  }
});

// 🔹 POST: Update team info
app.post("/update-team-info", (req, res) => {
  const { managementTeam, teachingTeam } = req.body;
  try {
    fs.writeFileSync("./database/team.json", JSON.stringify({ managementTeam, teachingTeam }, null, 2));
    res.json({ success: true });
  } catch {
    res.status(500).json({ success: false, message: "Failed to update team info." });
  }
});

// 🔹 GET: All images (team, map, gallery)
app.get("/images", (req, res) => {
  try {
    const images = JSON.parse(fs.readFileSync("./database/images.json", "utf8"));
    res.json(images);
  } catch {
    res.status(500).json({ message: "Failed to load images." });
  }
});

// 🔹 POST: Update gallery photo by ID
app.post("/update-gallery-photo/:id", (req, res) => {
  const id = parseInt(req.params.id);
  const { url } = req.body;
  try {
    const images = JSON.parse(fs.readFileSync("./database/images.json", "utf8"));
    if (!Array.isArray(images.gallery)) images.gallery = [];
    images.gallery[id - 1] = url;
    fs.writeFileSync("./database/images.json", JSON.stringify(images, null, 2));
    res.json({ success: true, message: "Gallery photo updated." });
  } catch {
    res.status(500).json({ success: false, message: "Failed to update gallery photo." });
  }
});

// 🔹 POST: Update team photo
app.post("/update-team-photo", (req, res) => {
  const { url } = req.body;
  try {
    const images = JSON.parse(fs.readFileSync("./database/images.json", "utf8"));
    images.team = url;
    fs.writeFileSync("./database/images.json", JSON.stringify(images, null, 2));
    res.json({ success: true, message: "Team photo updated." });
  } catch {
    res.status(500).json({ success: false, message: "Failed to update team photo." });
  }
});

// 🔹 POST: Password change (for logged in users)
app.post("/change-password", (req, res) => {
  const { email, oldPassword, newPassword } = req.body;
  let userGroup = null;
  const user = users.students.find(u => u.email === email) || users.teachers.find(u => u.email === email) || users.admin.find(u => u.email === email);
  if (users.students.some(u => u.email === email)) userGroup = "students";
  if (users.teachers.some(u => u.email === email)) userGroup = "teachers";
  if (users.admin.some(u => u.email === email)) userGroup = "admin";
  if (user && user.password === oldPassword) {
    user.password = newPassword;
    fs.writeFileSync('./database/users.json', JSON.stringify(users, null, 2));
    res.json({ success: true });
  } else {
    res.json({ success: false, message: "Incorrect email or old password." });
  }
});

// 🔹 POST: Admin resets password
app.post("/forgot-password", (req, res) => {
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

// 🔄 Update all resource links (Admin Panel)
app.post("/update-resources", (req, res) => {
  const updates = req.body;

  try {
    const resources = JSON.parse(fs.readFileSync("./database/resources.json", "utf-8"));

    for (let key in updates) {
      if (resources.hasOwnProperty(key)) {
        resources[key].folderUrl = updates[key];
      }
    }

    fs.writeFileSync("./database/resources.json", JSON.stringify(resources, null, 2));
    res.json({ success: true, message: "Resource links updated successfully." });
  } catch (error) {
    console.error("Error updating resource links:", error);
    res.status(500).json({ success: false, message: "Failed to update resource links." });
  }
});

// ✅ Start Server
app.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
});
