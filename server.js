const express = require("express");
const fs = require("fs");
const bodyParser = require("body-parser");
const cors = require("cors");
const jwt = require("jsonwebtoken");

const app = express();
const PORT = 3000;
const SECRET_KEY = "soanchirhi_secret_key";

const corsOptions = {
  origin: 'https://soanchiri.org',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

app.use(cors(corsOptions));
app.use(bodyParser.json());
app.use(express.static("public"));

const authenticateToken = (req, res, next) => {
  const token = req.headers['authorization']?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ message: "Access denied. No token provided." });
  }
  jwt.verify(token, SECRET_KEY, (err, user) => {
    if (err) {
      return res.status(403).json({ message: "Invalid token." });
    }
    req.user = user;
    next();
  });
};

const readJsonFile = (filePath) => {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf-8"));
  } catch (err) {
    console.error(`Error reading file at ${filePath}:`, err);
    return {};
  }
};

let users = readJsonFile("./database/users.json");
let resources = readJsonFile("./database/resources.json");
let classes = readJsonFile("./database/classes.json");
let admission = readJsonFile("./database/admission.json");
let images = readJsonFile("./database/images.json");
let team = readJsonFile("./database/team.json");

app.get("/admission-link", (req, res) => {
  const link = admission.admissionLink;
  if (link) {
    res.json({ admissionLink: link });
  } else {
    res.status(404).json({ message: "Admission link not found." });
  }
});

app.post("/update-admission-link", authenticateToken, (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: "Access denied. Only admins can update the admission link." });
  }
  const { admissionLink } = req.body;
  if (!admissionLink) {
    return res.status(400).json({ message: "Admission link is required." });
  }
  try {
    const newAdmission = { admissionLink };
    fs.writeFileSync('./database/admission.json', JSON.stringify(newAdmission, null, 2));
    admission = newAdmission;
    res.json({ success: true, message: "Admission link updated successfully." });
  } catch (error) {
    console.error("Error updating admission link:", error);
    res.status(500).json({ success: false, message: "Failed to update admission link." });
  }
});

app.get("/team-info", (req, res) => {
  res.json(team);
});


// ✅ Load Images JSON (gallery, team, map)
let images = readJsonFile("./database/images.json");

// 🔹 Route to Get Team Photo
app.get("/team-photo", (req, res) => {
  res.json({ teamPhotos: images.teamPhotos || [] });
});

// 🔹 Route to Get Gallery Photos
app.get("/gallery", (req, res) => {
  res.json({ gallery: images.gallery || [] });
});

// 🔹 Route to Get Class Map Image
app.get("/class-map", (req, res) => {
  res.json({ classMap: images.classMap || [] });
});

// 🔄 Admin-Only Route to Update Team Photo
app.post("/update-team-photo", authenticateToken, (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: "Only admins can update team photo." });
  }

  const { url } = req.body;
  if (!url) return res.status(400).json({ message: "Team photo URL required." });

  images.teamPhotos = [url];
  fs.writeFileSync("./database/images.json", JSON.stringify(images, null, 2));
  res.json({ success: true, message: "Team photo updated." });
});

// 🔄 Admin-Only Route to Update Gallery Photo (by index 1–4)
app.post("/update-gallery-photo/:id", authenticateToken, (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: "Only admins can update gallery." });
  }

  const id = parseInt(req.params.id, 10);
  const { galleryUrl } = req.body;

  if (!galleryUrl || isNaN(id) || id < 1 || id > 4) {
    return res.status(400).json({ message: "Invalid gallery index or URL." });
  }

  images.gallery = images.gallery || [];
  images.gallery[id - 1] = galleryUrl;

  fs.writeFileSync("./database/images.json", JSON.stringify(images, null, 2));
  res.json({ success: true, message: `Gallery photo ${id} updated.` });
});


// 🔄 Admin-Only Route to Update Class Map
app.post("/update-class-map", authenticateToken, (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: "Only admins can update class map." });
  }

  const { map } = req.body;  // Match frontend: `map` field
  if (!map) {
    return res.status(400).json({ message: "Class map URL is required." });
  }

  images.classMap = [map];  // Store as array
  fs.writeFileSync("./database/images.json", JSON.stringify(images, null, 2));
  res.json({ success: true, message: "Class map updated successfully." });
});

// ✅ Login Route
app.post("/login", (req, res) => {
  const { email, password } = req.body;

  // Look for the user in all roles
  const user =
    users.students.find(u => u.email === email && u.password === password) ||
    users.teachers.find(u => u.email === email && u.password === password) ||
    users.admin.find(u => u.email === email && u.password === password);

  if (!user) {
    return res.status(401).json({ success: false, message: "Invalid email or password" });
  }

  const role = user.role || "student";

  // Optional: check for required fields for student
  if (role === "student" && !user.level) {
    return res.status(400).json({ success: false, message: "Student account missing level assignment." });
  }

  // Create JWT token
  const token = jwt.sign(
    { email: user.email, role, level: user.level || null },
    SECRET_KEY,
    { expiresIn: "2h" }
  );

  res.json({ success: true, token, role, level: user.level || null });
});

// ✅ Forgot Password Route (Change Teacher/Admin/Student Password)
app.post("/forgot-password", (req, res) => {
  const { email, newPassword } = req.body;
  let userFound = false;

  for (const group of ["students", "teachers", "admin"]) {
    const userGroup = users[group];
    const user = userGroup.find(u => u.email === email);
    if (user) {
      user.password = newPassword;
      userFound = true;
      break;
    }
  }

  if (!userFound) {
    return res.status(404).json({ success: false, message: "User not found." });
  }

  fs.writeFileSync("./database/users.json", JSON.stringify(users, null, 2));
  res.json({ success: true, message: "Password updated successfully." });
});

// ✅ Route for Teacher Resources Only (matches frontend expectation)
app.get("/resources/teacher", authenticateToken, (req, res) => {
  if (req.user.role !== "teacher" && req.user.role !== "admin") {
    return res.status(403).json({ message: "Access denied. Only teachers and admins can access this." });
  }

  const teacherResource = resources.teachers;

  if (Array.isArray(teacherResource) && teacherResource.length > 0) {
    res.json(teacherResource);
  } else {
    res.status(404).json({ message: "Teacher resources not found." });
  }
});

// ✅ Resources by level (for students)
app.get("/resources/:level", authenticateToken, (req, res) => {
  const level = req.params.level.toLowerCase();
  const data = resources[level];
  if (data) {
    res.json(data);
  } else {
    res.status(404).json({ message: "No resources found for this level." });
  }
});

// ✅ All resources (for teachers and admins)
app.get("/all-resources", authenticateToken, (req, res) => {
  console.log("🔍 Teacher resource request from:", req.user.email, "Role:", req.user.role);
  if (req.user.role !== "teacher" && req.user.role !== "admin") {
    return res.status(403).json({ message: "Access denied. Only teachers and admins can access all resources." });
  }

  res.json(resources);
});

app.post("/update-classes", authenticateToken, (req, res) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({ message: "Access denied. Only admins can update class info." });
  }

  const { schedule, map } = req.body;
  if (!schedule || !map) {
    return res.status(400).json({ message: "Schedule and map are required." });
  }

  try {
    const updatedClassInfo = { schedule, map };
    fs.writeFileSync("./database/classes.json", JSON.stringify(updatedClassInfo, null, 2));
    res.json({ success: true, message: "Class info updated successfully." });
  } catch (error) {
    console.error("Error updating class info:", error);
    res.status(500).json({ success: false, message: "Failed to update class info." });
  }
});

app.post("/update-team-info", authenticateToken, (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: "Access denied. Only admins can update team info." });
  }

  const { description, managementTeam, teachingTeam } = req.body;

  if (!description || !Array.isArray(managementTeam) || !Array.isArray(teachingTeam)) {
    return res.status(400).json({ message: "Missing or invalid team info fields." });
  }

  try {
    const updatedTeam = {
      description,
      managementTeam,
      teachingTeam
    };

    fs.writeFileSync("./database/team.json", JSON.stringify(updatedTeam, null, 2));
    team = updatedTeam;
    res.json({ success: true, message: "Team info updated successfully." });
  } catch (error) {
    console.error("Error updating team info:", error);
    res.status(500).json({ success: false, message: "Failed to update team info." });
  }
});

// 🔄 Route to Update Team Photo (Admin Only)
app.post("/update-team-photo", authenticateToken, (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: "Access denied. Only admins can update the team photo." });
  }

  const { teamPhotoUrl } = req.body;

  if (!teamPhotoUrl) {
    return res.status(400).json({ message: "Team photo URL is required." });
  }

  try {
    const imageData = readJsonFile("./database/images.json");
    imageData.teamPhotos = [teamPhotoUrl]; // only one main team photo at a time
    fs.writeFileSync("./database/images.json", JSON.stringify(imageData, null, 2));
    res.json({ success: true, message: "Team photo updated successfully." });
  } catch (error) {
    console.error("Error updating team photo:", error);
    res.status(500).json({ success: false, message: "Failed to update team photo." });
  }
});
app.post("/update-gallery-photo/:id", authenticateToken, (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: "Only admins can update gallery photos." });
  }

  const id = parseInt(req.params.id, 10);
  const { galleryUrl } = req.body;

  // Validate ID and URL
  const isValidUrl = /^https:\/\/(?:drive\.google\.com\/.+|.+\.(?:jpg|jpeg|png|gif|webp))$/i.test(galleryUrl);
  if (!galleryUrl || isNaN(id) || id < 1 || !isValidUrl) {
    return res.status(400).json({
      message: "Invalid request. ID must be 1+ and URL must be a valid Google Drive or image link."
    });
  }

  try {
    const imageData = readJsonFile("./database/images.json");
    imageData.gallery = imageData.gallery || [];

    // Extend gallery array if necessary
    while (imageData.gallery.length < id) {
      imageData.gallery.push(""); // fill with empty strings if index doesn't exist
    }

    imageData.gallery[id - 1] = galleryUrl;

    fs.writeFileSync("./database/images.json", JSON.stringify(imageData, null, 2));
    res.json({ success: true, message: `Gallery photo ${id} updated successfully.` });
  } catch (error) {
    console.error("Error updating gallery photo:", error);
    res.status(500).json({ success: false, message: "Failed to update gallery photo." });
  }
});


// 🔄 Route to Add or Update Users (Admin Only)
app.post("/manage-users", authenticateToken, (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: "Access denied. Only admins can manage users." });
  }

  const { first_name, last_name, preferred_name, email, password, role, level } = req.body;

  // Validate required fields
  if (!first_name || !last_name || !email || !password || !role) {
    return res.status(400).json({ message: "Missing required fields." });
  }

  // Validate role
  const validRoles = ["student", "teacher", "admin"];
  if (!validRoles.includes(role)) {
    return res.status(400).json({ message: "Invalid role. Must be student, teacher, or admin." });
  }

  // Create user object
  const userObject = {
    id: Date.now(),
    first_name,
    last_name,
    preferred_name: preferred_name || "",
    email,
    password,
    role,
    level: role === "student" ? level || "" : undefined,
    firstLogin: false,
    resetToken: null
  };

  try {
    const groupKey = role + "s"; // "students", "teachers", "admins"
    let targetGroup = users[groupKey];

    if (!Array.isArray(targetGroup)) {
      return res.status(500).json({ message: "User group not found in database." });
    }

    const existingIndex = targetGroup.findIndex(u => u.email === email);

    if (existingIndex !== -1) {
      // Update existing user
      targetGroup[existingIndex] = { ...targetGroup[existingIndex], ...userObject };
    } else {
      // Add new user
      targetGroup.push(userObject);
    }

    // Write to file
    fs.writeFileSync("./database/users.json", JSON.stringify(users, null, 2));
    res.json({ success: true, message: "User saved successfully." });

  } catch (err) {
    console.error("❌ Error saving user:", err);
    res.status(500).json({ success: false, message: "Failed to save user." });
  }
});



// Start Server
app.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
});
