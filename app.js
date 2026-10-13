/**
 * MONER-JUI - Core Application Logic
 * Clean Architecture:
 * 1. Username & Password Authentication for Players and Host
 * 2. Host Account: Abhishek Kawarkhe / Monerpass@123
 * 3. Stats & Monitoring Dashboard strictly restricted to Host only
 * 4. Automatic database sync to Supabase with local storage fallback
 * 5. Dementia-Friendly Memory Match & Remember the Order Mini-Games
 */

// --- 1. SUPABASE CLIENT & CONFIGURATION ---
const DEFAULT_SUPABASE_URL = "https://gtiuqxuvbwfeqvcmqblu.supabase.co";
const DEFAULT_SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd0aXVxeHV2YndmZXF2Y21xYmx1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE5MDcxNTIsImV4cCI6MjEwNzQ4MzE1Mn0.n0d2Ta3IlZBfyz3cW_vNkzbzgBKs6EFBOyMWpj63FZA";

let supabaseClient = null;

// Persistent Settings
let supabaseUrl = localStorage.getItem("monerjui_sb_url") || DEFAULT_SUPABASE_URL;
let supabaseAnonKey = localStorage.getItem("monerjui_sb_key") || DEFAULT_SUPABASE_ANON_KEY;

// Host Credentials
const HOST_USERNAME = "Abhishek Kawarkhe";
const HOST_PASSWORD = "Monerpass@123";

// Current Active Session
let currentUser = JSON.parse(localStorage.getItem("monerjui_active_user")) || null; // { username, fullName, role, points }
let isHostLoggedIn = localStorage.getItem("monerjui_is_host_logged_in") === "true";

// Audio State (Web Audio API Synthesizer)
let audioEnabled = true;
let audioCtx = null;

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
    console.warn("Audio chime note error:", e);
  }
}

// --- 2. INITIALIZATION ---
document.addEventListener("DOMContentLoaded", () => {
  initSupabase();
  setupDateDisplay();
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
      .channel('public:game_sessions')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'game_sessions' }, (payload) => {
        if (isHostLoggedIn) {
          refreshHostDashboard(true);
        }
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
    switchTab("tab-home");
  } else {
    // Show Login
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

// 1. SIGN IN (PLAYER)
async function submitPlayerSignIn() {
  const username = (document.getElementById("login-username-input").value || "").trim();
  const password = (document.getElementById("login-password-input").value || "").trim();

  if (!username || !password) {
    alert("Please enter both username and password.");
    return;
  }

  let user = null;

  // Verify against Supabase
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
      console.warn("Supabase auth error:", err);
    }
  }

  // Fallback to local storage
  if (!user) {
    const localUsers = JSON.parse(localStorage.getItem("monerjui_registered_users") || "[]");
    user = localUsers.find(u => u.username.toLowerCase() === username.toLowerCase() && u.password === password);
  }

  if (!user) {
    alert("Invalid username or password. Please check your credentials or register a new account.");
    return;
  }

  // Successful login
  currentUser = {
    username: user.username,
    fullName: user.full_name || user.fullName || user.username,
    role: "player",
    points: user.total_points || 0
  };
  isHostLoggedIn = false;

  localStorage.setItem("monerjui_active_user", JSON.stringify(currentUser));
  localStorage.setItem("monerjui_is_host_logged_in", "false");

  document.getElementById("auth-overlay").classList.add("hidden");
  document.getElementById("nav-btn-host").classList.add("hidden");

  updatePlayerUI();
  switchTab("tab-home");
  playGentleChime(528, 0.4);
}

// 2. NEW REGISTRATION (PLAYER)
async function submitPlayerRegistration() {
  const fullName = (document.getElementById("reg-fullname-input").value || "").trim();
  const username = (document.getElementById("reg-username-input").value || "").trim();
  const password = (document.getElementById("reg-password-input").value || "").trim();

  if (!fullName || !username || !password) {
    alert("Please fill in all fields (Full Name, Username, and Password).");
    return;
  }

  // Check if username already exists in Supabase
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

  // Save new user in Supabase
  const newUserRecord = {
    username: username,
    password: password,
    full_name: fullName,
    role: "player",
    total_points: 0,
    games_played: 0,
    notes: "Active Participant"
  };

  if (supabaseClient) {
    try {
      await supabaseClient.from('users').insert([newUserRecord]);
    } catch (err) {
      console.warn("Supabase user insert fallback:", err);
    }
  }

  // Save locally
  const localUsers = JSON.parse(localStorage.getItem("monerjui_registered_users") || "[]");
  localUsers.push(newUserRecord);
  localStorage.setItem("monerjui_registered_users", JSON.stringify(localUsers));

  // Log in as the new user
  currentUser = {
    username: username,
    fullName: fullName,
    role: "player",
    points: 0
  };
  isHostLoggedIn = false;

  localStorage.setItem("monerjui_active_user", JSON.stringify(currentUser));
  localStorage.setItem("monerjui_is_host_logged_in", "false");

  document.getElementById("auth-overlay").classList.add("hidden");
  document.getElementById("nav-btn-host").classList.add("hidden");

  updatePlayerUI();
  switchTab("tab-home");
  playGentleChime(587, 0.4);
}

// 3. HOST LOGIN (Abhishek Kawarkhe / Monerpass@123)
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
}

function logoutSession() {
  isHostLoggedIn = false;
  currentUser = null;
  localStorage.removeItem("monerjui_active_user");
  localStorage.setItem("monerjui_is_host_logged_in", "false");

  document.getElementById("auth-overlay").classList.remove("hidden");
  document.getElementById("nav-btn-host").classList.add("hidden");
}

// --- 4. UI UPDATES ---
function updatePlayerUI() {
  if (!currentUser) return;

  const initial = currentUser.fullName.charAt(0).toUpperCase();
  document.getElementById("sidebar-user-avatar").innerText = initial;
  document.getElementById("sidebar-role-badge").innerText = "Player";
  document.getElementById("sidebar-user-name").innerText = currentUser.fullName;

  document.getElementById("main-greeting").innerText = `Good morning, ${currentUser.fullName}`;
  document.getElementById("sub-greeting").innerText = "May your day be peaceful, calm, and filled with gentle smiles.";

  document.getElementById("header-points-display").innerText = currentUser.points || 0;
  document.getElementById("card-points-display").innerText = currentUser.points || 0;

  // Profile Tab
  const pAvatar = document.getElementById("profile-big-avatar");
  if (pAvatar) pAvatar.innerText = initial;
  const pHero = document.getElementById("profile-hero-name");
  if (pHero) pHero.innerText = currentUser.fullName;
  const pPts = document.getElementById("profile-total-points");
  if (pPts) pPts.innerText = currentUser.points || 0;

  loadPlayerHistory();
}

function updateHostUI() {
  document.getElementById("sidebar-user-avatar").innerText = "👑";
  document.getElementById("sidebar-role-badge").innerText = "Host Administrator";
  document.getElementById("sidebar-user-name").innerText = HOST_USERNAME;

  document.getElementById("main-greeting").innerText = `Welcome, Host Abhishek Kawarkhe`;
  document.getElementById("sub-greeting").innerText = "Live caregiver monitoring and participant statistics.";
}

function switchTab(tabId) {
  // If player tries to access host tab directly, block it
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

// --- 5. GAME 1: MEMORY MATCH ---
const NATURE_ICONS = ["🌺", "🌸", "🌿", "🕊️", "☀️", "🌼"];
let matchCards = [];
let flippedCards = [];
let matchedPairs = 0;
let matchMoves = 0;
let matchTimerInterval = null;
let matchSeconds = 0;

function launchGame(gameType) {
  playGentleChime(440, 0.3);
  if (gameType === 'match') {
    startMemoryMatch();
    document.getElementById("modal-match-game").classList.remove("hidden");
  } else if (gameType === 'sequence') {
    prepareSequenceGame();
    document.getElementById("modal-sequence-game").classList.remove("hidden");
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
  
  matchMoves = 0;
  matchedPairs = 0;
  matchSeconds = 0;
  flippedCards = [];

  document.getElementById("match-player-label").innerText = currentUser ? currentUser.fullName : "Player";
  document.getElementById("match-moves-count").innerText = "0";
  document.getElementById("match-pairs-count").innerText = "0";
  document.getElementById("match-timer").innerText = "00:00";

  matchCards = [...NATURE_ICONS, ...NATURE_ICONS].sort(() => 0.5 - Math.random());

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

        if (matchedPairs === NATURE_ICONS.length) {
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
    window.confetti({ particleCount: 40, spread: 60, origin: { y: 0.7 } });
  }

  document.getElementById("match-win-screen").classList.remove("hidden");
  document.getElementById("badge-game1").innerText = "Completed today ✓";
  document.getElementById("badge-game1").classList.add("completed");
}

// --- 6. GAME 2: REMEMBER THE ORDER ---
const BLOSSOM_FREQS = [392, 440, 523, 587];
let sequencePattern = [];
let userSequence = [];
let seqRound = 1;
const MAX_ROUNDS = 4;
let isBotPlaying = false;
let seqTimerInterval = null;
let seqSeconds = 0;

function prepareSequenceGame() {
  document.getElementById("seq-player-label").innerText = currentUser ? currentUser.fullName : "Player";
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
  document.getElementById("seq-instruction").innerText = `Listen and watch blossoms gently... (Round ${seqRound}/${MAX_ROUNDS})`;
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
    if (seqRound >= MAX_ROUNDS) {
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
    window.confetti({ particleCount: 40, spread: 60, origin: { y: 0.7 } });
  }

  document.getElementById("seq-win-screen").classList.remove("hidden");
  document.getElementById("badge-game2").innerText = "Completed today ✓";
  document.getElementById("badge-game2").classList.add("completed");
}

// --- 7. PERSISTENCE & DATA SAVING ---
async function finishAndSaveGame(gameType) {
  const isMatch = gameType === 'match';
  const gameId = isMatch ? "memory-match" : "remember-order";
  const gameTitle = isMatch ? "Memory Match" : "Remember the Order";
  const timeSpent = isMatch ? matchSeconds : seqSeconds;
  const moves = isMatch ? matchMoves : sequencePattern.length * 2;
  const points = 100;

  if (currentUser) {
    currentUser.points = (currentUser.points || 0) + points;
    localStorage.setItem("monerjui_active_user", JSON.stringify(currentUser));
    updatePlayerUI();
  }

  const sessionData = {
    username: currentUser ? currentUser.username : "Guest",
    player_name: currentUser ? currentUser.fullName : "Guest Player",
    game_id: gameId,
    game_title: gameTitle,
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
      await supabaseClient.from('game_sessions').insert([sessionData]);
      if (currentUser && currentUser.username) {
        await supabaseClient.from('users').update({
          total_points: currentUser.points,
          games_played: 1
        }).eq('username', currentUser.username);
      }
    } catch (err) {
      console.warn("Error inserting to Supabase:", err);
    }
  }

  // 2. Save locally
  saveSessionLocally(sessionData);

  closeGameModal(isMatch ? 'modal-match-game' : 'modal-sequence-game');
  switchTab('tab-home');
  loadPlayerHistory();
}

function saveSessionLocally(session) {
  const localHistory = JSON.parse(localStorage.getItem("monerjui_history") || "[]");
  localHistory.unshift(session);
  localStorage.setItem("monerjui_history", JSON.stringify(localHistory));
}

// --- 8. HOST DASHBOARD (RESTRICTED TO HOST ONLY) ---
async function refreshHostDashboard(isSilent = false) {
  if (!isHostLoggedIn) return; // Strict security check

  const tbody = document.getElementById("host-sessions-tbody");
  if (!isSilent && tbody) {
    tbody.innerHTML = `<tr><td colspan="8" class="text-center">Syncing real-time updates from cloud...</td></tr>`;
  }

  let sessions = [];
  let usersList = [];

  // Fetch live from Supabase
  if (supabaseClient) {
    try {
      const [sessRes, usersRes] = await Promise.all([
        supabaseClient.from('game_sessions').select('*').order('created_at', { ascending: false }).limit(50),
        supabaseClient.from('users').select('*').neq('role', 'host')
      ]);

      if (!sessRes.error && sessRes.data) {
        sessions = sessRes.data;
      }
      if (!usersRes.error && usersRes.data) {
        usersList = usersRes.data;
      }
    } catch (err) {
      console.warn("Supabase dashboard fetch warning:", err);
    }
  }

  // Fallbacks to local records
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
      tbody.innerHTML = `<tr><td colspan="8" class="text-center" style="padding:24px; color:#5E7A6B;">No games played yet by registered friends. Awaiting their gentle play.</td></tr>`;
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
          <td class="score-pill">+${s.points_earned} pts</td>
          <td>${timeFormatted}</td>
          <td>${s.total_moves} moves</td>
          <td>${s.accuracy_percentage}%</td>
          <td><span class="check-pill completed">${s.status || 'completed'}</span></td>
        `;
        tbody.appendChild(row);
      });
    }
  }

  // Update Summary Metrics
  const activeCountEl = document.getElementById("metric-active-count");
  const totalGamesEl = document.getElementById("metric-total-games");
  const pointsEl = document.getElementById("metric-combined-points");

  if (activeCountEl) activeCountEl.innerText = usersList.length;
  if (totalGamesEl) totalGamesEl.innerText = sessions.length;
  if (pointsEl) {
    const totalPts = sessions.reduce((sum, s) => sum + (s.points_earned || 0), 0);
    pointsEl.innerText = totalPts;
  }

  renderHostPlayerCards(usersList, sessions);
}

function renderHostPlayerCards(usersList, sessions) {
  const container = document.getElementById("host-players-grid");
  if (!container) return;
  container.innerHTML = "";

  if (usersList.length === 0) {
    container.innerHTML = `<div style="grid-column: 1 / -1; background:white; padding:24px; border-radius:18px; text-align:center; color:#5E7A6B; border:1px solid #E2ECE5;">No participants registered yet. When friends register with a username and password, their live cards will appear here.</div>`;
    return;
  }

  usersList.forEach(user => {
    const userSessions = sessions.filter(s => (s.username === user.username) || (s.player_name === user.full_name));
    const completedCount = userSessions.length;
    const completedToday = completedCount > 0;
    const pts = userSessions.reduce((sum, s) => sum + (s.points_earned || 0), 0);
    const initial = (user.full_name || user.username).charAt(0).toUpperCase();

    const card = document.createElement("div");
    card.className = "friend-status-card";
    card.innerHTML = `
      <div class="friend-card-top">
        <div class="friend-avatar">${initial}</div>
        <div class="friend-name-col">
          <strong>${escapeHtml(user.full_name || user.username)}</strong>
          <span>@${escapeHtml(user.username)}</span>
        </div>
      </div>
      <div class="friend-card-stats">
        <span>Points: <strong>${pts} pts</strong></span>
        <span>Played: <strong>${completedCount}</strong></span>
      </div>
      <div class="friend-badge-status" style="background:${completedToday ? '#E8F5E9' : '#FFF3E0'}; color:${completedToday ? '#2E7D32' : '#E65100'};">
        ${completedToday ? 'Completed Today ✓' : 'Awaiting gentle play ⏳'}
      </div>
    `;
    container.appendChild(card);
  });
}

function loadPlayerHistory() {
  const container = document.getElementById("profile-history-list");
  if (!container || !currentUser) return;

  const localHistory = JSON.parse(localStorage.getItem("monerjui_history") || "[]");
  const playerHistory = localHistory.filter(s => s.username === currentUser.username || s.player_name === currentUser.fullName);

  if (playerHistory.length === 0) {
    container.innerHTML = `<div class="empty-state" style="padding:16px; color:#5E7A6B; font-size:14px;">No activities completed yet today. Play a memory game to record your journey!</div>`;
    return;
  }

  container.innerHTML = "";
  playerHistory.slice(0, 5).forEach(s => {
    const item = document.createElement("div");
    item.className = "history-item";
    const dateStr = new Date(s.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    item.innerHTML = `
      <div>
        <strong>${escapeHtml(s.game_title)}</strong>
        <p style="font-size:12px; color:#5E7A6B;">Completed at ${dateStr} • ${s.time_spent_seconds}s</p>
      </div>
      <span class="score-pill">+${s.points_earned} pts</span>
    `;
    container.appendChild(item);
  });

  const totSessions = document.getElementById("profile-total-sessions");
  if (totSessions) totSessions.innerText = playerHistory.length;
}

// --- 9. HELPERS & MODALS ---
function toggleAudioFx() {
  audioEnabled = !audioEnabled;
  const btn = document.getElementById("toggle-sound-btn");
  if (btn) {
    btn.innerHTML = `<span id="sound-icon">${audioEnabled ? '🔊' : '🔇'}</span> Calming Sound: ${audioEnabled ? 'On' : 'Muted'}`;
  }
}

function speakMessage(text) {
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.85;
    utterance.pitch = 1.0;
    window.speechSynthesis.speak(utterance);
  } else {
    alert(text);
  }
}

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
