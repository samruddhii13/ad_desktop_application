# 🔍 IP Detectives — Intellectual Property Awareness Game

An interactive, offline desktop application developed for the **Cell for IPR Promotion and Management (CIPAM)**, Department for Promotion of Industry and Internal Trade (DPIIT), Ministry of Commerce & Industry, Government of India.

Designed to educate school students (ages 10–16) on the fundamentals of **Intellectual Property Rights (IPR)** under Indian law through engaging detective cases, interactive challenges, and gamified mastery.

---

## 🌟 Key Features

### 1. 🗺️ IP City Exploration (4 Core Domains)
Explore four distinct interactive districts representing India's primary IP pillars:
- **🔬 Patent Lab** *(Patents Act, 1970)*: Discover what makes an invention patentable (novelty, inventive step, industrial application), the 20-year term, and non-patentable subject matter under Section 3.
- **™️ Trademark Tower** *(Trade Marks Act, 1999)*: Understand brand identity, the difference between ™ and ®, prevention of counterfeiting and confusion, and 10-year renewable terms.
- **©️ Copyright Cinema** *(Copyright Act, 1957)*: Learn about automatic protection for creative works, lifetime + 60 years term, moral rights, fair dealing, and software copyright.
- **🎨 Design Studio** *(Designs Act, 2000)*: Master the visual appearance of industrial products, 10+5 year registration, and distinguishing designs from patents/trademarks.

### 2. 🎮 Varied Interactive Question Formats
- **Standard MCQs**: Instant visual and audio feedback with clear explanations.
- **True / False Clues**: Rapid-fire conceptual checks.
- **Story Cases**: Real-world scenarios (e.g., student inventors, young artists, startup founders).
- **Detective Clues**: Progressive clue-by-clue investigations where students uncover hints sequentially before making their deduction.
- **Category Sorting (Drag/Assign)**: Interactive matching of real-world items to their correct IP protection categories.

### 3. 👩‍🏫 Teacher Dashboard & Analytics
- Multi-student profile support allowing multiple students to use the same computer inside or outside the classroom.
- Aggregated classroom analytics showing class average, highest score, and common misconceptions.
- Domain breakdown highlighting which topics (Patents, Trademarks, Copyrights, Designs) students struggle with most.
- **One-click CSV Export**: Teachers can export student progress, scores, ranks, and error breakdowns for offline assessment.

### 4. 📜 CIPAM Certificate of Achievement
- Students who complete all four districts unlock the **Final Master Challenge**.
- Upon completion, students earn an official, print-ready **Certificate of Achievement** with their name, rank, total score, and completion date.

### 5. 🔊 Pure Web Audio Synthesis
- Dynamic, retro-modern sound effects (correct tones, buzzer, star chimes, level-complete arpeggios, transitions) generated purely via the browser's Web Audio API with zero external audio assets.
- Fully togglable sound control in the Settings screen.

### 6. 🔒 Robust Offline & Secure Architecture
- 100% offline capability — no internet connection or external servers required.
- Electron security best practices: `contextIsolation: true`, `nodeIntegration: false`, and sandboxed preload IPC.
- Safe persistent storage saved to the system's `userData` directory with automated corrupt-file recovery.

---

## 🚀 Quick Start Guide

### Prerequisites
- [Node.js](https://nodejs.org/) (v18 or higher recommended)
- `npm`

### Installation
Clone or navigate to the project directory and install dependencies:
```bash
npm install
```

### Running the Game Locally
```bash
npm start
```

### Packaging / Building Desktop Installers
Build cross-platform standalone packages:
```bash
# Package for your current operating system:
npm run build

# Or package for a specific platform:
npm run build:win      # Windows installer (.exe via NSIS)
npm run build:mac      # macOS DMG
npm run build:linux    # Linux AppImage
```

---

## 📁 Project Structure

```
├── assets/
│   └── icon.png            # Application high-resolution icon
├── data/
│   ├── questions.json      # Comprehensive question bank (MCQ, T/F, cases, sort)
│   ├── ranks.json          # Detective rank progression tiers
│   ├── recaps.json         # District debrief takeaways based on Indian Acts
│   └── tidbits.json        # Curated "Did You Know?" historical & legal facts
├── renderer/
│   ├── css/
│   │   └── styles.css      # Custom design system with animations & dark theme
│   ├── js/
│   │   ├── app.js          # Main application orchestrator & screen routing
│   │   ├── certificate.js  # Printable certificate generator
│   │   ├── gameEngine.js   # Scoring, progression, ranks, and state engine
│   │   ├── levelView.js    # Level play session manager
│   │   ├── mapView.js      # IP City district cards and level progression map
│   │   ├── quizTypes.js    # Interactive renderers for all 5 question types
│   │   ├── sound.js        # Web Audio API procedural sound engine
│   │   └── storage.js      # Preload API abstraction layer & error recovery
│   └── index.html          # Semantic HTML5 single-page application structure
├── main.js                 # Electron main process (IPC handlers, safe file I/O)
├── preload.js              # Safe contextBridge IPC layer
└── package.json            # Project manifest and build scripts
```

---

## ⚖️ Legal & Curriculum Reference

All legal content, durations, and statutory provisions in this game are verified against the prevailing intellectual property statutes in India:
- **The Patents Act, 1970** (as amended)
- **The Trade Marks Act, 1999**
- **The Copyright Act, 1957** (as amended 2012)
- **The Designs Act, 2000**
- Official guidelines and publications from **CIPAM** and the **Controller General of Patents, Designs and Trade Marks (CGPDTM)**.
