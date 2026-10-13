# Moner-Jui (মনের জুঁই) 🌸
> **A Gentle, Dementia-Friendly Memory Care & Cognitive Wellbeing Web Application**

Designed for elders living with memory loss and dementia. Includes a soothing user experience, 2 therapeutic cognitive mini-games, and a **Host Live Monitoring Dashboard** connected to **Supabase Cloud Database** for tracking stats, completion, and progress from your friends across devices.

---

## ✨ Features

1. **Gentle Elder-First UI (Matches exact design specification):**
   - Soft pale-green, peach, and mint calming color palette.
   - Large legible typography, no stressful timers, countdown buzzers, or penalties.
   - Built-in Web Audio chime synthesizer playing soothing solfeggio frequencies (528Hz, 440Hz).
   - "Read Aloud" voice assistant for care plans.

2. **2 Therapeutic Cognitive Mini-Games:**
   - **Game 1: Memory Match (ফুলের সন্ধান):** Finding pairs of calming flower & nature icons (visual pattern recall).
   - **Game 2: Remember the Order (স্মৃতি ধারা):** Sequential blossom recall (Rose, Marigold, Jasmine, Lotus) stimulating short-term memory.

3. **Multi-Player Profiles (Your 4 Friends):**
   - Pre-configured profiles:
     1. Lakshmi Devi (नमस्ते, लक्ष्मीदेवी)
     2. Bimal Ghosh
     3. Suniti Sen
     4. Ananda Roy
   - Plus the option to add any friend's name in 1 click.

4. **Host / Caregiver Live Dashboard (👑):**
   - Individual progress cards for all 4 friends.
   - "Completed Today" daily status indicators.
   - Live session feed displaying game title, score, time spent, moves count, accuracy percentage, and timestamps.
   - Works in real-time via Supabase WebSocket publications.

---

## 🚀 How to Set Up with Supabase (Free Database)

### Step 1: Create a Supabase Project
1. Go to [https://supabase.com](https://supabase.com) and create a free account.
2. Click **"New Project"**, name it `moner-jui`, and set a password.

### Step 2: Run the Database Schema
1. In your Supabase dashboard, click **"SQL Editor"** on the left menu.
2. Open the file `supabase_schema.sql` from this project.
3. Paste the entire SQL script into the query editor and click **Run (▶)**.
   *(This creates the `game_sessions` and `player_profiles` tables with public read/write policies and real-time syncing enabled).*

### Step 3: Connect to Your App
1. In your Supabase project, go to **Project Settings** (gear icon) -> **API**.
2. Copy your **Project URL** and **Anon Public Key**.
3. You can either:
   - Paste them in `app.js` at `DEFAULT_SUPABASE_URL` and `DEFAULT_SUPABASE_ANON_KEY`.
   - OR click the **"Settings"** button directly on the website UI and paste them in the pop-up modal.

---

## 🌐 How to Deploy to Vercel via GitHub

1. Initialize a git repository in this folder:
   ```bash
   git init
   git add .
   git commit -m "feat: initial Moner-Jui memory care application"
   ```
2. Create a new repository on GitHub (e.g., `moner-jui`) and push:
   ```bash
   git remote add origin https://github.com/<your-username>/moner-jui.git
   git branch -M main
   git push -u origin main
   ```
3. Go to [https://vercel.com](https://vercel.com) -> Click **"Add New..."** -> **"Project"**.
4. Import your `moner-jui` GitHub repository.
5. Click **"Deploy"**.

Your website will be live at `https://moner-jui.vercel.app`! You can send that URL to your 4 friends immediately.

---

## 📱 How Your Friends and You Use It

- **For your 4 friends:** They open the Vercel link on their phone, tablet, or laptop, tap their name, and play their gentle daily games.
- **For you (Host):** Open the same link (or click **"Host Dashboard 👑"** in the sidebar) to see all scores, game history, and completion badges streaming in live!
