const backend = "https://soanchirhi-backend.onrender.com";

// Show login modal
document.getElementById("studentLogin")?.addEventListener("click", function () {
  document.getElementById("loginModal").classList.remove("hidden");
});

// Close modal
document.getElementById("closeModal")?.addEventListener("click", function () {
  document.getElementById("loginModal").classList.add("hidden");
});

// Teacher login button redirect
document.getElementById("teacherLogin")?.addEventListener("click", function () {
  window.location.href = "teacher_login.html";
});

// Admin login button redirect
document.getElementById("adminLogin")?.addEventListener("click", function () {
  window.location.href = "admin_login.html";
});

// Student login form submit
document.getElementById("studentLoginForm")?.addEventListener("submit", async function (e) {
  e.preventDefault();

  const email = document.getElementById("studentEmail").value;
  const password = document.getElementById("studentPassword").value;
  const message = document.getElementById("studentLoginMessage");

  try {
    const response = await fetch(`${backend}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, role: "student" })
    });

    const data = await response.json();
    message.textContent = "";

    if (data.success && data.role === "student") {
      message.textContent = "Login successful! Redirecting...";
      message.style.color = "green";

      setTimeout(() => {
        localStorage.setItem('userEmail', email);

        if (data.firstLogin) {
          window.location.href = "change_password.html";
        } else {
          // Redirect based on level
          const level = (data.level || "").toLowerCase().replace(/\s+/g, "");
          const pageMap = {
            level1: "level1_resources.html",
            level2: "level2_resources.html",
            level3: "level3_resources.html",
            level4: "level4_resources.html",
            level5: "level5_resources.html",
            sace: "sace_resources.html"
          };

          const redirectPage = pageMap[level] || "student_resources.html";
          window.location.href = redirectPage;
        }
      }, 1000);
    } else {
      message.textContent = data.message || "Login failed.";
      message.style.color = "red";
    }
  } catch (error) {
    console.error("Login error:", error);
    message.textContent = "Server error. Please try again.";
    message.style.color = "red";
  }
});

// Load dynamic content on DOM ready
window.addEventListener("DOMContentLoaded", async () => {
  try {
    // Load image data
    const imageRes = await fetch(`${backend}/images`);
    const imagesData = await imageRes.json();

    // Team photo
    const teamPhotoEl = document.getElementById("team-photo") || document.getElementById("teamPhoto");
    if (teamPhotoEl && imagesData.team) {
      teamPhotoEl.src = imagesData.team;
      teamPhotoEl.classList.remove("hidden");
      teamPhotoEl.addEventListener("click", () => teamPhotoEl.classList.toggle("enlarged"));
    }

    // Map image
    const mapEl = document.getElementById("mapImage") || document.getElementById("classMap");
    if (mapEl && imagesData.map) {
      mapEl.src = imagesData.map;
      mapEl.classList.remove("hidden");
    }

    // Gallery images
    const galleryContainer = document.getElementById("galleryPhotos");
    if (galleryContainer && Array.isArray(imagesData.gallery)) {
      galleryContainer.innerHTML = "";
      imagesData.gallery.forEach(url => {
        const img = document.createElement("img");
        img.src = url;
        img.alt = "Gallery Photo";
        img.className = "gallery-photo";
        img.addEventListener("click", () => img.classList.toggle("enlarged"));
        galleryContainer.appendChild(img);
      });
    }

    // Predefined gallery-photo IDs
    for (let i = 1; i <= 4; i++) {
      const imgEl = document.getElementById(`gallery-photo${i}`);
      if (imgEl && imagesData.gallery[i - 1]) {
        imgEl.src = imagesData.gallery[i - 1];
      }
    }

    // Team info
    const teamRes = await fetch(`${backend}/team`);
    const teamData = await teamRes.json();

    const managementList = document.getElementById("management-list");
    if (managementList && teamData.managementTeam) {
      managementList.innerHTML = teamData.managementTeam.map(name => `<li>${name}</li>`).join("");
    }

    const teachingList = document.getElementById("teaching-list");
    if (teachingList && teamData.teachingTeam) {
      teachingList.innerHTML = teamData.teachingTeam.map(name => `<li>${name}</li>`).join("");
    }

    // Class Info
    const classRes = await fetch(`${backend}/classes`);
    const classData = await classRes.json();

    const ul = document.getElementById("class-schedule");
    if (ul && classData.schedule) {
      const lines = classData.schedule.split("\n").filter(line => line.trim());
      ul.innerHTML = lines.map(line => `<li>${line}</li>`).join("");
    }

    const mapImage = document.getElementById("mapImage");
    if (mapImage && classData.map) {
      mapImage.src = classData.map;
    }

    // Admission link
    const admissionRes = await fetch(`${backend}/admission-link`);
    const admissionData = await admissionRes.json();
    if (admissionData?.admissionLink) {
      const admissionBtn = document.getElementById("admission-link");
      if (admissionBtn) admissionBtn.href = admissionData.admissionLink;
    }

  } catch (error) {
    console.error("Failed to load dynamic content:", error);
  }
});
