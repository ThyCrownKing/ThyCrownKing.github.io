const API_BASE = "https://discordbotv3-production.up.railway.app
"; // replace with your FastAPI base URL

let jwtToken = null;
let apiKey = null;
let currentGuildId = null;

function readTokenFromHash() {
  const hash = window.location.hash || "";
  const match = hash.match(/token=([^&]+)/);
  if (match) {
    jwtToken = match[1];
    localStorage.setItem("admin_jwt", jwtToken);
  } else {
    jwtToken = localStorage.getItem("admin_jwt");
  }
}

function loadApiKey() {
  apiKey = localStorage.getItem("admin_api_key") || "";
  document.getElementById("apiKey").value = apiKey;
}

function saveApiKey() {
  apiKey = document.getElementById("apiKey").value.trim();
  localStorage.setItem("admin_api_key", apiKey);
}

function headers() {
  return {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${jwtToken}`,
    "auth": apiKey
  };
}

async function fetchJSON(path, options = {}) {
  const res = await fetch(API_BASE + path, {
    ...options,
    headers: { ...headers(), ...(options.headers || {}) }
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

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
    document.getElementById("status").textContent = "Connected";
  } catch (e) {
    document.getElementById("status").textContent = "Error: " + e.message;
  }
}

async function loadGuildInfo() {
  if (!currentGuildId) return;
  const info = await fetchJSON(`/admin/guilds/${currentGuildId}/stats`);
  document.getElementById("guildInfo").textContent =
    `Name: ${info.name} | Members: ${info.member_count} | Roles: ${info.roles} | Channels: ${info.channels}`;
}

async function loadAutomod() {
  if (!currentGuildId) return;
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
    const span = document.createElement("span");
    span.textContent = " " + label;
    row.appendChild(cb);
    row.appendChild(span);
    container.appendChild(row);
  });

  const raidRow = document.createElement("div");
  const raidLabel = document.createElement("span");
  raidLabel.textContent = "Raid Threshold: ";
  const raidInput = document.createElement("input");
  raidInput.type = "number";
  raidInput.value = data.raid_threshold;
  raidInput.id = "raidThresholdInput";
  raidRow.appendChild(raidLabel);
  raidRow.appendChild(raidInput);
  container.appendChild(raidRow);

  const saveBtn = document.createElement("button");
  saveBtn.textContent = "Save Automod";
  saveBtn.onclick = saveAutomod;
  container.appendChild(saveBtn);
}

async function saveAutomod() {
  if (!currentGuildId) return;
  const container = document.getElementById("automodForm");
  const payload = {};
  container.querySelectorAll("input[type=checkbox]").forEach(cb => {
    payload[cb.dataset.key] = cb.checked ? 1 : 0;
  });
  const raidInput = document.getElementById("raidThresholdInput");
  payload.raid_threshold = parseInt(raidInput.value || "8", 10);

  await fetchJSON(`/admin/guilds/${currentGuildId}/automod`, {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

async function lockServer() {
  if (!currentGuildId) return;
  const reason = document.getElementById("lockReason").value || "Admin Panel Lockdown";
  const res = await fetchJSON(`/admin/guilds/${currentGuildId}/lock`, {
    method: "POST",
    body: JSON.stringify({ reason })
  });
  document.getElementById("lockResult").textContent =
    `Locked ${res.channels_locked} channels.`;
}

async function unlockServer() {
  if (!currentGuildId) return;
  const res = await fetchJSON(`/admin/guilds/${currentGuildId}/unlock`, {
    method: "POST",
    body: JSON.stringify({})
  });
  document.getElementById("lockResult").textContent =
    `Unlocked ${res.channels_restored} channels.`;
}

async function loadVoiceStatus() {
  if (!currentGuildId) return;
  const data = await fetchJSON(`/admin/guilds/${currentGuildId}/voice/status`);
  const container = document.getElementById("voiceStatus");
  container.innerHTML = "";
  data.channels.forEach(ch => {
    const div = document.createElement("div");
    const title = document.createElement("strong");
    title.textContent = `${ch.name} (${ch.members.length} members)`;
    div.appendChild(title);
    const list = document.createElement("ul");
    ch.members.forEach(m => {
      const li = document.createElement("li");
      const icons = [];
      if (m.status.includes("mute")) icons.push("🔇");
      if (m.status.includes("deaf")) icons.push("🔕");
      if (m.status.includes("stream")) icons.push("📺");
      li.textContent = `${m.name} ${icons.join(" ")}`;
      list.appendChild(li);
    });
    div.appendChild(list);
    container.appendChild(div);
  });
}

document.addEventListener("DOMContentLoaded", () => {
  readTokenFromHash();
  loadApiKey();

  document.getElementById("saveApiKey").onclick = () => {
    saveApiKey();
    loadGuilds();
  };

  document.getElementById("refreshGuilds").onclick = loadGuilds;

  document.getElementById("guildSelect").onchange = async (e) => {
    currentGuildId = e.target.value;
    await loadGuildInfo();
    await loadAutomod();
  };

  document.getElementById("lockBtn").onclick = lockServer;
  document.getElementById("unlockBtn").onclick = unlockServer;
  document.getElementById("voiceRefresh").onclick = loadVoiceStatus;

  if (jwtToken && apiKey) {
    loadGuilds();
  } else {
    document.getElementById("status").textContent = "Waiting for token/API key";
  }
});
