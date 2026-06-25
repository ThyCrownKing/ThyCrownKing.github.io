const API_BASE = "https://discordbotv3-production.up.railway.app";

let jwtToken = null;
let apiKey = null;
let currentGuildId = null;

// --- Page switching ---
function showPage(id) {
  document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));
  document.getElementById(id).classList.add("active");
}

// --- Token handling ---
function readTokenFromHash() {
  const hash = window.location.hash;
  if (hash.includes("token=")) {
    jwtToken = hash.split("token=")[1];
    localStorage.setItem("admin_jwt", jwtToken);
  } else {
    jwtToken = localStorage.getItem("admin_jwt");
  }
}

// --- API Key ---
function loadApiKey() {
  apiKey = localStorage.getItem("admin_api_key") || "";
  document.getElementById("apiKey").value = apiKey;
}

function saveApiKey() {
  apiKey = document.getElementById("apiKey").value.trim();
  localStorage.setItem("admin_api_key", apiKey);
}

// --- Headers ---
function headers() {
  return {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${jwtToken}`,
    "auth": apiKey
  };
}

// --- Fetch helper ---
async function fetchJSON(path, options = {}) {
  const res = await fetch(API_BASE + path, {
    ...options,
    headers: { ...headers(), ...(options.headers || {}) }
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

// --- Guilds ---
async function loadGuilds() {
  try {
    const data = await fetchJSON("/admin/guilds");
    const select = document.getElementById("guildSelect");
    select.innerHTML = "";

    data.guilds.forEach(g => {
      const opt = document.createElement("option");
      opt.value = g.id;
      opt.textContent = `${g.name} (${g.member_count})`;
      select.appendChild(opt);
    });

    if (data.guilds.length) {
      currentGuildId = data.guilds[0].id;
      select.value = currentGuildId;
      await loadGuildInfo();
      await loadAutomod();
    }
  } catch (e) {
    console.error(e);
  }
}

async function loadGuildInfo() {
  const info = await fetchJSON(`/admin/guilds/${currentGuildId}/stats`);
  document.getElementById("guildInfo").textContent =
    `Name: ${info.name} | Members: ${info.member_count} | Roles: ${info.roles} | Channels: ${info.channels}`;
}

// --- Automod ---
async function loadAutomod() {
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
    const cb = document.createElement("input");
    cb.type = "checkbox";
    cb.checked = !!data[key];
    cb.dataset.key = key;
    row.appendChild(cb);
    row.appendChild(document.createTextNode(" " + label));
    container.appendChild(row);
  });

  const raidRow = document.createElement("div");
  raidRow.innerHTML = `
    Raid Threshold:
    <input type="number" id="raidThresholdInput" value="${data.raid_threshold}">
  `;
  container.appendChild(raidRow);

  const saveBtn = document.createElement("button");
  saveBtn.textContent = "Save Automod";
  saveBtn.onclick = saveAutomod;
  container.appendChild(saveBtn);
}

async function saveAutomod() {
  const payload = {};
  document.querySelectorAll("#automodForm input[type=checkbox]").forEach(cb => {
    payload[cb.dataset.key] = cb.checked ? 1 : 0;
  });
  payload.raid_threshold = parseInt(document.getElementById("raidThresholdInput").value);

  await fetchJSON(`/admin/guilds/${currentGuildId}/automod`, {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

// --- Lockdown ---
async function lockServer() {
  const reason = document.getElementById("lockReason").value || "Admin Panel Lockdown";
  const res = await fetchJSON(`/admin/guilds/${currentGuildId}/lock`, {
    method: "POST",
    body: JSON.stringify({ reason })
  });
  document.getElementById("lockResult").textContent =
    `Locked ${res.channels_locked} channels.`;
}

async function unlockServer() {
  const res = await fetchJSON(`/admin/guilds/${currentGuildId}/unlock`, {
    method: "POST",
    body: JSON.stringify({})
  });
  document.getElementById("lockResult").textContent =
    `Unlocked ${res.channels_restored} channels.`;
}

// --- Voice ---
async function loadVoiceStatus() {
  const data = await fetchJSON(`/admin/guilds/${currentGuildId}/voice/status`);
  const container = document.getElementById("voiceStatus");
  container.innerHTML = "";

  data.channels.forEach(ch => {
    const div = document.createElement("div");
    div.innerHTML = `<strong>${ch.name} (${ch.members.length})</strong>`;
    const ul = document.createElement("ul");

    ch.members.forEach(m => {
      const li = document.createElement("li");
      const icons = [];
      if (m.status.includes("mute")) icons.push("🔇");
      if (m.status.includes("deaf")) icons.push("🔕");
      if (m.status.includes("stream")) icons.push("📺");
      li.textContent = `${m.name} ${icons.join(" ")}`;
      ul.appendChild(li);
    });

    div.appendChild(ul);
    container.appendChild(div);
  });
}

// --- Init ---
document.addEventListener("DOMContentLoaded", () => {
  readTokenFromHash();
  loadApiKey();

  document.getElementById("saveApiKey").onclick = () => {
    saveApiKey();
    loadGuilds();
  };

  document.getElementById("refreshGuilds").onclick = loadGuilds;
  document.getElementById("guildSelect").onchange = e => {
    currentGuildId = e.target.value;
    loadGuildInfo();
    loadAutomod();
  };

  document.getElementById("lockBtn").onclick = lockServer;
  document.getElementById("unlockBtn").onclick = unlockServer;
  document.getElementById("voiceRefresh").onclick = loadVoiceStatus;
document.getElementById("warnBtn").onclick = warnUser;
document.getElementById("blacklistBtn").onclick = blacklistUser;

  if (jwtToken && apiKey) loadGuilds();
});
// --- Moderation: Warn ---
async function warnUser() {
  const user_id = document.getElementById("warnUserId").value.trim();
  const reason = document.getElementById("warnReason").value.trim() || "No reason provided";

  const res = await fetchJSON(`/admin/guilds/${currentGuildId}/moderation/warn`, {
    method: "POST",
    body: JSON.stringify({ user_id, reason })
  });

  document.getElementById("warnResult").textContent = "User warned successfully.";
}

// --- Moderation: Blacklist ---
async function blacklistUser() {
  const user_id = document.getElementById("blacklistUserId").value.trim();
  const reason = document.getElementById("blacklistReason").value.trim() || "No reason provided";

  const res = await fetchJSON(`/admin/guilds/${currentGuildId}/moderation/blacklist`, {
    method: "POST",
    body: JSON.stringify({ user_id, reason })
  });

  document.getElementById("blacklistResult").textContent = "User blacklisted successfully.";
}
