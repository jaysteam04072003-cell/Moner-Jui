/**
 * MONER-JUI (মনের জুঁই) - Core Application Logic
 * Supports:
 * 1. Supabase Cloud Database Integration (with graceful offline/local fallback)
 * 2. 4 Default Friend Profiles with quick switcher
 * 3. Game 1: Memory Match (Elder-friendly card pairing)
 * 4. Game 2: Remember the Order (Calm sequential blossom recall)
 * 5. Host Real-time Monitoring Dashboard with stats, activity logs & completion badges
 */

// --- 1. SUPABASE CLIENT & CONFIGURATION ---
const DEFAULT_SUPABASE_URL = "https://gtiuqxuvbwfeqvcmqblu.supabase.co";
const DEFAULT_SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd0aXVxeHV2YndmZXF2Y21xYmx1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE5MDcxNTIsImV4cCI6MjEwNzQ4MzE1Mn0.n0d2Ta3IlZBfyz3cW_vNkzbzgBKs6EFBOyMWpj63FZA";


let supabaseClient = null;

// Persistent Settings
let supabaseUrl = localStorage.getItem("monerjui_sb_url") || DEFAULT_SUPABASE_URL;
let supabaseAnonKey = localStorage.getItem("monerjui_sb_key") || DEFAULT_SUPABASE_ANON_KEY;

// 4 Initial Friends
const INITIAL_FRIENDS = [
  { name: "Lakshmi Devi", initial: "ल", points: 420, completedToday: true, notes: "Visual Memory Focus" },
  { name: "Bimal Ghosh", initial: "বি", points: 350, completedToday: true, notes: "Pattern & Audio Focus" },
  { name: "Suniti Sen", initial: "সু", points: 280, completedToday: false, notes: "Gentle Pace Preferred" },
  { name: "Ananda Roy", initial: "আ", points: 390, completedToday: true, notes: "Morning Routine Regular" }
];

// Current Active Player
let currentPlayer = JSON.parse(localStorage.getItem("monerjui_active_player")) || INITIAL_FRIENDS[0];

// Audio State (Web Audio API Synthesizer for gentle chimes)
let audioEnabled = true;
let audioCtx = null;

function getAudioContext() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  return audioCtx;
}

// Gentle Calming Sound Generator
function playGentleChime(freq = 528, duration = 0.5) {
  if (!audioEnabled) return;
  try {
    const ctx = getAudioContext();
    if (ctx.state === 'suspended') ctx.resume();
    
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.type = 'sine'; // Pure soft sine wave
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
  updateProfileUI();
  renderProfilePicker();
  loadLocalOrCloudStats();
  
  // Set up periodic dashboard refresh (every 10 seconds if on host tab)
  setInterval(() => {
    const hostTab = document.getElementById("tab-host");
    if (hostTab && hostTab.classList.contains("active")) {
      refreshHostDashboard(true);
    }
  }, 10000);
});

// Setup Friendly Date
function setupDateDisplay() {
  const options = { weekday: 'long', month: 'long', day: 'numeric' };
  const today = new Date().toLocaleDateString('en-US', options);
  const dateEl = document.getElementById("current-date-display");
  if (dateEl) dateEl.innerText = today;
}

// Connect to Supabase
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

      // Listen to real-time additions if host tab is open
      subscribeRealtime();
    } catch (err) {
      console.error("Supabase init error:", err);
      showFallbackStatus();
    }
  } else {
    // Show configuration hint
    if (statusBar) statusBar.classList.remove("hidden");
    if (statusIndicator) statusIndicator.classList.remove("connected");
    if (statusText) statusText.innerText = "Running in Local Storage Mode (Click Settings to link Supabase)";
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

// Subscribe to Supabase Real-time updates
function subscribeRealtime() {
  if (!supabaseClient) return;
  try {
    supabaseClient
      .channel('public:game_sessions')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'game_sessions' }, (payload) => {
        console.log("New game session received in real-time!", payload);
        refreshHostDashboard(true);
      })
      .subscribe();
  } catch (e) {
    console.warn("Real-time subscription error:", e);
  }
}

// --- 3. PROFILE & UI SWITCHING ---
function updateProfileUI() {
  document.getElementById("sidebar-user-avatar").innerText = currentPlayer.initial;
  document.getElementById("sidebar-user-name").innerText = currentPlayer.name;
  
  const greetingEl = document.getElementById("main-greeting");
  if (greetingEl) {
    if (currentPlayer.name === "Lakshmi Devi") {
      greetingEl.innerText = "नमस्ते, लक्ष्मीदेवी";
    } else {
      greetingEl.innerText = `Welcome, ${currentPlayer.name}`;
    }
  }

  document.getElementById("header-points-display").innerText = currentPlayer.points || 0;
  document.getElementById("card-points-display").innerText = currentPlayer.points || 0;

  // Profile tab fields
  const bigAvatar = document.getElementById("profile-big-avatar");
  if (bigAvatar) bigAvatar.innerText = currentPlayer.initial;
  const heroName = document.getElementById("profile-hero-name");
  if (heroName) heroName.innerText = currentPlayer.name;
  const totPts = document.getElementById("profile-total-points");
  if (totPts) totPts.innerText = currentPlayer.points || 0;

  // Progress Bar
  const fill = document.getElementById("rewards-bar-fill");
  if (fill) {
    const pct = Math.min(100, Math.floor(((currentPlayer.points || 0) % 500) / 5));
    fill.style.width = `${pct}%`;
  }

  localStorage.setItem("monerjui_active_player", JSON.stringify(currentPlayer));
}

function switchTab(tabId) {
  playGentleChime(440, 0.2);
  document.querySelectorAll(".tab-pane").forEach(pane => pane.classList.remove("active"));
  document.querySelectorAll(".nav-item").forEach(item => item.classList.remove("active"));

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

// Modal open/close
function openProfileSelector() {
  document.getElementById("modal-select-profile").classList.remove("hidden");
}
function closeProfileSelector() {
  document.getElementById("modal-select-profile").classList.add("hidden");
}

function renderProfilePicker() {
  const container = document.getElementById("picker-list");
  if (!container) return;
  container.innerHTML = "";

  INITIAL_FRIENDS.forEach(friend => {
    const row = document.createElement("div");
    row.className = "picker-row";
    row.onclick = () => selectPlayer(friend);
    row.innerHTML = `
      <div class="picker-initial">${friend.initial}</div>
      <div>
        <strong>${friend.name}</strong>
        <p style="font-size:12px; color:#5E7A6B;">${friend.points} points • ${friend.notes}</p>
      </div>
    `;
    container.appendChild(row);
  });
}

function selectPlayer(player) {
  currentPlayer = player;
  updateProfileUI();
  closeProfileSelector();
  playGentleChime(528, 0.3);
}

function chooseCustomPlayer() {
  const input = document.getElementById("custom-name-input");
  const name = (input.value || "").trim();
  if (!name) return;

  const newPlayer = {
    name: name,
    initial: name.charAt(0).toUpperCase(),
    points: 100,
    completedToday: false,
    notes: "Active Explorer"
  };

  currentPlayer = newPlayer;
  INITIAL_FRIENDS.push(newPlayer);
  updateProfileUI();
  renderProfilePicker();
  closeProfileSelector();
  input.value = "";
  playGentleChime(587, 0.4);
}

// --- 4. GAME 1: MEMORY MATCH ---
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

  document.getElementById("match-player-label").innerText = currentPlayer.name;
  document.getElementById("match-moves-count").innerText = "0";
  document.getElementById("match-pairs-count").innerText = "0";
  document.getElementById("match-timer").innerText = "00:00";

  // Double cards to make pairs & shuffle
  matchCards = [...NATURE_ICONS, ...NATURE_ICONS].sort(() => 0.5 - Math.random());

  matchCards.forEach((icon, idx) => {
    const card = document.createElement("div");
    card.className = "match-card";
    card.dataset.index = idx;
    card.dataset.icon = icon;
    card.innerText = "🌱"; // Covered state
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
      // MATCH FOUND!
      setTimeout(() => {
        playGentleChime(784, 0.35); // Pleasant higher chime
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
      // NO MATCH: Gently flip back
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

// --- 5. GAME 2: REMEMBER THE ORDER (SEQUENCE RECALL) ---
const BLOSSOM_FREQS = [392, 440, 523, 587]; // G4, A4, C5, D5 soothing pentatonic notes
let sequencePattern = [];
let userSequence = [];
let seqRound = 1;
const MAX_ROUNDS = 4;
let isBotPlaying = false;
let seqTimerInterval = null;
let seqSeconds = 0;

function prepareSequenceGame() {
  document.getElementById("seq-player-label").innerText = currentPlayer.name;
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

  // Add 1 random flower to pattern
  sequencePattern.push(Math.floor(Math.random() * 4));

  // Play sequence to player
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
    // Gentle mistake prompt without harsh buzzers
    document.getElementById("seq-instruction").innerText = "Let's try that sequence again softly!";
    playGentleChime(330, 0.4);
    setTimeout(() => {
      userSequence = [];
      playFullSequence();
    }, 1000);
    return;
  }

  // Round succeeded
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

// --- 6. DATA PERSISTENCE (SAVE TO SUPABASE OR LOCAL STORAGE) ---
async function finishAndSaveGame(gameType) {
  const isMatch = gameType === 'match';
  const gameId = isMatch ? "memory-match" : "remember-order";
  const gameTitle = isMatch ? "Memory Match" : "Remember the Order";
  const timeSpent = isMatch ? matchSeconds : seqSeconds;
  const moves = isMatch ? matchMoves : sequencePattern.length * 2;
  const points = 100;

  // Update current player points locally
  currentPlayer.points = (currentPlayer.points || 0) + points;
  updateProfileUI();

  // Save session record
  const sessionData = {
    player_name: currentPlayer.name,
    game_id: gameId,
    game_title: gameTitle,
    points_earned: points,
    time_spent_seconds: timeSpent,
    total_moves: moves,
    accuracy_percentage: 100.0,
    status: "completed",
    created_at: new Date().toISOString()
  };

  // 1. Save to Supabase (if configured)
  if (supabaseClient) {
    try {
      const { error } = await supabaseClient
        .from('game_sessions')
        .insert([sessionData]);
      if (error) console.error("Supabase insert error:", error);
    } catch (err) {
      console.warn("Could not save to Supabase, falling back locally:", err);
    }
  }

  // 2. Always maintain in local history array
  saveSessionLocally(sessionData);

  // Close modals
  closeGameModal(isMatch ? 'modal-match-game' : 'modal-sequence-game');
  switchTab('tab-home');
  loadPlayerHistory();
}

function saveSessionLocally(session) {
  const localHistory = JSON.parse(localStorage.getItem("monerjui_history") || "[]");
  localHistory.unshift(session);
  localStorage.setItem("monerjui_history", JSON.stringify(localHistory));
}

// --- 7. HOST DASHBOARD LOGIC (AGGREGATE 4 FRIENDS) ---
async function refreshHostDashboard(isSilent = false) {
  const tbody = document.getElementById("host-sessions-tbody");
  if (!isSilent && tbody) {
    tbody.innerHTML = `<tr><td colspan="8" class="text-center">Syncing real-time updates...</td></tr>`;
  }

  let sessions = [];

  // Try fetching from Supabase first
  if (supabaseClient) {
    try {
      const { data, error } = await supabaseClient
        .from('game_sessions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(25);

      if (!error && data && data.length > 0) {
        sessions = data;
      }
    } catch (err) {
      console.warn("Supabase fetch failed, showing local records:", err);
    }
  }

  // Fallback to local storage if Supabase returned empty
  if (sessions.length === 0) {
    sessions = JSON.parse(localStorage.getItem("monerjui_history") || "[]");
  }

  // Seed sample demonstration sessions if totally empty
  if (sessions.length === 0) {
    sessions = [
      { player_name: "Lakshmi Devi", game_title: "Memory Match", points_earned: 100, time_spent_seconds: 94, total_moves: 14, accuracy_percentage: 95.0, status: "completed", created_at: new Date(Date.now() - 3600000).toISOString() },
      { player_name: "Bimal Ghosh", game_title: "Remember the Order", points_earned: 100, time_spent_seconds: 110, total_moves: 12, accuracy_percentage: 100.0, status: "completed", created_at: new Date(Date.now() - 7200000).toISOString() },
      { player_name: "Ananda Roy", game_title: "Memory Match", points_earned: 100, time_spent_seconds: 88, total_moves: 12, accuracy_percentage: 100.0, status: "completed", created_at: new Date(Date.now() - 14400000).toISOString() }
    ];
  }

  // Render Table
  if (tbody) {
    tbody.innerHTML = "";
    sessions.forEach(s => {
      const row = document.createElement("tr");
      const dateStr = new Date(s.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const sec = s.time_spent_seconds || 0;
      const timeFormatted = `${Math.floor(sec/60)}m ${sec%60}s`;
      
      row.innerHTML = `
        <td>${dateStr}</td>
        <td><strong>${escapeHtml(s.player_name)}</strong></td>
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

  // Update Summary Metrics
  const totalGames = sessions.length;
  const combinedPoints = sessions.reduce((acc, curr) => acc + (curr.points_earned || 0), 0);
  const metricGames = document.getElementById("metric-total-games");
  const metricPoints = document.getElementById("metric-combined-points");
  if (metricGames) metricGames.innerText = totalGames;
  if (metricPoints) metricPoints.innerText = combinedPoints;

  // Render 4 Friends Cards
  renderHostPlayerCards(sessions);
}

function renderHostPlayerCards(recentSessions) {
  const container = document.getElementById("host-players-grid");
  if (!container) return;
  container.innerHTML = "";

  INITIAL_FRIENDS.forEach(friend => {
    // Find player's sessions
    const friendSessions = recentSessions.filter(s => s.player_name === friend.name);
    const sessionCount = friendSessions.length;
    const completedToday = sessionCount > 0 || friend.completedToday;
    const pts = friend.points + (friendSessions.length * 100);

    const card = document.createElement("div");
    card.className = "friend-status-card";
    card.innerHTML = `
      <div class="friend-card-top">
        <div class="friend-avatar">${friend.initial}</div>
        <div class="friend-name-col">
          <strong>${friend.name}</strong>
          <span>${friend.notes}</span>
        </div>
      </div>
      <div class="friend-card-stats">
        <span>Score: <strong>${pts} pts</strong></span>
        <span>Sessions: <strong>${sessionCount}</strong></span>
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
  if (!container) return;

  const localHistory = JSON.parse(localStorage.getItem("monerjui_history") || "[]");
  const playerHistory = localHistory.filter(s => s.player_name === currentPlayer.name);

  if (playerHistory.length === 0) {
    container.innerHTML = `<div class="empty-state" style="padding:16px; color:#5E7A6B; font-size:14px;">No activities completed yet today. Play a memory game to light up this garden!</div>`;
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
}

function loadLocalOrCloudStats() {
  // Pre-load default state
  refreshHostDashboard(true);
}

// --- 8. SOUND & SPEECH HELPERS ---
function toggleAudioFx() {
  audioEnabled = !audioEnabled;
  const btn = document.getElementById("toggle-sound-btn");
  if (btn) {
    btn.innerHTML = `<span id="sound-icon">${audioEnabled ? '🔊' : '🔇'}</span> Calming sound: ${audioEnabled ? 'On' : 'Muted'}`;
  }
}

function speakMessage(text) {
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.85; // Calming, gentle pace for elders
    utterance.pitch = 1.0;
    window.speechSynthesis.speak(utterance);
  } else {
    alert(text);
  }
}

// --- 9. CONFIG MODAL (SUPABASE KEYS) ---
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

// Security sanitization helper
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
