// ✅ Update all Google Drive resource links
document.getElementById("resourceLinksForm").addEventListener("submit", async function (e) {
  e.preventDefault();

  const updates = {
    level1: document.getElementById("level1").value,
    level2: document.getElementById("level2").value,
    level3: document.getElementById("level3").value,
    level4: document.getElementById("level4").value,
    level5: document.getElementById("level5").value,
    sace: document.getElementById("sace").value,
    teacher: document.getElementById("teacher").value
  };

  try {
    const res = await fetch("https://soanchirhi-backend.onrender.com/update-resources", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates)
    });

    const data = await res.json();
    document.getElementById("resourceMessage").textContent = data.message || "Resource links updated.";
  } catch (err) {
    console.error("Error updating resources:", err);
    document.getElementById("resourceMessage").textContent = "Failed to update resource links.";
  }
});
