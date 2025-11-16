document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");
  const authLoginBtn = document.getElementById("auth-login-btn");
  const authLogoutBtn = document.getElementById("auth-logout-btn");
  const authUserLabel = document.getElementById("auth-user-label");
  const authLoggedOut = document.getElementById("auth-logged-out");
  const authLoggedIn = document.getElementById("auth-logged-in");
  const adminRequiredNote = document.getElementById("admin-required-note");
  const usernameInput = document.getElementById("auth-username");
  const passwordInput = document.getElementById("auth-password");

  function isAdmin() {
    return !!localStorage.getItem("adminToken");
  }

  function applyAuthUI() {
    if (isAdmin()) {
      authLoggedOut.classList.add("hidden");
      authLoggedIn.classList.remove("hidden");
      authUserLabel.textContent = `Logged in as ${localStorage.getItem("adminUser")}`;
      signupForm.querySelectorAll("input, select, button").forEach((el) => (el.disabled = false));
      adminRequiredNote.style.display = "inline";
    } else {
      authLoggedOut.classList.remove("hidden");
      authLoggedIn.classList.add("hidden");
      authUserLabel.textContent = "";
      signupForm.querySelectorAll("input, select, button").forEach((el) => (el.disabled = true));
      adminRequiredNote.style.display = "inline";
    }
  }

  // Function to fetch activities from API
  async function fetchActivities() {
    try {
      const response = await fetch("/activities");
      const activities = await response.json();

      // Clear loading message
      activitiesList.innerHTML = "";

      // Populate activities list
      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";

        const spotsLeft =
          details.max_participants - details.participants.length;

        // Create participants HTML, include delete buttons only for admins
        let participantsHTML = "<p><em>No participants yet</em></p>";
        if (details.participants.length > 0) {
          const items = details.participants
            .map((email) => {
              const delBtn = isAdmin()
                ? `<button class="delete-btn" data-activity="${name}" data-email="${email}">❌</button>`
                : "";
              return `<li><span class="participant-email">${email}</span>${delBtn}</li>`;
            })
            .join("");
          participantsHTML = `<div class="participants-section">
              <h5>Participants:</h5>
              <ul class="participants-list">${items}</ul>
            </div>`;
        }

        activityCard.innerHTML = `
          <h4>${name}</h4>
          <p>${details.description}</p>
          <p><strong>Schedule:</strong> ${details.schedule}</p>
          <p><strong>Availability:</strong> ${spotsLeft} spots left</p>
          <div class="participants-container">
            ${participantsHTML}
          </div>
        `;

        activitiesList.appendChild(activityCard);

        // Add option to select dropdown
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);
      });

      // Add event listeners to delete buttons (only exists for admins)
      document.querySelectorAll(".delete-btn").forEach((button) => {
        button.addEventListener("click", handleUnregister);
      });
    } catch (error) {
      activitiesList.innerHTML =
        "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  // Handle unregister functionality
  async function handleUnregister(event) {
    const button = event.target;
    const activity = button.getAttribute("data-activity");
    const email = button.getAttribute("data-email");

    if (!isAdmin()) {
      showError("Admin login required to unregister.");
      return;
    }

    try {
      const token = localStorage.getItem("adminToken");
      const response = await fetch(
        `/activities/${encodeURIComponent(
          activity
        )}/unregister?email=${encodeURIComponent(email)}`,
        {
          method: "DELETE",
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "success";

        // Refresh activities list to show updated participants
        fetchActivities();
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "error";
      }

      messageDiv.classList.remove("hidden");

      // Hide message after 5 seconds
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to unregister. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error unregistering:", error);
    }
  }

  // Handle form submission
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    if (!isAdmin()) {
      showError("Admin login required to sign up students.");
      return;
    }

    try {
      const token = localStorage.getItem("adminToken");
      const response = await fetch(
        `/activities/${encodeURIComponent(
          activity
        )}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "success";
        signupForm.reset();

        // Refresh activities list to show updated participants
        fetchActivities();
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "error";
      }

      messageDiv.classList.remove("hidden");

      // Hide message after 5 seconds
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to sign up. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error signing up:", error);
    }
  });

  // Initialize app
  fetchActivities();

  function showError(msg) {
    messageDiv.textContent = msg;
    messageDiv.className = "error";
    messageDiv.classList.remove("hidden");
    setTimeout(() => messageDiv.classList.add("hidden"), 5000);
  }

  // Auth handlers
  if (authLoginBtn) {
    authLoginBtn.addEventListener("click", async () => {
      const username = usernameInput.value.trim();
      const password = passwordInput.value;
      if (!username || !password) {
        showError("Enter username and password.");
        return;
      }
      try {
        const res = await fetch("/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username, password }),
        });
        const data = await res.json();
        if (!res.ok) {
          showError(data.detail || "Login failed");
          return;
        }
        localStorage.setItem("adminToken", data.token);
        localStorage.setItem("adminUser", data.username);
        applyAuthUI();
        fetchActivities();
      } catch (e) {
        showError("Login failed. Try again.");
        console.error(e);
      }
    });
  }

  if (authLogoutBtn) {
    authLogoutBtn.addEventListener("click", async () => {
      const token = localStorage.getItem("adminToken");
      try {
        await fetch("/logout", {
          method: "POST",
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
      } catch (e) {
        // ignore
      }
      localStorage.removeItem("adminToken");
      localStorage.removeItem("adminUser");
      applyAuthUI();
      fetchActivities();
    });
  }

  applyAuthUI();
});
