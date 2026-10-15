/**
 * MONER-JUI - Complete Application Engine
 * Features:
 * 1. Warm pink caring aesthetic with custom brand logo.
 * 2. Setup Patient Profile registration with full medical & emergency fields.
 * 3. 3 Difficulty Levels in both Memory Games (Level 1 Easy, Level 2 Medium, Level 3 Mastery).
 * 4. Text-To-Speech (TTS) Voice Guide that speaks and greets in gentle English.
 * 5. 8 Daily Tasks with interactive checkboxes synced live to Supabase & Host.
 * 6. Host Live Dashboard with Chart.js statistical graphs & patient analytics.
 */

// --- 1. SUPABASE CLIENT & CONFIGURATION ---
const DEFAULT_SUPABASE_URL = "https://gtiuqxuvbwfeqvcmqblu.supabase.co";
const DEFAULT_SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd0aXVxeHV2YndmZXF2Y21xYmx1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE5MDcxNTIsImV4cCI6MjEwNzQ4MzE1Mn0.n0d2Ta3IlZBfyz3cW_vNkzbzgBKs6EFBOyMWpj63FZA";

let supabaseClient = null;

let supabaseUrl = localStorage.getItem("monerjui_sb_url") || DEFAULT_SUPABASE_URL;
let supabaseAnonKey = localStorage.getItem("monerjui_sb_key") || DEFAULT_SUPABASE_ANON_KEY;

// Host Credentials
const HOST_USERNAME = "Abhishek Kawarkhe";
const HOST_PASSWORD = "Monerpass@123";

// Current Active Session
let currentUser = JSON.parse(localStorage.getItem("monerjui_active_user")) || null;
let isHostLoggedIn = localStorage.getItem("monerjui_is_host_logged_in") === "true";

// Sound & Voice Assistant Settings
let audioEnabled = true;
let voiceAssistantEnabled = localStorage.getItem("monerjui_voice_enabled") === "true";
let audioCtx = null;

// Default 8 Daily Tasks for Dementia Care
const DAILY_TASKS_TEMPLATE = [
  { index: 0, title: "Morning Hydration", desc: "Drank 1 glass of fresh morning water", icon: "💧" },
  { index: 1, title: "Gentle Stretching", desc: "5-minute gentle breathwork or balcony walk", icon: "🌿" },
  { index: 2, title: "Morning Medication", desc: "Taken prescribed morning supplements/medicines", icon: "💊" },
  { index: 3, title: "Memory Game Exercise", desc: "Completed 1 round of gentle cognitive play", icon: "🧩" },
  { index: 4, title: "Nutritious Lunch", desc: "Enjoyed a peaceful, wholesome midday meal", icon: "🥗" },
  { index: 5, title: "Afternoon Rest", desc: "Rested quietly with calming music or silence", icon: "🕊️" },
  { index: 6, title: "Family Connection", desc: "Exchanged smiles or had a warm call with family", icon: "📞" },
  { index: 7, title: "Evening Hydration & Calm", desc: "Drank evening water and relaxed before dinner", icon: "🌙" }
];

let currentPatientTasks = [];

// Selected Game Levels (Default Level 1)
let selectedMatchLevel = 1; // 1: 4 pairs, 2: 6 pairs, 3: 8 pairs
let selectedSeqLevel = 1;   // 1: 3 rounds, 2: 5 rounds, 3: 7 rounds

// Chart.js Instances for Host Modal
let scoreChartInstance = null;
let taskChartInstance = null;

function getAudioContext() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  return audioCtx;
}

function playGentleChime(freq = 528, duration = 0.5) {
  if (!audioEnabled) return;
  try {
    const ctx = getAudioContext();
    if (ctx.state === 'suspended') ctx.resume();
    
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    
    gain.gain.setValueAtTime(0.01, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.2, ctx.currentTime + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.start();
    osc.stop(ctx.currentTime + duration);
  } catch (e) {
    console.warn("Audio chime error:", e);
  }
}

// --- 2. INITIALIZATION ---
document.addEventListener("DOMContentLoaded", () => {
  initSupabase();
  setupDateDisplay();
  updateVoiceButtonUI();
  checkAuthSession();

  // Periodic host sync every 10s if host dashboard is active
  setInterval(() => {
    const hostTab = document.getElementById("tab-host");
    if (isHostLoggedIn && hostTab && hostTab.classList.contains("active")) {
      refreshHostDashboard(true);
    }
  }, 10000);
});

function setupDateDisplay() {
  const options = { weekday: 'long', month: 'long', day: 'numeric' };
  const today = new Date().toLocaleDateString('en-US', options);
  const dateEl = document.getElementById("current-date-display");
  if (dateEl) dateEl.innerText = today;
}

function initSupabase() {
  const statusBar = document.getElementById("db-status-bar");
  const statusIndicator = document.getElementById("status-indicator");
  const statusText = document.getElementById("status-text");

  if (supabaseUrl && supabaseAnonKey && window.supabase) {
    try {
      supabaseClient = window.supabase.createClient(supabaseUrl, supabaseAnonKey);
      if (statusBar) statusBar.classList.remove("hidden");
      if (statusIndicator) statusIndicator.classList.add("connected");
      if (statusText) statusText.innerText = "Connected to Supabase Cloud Database";
      subscribeRealtime();
    } catch (err) {
      console.error("Supabase init error:", err);
      showFallbackStatus();
    }
  } else {
    showFallbackStatus();
  }
}

function showFallbackStatus() {
  const statusBar = document.getElementById("db-status-bar");
  const statusIndicator = document.getElementById("status-indicator");
  const statusText = document.getElementById("status-text");
  if (statusBar) statusBar.classList.remove("hidden");
  if (statusIndicator) statusIndicator.classList.remove("connected");
  if (statusText) statusText.innerText = "Offline Mode (Local Storage Enabled)";
}

function subscribeRealtime() {
  if (!supabaseClient) return;
  try {
    supabaseClient
      .channel('public:realtime_updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'game_sessions' }, () => {
        if (isHostLoggedIn) refreshHostDashboard(true);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'daily_tasks' }, () => {
        if (isHostLoggedIn) refreshHostDashboard(true);
      })
      .subscribe();
  } catch (e) {
    console.warn("Realtime subscription error:", e);
  }
}

// --- 3. AUTHENTICATION & ACCESS CONTROL ---
function checkAuthSession() {
  const overlay = document.getElementById("auth-overlay");
  const hostNavBtn = document.getElementById("nav-btn-host");

  if (isHostLoggedIn) {
    if (overlay) overlay.classList.add("hidden");
    if (hostNavBtn) hostNavBtn.classList.remove("hidden");
    updateHostUI();
    switchTab("tab-host");
  } else if (currentUser && currentUser.username) {
    if (overlay) overlay.classList.add("hidden");
    if (hostNavBtn) hostNavBtn.classList.add("hidden");
    updatePlayerUI();
    loadPatientDailyTasks();
    switchTab("tab-home");

    if (voiceAssistantEnabled) {
      speakMessage(`Welcome back, ${currentUser.fullName}. Small steps make a good day.`);
    }
  } else {
    if (overlay) overlay.classList.remove("hidden");
    if (hostNavBtn) hostNavBtn.classList.add("hidden");
  }
}

function switchAuthTab(tab) {
  playGentleChime(440, 0.15);
  document.querySelectorAll(".auth-tab-btn").forEach(btn => btn.classList.remove("active"));
  document.querySelectorAll(".auth-panel").forEach(panel => panel.classList.remove("active"));

  if (tab === 'signin') {
    document.getElementById("btn-tab-signin").classList.add("active");
    document.getElementById("auth-panel-signin").classList.add("active");
  } else if (tab === 'register') {
    document.getElementById("btn-tab-register").classList.add("active");
    document.getElementById("auth-panel-register").classList.add("active");
  } else if (tab === 'host') {
    document.getElementById("btn-tab-host").classList.add("active");
    document.getElementById("auth-panel-host").classList.add("active");
  }
}

// 1. SIGN IN
async function submitPlayerSignIn() {
  const username = (document.getElementById("login-username-input").value || "").trim();
  const password = (document.getElementById("login-password-input").value || "").trim();

  if (!username || !password) {
    alert("Please enter both username and password.");
    return;
  }

  let user = null;

  if (supabaseClient) {
    try {
      const { data, error } = await supabaseClient
        .from('users')
        .select('*')
        .ilike('username', username)
        .eq('password', password)
        .limit(1);

      if (!error && data && data.length > 0) {
        user = data[0];
      }
    } catch (err) {
      console.warn("Supabase auth check:", err);
    }
  }

  if (!user) {
    const localUsers = JSON.parse(localStorage.getItem("monerjui_registered_users") || "[]");
    user = localUsers.find(u => u.username.toLowerCase() === username.toLowerCase() && u.password === password);
  }

  if (!user) {
    alert("Invalid username or password. Please verify or register a new patient profile.");
    return;
  }

  currentUser = {
    username: user.username,
    fullName: user.full_name || user.fullName || user.username,
    age: user.age || "65 yrs",
    gender: user.gender || "Other",
    dementiaStage: user.dementia_stage || "Early Stage (MCI)",
    diseaseDescription: user.disease_description || "",
    caretakerPhone: user.caretaker_phone || "",
    doctorName: user.doctor_name || "Dr. Anirban Mukherjee",
    doctorPhone: user.doctor_phone || "+1 (555) 018-9922",
    role: "player",
    points: user.total_points || 0
  };
  isHostLoggedIn = false;

  localStorage.setItem("monerjui_active_user", JSON.stringify(currentUser));
  localStorage.setItem("monerjui_is_host_logged_in", "false");

  document.getElementById("auth-overlay").classList.add("hidden");
  document.getElementById("nav-btn-host").classList.add("hidden");

  updatePlayerUI();
  loadPatientDailyTasks();
  switchTab("tab-home");
  playGentleChime(528, 0.4);

  if (voiceAssistantEnabled) {
    speakMessage(`Welcome back, ${currentUser.fullName}.`);
  }
}

// 2. PATIENT REGISTRATION
async function submitPlayerRegistration() {
  const fullName = (document.getElementById("reg-fullname-input").value || "").trim();
  const username = (document.getElementById("reg-username-input").value || "").trim();
  const password = (document.getElementById("reg-password-input").value || "").trim();
  const age = document.getElementById("reg-age-input").value;
  const gender = document.getElementById("reg-gender-input").value;
  const stage = document.getElementById("reg-stage-input").value;
  const desc = (document.getElementById("reg-desc-input").value || "").trim();
  const caretakerPhone = (document.getElementById("reg-caretaker-phone-input").value || "").trim();
  const doctorName = (document.getElementById("reg-doctor-name-input").value || "Dr. Anirban Mukherjee").trim();
  const doctorPhone = (document.getElementById("reg-doctor-phone-input").value || "+1 (555) 018-9922").trim();

  if (!fullName || !username || !password) {
    alert("Please fill in Patient Full Name, Username, and Password.");
    return;
  }

  if (supabaseClient) {
    try {
      const { data } = await supabaseClient
        .from('users')
        .select('username')
        .ilike('username', username);

      if (data && data.length > 0) {
        alert("This username is already taken. Please choose another username.");
        return;
      }
    } catch (err) {
      console.warn("User existence check warning:", err);
    }
  }

  const newPatientRecord = {
    username: username,
    password: password,
    full_name: fullName,
    role: "player",
    age: age,
    gender: gender,
    dementia_stage: stage,
    disease_description: desc,
    caretaker_phone: caretakerPhone,
    doctor_name: doctorName,
    doctor_phone: doctorPhone,
    total_points: 0,
    games_played: 0
  };

  if (supabaseClient) {
    try {
      await supabaseClient.from('users').insert([newPatientRecord]);
    } catch (err) {
      console.warn("Supabase user insert fallback:", err);
    }
  }

  const localUsers = JSON.parse(localStorage.getItem("monerjui_registered_users") || "[]");
  localUsers.push(newPatientRecord);
  localStorage.setItem("monerjui_registered_users", JSON.stringify(localUsers));

  currentUser = {
    username: username,
    fullName: fullName,
    age: age,
    gender: gender,
    dementiaStage: stage,
    diseaseDescription: desc,
    caretakerPhone: caretakerPhone,
    doctorName: doctorName,
    doctorPhone: doctorPhone,
    role: "player",
    points: 0
  };
  isHostLoggedIn = false;

  localStorage.setItem("monerjui_active_user", JSON.stringify(currentUser));
  localStorage.setItem("monerjui_is_host_logged_in", "false");

  document.getElementById("auth-overlay").classList.add("hidden");
  document.getElementById("nav-btn-host").classList.add("hidden");

  updatePlayerUI();
  loadPatientDailyTasks();
  switchTab("tab-home");
  playGentleChime(587, 0.4);

  speakMessage(`Hello ${fullName}, welcome to your gentle memory care garden.`);
}

// 3. HOST LOGIN
function submitHostLogin() {
  const username = (document.getElementById("host-name-input").value || "").trim();
  const password = (document.getElementById("host-pass-input").value || "").trim();

  if (username !== HOST_USERNAME || password !== HOST_PASSWORD) {
    alert("Invalid Host credentials! Access restricted to Host Abhishek Kawarkhe.");
    return;
  }

  isHostLoggedIn = true;
  currentUser = {
    username: HOST_USERNAME,
    fullName: HOST_USERNAME,
    role: "host",
    points: 0
  };

  localStorage.setItem("monerjui_is_host_logged_in", "true");
  localStorage.setItem("monerjui_active_user", JSON.stringify(currentUser));

  document.getElementById("auth-overlay").classList.add("hidden");
  document.getElementById("nav-btn-host").classList.remove("hidden");

  updateHostUI();
  switchTab("tab-host");
  playGentleChime(659, 0.4);
  refreshHostDashboard();
  speakMessage("Host console opened. Live patient tracking is active.");
}

function logoutSession() {
  isHostLoggedIn = false;
  currentUser = null;
  localStorage.removeItem("monerjui_active_user");
  localStorage.setItem("monerjui_is_host_logged_in", "false");

  document.getElementById("auth-overlay").classList.remove("hidden");
  document.getElementById("nav-btn-host").classList.add("hidden");
}

// --- 4. 8 DAILY TASKS SYSTEM ---
function loadPatientDailyTasks() {
  if (!currentUser) return;
  const todayKey = `monerjui_tasks_${currentUser.username}_${new Date().toISOString().slice(0, 10)}`;
  const saved = localStorage.getItem(todayKey);

  if (saved) {
    currentPatientTasks = JSON.parse(saved);
  } else {
    currentPatientTasks = DAILY_TASKS_TEMPLATE.map(t => ({
      ...t,
      completed: false
    }));
    localStorage.setItem(todayKey, JSON.stringify(currentPatientTasks));
  }

  renderDailyTasksUI();
}

function renderDailyTasksUI() {
  const container = document.getElementById("daily-tasks-list");
  if (!container) return;
  container.innerHTML = "";

  let completedCount = 0;

  currentPatientTasks.forEach((task, idx) => {
    if (task.completed) completedCount++;

    const item = document.createElement("div");
    item.className = `task-item ${task.completed ? 'completed' : ''}`;
    item.onclick = () => toggleTaskCompletion(idx);
    item.innerHTML = `
      <div class="task-checkbox">${task.completed ? '✓' : ''}</div>
      <div class="task-label-text">
        <strong>${task.icon} ${escapeHtml(task.title)}</strong>
        <span>${escapeHtml(task.desc)}</span>
      </div>
    `;
    container.appendChild(item);
  });

  const badge = document.getElementById("tasks-progress-badge");
  if (badge) badge.innerText = `${completedCount} / 8 Completed`;

  const profileBadge = document.getElementById("profile-tasks-badge");
  if (profileBadge) profileBadge.innerText = `Tasks: ${completedCount}/8 Done`;

  const profileStat = document.getElementById("profile-tasks-stat");
  if (profileStat) profileStat.innerText = `${completedCount}/8`;
}

async function toggleTaskCompletion(taskIdx) {
  if (!currentUser || !currentPatientTasks[taskIdx]) return;

  const task = currentPatientTasks[taskIdx];
  task.completed = !task.completed;

  const todayStr = new Date().toISOString().slice(0, 10);
  const todayKey = `monerjui_tasks_${currentUser.username}_${todayStr}`;
  localStorage.setItem(todayKey, JSON.stringify(currentPatientTasks));

  if (task.completed) {
    playGentleChime(784, 0.3);
    if (voiceAssistantEnabled) {
      speakMessage(`Completed ${task.title}. Wonderful step!`);
    }
  } else {
    playGentleChime(440, 0.15);
  }

  renderDailyTasksUI();

  // Sync to Supabase daily_tasks table
  if (supabaseClient) {
    try {
      await supabaseClient.from('daily_tasks').upsert([{
        username: currentUser.username,
        player_name: currentUser.fullName,
        task_date: todayStr,
        task_index: taskIdx,
        task_title: task.title,
        is_completed: task.completed,
        completed_at: task.completed ? new Date().toISOString() : null
      }], { onConflict: 'username,task_date,task_index' });
    } catch (err) {
      console.warn("Daily task cloud sync error:", err);
    }
  }
}

// --- 5. UI UPDATES ---
function updatePlayerUI() {
  if (!currentUser) return;

  const initial = currentUser.fullName.charAt(0).toUpperCase();
  document.getElementById("sidebar-user-avatar").innerText = initial;
  document.getElementById("sidebar-role-badge").innerText = "Patient";
  document.getElementById("sidebar-user-name").innerText = currentUser.fullName;

  document.getElementById("main-greeting").innerText = `Good morning, ${currentUser.fullName}`;
  document.getElementById("sub-greeting").innerText = "May your day be peaceful, calm, and filled with gentle smiles.";

  document.getElementById("header-points-display").innerText = currentUser.points || 0;
  document.getElementById("card-points-display").innerText = currentUser.points || 0;

  // Care Team & Doctor Box
  const docName = document.getElementById("care-doctor-name-display");
  if (docName) docName.innerText = currentUser.doctorName || "Dr. Anirban Mukherjee";
  const docStage = document.getElementById("care-dementia-stage-display");
  if (docStage) docStage.innerText = `${currentUser.dementiaStage || 'Early Stage (MCI)'} Care`;
  const phoneBtn = document.getElementById("care-doctor-phone-btn");
  if (phoneBtn) {
    phoneBtn.innerText = `📞 ${currentUser.doctorPhone || 'Contact'}`;
  }

  // Profile Tab
  const pAvatar = document.getElementById("profile-big-avatar");
  if (pAvatar) pAvatar.innerText = initial;
  const pHero = document.getElementById("profile-hero-name");
  if (pHero) pHero.innerText = currentUser.fullName;
  const pMeta = document.getElementById("profile-meta-line");
  if (pMeta) pMeta.innerText = `Age: ${currentUser.age || '65 yrs'} • ${currentUser.dementiaStage || 'Early Stage (MCI)'}`;
  const pPts = document.getElementById("profile-total-points");
  if (pPts) pPts.innerText = currentUser.points || 0;

  loadPlayerHistory();
}

function updateHostUI() {
  document.getElementById("sidebar-user-avatar").innerText = "👑";
  document.getElementById("sidebar-role-badge").innerText = "Host Administrator";
  document.getElementById("sidebar-user-name").innerText = HOST_USERNAME;

  document.getElementById("main-greeting").innerText = `Welcome, Host Abhishek Kawarkhe`;
  document.getElementById("sub-greeting").innerText = "Real-time patient monitoring, medical summaries, and statistical graphs.";
}

function switchTab(tabId) {
  if (tabId === "tab-host" && !isHostLoggedIn) {
    alert("Access Denied: The Host Dashboard is restricted to Host Abhishek Kawarkhe.");
    return;
  }

  playGentleChime(440, 0.2);
  document.querySelectorAll(".tab-pane").forEach(pane => pane.classList.remove("active"));
  document.querySelectorAll(".nav-menu .nav-item").forEach(item => item.classList.remove("active"));

  const targetPane = document.getElementById(tabId);
  if (targetPane) targetPane.classList.add("active");

  const targetBtn = document.querySelector(`[data-tab="${tabId}"]`);
  if (targetBtn) targetBtn.classList.add("active");

  if (tabId === "tab-host") {
    refreshHostDashboard();
  } else if (tabId === "tab-profile") {
    loadPlayerHistory();
  }
}

// --- 6. 3-LEVEL GAME SYSTEM ---
function setGameLevel(gameType, level) {
  playGentleChime(528, 0.2);
  if (gameType === 'match') {
    selectedMatchLevel = level;
    [1, 2, 3].forEach(l => {
      const btn = document.getElementById(`btn-match-lvl-${l}`);
      if (btn) btn.classList.toggle("active", l === level);
    });
  } else if (gameType === 'seq') {
    selectedSeqLevel = level;
    [1, 2, 3].forEach(l => {
      const btn = document.getElementById(`btn-seq-lvl-${l}`);
      if (btn) btn.classList.toggle("active", l === level);
    });
  }
}

// GAME 1: MEMORY MATCH (3 LEVELS)
const ALL_ICONS = ["🌺", "🌸", "🌿", "🕊️", "☀️", "🌼", "🪷", "🍃"];
let matchCards = [];
let flippedCards = [];
let matchedPairs = 0;
let targetPairs = 4; // Level 1: 4 pairs, Level 2: 6 pairs, Level 3: 8 pairs
let matchMoves = 0;
let matchTimerInterval = null;
let matchSeconds = 0;

function launchGame(gameType) {
  playGentleChime(440, 0.3);
  if (gameType === 'match') {
    startMemoryMatch();
    document.getElementById("modal-match-game").classList.remove("hidden");
    if (voiceAssistantEnabled) {
      speakMessage(`Memory Match Level ${selectedMatchLevel}. Find all ${targetPairs} pairs gently.`);
    }
  } else if (gameType === 'sequence') {
    prepareSequenceGame();
    document.getElementById("modal-sequence-game").classList.remove("hidden");
    if (voiceAssistantEnabled) {
      speakMessage(`Remember the Order Level ${selectedSeqLevel}. Watch the glowing blossoms in order.`);
    }
  }
}

function closeGameModal(modalId) {
  document.getElementById(modalId).classList.add("hidden");
  if (matchTimerInterval) clearInterval(matchTimerInterval);
  if (seqTimerInterval) clearInterval(seqTimerInterval);
}

function startMemoryMatch() {
  const board = document.getElementById("match-board");
  board.innerHTML = "";
  document.getElementById("match-win-screen").classList.add("hidden");

  // Determine pair count by level
  if (selectedMatchLevel === 1) targetPairs = 4;
  else if (selectedMatchLevel === 2) targetPairs = 6;
  else targetPairs = 8;

  const levelBadge = document.getElementById("match-level-badge");
  if (levelBadge) levelBadge.innerText = `Visual Memory Game • Level ${selectedMatchLevel} (${targetPairs} Pairs)`;

  document.getElementById("match-pairs-target").innerText = targetPairs;

  matchMoves = 0;
  matchedPairs = 0;
  matchSeconds = 0;
  flippedCards = [];

  document.getElementById("match-player-label").innerText = currentUser ? currentUser.fullName : "Patient";
  document.getElementById("match-moves-count").innerText = "0";
  document.getElementById("match-pairs-count").innerText = "0";
  document.getElementById("match-timer").innerText = "00:00";

  const iconsSlice = ALL_ICONS.slice(0, targetPairs);
  matchCards = [...iconsSlice, ...iconsSlice].sort(() => 0.5 - Math.random());

  matchCards.forEach((icon, idx) => {
    const card = document.createElement("div");
    card.className = "match-card";
    card.dataset.index = idx;
    card.dataset.icon = icon;
    card.innerText = "🌱";
    card.onclick = () => handleCardClick(card);
    board.appendChild(card);
  });

  if (matchTimerInterval) clearInterval(matchTimerInterval);
  matchTimerInterval = setInterval(() => {
    matchSeconds++;
    const m = String(Math.floor(matchSeconds / 60)).padStart(2, '0');
    const s = String(matchSeconds % 60).padStart(2, '0');
    document.getElementById("match-timer").innerText = `${m}:${s}`;
  }, 1000);
}

function handleCardClick(card) {
  if (card.classList.contains("flipped") || card.classList.contains("matched") || flippedCards.length >= 2) {
    return;
  }

  playGentleChime(587, 0.15);
  card.classList.add("flipped");
  card.innerText = card.dataset.icon;
  flippedCards.push(card);

  if (flippedCards.length === 2) {
    matchMoves++;
    document.getElementById("match-moves-count").innerText = matchMoves;

    const [first, second] = flippedCards;
    if (first.dataset.icon === second.dataset.icon) {
      setTimeout(() => {
        playGentleChime(784, 0.35);
        first.classList.add("matched");
        second.classList.add("matched");
        matchedPairs++;
        document.getElementById("match-pairs-count").innerText = matchedPairs;
        flippedCards = [];

        if (matchedPairs === targetPairs) {
          handleMatchGameWon();
        }
      }, 400);
    } else {
      setTimeout(() => {
        first.classList.remove("flipped");
        second.classList.remove("flipped");
        first.innerText = "🌱";
        second.innerText = "🌱";
        flippedCards = [];
      }, 900);
    }
  }
}

function handleMatchGameWon() {
  clearInterval(matchTimerInterval);
  playGentleChime(659, 0.4);
  setTimeout(() => playGentleChime(880, 0.6), 250);

  if (window.confetti) {
    window.confetti({ particleCount: 45, spread: 70, origin: { y: 0.7 } });
  }

  const earnedPoints = selectedMatchLevel * 100;
  const badge = document.getElementById("match-win-points-badge");
  if (badge) badge.innerText = `+${earnedPoints} Points Earned (Level ${selectedMatchLevel})!`;

  document.getElementById("match-win-screen").classList.remove("hidden");
  document.getElementById("badge-game1").innerText = "Completed today ✓";
  document.getElementById("badge-game1").classList.add("completed");

  if (voiceAssistantEnabled) {
    speakMessage(`Splendid memory! You completed Level ${selectedMatchLevel} and earned ${earnedPoints} points.`);
  }
}

// GAME 2: REMEMBER THE ORDER (3 LEVELS)
const BLOSSOM_FREQS = [392, 440, 523, 587];
let sequencePattern = [];
let userSequence = [];
let seqRound = 1;
let seqMaxRounds = 3; // Level 1: 3, Level 2: 5, Level 3: 7
let isBotPlaying = false;
let seqTimerInterval = null;
let seqSeconds = 0;

function prepareSequenceGame() {
  if (selectedSeqLevel === 1) seqMaxRounds = 3;
  else if (selectedSeqLevel === 2) seqMaxRounds = 5;
  else seqMaxRounds = 7;

  const levelBadge = document.getElementById("seq-level-badge");
  if (levelBadge) levelBadge.innerText = `Sequential Recall • Level ${selectedSeqLevel} (${seqMaxRounds} Rounds)`;

  document.getElementById("seq-round-target").innerText = seqMaxRounds;
  document.getElementById("seq-player-label").innerText = currentUser ? currentUser.fullName : "Patient";
  document.getElementById("seq-round-count").innerText = "1";
  document.getElementById("seq-timer").innerText = "00:00";
  document.getElementById("seq-win-screen").classList.add("hidden");
  document.getElementById("start-seq-btn").classList.remove("hidden");
  document.getElementById("seq-instruction").innerText = "Click 'Start Gentle Round' to begin.";
  sequencePattern = [];
  userSequence = [];
  seqRound = 1;
  seqSeconds = 0;
  if (seqTimerInterval) clearInterval(seqTimerInterval);
}

function startSequenceGame() {
  document.getElementById("start-seq-btn").classList.add("hidden");
  seqSeconds = 0;
  seqTimerInterval = setInterval(() => {
    seqSeconds++;
    const m = String(Math.floor(seqSeconds / 60)).padStart(2, '0');
    const s = String(seqSeconds % 60).padStart(2, '0');
    document.getElementById("seq-timer").innerText = `${m}:${s}`;
  }, 1000);

  nextSequenceRound();
}

function nextSequenceRound() {
  userSequence = [];
  document.getElementById("seq-round-count").innerText = `${seqRound}`;
  document.getElementById("seq-instruction").innerText = `Listen and watch blossoms gently... (Round ${seqRound}/${seqMaxRounds})`;
  sequencePattern.push(Math.floor(Math.random() * 4));
  playFullSequence();
}

function playFullSequence() {
  isBotPlaying = true;
  let i = 0;
  const interval = setInterval(() => {
    const padIdx = sequencePattern[i];
    activatePadVisual(padIdx);
    i++;
    if (i >= sequencePattern.length) {
      clearInterval(interval);
      setTimeout(() => {
        isBotPlaying = false;
        document.getElementById("seq-instruction").innerText = "Now tap the blossoms in the same order. Take your time.";
      }, 500);
    }
  }, 800);
}

function activatePadVisual(padIdx) {
  const pad = document.querySelector(`.seq-pad[data-idx="${padIdx}"]`);
  if (!pad) return;
  playGentleChime(BLOSSOM_FREQS[padIdx], 0.35);
  pad.classList.add("active");
  setTimeout(() => {
    pad.classList.remove("active");
  }, 400);
}

function handleSeqPadClick(padIdx) {
  if (isBotPlaying || sequencePattern.length === 0) return;

  activatePadVisual(padIdx);
  userSequence.push(padIdx);

  const curStep = userSequence.length - 1;
  if (userSequence[curStep] !== sequencePattern[curStep]) {
    document.getElementById("seq-instruction").innerText = "Let's try that sequence again softly!";
    playGentleChime(330, 0.4);
    setTimeout(() => {
      userSequence = [];
      playFullSequence();
    }, 1000);
    return;
  }

  if (userSequence.length === sequencePattern.length) {
    if (seqRound >= seqMaxRounds) {
      handleSeqGameWon();
    } else {
      seqRound++;
      document.getElementById("seq-instruction").innerText = "Wonderful memory! Ready for the next gentle blossom.";
      setTimeout(nextSequenceRound, 1200);
    }
  }
}

function handleSeqGameWon() {
  clearInterval(seqTimerInterval);
  playGentleChime(523, 0.4);
  setTimeout(() => playGentleChime(784, 0.6), 250);

  if (window.confetti) {
    window.confetti({ particleCount: 45, spread: 70, origin: { y: 0.7 } });
  }

  const earnedPoints = selectedSeqLevel * 100;
  const badge = document.getElementById("seq-win-points-badge");
  if (badge) badge.innerText = `+${earnedPoints} Points Earned (Level ${selectedSeqLevel})!`;

  document.getElementById("seq-win-screen").classList.remove("hidden");
  document.getElementById("badge-game2").innerText = "Completed today ✓";
  document.getElementById("badge-game2").classList.add("completed");

  if (voiceAssistantEnabled) {
    speakMessage(`Brilliant focus! You finished Level ${selectedSeqLevel} and collected ${earnedPoints} points.`);
  }
}

// --- 7. DATA PERSISTENCE ---
async function finishAndSaveGame(gameType) {
  const isMatch = gameType === 'match';
  const gameId = isMatch ? "memory-match" : "remember-order";
  const gameTitle = isMatch ? "Memory Match" : "Remember the Order";
  const gameLevel = isMatch ? selectedMatchLevel : selectedSeqLevel;
  const timeSpent = isMatch ? matchSeconds : seqSeconds;
  const moves = isMatch ? matchMoves : sequencePattern.length * 2;
  const points = gameLevel * 100;

  if (currentUser) {
    currentUser.points = (currentUser.points || 0) + points;
    localStorage.setItem("monerjui_active_user", JSON.stringify(currentUser));
    updatePlayerUI();
  }

  const sessionData = {
    username: currentUser ? currentUser.username : "Guest",
    player_name: currentUser ? currentUser.fullName : "Guest Patient",
    game_id: gameId,
    game_title: gameTitle,
    game_level: gameLevel,
    points_earned: points,
    time_spent_seconds: timeSpent,
    total_moves: moves,
    accuracy_percentage: 100.0,
    status: "completed",
    created_at: new Date().toISOString()
  };

  // 1. Supabase Cloud insert
  if (supabaseClient) {
    try {
      // First try inserting with all fields
      const { error: insErr } = await supabaseClient.from('game_sessions').insert([sessionData]);
      
      // If schema doesn't have username column, fallback to insert without username
      if (insErr && insErr.message && insErr.message.includes("username")) {
        const fallbackData = { ...sessionData };
        delete fallbackData.username;
        await supabaseClient.from('game_sessions').insert([fallbackData]);
      }

      if (currentUser && currentUser.username) {
        await supabaseClient.from('users').update({
          total_points: currentUser.points,
          games_played: 1
        }).eq('username', currentUser.username);
      }
    } catch (err) {
      console.warn("Supabase insert session error:", err);
    }
  }

  // 2. Save locally
  const localHistory = JSON.parse(localStorage.getItem("monerjui_history") || "[]");
  localHistory.unshift(sessionData);
  localStorage.setItem("monerjui_history", JSON.stringify(localHistory));

  closeGameModal(isMatch ? 'modal-match-game' : 'modal-sequence-game');
  switchTab('tab-home');
  loadPlayerHistory();
}

// --- 8. HOST DASHBOARD & STATISTICAL GRAPHS ---
async function refreshHostDashboard(isSilent = false) {
  if (!isHostLoggedIn) return;

  const tbody = document.getElementById("host-sessions-tbody");
  if (!isSilent && tbody) {
    tbody.innerHTML = `<tr><td colspan="8" class="text-center">Syncing real-time updates from cloud...</td></tr>`;
  }

  let sessions = [];
  let usersList = [];
  let tasksList = [];

  if (supabaseClient) {
    try {
      const [sessRes, usersRes, tasksRes] = await Promise.all([
        supabaseClient.from('game_sessions').select('*').order('created_at', { ascending: false }).limit(50),
        supabaseClient.from('users').select('*').neq('role', 'host'),
        supabaseClient.from('daily_tasks').select('*')
      ]);

      if (!sessRes.error && sessRes.data) sessions = sessRes.data;
      if (!usersRes.error && usersRes.data) usersList = usersRes.data;
      if (!tasksRes.error && tasksRes.data) tasksList = tasksRes.data;
    } catch (err) {
      console.warn("Supabase dashboard fetch warning:", err);
    }
  }

  if (sessions.length === 0) {
    sessions = JSON.parse(localStorage.getItem("monerjui_history") || "[]");
  }
  if (usersList.length === 0) {
    const localRegistered = JSON.parse(localStorage.getItem("monerjui_registered_users") || "[]");
    usersList = localRegistered.filter(u => u.role !== 'host');
  }

  // Populate Table
  if (tbody) {
    tbody.innerHTML = "";
    if (sessions.length === 0) {
      tbody.innerHTML = `<tr><td colspan="8" class="text-center" style="padding:24px; color:var(--text-muted);">No games completed yet by registered patients.</td></tr>`;
    } else {
      sessions.forEach(s => {
        const row = document.createElement("tr");
        const dateStr = new Date(s.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const sec = s.time_spent_seconds || 0;
        const timeFormatted = `${Math.floor(sec/60)}m ${sec%60}s`;
        
        row.innerHTML = `
          <td>${dateStr}</td>
          <td><strong>${escapeHtml(s.player_name || s.username)}</strong></td>
          <td>${escapeHtml(s.game_title)}</td>
          <td><span class="check-pill">Level ${s.game_level || 1}</span></td>
          <td class="score-pill">+${s.points_earned} pts</td>
          <td>${timeFormatted}</td>
          <td>${s.total_moves} moves</td>
          <td>${s.accuracy_percentage}%</td>
        `;
        tbody.appendChild(row);
      });
    }
  }

  // Summary Metrics
  const activeCountEl = document.getElementById("metric-active-count");
  const totalGamesEl = document.getElementById("metric-total-games");
  const pointsEl = document.getElementById("metric-combined-points");
  const tasksEl = document.getElementById("metric-total-tasks");

  if (activeCountEl) activeCountEl.innerText = usersList.length;
  if (totalGamesEl) totalGamesEl.innerText = sessions.length;
  if (pointsEl) {
    pointsEl.innerText = sessions.reduce((sum, s) => sum + (s.points_earned || 0), 0);
  }
  if (tasksEl) {
    const completedTasks = tasksList.filter(t => t.is_completed).length;
    tasksEl.innerText = completedTasks;
  }

  lastLoadedUsersList = usersList;
  lastLoadedSessions = sessions;
  lastLoadedTasksList = tasksList;

  renderHostPlayerCards(usersList, sessions, tasksList);
}

function renderHostPlayerCards(usersList, sessions, tasksList) {
  const container = document.getElementById("host-players-grid");
  if (!container) return;
  container.innerHTML = "";

  if (usersList.length === 0) {
    container.innerHTML = `<div style="grid-column: 1 / -1; background:white; padding:24px; border-radius:18px; text-align:center; color:var(--text-muted); border:1px solid var(--border-subtle);">No patients registered yet. When a patient registers, their card and analytics will appear here.</div>`;
    return;
  }

  usersList.forEach(user => {
    const userSessions = sessions.filter(s => (s.username === user.username) || (s.player_name === user.full_name));
    const completedCount = userSessions.length;
    const pts = userSessions.reduce((sum, s) => sum + (s.points_earned || 0), 0);
    const initial = (user.full_name || user.username).charAt(0).toUpperCase();

    // Check today's tasks
    const todayStr = new Date().toISOString().slice(0, 10);
    const userTasksToday = tasksList.filter(t => t.username === user.username && t.task_date === todayStr && t.is_completed);

    const card = document.createElement("div");
    card.className = "friend-status-card";
    card.innerHTML = `
      <div class="friend-card-top" onclick="openPatientChartsModalByName('${escapeHtml(user.username)}')">
        <div class="friend-avatar">${initial}</div>
        <div class="friend-name-col">
          <strong>${escapeHtml(user.full_name || user.username)}</strong>
          <span>@${escapeHtml(user.username)} • ${escapeHtml(user.age || '65 yrs')}</span>
        </div>
      </div>
      <div class="friend-card-stats" onclick="openPatientChartsModalByName('${escapeHtml(user.username)}')">
        <span>Score: <strong>${pts} pts</strong></span>
        <span>Tasks: <strong>${userTasksToday.length}/8 Done</strong></span>
      </div>
      <div class="friend-badge-status" onclick="openPatientChartsModalByName('${escapeHtml(user.username)}')" style="background:${completedCount > 0 ? '#FFF1F5' : '#FFF9F0'}; color:${completedCount > 0 ? '#B32856' : '#C27A23'};">
        ${completedCount > 0 ? 'Played Today ✓' : 'Awaiting activity ⏳'}
      </div>
      <div class="friend-card-actions">
        <button class="card-action-btn" onclick="openPatientChartsModalByName('${escapeHtml(user.username)}')">📊 View Stats</button>
        <button class="card-action-btn card-delete-btn" onclick="deletePatientProfile('${escapeHtml(user.username)}', '${escapeHtml(user.full_name || user.username)}')">🗑️ Delete</button>
      </div>
    `;
    container.appendChild(card);
  });
}

// Global cached variables for modal opening
let lastLoadedUsersList = [];
let lastLoadedSessions = [];
let lastLoadedTasksList = [];

function openPatientChartsModalByName(username) {
  const user = lastLoadedUsersList.find(u => u.username === username);
  if (!user) return;
  const userSessions = lastLoadedSessions.filter(s => (s.username === user.username) || (s.player_name === user.full_name));
  openPatientChartsModal(user, userSessions, lastLoadedTasksList);
}

// Delete Patient Profile & Username
async function deletePatientProfile(username, fullName) {
  if (!confirm(`Are you sure you want to permanently delete patient "${fullName}" (@${username})? This will remove their profile and free up database space.`)) {
    return;
  }

  playGentleChime(440, 0.2);

  // 1. Delete from Supabase
  if (supabaseClient) {
    try {
      await Promise.all([
        supabaseClient.from('users').delete().eq('username', username),
        supabaseClient.from('game_sessions').delete().or(`username.eq.${username},player_name.eq.${fullName}`),
        supabaseClient.from('daily_tasks').delete().eq('username', username)
      ]);
    } catch (err) {
      console.warn("Supabase deletion notice:", err);
    }
  }

  // 2. Delete from local storage
  let localUsers = JSON.parse(localStorage.getItem("monerjui_registered_users") || "[]");
  localUsers = localUsers.filter(u => u.username !== username);
  localStorage.setItem("monerjui_registered_users", JSON.stringify(localUsers));

  let localHistory = JSON.parse(localStorage.getItem("monerjui_history") || "[]");
  localHistory = localHistory.filter(s => s.username !== username && s.player_name !== fullName);
  localStorage.setItem("monerjui_history", JSON.stringify(localHistory));

  alert(`Patient profile "${fullName}" has been deleted successfully.`);
  refreshHostDashboard();
}

// Clear All Old Game Logs
async function clearAllGameLogs() {
  if (!confirm("Are you sure you want to clear old game session logs? This will clean up the log table and free up storage.")) {
    return;
  }

  playGentleChime(440, 0.2);

  if (supabaseClient) {
    try {
      await supabaseClient.from('game_sessions').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    } catch (err) {
      console.warn("Supabase logs clear notice:", err);
    }
  }

  localStorage.removeItem("monerjui_history");
  alert("Old game logs have been cleared successfully.");
  refreshHostDashboard();
}

// Open Patient Statistical Graphs Modal
function openPatientChartsModal(user, userSessions, tasksList) {
  const modal = document.getElementById("modal-patient-charts");
  modal.classList.remove("hidden");

  document.getElementById("chart-modal-patient-name").innerText = `${user.full_name || user.username}'s Progress & Graphs`;
  document.getElementById("chart-modal-sub").innerText = `Username: @${user.username} • Registered Patient`;

  // Bio card
  const bio = document.getElementById("chart-modal-bio");
  bio.innerHTML = `
    <div class="patient-bio-item">
      <strong>Age & Gender</strong>
      <span>${user.age || '65 yrs'} (${user.gender || 'Not specified'})</span>
    </div>
    <div class="patient-bio-item">
      <strong>Dementia Stage</strong>
      <span>${user.dementia_stage || 'Early Stage (MCI)'}</span>
    </div>
    <div class="patient-bio-item">
      <strong>Caregiver Phone</strong>
      <span>${user.caretaker_phone || 'None provided'}</span>
    </div>
    <div class="patient-bio-item">
      <strong>Assigned Doctor</strong>
      <span>${user.doctor_name || 'Dr. Anirban Mukherjee'}</span>
    </div>
    <div class="patient-bio-item">
      <strong>Doctor Phone</strong>
      <span>${user.doctor_phone || '+1 (555) 018-9922'}</span>
    </div>
    <div class="patient-bio-item">
      <strong>Condition Notes</strong>
      <span>${user.disease_description || 'Active regular monitoring'}</span>
    </div>
  `;

  // Render Chart 1: Game Scores By Level
  renderScoresChart(userSessions);

  // Render Chart 2: Daily Tasks Progress
  renderTasksChart(user.username, tasksList);

  // History list
  const historyContainer = document.getElementById("chart-modal-history-list");
  historyContainer.innerHTML = "";
  if (userSessions.length === 0) {
    historyContainer.innerHTML = `<div style="padding:14px; color:var(--text-muted); font-size:13px;">No game attempts logged yet for this patient.</div>`;
  } else {
    userSessions.slice(0, 5).forEach(s => {
      const item = document.createElement("div");
      item.className = "history-item";
      const timeStr = new Date(s.created_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' });
      item.innerHTML = `
        <div>
          <strong>${escapeHtml(s.game_title)} (Level ${s.game_level || 1})</strong>
          <p style="font-size:12px; color:var(--text-muted);">${timeStr} • ${s.time_spent_seconds}s • ${s.total_moves} moves</p>
        </div>
        <span class="score-pill">+${s.points_earned} pts</span>
      `;
      historyContainer.appendChild(item);
    });
  }
}

function closePatientChartsModal() {
  document.getElementById("modal-patient-charts").classList.add("hidden");
}

function renderScoresChart(userSessions) {
  const canvas = document.getElementById("chart-scores-canvas");
  if (!canvas) return;

  if (scoreChartInstance) scoreChartInstance.destroy();

  const lvl1Points = userSessions.filter(s => (s.game_level || 1) === 1).reduce((sum, s) => sum + s.points_earned, 0);
  const lvl2Points = userSessions.filter(s => (s.game_level || 1) === 2).reduce((sum, s) => sum + s.points_earned, 0);
  const lvl3Points = userSessions.filter(s => (s.game_level || 1) === 3).reduce((sum, s) => sum + s.points_earned, 0);

  scoreChartInstance = new Chart(canvas, {
    type: 'bar',
    data: {
      labels: ['Level 1 (Easy)', 'Level 2 (Medium)', 'Level 3 (Mastery)'],
      datasets: [{
        label: 'Total Points Earned',
        data: [lvl1Points, lvl2Points, lvl3Points],
        backgroundColor: ['#F8B3C8', '#E65A88', '#B32856'],
        borderRadius: 8
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        y: { beginAtZero: true, grid: { color: '#FCE7EE' } },
        x: { grid: { display: false } }
      }
    }
  });
}

function renderTasksChart(username, tasksList) {
  const canvas = document.getElementById("chart-tasks-canvas");
  if (!canvas) return;

  if (taskChartInstance) taskChartInstance.destroy();

  const userTasks = tasksList.filter(t => t.username === username);
  const completed = userTasks.filter(t => t.is_completed).length;
  const pending = Math.max(0, 8 - (completed % 8));

  taskChartInstance = new Chart(canvas, {
    type: 'doughnut',
    data: {
      labels: ['Completed Tasks', 'Remaining Tasks'],
      datasets: [{
        data: [completed || 1, pending],
        backgroundColor: ['#D94676', '#FCE7EE'],
        borderWidth: 0
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'bottom' }
      }
    }
  });
}

function loadPlayerHistory() {
  const container = document.getElementById("profile-history-list");
  if (!container || !currentUser) return;

  const localHistory = JSON.parse(localStorage.getItem("monerjui_history") || "[]");
  const playerHistory = localHistory.filter(s => s.username === currentUser.username || s.player_name === currentUser.fullName);

  if (playerHistory.length === 0) {
    container.innerHTML = `<div class="empty-state" style="padding:16px; color:var(--text-muted); font-size:14px;">No activities completed yet today. Play a memory game to record your journey!</div>`;
    return;
  }

  container.innerHTML = "";
  playerHistory.slice(0, 5).forEach(s => {
    const item = document.createElement("div");
    item.className = "history-item";
    const dateStr = new Date(s.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    item.innerHTML = `
      <div>
        <strong>${escapeHtml(s.game_title)} (Level ${s.game_level || 1})</strong>
        <p style="font-size:12px; color:var(--text-muted);">Completed at ${dateStr} • ${s.time_spent_seconds}s</p>
      </div>
      <span class="score-pill">+${s.points_earned} pts</span>
    `;
    container.appendChild(item);
  });

  const totSessions = document.getElementById("profile-total-sessions");
  if (totSessions) totSessions.innerText = playerHistory.length;
}

// --- 9. TEXT-TO-SPEECH (TTS) GENTLE FEMALE VOICE ASSISTANT ---
function toggleVoiceAssistant() {
  voiceAssistantEnabled = !voiceAssistantEnabled;
  localStorage.setItem("monerjui_voice_enabled", voiceAssistantEnabled ? "true" : "false");
  updateVoiceButtonUI();

  if (voiceAssistantEnabled) {
    // Immediate gentle greeting when turned ON
    speakMessage("Hello! I am your gentle voice assistant. I am here to guide you peacefully.", true);
  } else {
    // Immediately stop any active speech when turned OFF
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  }
}

function updateVoiceButtonUI() {
  const btn = document.getElementById("toggle-voice-btn");
  if (btn) {
    btn.classList.toggle("active", voiceAssistantEnabled);
    btn.innerHTML = `<span id="voice-icon">🗣️</span> Voice Guide: ${voiceAssistantEnabled ? 'On' : 'Off'}`;
  }
}

function speakHeaderGreeting() {
  // Manual click on "Read aloud" button will speak
  if (currentUser) {
    speakMessage(`Good morning, ${currentUser.fullName}. Small steps make a good day. Take your time, you are doing beautifully.`, true);
  } else {
    speakMessage("Good morning. Welcome to Moner-Jui. Small steps make a good day.", true);
  }
}

// Gentle female voice selector helper
function getGentleFemaleVoice() {
  if (!('speechSynthesis' in window)) return null;
  const voices = window.speechSynthesis.getVoices();
  if (!voices || voices.length === 0) return null;

  // Search for preferred gentle female English voices
  const preferredFemaleNames = [
    "Google UK English Female",
    "Google US English",
    "Samantha",
    "Victoria",
    "Karen",
    "Moira",
    "Fiona",
    "Microsoft Zira",
    "Microsoft Jenny",
    "Microsoft Aria",
    "Natural",
    "Female"
  ];

  for (const name of preferredFemaleNames) {
    const found = voices.find(v => v.lang.startsWith("en") && v.name.toLowerCase().includes(name.toLowerCase()));
    if (found) return found;
  }

  // Fallback to any English female voice or first English voice
  const femaleVoice = voices.find(v => v.lang.startsWith("en") && /female|woman|girl/i.test(v.name));
  if (femaleVoice) return femaleVoice;

  return voices.find(v => v.lang.startsWith("en")) || voices[0];
}

// Ensure voices are loaded by browser
if ('speechSynthesis' in window) {
  window.speechSynthesis.onvoiceschanged = () => {
    getGentleFemaleVoice();
  };
}

function speakMessage(text, forceSpeak = false) {
  // STRICT RULE: Only speak if voice assistant is explicitly turned ON (or user directly clicked "Read Aloud")
  if (!voiceAssistantEnabled && !forceSpeak) {
    return;
  }

  if (!('speechSynthesis' in window)) {
    return;
  }

  try {
    window.speechSynthesis.cancel(); // Cancel any previous speech

    const utterance = new SpeechSynthesisUtterance(text);
    const femaleVoice = getGentleFemaleVoice();
    if (femaleVoice) {
      utterance.voice = femaleVoice;
    }

    // Gentle, comforting female parameters
    utterance.rate = 0.82;   // Gentle, unhurried, calm pace for dementia care
    utterance.pitch = 1.15;  // Slightly warm, soft feminine pitch
    utterance.volume = 1.0;
    utterance.lang = 'en-US';

    window.speechSynthesis.speak(utterance);
  } catch (err) {
    console.warn("Speech synthesis notice:", err);
  }
}


function toggleAudioFx() {
  audioEnabled = !audioEnabled;
  const btn = document.getElementById("toggle-sound-btn");
  if (btn) {
    btn.classList.toggle("active", audioEnabled);
    btn.innerHTML = `<span id="sound-icon">${audioEnabled ? '🔊' : '🔇'}</span> Calming Sound: ${audioEnabled ? 'On' : 'Muted'}`;
  }
}

// Config Modal
function openConfigModal() {
  document.getElementById("modal-config").classList.remove("hidden");
  const urlInput = document.getElementById("cfg-supabase-url");
  const keyInput = document.getElementById("cfg-supabase-key");
  if (urlInput) urlInput.value = supabaseUrl;
  if (keyInput) keyInput.value = supabaseAnonKey;
}

function closeConfigModal() {
  document.getElementById("modal-config").classList.add("hidden");
}

function saveSupabaseConfig() {
  const urlInput = document.getElementById("cfg-supabase-url");
  const keyInput = document.getElementById("cfg-supabase-key");

  supabaseUrl = (urlInput.value || "").trim();
  supabaseAnonKey = (keyInput.value || "").trim();

  localStorage.setItem("monerjui_sb_url", supabaseUrl);
  localStorage.setItem("monerjui_sb_key", supabaseAnonKey);

  initSupabase();
  closeConfigModal();
  refreshHostDashboard();
  playGentleChime(528, 0.4);
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
