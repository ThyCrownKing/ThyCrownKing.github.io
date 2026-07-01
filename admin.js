const DEFAULT_API_BASE = "";
let API_BASE = DEFAULT_API_BASE;
let jwtToken = null;
let apiKey = null;
let currentGuildId = null;

// --- Page switching ---
function showPage(id) {
  document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));
  document.querySelectorAll(".nav-btn").forEach(b => b.classList.remove("active"));

  const page = document.getElementById(id);
  const button = document.querySelector(`.nav-btn[data-page="${id}"]`);

  if (page) page.classList.add("active");
  if (button) button.classList.add("active");
}

// --- Token & settings handling ---
function readTokenFromHash() {
  const hash = window.location.hash;
  if (hash.includes("token=")) {
    const token = new URLSearchParams(hash.slice(1)).get("token");
    if (token) {
      jwtToken = token;
      localStorage.setItem("admin_jwt", jwtToken);
      window.location.hash = "";
    }
  }
}

function loadSettings() {
  API_BASE = localStorage.getItem("admin_api_base") || DEFAULT_API_BASE;
  jwtToken = localStorage.getItem("admin_jwt") || "";
  apiKey = localStorage.getItem("admin_api_key") || "";

  document.getElementById("apiBase").value = API_BASE;
  document.getElementById("tokenInput").value = jwtToken;
  document.getElementById("apiKey").value = apiKey;
  updateConnectionStatus();
}

function saveSettings() {
  API_BASE = document.getElementById("apiBase").value.trim();
  jwtToken = document.getElementById("tokenInput").value.trim();
  apiKey = document.getElementById("apiKey").value.trim();

  localStorage.setItem("admin_api_base", API_BASE);
  localStorage.setItem("admin_jwt", jwtToken);
  localStorage.setItem("admin_api_key", apiKey);

  updateConnectionStatus();
}

function updateConnectionStatus(message = "") {
  const status = document.getElementById("connectionStatus");
  if (!API_BASE) {
    status.textContent = "Please enter the bot API base URL.";
    status.className = "status warning";
    return;
  }

  if (!jwtToken) {
    status.textContent = "Please enter a valid JWT token.";
    status.className = "status warning";
    return;
  }

  status.textContent = message || `Ready to connect with ${API_BASE}`;
  status.className = message && message.toLowerCase().includes("error") ? "status error" : "status";
}

function headers() {
  const result = {
    "Content-Type": "application/json"
  };
  if (jwtToken) result["Authorization"] = `Bearer ${jwtToken}`;
  if (apiKey) result["x-api-key"] = apiKey;
  return result;
}

function normalizeBase(url) {
  return url.replace(/\/+$/, "");
}

async function fetchJSON(path, options = {}) {
  if (!API_BASE) throw new Error("API base URL is not configured.");
  const url = `${normalizeBase(API_BASE)}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: { ...headers(), ...(options.headers || {}) }
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `HTTP ${res.status}`);
  }
  if (res.status === 204) return null;
  return res.json();
}

function showCardMessage(cardId, message, type = "status") {
  const el = document.getElementById(cardId);
  if (!el) return;
  el.textContent = message;
  el.className = type === "error" ? "status error" : type === "warning" ? "status warning" : "status";
}

// --- Guilds ---
async function loadGuilds() {
  try {
    const data = await fetchJSON("/admin/guilds");
    const select = document.getElementById("guildSelect");
    select.innerHTML = "";

    if (!Array.isArray(data.guilds) || data.guilds.length === 0) {
      showCardMessage("guildInfo", "No guilds found for this bot.", "warning");
      return;
    }

    data.guilds.forEach(g => {
      const opt = document.createElement("option");
      opt.value = g.id;
      opt.textContent = `${g.name} (${g.member_count} members)`;
      select.appendChild(opt);
    });

    currentGuildId = data.guilds[0].id;
    select.value = currentGuildId;
    await loadGuildInfo();
    await loadAutomod();
    showCardMessage("guildInfo", `Loaded ${data.guilds.length} guild(s).`);
  } catch (error) {
    console.error(error);
    showCardMessage("guildInfo", `Failed to load guilds: ${error.message}`, "error");
  }
}

async function loadGuildInfo() {
  if (!currentGuildId) {
    showCardMessage("guildInfo", "Please select a guild first.", "warning");
    return;
  }

  try {
    const info = await fetchJSON(`/admin/guilds/${currentGuildId}/stats`);
    document.getElementById("guildInfo").textContent =
      `Name: ${info.name} | Members: ${info.member_count} | Roles: ${info.roles || 0} | Channels: ${info.channels || 0}`;
  } catch (error) {
    console.error(error);
    showCardMessage("guildInfo", `Failed to load guild info: ${error.message}`, "error");
  }
}

// --- Automod ---
async function loadAutomod() {
  if (!currentGuildId) {
    document.getElementById("automodForm").innerHTML = "<p>Please select a guild first.</p>";
    return;
  }

  try {
    const data = await fetchJSON(`/admin/guilds/${currentGuildId}/automod`);
    const container = document.getElementById("automodForm");
    container.innerHTML = "";

    const rules = [
      ["invites", "Block Invites"],
      ["profanity", "Profanity Filter"],
      ["links", "Block External Links"],
      ["mentions", "Mention Spam"],
      ["duplicate", "Duplicate Messages"]
    ];

    rules.forEach(([key, label]) => {
      const row = document.createElement("div");
      row.className = "form-row";
      const cb = document.createElement("input");
      cb.type = "checkbox";
      cb.checked = !!data[key];
      cb.dataset.key = key;
      row.appendChild(cb);
      const labelEl = document.createElement("label");
      labelEl.textContent = label;
      row.appendChild(labelEl);
      container.appendChild(row);
    });

    const raidRow = document.createElement("div");
    raidRow.className = "form-row";
    raidRow.innerHTML = `
      <label>Raid Threshold</label>
      <input type="number" id="raidThresholdInput" value="${data.raid_threshold || 0}" min="0">
    `;
    container.appendChild(raidRow);

    const saveBtn = document.createElement("button");
    saveBtn.textContent = "Save Automod";
    saveBtn.onclick = saveAutomod;
    container.appendChild(saveBtn);
  } catch (error) {
    console.error(error);
    document.getElementById("automodForm").innerHTML = `<p class="status error">Failed to load Automod settings: ${error.message}</p>`;
  }
}

async function saveAutomod() {
  try {
    const payload = {};
    document.querySelectorAll("#automodForm input[type=checkbox]").forEach(cb => {
      payload[cb.dataset.key] = cb.checked ? 1 : 0;
    });
    payload.raid_threshold = parseInt(document.getElementById("raidThresholdInput").value, 10) || 0;

    await fetchJSON(`/admin/guilds/${currentGuildId}/automod`, {
      method: "POST",
      body: JSON.stringify(payload)
    });

    showCardMessage("automodForm", "Automod settings saved successfully.");
  } catch (error) {
    console.error(error);
    showCardMessage("automodForm", `Unable to save Automod settings: ${error.message}`, "error");
  }
}

// --- Lockdown ---
async function lockServer() {
  try {
    const reason = document.getElementById("lockReason").value || "Admin Panel Lockdown";
    const res = await fetchJSON(`/admin/guilds/${currentGuildId}/lock`, {
      method: "POST",
      body: JSON.stringify({ reason })
    });

    showCardMessage("lockResult", `Locked ${res.channels_locked || 0} channels.`);
  } catch (error) {
    console.error(error);
    showCardMessage("lockResult", `Lock failed: ${error.message}`, "error");
  }
}

async function unlockServer() {
  try {
    const res = await fetchJSON(`/admin/guilds/${currentGuildId}/unlock`, {
      method: "POST",
      body: JSON.stringify({})
    });

    showCardMessage("lockResult", `Unlocked ${res.channels_restored || 0} channels.`);
  } catch (error) {
    console.error(error);
    showCardMessage("lockResult", `Unlock failed: ${error.message}`, "error");
  }
}

// --- Voice ---
async function loadVoiceStatus() {
  try {
    const data = await fetchJSON(`/admin/guilds/${currentGuildId}/voice/status`);
    const container = document.getElementById("voiceStatus");
    container.innerHTML = "";

    if (!Array.isArray(data.channels) || data.channels.length === 0) {
      container.textContent = "No active voice channels available.";
      return;
    }

    data.channels.forEach(ch => {
      const wrapper = document.createElement("div");
      wrapper.className = "voice-channel";
      wrapper.innerHTML = `<strong>${ch.name} (${ch.members.length})</strong>`;
      const ul = document.createElement("ul");

      ch.members.forEach(m => {
        const li = document.createElement("li");
        const icons = [];
        if (m.status && m.status.includes("mute")) icons.push("🔇");
        if (m.status && m.status.includes("deaf")) icons.push("🔕");
        if (m.status && m.status.includes("stream")) icons.push("📺");
        li.textContent = `${m.name || m.username || "Member"} ${icons.join(" ")}`;
        ul.appendChild(li);
      });

      wrapper.appendChild(ul);
      container.appendChild(wrapper);
    });
  } catch (error) {
    console.error(error);
    showCardMessage("voiceStatus", `Unable to load voice status: ${error.message}`, "error");
  }
}

// --- Moderation: Warn ---
async function warnUser() {
  try {
    const user_id = document.getElementById("warnUserId").value.trim();
    const reason = document.getElementById("warnReason").value.trim() || "No reason provided";

    if (!user_id) {
      showCardMessage("warnResult", "Enter a user ID to warn.", "warning");
      return;
    }

    await fetchJSON(`/admin/guilds/${currentGuildId}/moderation/warn`, {
      method: "POST",
      body: JSON.stringify({ user_id, reason })
    });

    showCardMessage("warnResult", "User warned successfully.");
  } catch (error) {
    console.error(error);
    showCardMessage("warnResult", `Warn failed: ${error.message}`, "error");
  }
}

// --- Moderation: Blacklist ---
async function blacklistUser() {
  try {
    const user_id = document.getElementById("blacklistUserId").value.trim();
    const reason = document.getElementById("blacklistReason").value.trim() || "No reason provided";

    if (!user_id) {
      showCardMessage("blacklistResult", "Enter a user ID to blacklist.", "warning");
      return;
    }

    await fetchJSON(`/admin/guilds/${currentGuildId}/moderation/blacklist`, {
      method: "POST",
      body: JSON.stringify({ user_id, reason })
    });

    showCardMessage("blacklistResult", "User blacklisted successfully.");
  } catch (error) {
    console.error(error);
    showCardMessage("blacklistResult", `Blacklist failed: ${error.message}`, "error");
  }
}

// --- Init ---
document.addEventListener("DOMContentLoaded", () => {
  readTokenFromHash();
  loadSettings();

  document.getElementById("saveSettings").onclick = async () => {
    saveSettings();
    await loadGuilds();
  };

  document.getElementById("refreshGuilds").onclick = loadGuilds;
  document.getElementById("guildSelect").onchange = async e => {
    currentGuildId = e.target.value;
    await loadGuildInfo();
    await loadAutomod();
  };
  document.getElementById("lockBtn").onclick = lockServer;
  document.getElementById("unlockBtn").onclick = unlockServer;
  document.getElementById("voiceRefresh").onclick = loadVoiceStatus;
  document.getElementById("warnBtn").onclick = warnUser;
  document.getElementById("blacklistBtn").onclick = blacklistUser;

  if (API_BASE && jwtToken) {
    loadGuilds();
  }
});
