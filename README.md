# TerraWhatIf: Earth System Trend Detective

> **Interactive 3D Coastal Climate Observatory & Planetary Habitability Simulator**  
> Built for **NASA Space Apps Challenge 2026** (*"Be An Earth System Trend Detective!"*)

**TerraWhatIf** is an interactive 3D web science experience that combines **third-person 3D observatory exploration**, **calibrated first-order radiative-balance physics**, and **real NASA Giovanni satellite trend analysis (2003–2025)**.

Instead of reading static charts, players step onto a coastal climate observatory deck as an Earth System Trend Detective alongside planetary navigator **TERRA**, scan scientific instruments with a holographic wrist-scanner, test hypotheses through chapter prediction quizzes, and watch Earth's atmosphere, oceans, polar ice, sky optics, and orbital globe respond live in 3D.

---

## Key Features

### 1. Immediate 3D Observatory & Third-Person Exploration (`Walking 3P`)
- **Cinematic Opening Sweep**: Launches directly into the 3D WebGL scene with a 2-second orbital-horizon camera sweep, retracting cinema letterbox bars, and an incoming typewriter mission transmission from **TERRA**.
- **3D Astronaut & Holographic Wrist-Scanner**: Walk across the observatory deck using `W A S D` / Arrow keys (or the touch D-Pad on mobile). Press `[E]` or tap any nearby instrument to aim the astronaut's holographic cyan/amber scan beam and target ring.
- **3D Floor Waypoint Path & Celebrations**: A glowing animated floor beacon and chevron trail guide the player from the astronaut's feet to the active mission instrument, and the astronaut celebrates with a hop and wave whenever a chapter mission is completed.
- **Real-Time Dynamic 3D Environment**:
  - Physically computed **Rayleigh sky colors** shifting from Earth's *Azure Blue* to **TRAPPIST-1**'s *Sunset Amber*.
  - Dynamic **3D weather particles**: falling snow flurries below freezing (`< 275 K`) and rising thermal embers during extreme heat (`> 315 K`).
  - Live **3D Spherical Earth** in the upper sky reflecting ice cover and cloud haze, plus a floating **3D Mini Habitable Zone Hologram** above the Star Telescope.

### 2. Story-Driven 3-Chapter Mission Progression
Each chapter opens with a **Chapter Story Briefing** featuring animated typewriter text, custom SVG science visualizations, gentle thematic Web Audio music, and optional read-aloud narration:

| Chapter | Title | Core Science Concept | Mission Goal |
| :--- | :--- | :--- | :--- |
| **Chapter 1** | **The Heat Blanket** | Natural greenhouse warming (`+33°C`) & Ice-Albedo feedback | Inspect Earth's thermometer, Polar Ice, and Gas Valve, then raise `CO₂` past `560 ppm`. |
| **Chapter 2** | **Too Close to the Sun** | Inverse-square stellar flux ($1/d^2$) & water-vapor feedback | Answer TERRA's prediction quiz, pull Earth inward to `0.85 AU` (`+38%` sunlight), and rebalance temperature below `47°C`. |
| **Chapter 3** | **Red Sun TRAPPIST-1** | M-dwarf luminosity, Kopparapu Habitable Zone & tidal locking | Switch host star to **TRAPPIST-1**, find the green Habitable Zone (`~0.029 AU`), and inspect the amber sky and eternal Day-Night terminator. |

### 3. Intuitive Learning, Quizzes & Instant What-If Testing
- **3-Tab *Touch to Understand* Cards**: Every landmark (`Thermometer`, `Polar Ice`, `Gas Valve`, `Orbit Lever`, `Ocean Mist`, `Star Telescope`, `Sky Dome`, `Day-Night Line`) opens a 3-layer explanation:
  1. **Look!** — Direct visual observations in the 3D scene.
  2. **Why?** — Everyday analogies explaining the underlying mechanism.
  3. **Math & NASA Data** — Structured physics formula, live simulation telemetry, and matching NASA observations.
- **Prediction Quizzes in Every Chapter (`CH1`–`CH3`)**: Encourages scientific prediction before experimenting, with immediate right/wrong intuitive explanations.
- **1-Click *What-If Presets* & Live `vs. Earth` Delta Strip**: Jump straight into *Earth Today*, *Snowball Earth*, *2× CO₂ Future*, *Runaway Heat*, or *TRAPPIST-1 e*, compare live temperature and ice deltas against Earth baseline, or click **Reset** in one tap.
- **Intuitive Off-Track Guidance**: Moving controls counter to the active experiment (such as stripping Earth's atmosphere when testing warming) triggers helpful non-punitive feedback explaining *why* that physical change happens.

### 4. NASA Giovanni Data Explorer & Live 3D Replay (2003–2025)
- **OLS Regression & Student's t-Test Engine (`trends.js`)**: Computes decadal slope, $R^2$, *t*-statistic, *p*-value, and 95% confidence intervals across four **NASA Giovanni (MERRA-2 & AIRS)** regional time series:
  - *Arctic Surface Temperature* (66–90°N)
  - *Tropical Surface Temperature* (23°S–23°N)
  - *Arctic Sea-Ice Albedo*
  - *Tropical Water Vapor*
- **Animated Sparklines & Live 3D Replay**: Hovering the *Regional Trends* card animates the 2003–2025 regression sweep, and **`Play 2003→2025 in 3D`** replays 22 years of observed NASA satellite progression directly inside the 3D observatory with a live telemetry HUD.

### 5. Gamification, Science Lab & Procedural Web Audio
- **Detective Ranks & 5 Unlockable Badges**: Progress from *Rookie Observer* to *Master Trend Detective* (*Blanket Decoder*, *Flashlight Physicist*, *Exoplanet Scout*, *Prediction Ace*, *Master Trend Detective*), culminating in a **Mission Debrief** summary after Chapter 3.
- **Science Lab Sandbox**: Full open-ended parameter controls (host star, orbital distance, `CO₂`, `CH₄`, airless toggle), optical depth breakdown ($\tau_{\text{base}}, \tau_{\text{CO}_2}, \tau_{\text{CH}_4}, \tau_{\text{H}_2\text{O}}$), and model limitations documentation.
- **Zero-Asset Procedural Audio (`AudioManager`)**: Synthesizes calm orbital opening music, per-chapter story themes, subtle comms typewriter ticks, footsteps, success/wrong cues, and mood-driven climate soundscapes (low Arctic wind hum, soft coastal surf, and thermal crackles).

---

## Physics Engine & Scientific Calibration

All climate physics run deterministically in SI units and are verified against NASA reference values:

1. **Stellar Flux & Equilibrium Temperature**:
   $$F = \sigma T_{\star}^4 \left(\frac{R_{\star}}{a}\right)^2, \qquad T_{\text{eq}} = T_{\star}\sqrt{\frac{R_{\star}}{2a}}(1 - A)^{1/4}$$
   Calibrated to **NASA CERES EBAF**: $S_0 = 1361\text{ W/m}^2$, Bond albedo $A(288\text{ K}) = 0.30$, and airless equilibrium temperature $T_{\text{eq}} \approx 254.6\text{ K}$ (`-18.5°C`).
2. **Coupled Ice-Albedo Feedback**:
   $$A(T_s) = A_{\text{warm}} + (A_{\text{ice}} - A_{\text{warm}}) \cdot \frac{1}{2}\left[1 - \tanh\left(\frac{T_s - 273}{10}\right)\right]$$
   with $A_{\text{ice}} = 0.62$.
3. **Infrared Optical Depth ($\tau$) & Coupled Radiative Solver**:
   $$\tau_{\text{total}} = \tau_{\text{base}} + 0.13\ln\left(\frac{\text{CO}_2}{280}\right) + 0.015\left(\sqrt{\text{CH}_4} - \sqrt{700}\right) + \tau_{\text{H}_2\text{O},0}\,e^{0.07\,\Delta T}$$
   $$T_s = T_{\text{eq}}(A(T_s)) \cdot \left(1 + 0.75\,\tau_{\text{total}}\right)^{1/4}$$
   Solved via damped fixed-point iteration (50 steps, damping `0.5`), yielding a `+2–4 K` response for doubled $\text{CO}_2$ (`560 ppm`) and flagging the **Simpson–Nakajima runaway threshold** (`> 280 W/m²` absorbed flux).
4. **Habitable Zone Boundaries (*Kopparapu et al., 2013*)**: Computes conservative inner (*Runaway Greenhouse*) and outer (*Maximum Greenhouse*) orbital limits for both the Sun (`5772 K`) and **TRAPPIST-1** (`2566 K` from the **NASA Exoplanet Archive**).

---

## Tech Stack

| Layer | Technology |
| :--- | :--- |
| **UI Framework** | React 19 + TypeScript + Vite |
| **Styling** | Tailwind CSS v4 + Obsidian HUD Styling |
| **3D Graphics** | Three.js (`WebGLRenderer`, `ACESFilmicToneMapping`, `OrbitControls`, `RoomEnvironment`) |
| **Physics & Statistics** | Zero-dependency pure ES modules (`physics.js`, `sky.js`, `trends.js`) |
| **Audio** | Procedural Web Audio API Synthesizer (`AudioManager.ts`) |
| **Icons & Diagrams** | Lucide React + Custom SVG Data Visualizations |

---

## Project Structure

```text
src/
├── App.tsx                       # Mission state orchestration, 3D NASA replay, HUD & modals
├── audio/
│   └── AudioManager.ts           # Web Audio procedural soundscapes, opening/chapter themes & SFX
├── engine/                       # Verified pure scientific & statistical modules
│   ├── physics.js                # Radiative balance, ice-albedo feedback & Kopparapu HZ solver
│   ├── physics.test.js           # Physics calibration test suite (10/10 assertions)
│   ├── sky.js                    # 15-wavelength Rayleigh spectral sky color engine
│   ├── trends.js                 # OLS linear regression, R², t-stat, p-value & 95% CI
│   ├── trends.json               # NASA Giovanni 2003–2025 regional series (MERRA-2 & AIRS)
│   ├── stars.json                # Stellar & exoplanet parameters (NASA Exoplanet Archive)
│   └── chapters.js & concepts.js # Chapter curriculum & concept definitions
├── scene3d/                      # Modular Three.js systems
│   ├── environment.ts            # Sky dome, star, ocean, ice, mist, snow/embers & 3D Earth globe
│   ├── explorer.ts               # 3P astronaut rig, walk cycle, wrist scan beam & celebration
│   ├── landmarks.ts              # 8 interactive deck instruments + mini 3D HZ orbit hologram
│   └── materials.ts              # Procedural canvas textures & PBR observatory materials
├── data/                         # Narrative copy, gamification & math breakdowns
│   ├── badges.ts                 # Detective rank & 5-badge progression evaluator
│   ├── chapterStories.ts         # Multi-beat narrative intros per chapter
│   ├── kidCopy.ts                # Accessible Look! / Why? explanations
│   ├── mathBreakdown.ts          # Structured equations & live telemetry cards
│   ├── presets.ts                # 1-click What-If scenario presets
│   └── quests.ts                 # 3-step mission evaluator & intuitive step insights
└── components/                   # Modular React UI components
    ├── Observatory3D.tsx         # WebGL canvas, HUD-safe floating badges, floor waypoint & 3P controls
    ├── IntroBriefingCard.tsx     # Cinematic typewriter opening mission briefing
    ├── ChapterStoryModal.tsx     # Interactive chapter story viewer with typing & audio
    ├── NavigatorMissionCard.tsx  # Collapsible 3-step mission checklist with clickable target focus
    ├── ControlDeck.tsx           # Target-marked sliders, vs. Earth delta strip, Reset & presets
    ├── ConceptCard.tsx           # 3-tab "Touch to Understand" card (Look! / Why? / Math & NASA)
    ├── GiovanniTrendsCard.tsx    # Animated NASA Giovanni sparklines, OLS t-test & 3D replay trigger
    ├── MiniPredictionModal.tsx   # Chapter 1–3 interactive prediction quizzes
    ├── DetectiveBadgesModal.tsx  # Detective rank & badge collection modal
    ├── MissionDebriefModal.tsx   # End-of-mission summary after Chapter 3 completion
    ├── ScienceLabView.tsx        # Open sandbox, full telemetry & model limitations
    ├── ControlsHelpModal.tsx     # Keyboard shortcuts & navigation guide
    ├── NotebookDrawer.tsx        # Discovery notebook (0/8 instruments)
    ├── StarSwitcherCard.tsx      # Host star switcher (Sun ↔ TRAPPIST-1)
    ├── RewardBanner.tsx          # Success/off-track explanation banner with quick Next CTA
    └── TerraAvatar.tsx           # Dynamic TERRA avatar responding to climate mood
```

---

## Getting Started & Controls

### Local Development
```bash
npm install
npm run dev                        # Start Vite dev server on port 3000
npm run lint                       # Run TypeScript check (tsc --noEmit)
npm run build                      # Build production bundle
node src/engine/physics.test.js    # Run calibrated physics test suite (10/10)
```

### Observatory Controls
| Input | Action |
| :--- | :--- |
| `W` `A` `S` `D` / Arrow Keys | Walk around the 3D observatory deck (or use the touch D-Pad on mobile) |
| `E` | Scan and inspect the nearest glowing instrument |
| `V` | Toggle between **Walking (3P)** astronaut mode and **Overview** camera |
| `H` | Hide or show all HUD panels for an unobstructed 3D view |
| `?` | Open the Controls & Shortcuts guide |
| **Drag / Scroll** | Orbit the camera angle and zoom in/out |

---

## Scientific Data Credits
- **NASA CERES EBAF**: Top-of-atmosphere solar flux (`340 W/m²`), global Bond albedo (`0.30`), and `288 K` baseline surface temperature calibration.
- **NASA Giovanni (GES DISC — MERRA-2 & AIRS)**: Regional 2003–2025 observational time series for Arctic & Tropical temperatures, Arctic sea-ice albedo, and tropical water vapor.
- **NASA Exoplanet Archive**: Stellar and orbital parameters for **TRAPPIST-1** and **TRAPPIST-1 e**.
