/**
 * app.js — Main application controller for IP Detectives.
 * Orchestrates screen transitions, user flows, event listeners,
 * sound effects, and connects the engine to the DOM views.
 */

import {
  init as initEngine,
  getProfiles,
  hasProfiles,
  createProfile,
  deleteProfile,
  setActiveProfile,
  getProfile,
  getProfileRank,
  getRank,
  isZoneCompleted,
  allZonesCompleted,
  recordLevelResult,
  recordFinalQuiz,
  getRandomTidbit,
  getRecap,
  resetAll,
  ZONES,
  LEVELS,
  ZONE_META,
  LEVEL_NAMES
} from './gameEngine.js';

import {
  playClick,
  playTransition,
  playCorrect,
  playWrong,
  playLevelComplete,
  playStar,
  setMuted,
  isMuted
} from './sound.js';

import { exportCSV, quitApp } from './storage.js';
import { renderMap } from './mapView.js';
import { startLevel, startFinalQuiz } from './levelView.js';
import { renderCertificate, printCertificate } from './certificate.js';

/* ══════════════════════════════════════════════════════════════ */
/*  State                                                        */
/* ══════════════════════════════════════════════════════════════ */

let _currentScreen = 'screen-home';
let _currentZone = null;
let _currentLevel = null;
let _isFinalQuiz = false;
let _lastLevelAnswers = [];
let _lastResult = null;
let _zoneJustCompleted = false;

/* ══════════════════════════════════════════════════════════════ */
/*  DOM Elements Cache                                           */
/* ══════════════════════════════════════════════════════════════ */

const els = {
  // Screens
  screenHome:         document.getElementById('screen-home'),
  screenPlayerSetup:  document.getElementById('screen-player-setup'),
  screenMap:          document.getElementById('screen-map'),
  screenLevel:        document.getElementById('screen-level'),
  screenTidbit:       document.getElementById('screen-tidbit'),
  screenResults:      document.getElementById('screen-results'),
  screenReview:       document.getElementById('screen-review'),
  screenZoneRecap:    document.getElementById('screen-zone-recap'),
  screenFinalResults: document.getElementById('screen-final-results'),
  screenCertificate:  document.getElementById('screen-certificate'),
  screenLeaderboard:  document.getElementById('screen-leaderboard'),
  screenTeacher:      document.getElementById('screen-teacher'),
  screenSettings:     document.getElementById('screen-settings'),

  // Home
  starsHome:          document.getElementById('stars-home'),
  btnStart:           document.getElementById('btn-start'),
  btnContinue:        document.getElementById('btn-continue'),
  btnLeaderboard:     document.getElementById('btn-leaderboard'),
  btnTeacher:         document.getElementById('btn-teacher'),
  btnSettings:        document.getElementById('btn-settings'),
  btnQuit:            document.getElementById('btn-quit'),

  // Player Setup
  btnBackSetup:       document.getElementById('btn-back-setup'),
  existingProfiles:   document.getElementById('existing-profiles'),
  inputName:          document.getElementById('input-name'),
  btnCreateProfile:   document.getElementById('btn-create-profile'),

  // Map
  btnBackMap:         document.getElementById('btn-back-map'),
  playerInfo:         document.getElementById('player-info'),
  mapContainer:       document.getElementById('map-container'),
  btnFinalQuiz:       document.getElementById('btn-final-quiz'),

  // Level
  btnBackLevel:       document.getElementById('btn-back-level'),
  levelProgress:      document.getElementById('level-progress'),
  levelScore:         document.getElementById('level-score'),
  levelContent:       document.getElementById('level-content'),

  // Tidbit
  tidbitText:         document.getElementById('tidbit-text'),
  btnTidbitContinue:  document.getElementById('btn-tidbit-continue'),

  // Results
  resultsTitle:       document.getElementById('results-title'),
  resultsStars:       document.getElementById('results-stars'),
  resultsScoreDisplay:document.getElementById('results-score-display'),
  resultsDetails:     document.getElementById('results-details'),
  btnResultsContinue: document.getElementById('btn-results-continue'),
  btnResultsReview:   document.getElementById('btn-results-review'),

  // Review
  btnBackReview:      document.getElementById('btn-back-review'),
  reviewList:         document.getElementById('review-list'),
  btnReviewDone:      document.getElementById('btn-review-done'),

  // Recap
  recapIcon:          document.getElementById('recap-icon'),
  recapTitle:         document.getElementById('recap-title'),
  recapPoints:        document.getElementById('recap-points'),
  btnRecapContinue:   document.getElementById('btn-recap-continue'),

  // Final Results
  finalResultsContent:document.getElementById('final-results-content'),
  btnViewCertificate: document.getElementById('btn-view-certificate'),
  btnFinalHome:       document.getElementById('btn-final-home'),

  // Certificate
  certificate:        document.getElementById('certificate'),
  btnPrintCert:       document.getElementById('btn-print-cert'),
  btnCertBack:        document.getElementById('btn-cert-back'),

  // Leaderboard
  btnBackLeaderboard: document.getElementById('btn-back-leaderboard'),
  leaderboardTable:   document.getElementById('leaderboard-table'),

  // Teacher
  btnBackTeacher:     document.getElementById('btn-back-teacher'),
  teacherContent:     document.getElementById('teacher-content'),

  // Settings
  btnBackSettings:    document.getElementById('btn-back-settings'),
  toggleSound:        document.getElementById('toggle-sound'),
  btnResetData:       document.getElementById('btn-reset-data')
};

/* ══════════════════════════════════════════════════════════════ */
/*  Screen Transitions                                           */
/* ══════════════════════════════════════════════════════════════ */

/**
 * Switch from the current screen to a new screen.
 * @param {string} targetScreenId — the id of the target screen div
 * @param {boolean} [silent=false] — suppress transition sound
 */
export function switchScreen(targetScreenId, silent = false) {
  if (_currentScreen === targetScreenId) return;

  const currentEl = document.getElementById(_currentScreen);
  const targetEl = document.getElementById(targetScreenId);

  if (!targetEl) {
    console.error(`Screen not found: ${targetScreenId}`);
    return;
  }

  if (currentEl) {
    currentEl.classList.remove('active');
  }

  targetEl.classList.add('active');
  _currentScreen = targetScreenId;

  if (!silent) {
    playTransition();
  }

  // Lifecycle hooks for specific screens
  onScreenEnter(targetScreenId);
}

/**
 * Executes per-screen logic when entering a screen.
 */
function onScreenEnter(screenId) {
  switch (screenId) {
    case 'screen-home':
      updateHomeButtons();
      break;
    case 'screen-player-setup':
      renderProfilesList();
      els.inputName.value = '';
      setTimeout(() => els.inputName.focus(), 150);
      break;
    case 'screen-map':
      refreshMapView();
      break;
    case 'screen-leaderboard':
      renderLeaderboardView();
      break;
    case 'screen-teacher':
      renderTeacherDashboard();
      break;
  }
}

/* ══════════════════════════════════════════════════════════════ */
/*  Home Screen Logic                                            */
/* ══════════════════════════════════════════════════════════════ */

function initHomeStars() {
  if (!els.starsHome) return;
  els.starsHome.innerHTML = '';
  const starCount = 45;
  for (let i = 0; i < starCount; i++) {
    const star = document.createElement('div');
    star.className = 'star-particle';
    const top = Math.random() * 85;
    const left = Math.random() * 98;
    const delay = (Math.random() * 4).toFixed(2);
    const duration = (2 + Math.random() * 3).toFixed(2);
    const size = (1.5 + Math.random() * 2).toFixed(1);

    star.style.top = `${top}%`;
    star.style.left = `${left}%`;
    star.style.width = `${size}px`;
    star.style.height = `${size}px`;
    star.style.animationDelay = `${delay}s`;
    star.style.animationDuration = `${duration}s`;

    els.starsHome.appendChild(star);
  }
}

function updateHomeButtons() {
  const profile = getProfile();
  if (profile) {
    els.btnContinue.style.display = 'inline-flex';
    els.btnContinue.innerHTML = `<span class="btn-icon">▶️</span> Continue as <strong>${escapeHTML(profile.name)}</strong>`;
  } else if (hasProfiles()) {
    const list = getProfiles();
    const last = list[list.length - 1];
    setActiveProfile(last.id);
    els.btnContinue.style.display = 'inline-flex';
    els.btnContinue.innerHTML = `<span class="btn-icon">▶️</span> Continue as <strong>${escapeHTML(last.name)}</strong>`;
  } else {
    els.btnContinue.style.display = 'none';
  }
}

/* ══════════════════════════════════════════════════════════════ */
/*  Player Setup Logic                                           */
/* ══════════════════════════════════════════════════════════════ */

const AVATARS = ['🕵️', '🕵️‍♀️', '🧐', '🔍', '🎩', '💼', '🚀'];

function getAvatarForName(name) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash << 5) - hash + name.charCodeAt(i);
  }
  return AVATARS[Math.abs(hash) % AVATARS.length];
}

function renderProfilesList() {
  const profiles = getProfiles();
  els.existingProfiles.innerHTML = '';

  if (profiles.length === 0) {
    els.existingProfiles.innerHTML = `
      <div style="grid-column: 1 / -1; text-align: center; color: var(--text-muted); padding: 1.5rem;">
        No detectives enrolled yet. Create your profile below to begin!
      </div>
    `;
    return;
  }

  profiles.forEach(p => {
    const rank = getRank(p.totalPoints);
    const card = document.createElement('div');
    card.className = 'profile-card';

    card.innerHTML = `
      <button class="delete-profile" title="Delete Profile" aria-label="Delete Profile">✕</button>
      <div class="profile-avatar">${getAvatarForName(p.name)}</div>
      <div class="profile-name">${escapeHTML(p.name)}</div>
      <div class="profile-rank">${rank.emoji} ${rank.title}</div>
      <div class="profile-points">⭐ ${p.totalStars} stars · ${p.totalPoints} pts</div>
    `;

    // Click on profile card to select and proceed
    card.addEventListener('click', (e) => {
      if (e.target.closest('.delete-profile')) return;
      playClick();
      setActiveProfile(p.id);
      switchScreen('screen-map');
    });

    // Delete button
    const deleteBtn = card.querySelector('.delete-profile');
    deleteBtn.addEventListener('click', async (e) => {
      e.stopPropagation();
      playClick();
      const confirmDelete = window.confirm(`Are you sure you want to delete detective profile "${p.name}"?`);
      if (confirmDelete) {
        await deleteProfile(p.id);
        renderProfilesList();
        updateHomeButtons();
      }
    });

    els.existingProfiles.appendChild(card);
  });
}

async function handleCreateProfile() {
  const name = els.inputName.value.trim();
  if (!name) {
    alert('Please enter a detective name!');
    els.inputName.focus();
    return;
  }

  playClick();
  const id = await createProfile(name);
  setActiveProfile(id);
  switchScreen('screen-map');
}

/* ══════════════════════════════════════════════════════════════ */
/*  Map View Logic                                               */
/* ══════════════════════════════════════════════════════════════ */

function refreshMapView() {
  const profile = getProfile();
  if (!profile) {
    switchScreen('screen-player-setup');
    return;
  }

  renderMap(
    els.mapContainer,
    els.playerInfo,
    els.btnFinalQuiz,
    (zone, level) => onStartLevel(zone, level),
    () => onStartFinalQuiz()
  );
}

function onStartLevel(zone, level) {
  _currentZone = zone;
  _currentLevel = level;
  _isFinalQuiz = false;
  _zoneJustCompleted = false;

  switchScreen('screen-level');
  startLevel(
    zone,
    level,
    els.levelContent,
    els.levelProgress,
    els.levelScore,
    handleLevelCompleted
  );
}

function onStartFinalQuiz() {
  _currentZone = 'final';
  _currentLevel = 'final';
  _isFinalQuiz = true;
  _zoneJustCompleted = false;

  switchScreen('screen-level');
  startFinalQuiz(
    els.levelContent,
    els.levelProgress,
    els.levelScore,
    handleFinalQuizCompleted
  );
}

/* ══════════════════════════════════════════════════════════════ */
/*  Level Session Complete Handlers                              */
/* ══════════════════════════════════════════════════════════════ */

async function handleLevelCompleted({ correctCount, totalCount, wrongQuestions, allAnswers }) {
  _lastLevelAnswers = allAnswers;

  const wasZoneDoneBefore = isZoneCompleted(_currentZone);
  const result = await recordLevelResult(_currentZone, _currentLevel, correctCount, totalCount, wrongQuestions);
  _lastResult = result;

  const isZoneDoneNow = isZoneCompleted(_currentZone);
  _zoneJustCompleted = (!wasZoneDoneBefore && isZoneDoneNow);

  playLevelComplete();

  // Show "Did You Know?" tidbit if available, otherwise go directly to results
  const tidbit = getRandomTidbit(_currentZone);
  if (tidbit && tidbit.text) {
    els.tidbitText.textContent = tidbit.text;
    switchScreen('screen-tidbit');
  } else {
    showResultsScreen();
  }
}

async function handleFinalQuizCompleted({ correctCount, totalCount, wrongQuestions, allAnswers }) {
  _lastLevelAnswers = allAnswers;
  const finalResult = await recordFinalQuiz(correctCount, totalCount);

  playLevelComplete();
  showFinalResultsScreen(finalResult, correctCount, totalCount);
}

/* ══════════════════════════════════════════════════════════════ */
/*  Results Screen Logic                                         */
/* ══════════════════════════════════════════════════════════════ */

function showResultsScreen() {
  switchScreen('screen-results');

  const correct = _lastLevelAnswers.filter(a => a.isCorrect).length;
  const total = _lastLevelAnswers.length;
  const stars = _lastResult ? _lastResult.stars : 0;
  const score = _lastResult ? _lastResult.score : 0;

  // Title
  if (correct === total) {
    els.resultsTitle.textContent = '🌟 Perfect Investigation!';
  } else if (correct >= Math.ceil(total * 0.6)) {
    els.resultsTitle.textContent = '🎉 Case Solved!';
  } else {
    els.resultsTitle.textContent = 'Case Concluded';
  }

  // Render Stars
  let starsHtml = '';
  for (let i = 0; i < 3; i++) {
    starsHtml += i < stars
      ? '<span class="star-filled animate-pop">⭐</span>'
      : '<span class="star-empty">☆</span>';
  }
  els.resultsStars.innerHTML = starsHtml;
  if (stars > 0) {
    playStar();
  }

  // Score display
  let scoreText = `+${score} Points`;
  if (_lastResult?.isNewBest) {
    scoreText += ' <span style="font-size:0.85rem;color:var(--accent-gold);margin-left:0.5rem;">✨ New Best!</span>';
  }
  els.resultsScoreDisplay.innerHTML = scoreText;

  // Details
  els.resultsDetails.innerHTML = `
    <p>You answered <strong>${correct}</strong> out of <strong>${total}</strong> clues correctly.</p>
    ${_zoneJustCompleted ? '<p style="color:var(--accent-gold);font-weight:600;margin-top:0.5rem;">🏆 Zone Completed! Debrief ahead.</p>' : ''}
  `;
}

function handleResultsContinue() {
  playClick();
  if (_zoneJustCompleted) {
    showZoneRecap(_currentZone);
  } else {
    switchScreen('screen-map');
  }
}

/* ══════════════════════════════════════════════════════════════ */
/*  Zone Recap Logic                                             */
/* ══════════════════════════════════════════════════════════════ */

function showZoneRecap(zone) {
  const recap = getRecap(zone);
  const meta = ZONE_META[zone];

  els.recapIcon.textContent = recap?.emoji || meta.emoji;
  els.recapTitle.textContent = recap?.title || `${meta.name} Summary`;

  els.recapPoints.innerHTML = '';
  const points = recap?.points || [
    'You have mastered the foundational concepts of this IP domain!',
    'Always remember to verify whether an idea is protected before use.',
    'IP rights foster innovation and respect for creators.'
  ];

  points.forEach(pt => {
    const li = document.createElement('li');
    li.textContent = pt;
    els.recapPoints.appendChild(li);
  });

  switchScreen('screen-zone-recap');
}

function handleRecapContinue() {
  playClick();
  if (allZonesCompleted()) {
    alert('🎉 Congratulations! You have conquered all four IP City zones! The Master Challenge is now unlocked on your map!');
  }
  switchScreen('screen-map');
}

/* ══════════════════════════════════════════════════════════════ */
/*  Answer Review Screen                                         */
/* ══════════════════════════════════════════════════════════════ */

function renderReviewScreen() {
  els.reviewList.innerHTML = '';

  if (_lastLevelAnswers.length === 0) {
    els.reviewList.innerHTML = '<p style="text-align:center;color:var(--text-muted);">No answers to review.</p>';
    switchScreen('screen-review');
    return;
  }

  _lastLevelAnswers.forEach(({ question, isCorrect }, idx) => {
    const item = document.createElement('div');
    item.className = `review-item ${isCorrect ? 'review-correct' : 'review-wrong'}`;

    const promptText = question.prompt || (question.story ? `Story Case: ${question.story}` : `Question ${idx + 1}`);

    // Build correct answer explanation text
    let correctText = '';
    if (question.type === 'true_false') {
      correctText = question.correct ? 'True' : 'False';
    } else if (question.options && typeof question.correct === 'number') {
      correctText = question.options[question.correct] || '';
    } else if (question.type === 'drag_sort' && question.items) {
      correctText = question.items.map(it => `${it.label} → ${it.category.toUpperCase()}`).join('; ');
    }

    item.innerHTML = `
      <div class="review-question">Q${idx + 1}. ${escapeHTML(promptText)}</div>
      <div class="review-answer">
        <div>Result: ${isCorrect ? '<span class="correct-mark">✔ Correct</span>' : '<span class="wrong-mark">✘ Needs Review</span>'}</div>
        ${correctText ? `<div style="margin-top:0.35rem;"><strong>Correct Answer:</strong> ${escapeHTML(correctText)}</div>` : ''}
        ${question.explanation ? `<div style="margin-top:0.35rem; color:var(--text-secondary);">💡 <em>${escapeHTML(question.explanation)}</em></div>` : ''}
        ${question.verify ? `<div style="margin-top:0.35rem; font-size:0.75rem; color:var(--text-muted);">📜 Reference: ${escapeHTML(question.verify)}</div>` : ''}
      </div>
    `;

    els.reviewList.appendChild(item);
  });

  switchScreen('screen-review');
}

/* ══════════════════════════════════════════════════════════════ */
/*  Final Results & Certificate Logic                            */
/* ══════════════════════════════════════════════════════════════ */

function showFinalResultsScreen(finalResult, correctCount, totalCount) {
  const profile = getProfile();
  const rank = getProfileRank();

  els.finalResultsContent.innerHTML = `
    <div class="final-rank">${rank.emoji} ${rank.title}</div>
    <div class="final-total">Total Score: <strong>${profile.totalPoints}</strong> points · ⭐ <strong>${profile.totalStars}</strong> stars</div>
    <p style="color:var(--text-secondary);margin:0.75rem 0;">
      Final Challenge: Answered <strong>${correctCount}/${totalCount}</strong> questions accurately!
    </p>
    <div class="final-zone-scores">
      ${ZONES.map(z => {
        const meta = ZONE_META[z];
        const zp = profile.zones[z];
        const zStars = Object.values(zp).reduce((sum, lv) => sum + (lv.stars || 0), 0);
        return `
          <div class="final-zone-score" style="background:rgba(255,255,255,0.04);border-radius:var(--radius-sm);padding:0.75rem;">
            <div>${meta.emoji} ${meta.name}</div>
            <div style="color:var(--star-color);font-size:0.85rem;margin-top:0.25rem;">${zStars}/9 ⭐</div>
          </div>
        `;
      }).join('')}
    </div>
    <p style="font-size:0.9rem;color:var(--text-muted);margin-top:1rem;">
      You have demonstrated comprehensive mastery over Patents, Trademarks, Copyrights, and Industrial Designs under Indian law.
    </p>
  `;

  switchScreen('screen-final-results');
}

/* ══════════════════════════════════════════════════════════════ */
/*  Leaderboard View                                             */
/* ══════════════════════════════════════════════════════════════ */

function renderLeaderboardView() {
  const profiles = getProfiles();
  els.leaderboardTable.innerHTML = '';

  if (profiles.length === 0) {
    els.leaderboardTable.innerHTML = `
      <div class="lb-empty">
        <p>No detective records found yet.</p>
        <p style="font-size:0.9rem;margin-top:0.5rem;">Complete challenges to claim the top spot!</p>
      </div>
    `;
    return;
  }

  // Sort descending by totalPoints
  const sorted = [...profiles].sort((a, b) => b.totalPoints - a.totalPoints);

  sorted.forEach((p, idx) => {
    const rank = getRank(p.totalPoints);
    const pos = idx + 1;
    let posClass = '';
    if (pos === 1) posClass = 'gold';
    else if (pos === 2) posClass = 'silver';
    else if (pos === 3) posClass = 'bronze';

    const row = document.createElement('div');
    row.className = 'lb-row';
    row.innerHTML = `
      <div class="lb-rank-pos ${posClass}">${pos === 1 ? '🥇' : pos === 2 ? '🥈' : pos === 3 ? '🥉' : pos}</div>
      <div class="lb-info">
        <div class="lb-name">${escapeHTML(p.name)}</div>
        <div class="lb-rank-title">${rank.emoji} ${rank.title}</div>
      </div>
      <div style="text-align:right;">
        <div class="lb-score">${p.totalPoints} pts</div>
        <div class="lb-stars">⭐ ${p.totalStars} stars</div>
      </div>
    `;
    els.leaderboardTable.appendChild(row);
  });
}

/* ══════════════════════════════════════════════════════════════ */
/*  Teacher Dashboard View                                       */
/* ══════════════════════════════════════════════════════════════ */

function renderTeacherDashboard() {
  const profiles = getProfiles();
  els.teacherContent.innerHTML = '';

  if (profiles.length === 0) {
    els.teacherContent.innerHTML = `
      <div class="teacher-empty">
        <p style="font-size:1.2rem;">👩‍🏫 No student activity recorded yet.</p>
        <p style="margin-top:0.5rem;font-size:0.9rem;">Once students create profiles and play cases, their learning metrics, analytics, and weak topics will appear here.</p>
      </div>
    `;
    return;
  }

  // Compute classroom analytics
  const totalStudents = profiles.length;
  const totalScoreAll = profiles.reduce((s, p) => s + p.totalPoints, 0);
  const avgScore = Math.round(totalScoreAll / totalStudents);
  const highestScore = Math.max(...profiles.map(p => p.totalPoints));

  // Misconception / error breakdown per zone
  const topicErrors = { patent: 0, trademark: 0, copyright: 0, design: 0 };
  profiles.forEach(p => {
    if (p.wrongTopics) {
      for (const z of ZONES) {
        topicErrors[z] += (p.wrongTopics[z] || 0);
      }
    }
  });

  const totalErrors = Object.values(topicErrors).reduce((a, b) => a + b, 0);

  els.teacherContent.innerHTML = `
    <div class="teacher-toolbar">
      <button id="btn-export-csv" class="btn btn-primary">
        <span class="btn-icon">📥</span> Export CSV Report
      </button>
    </div>

    <!-- Analytics Cards -->
    <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(180px, 1fr));gap:1rem;margin-bottom:1.5rem;">
      <div style="background:var(--bg-card);border:1px solid rgba(255,255,255,0.08);border-radius:var(--radius-md);padding:1rem;text-align:center;">
        <div style="font-size:0.75rem;text-transform:uppercase;color:var(--text-muted);font-weight:600;">Total Students</div>
        <div style="font-size:1.8rem;font-weight:800;color:var(--accent-cyan);margin-top:0.25rem;">${totalStudents}</div>
      </div>
      <div style="background:var(--bg-card);border:1px solid rgba(255,255,255,0.08);border-radius:var(--radius-md);padding:1rem;text-align:center;">
        <div style="font-size:0.75rem;text-transform:uppercase;color:var(--text-muted);font-weight:600;">Class Average Score</div>
        <div style="font-size:1.8rem;font-weight:800;color:var(--accent-gold);margin-top:0.25rem;">${avgScore} pts</div>
      </div>
      <div style="background:var(--bg-card);border:1px solid rgba(255,255,255,0.08);border-radius:var(--radius-md);padding:1rem;text-align:center;">
        <div style="font-size:0.75rem;text-transform:uppercase;color:var(--text-muted);font-weight:600;">Highest Score</div>
        <div style="font-size:1.8rem;font-weight:800;color:var(--accent-green);margin-top:0.25rem;">${highestScore} pts</div>
      </div>
      <div style="background:var(--bg-card);border:1px solid rgba(255,255,255,0.08);border-radius:var(--radius-md);padding:1rem;text-align:center;">
        <div style="font-size:0.75rem;text-transform:uppercase;color:var(--text-muted);font-weight:600;">Total Inaccuracies</div>
        <div style="font-size:1.8rem;font-weight:800;color:var(--wrong-color);margin-top:0.25rem;">${totalErrors}</div>
      </div>
    </div>

    <!-- Student Table -->
    <div style="overflow-x:auto;background:var(--bg-card);border-radius:var(--radius-md);border:1px solid rgba(255,255,255,0.08);">
      <table class="teacher-table">
        <thead>
          <tr>
            <th>Student</th>
            <th>Rank</th>
            <th>Total Points</th>
            <th>Stars</th>
            <th>Zones Done</th>
            <th>Wrong Area Breakdown</th>
          </tr>
        </thead>
        <tbody>
          ${profiles.map(p => {
            const rank = getRank(p.totalPoints);
            const zonesCount = (p.completedZones || []).length;
            const wt = p.wrongTopics || {};
            return `
              <tr>
                <td><strong>${escapeHTML(p.name)}</strong></td>
                <td>${rank.emoji} ${rank.title}</td>
                <td><span style="color:var(--accent-cyan);font-weight:700;">${p.totalPoints}</span></td>
                <td>⭐ ${p.totalStars}</td>
                <td>${zonesCount}/4 Zones</td>
                <td>
                  <span style="font-size:0.75rem;color:var(--text-muted);">
                    🔬 P: ${wt.patent || 0} · ™️ TM: ${wt.trademark || 0} · ©️ CR: ${wt.copyright || 0} · 🎨 D: ${wt.design || 0}
                  </span>
                </td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    </div>

    <!-- Topic Misconceptions Detail -->
    <div class="teacher-detail">
      <h3>🔍 Common Misconceptions &amp; Domain Analysis</h3>
      <p style="font-size:0.9rem;color:var(--text-secondary);margin-bottom:1rem;">
        Aggregated error count by intellectual property category. Use these metrics to identify which topic areas require reinforcement in class.
      </p>
      <div class="weak-topics">
        ${ZONES.map(z => {
          const meta = ZONE_META[z];
          const errs = topicErrors[z];
          const pct = totalErrors > 0 ? Math.round((errs / totalErrors) * 100) : 0;
          return `
            <div class="weak-topic-tag" style="background:rgba(255,255,255,0.05);border-color:rgba(255,255,255,0.12);color:var(--text-primary);padding:0.6rem 1rem;">
              <strong>${meta.emoji} ${meta.name}</strong>: ${errs} errors (${pct}% of total)
            </div>
          `;
        }).join('')}
      </div>
    </div>
  `;

  // Attach CSV export handler
  const btnExport = document.getElementById('btn-export-csv');
  if (btnExport) {
    btnExport.addEventListener('click', handleExportCSV);
  }
}

async function handleExportCSV() {
  playClick();
  const profiles = getProfiles();
  if (profiles.length === 0) return;

  const headers = [
    'Student Name',
    'Rank Title',
    'Total Points',
    'Total Stars',
    'Zones Completed',
    'Final Challenge Done',
    'Patent Errors',
    'Trademark Errors',
    'Copyright Errors',
    'Design Errors',
    'Created At'
  ];

  const rows = profiles.map(p => {
    const rank = getRank(p.totalPoints);
    const wt = p.wrongTopics || {};
    return [
      `"${p.name.replace(/"/g, '""')}"`,
      `"${rank.title}"`,
      p.totalPoints,
      p.totalStars,
      (p.completedZones || []).length,
      p.finalQuiz?.completed ? 'Yes' : 'No',
      wt.patent || 0,
      wt.trademark || 0,
      wt.copyright || 0,
      wt.design || 0,
      `"${p.createdAt || ''}"`
    ].join(',');
  });

  const csvContent = [headers.join(','), ...rows].join('\n');
  const success = await exportCSV(csvContent);
  if (success) {
    alert('✅ Report exported successfully!');
  }
}

/* ══════════════════════════════════════════════════════════════ */
/*  Settings Logic                                               */
/* ══════════════════════════════════════════════════════════════ */

function initSettings() {
  const savedMuted = localStorage.getItem('ip_detectives_sound_muted');
  const isMute = savedMuted === 'true';
  setMuted(isMute);
  updateSoundButtonUI(isMute);

  els.toggleSound.addEventListener('click', () => {
    playClick();
    const newMuted = !isMuted();
    setMuted(newMuted);
    localStorage.setItem('ip_detectives_sound_muted', String(newMuted));
    updateSoundButtonUI(newMuted);
  });

  els.btnResetData.addEventListener('click', async () => {
    playClick();
    const confirmed = window.confirm(
      '⚠️ Are you sure you want to reset all game data and delete all student profiles?\n\nThis cannot be undone.'
    );
    if (confirmed) {
      await resetAll();
      alert('All profiles and game progress have been reset.');
      switchScreen('screen-home');
      updateHomeButtons();
    }
  });
}

function updateSoundButtonUI(muted) {
  if (muted) {
    els.toggleSound.classList.remove('active');
    els.toggleSound.textContent = 'OFF';
  } else {
    els.toggleSound.classList.add('active');
    els.toggleSound.textContent = 'ON';
  }
}

/* ══════════════════════════════════════════════════════════════ */
/*  Helper Functions                                             */
/* ══════════════════════════════════════════════════════════════ */

function escapeHTML(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/* ══════════════════════════════════════════════════════════════ */
/*  Event Listeners Registration                                 */
/* ══════════════════════════════════════════════════════════════ */

function registerEventListeners() {
  // Home Buttons
  els.btnStart.addEventListener('click', () => {
    playClick();
    switchScreen('screen-player-setup');
  });

  els.btnContinue.addEventListener('click', () => {
    playClick();
    switchScreen('screen-map');
  });

  els.btnLeaderboard.addEventListener('click', () => {
    playClick();
    switchScreen('screen-leaderboard');
  });

  els.btnTeacher.addEventListener('click', () => {
    playClick();
    switchScreen('screen-teacher');
  });

  els.btnSettings.addEventListener('click', () => {
    playClick();
    switchScreen('screen-settings');
  });

  els.btnQuit.addEventListener('click', () => {
    playClick();
    quitApp();
  });

  // Player Setup
  els.btnBackSetup.addEventListener('click', () => {
    playClick();
    switchScreen('screen-home');
  });

  els.btnCreateProfile.addEventListener('click', handleCreateProfile);
  els.inputName.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') handleCreateProfile();
  });

  // Map
  els.btnBackMap.addEventListener('click', () => {
    playClick();
    switchScreen('screen-home');
  });

  // Level
  els.btnBackLevel.addEventListener('click', () => {
    playClick();
    const confirmed = window.confirm('Exit current case? Your progress in this round will not be saved.');
    if (confirmed) {
      switchScreen('screen-map');
    }
  });

  // Tidbit
  els.btnTidbitContinue.addEventListener('click', () => {
    playClick();
    showResultsScreen();
  });

  // Results
  els.btnResultsContinue.addEventListener('click', handleResultsContinue);
  els.btnResultsReview.addEventListener('click', () => {
    playClick();
    renderReviewScreen();
  });

  // Review
  els.btnBackReview.addEventListener('click', () => {
    playClick();
    switchScreen('screen-results');
  });
  els.btnReviewDone.addEventListener('click', () => {
    playClick();
    switchScreen('screen-results');
  });

  // Zone Recap
  els.btnRecapContinue.addEventListener('click', handleRecapContinue);

  // Final Results
  els.btnViewCertificate.addEventListener('click', () => {
    playClick();
    renderCertificate(els.certificate);
    switchScreen('screen-certificate');
  });

  els.btnFinalHome.addEventListener('click', () => {
    playClick();
    switchScreen('screen-map');
  });

  // Certificate
  els.btnPrintCert.addEventListener('click', () => {
    playClick();
    printCertificate();
  });

  els.btnCertBack.addEventListener('click', () => {
    playClick();
    switchScreen('screen-final-results');
  });

  // Leaderboard
  els.btnBackLeaderboard.addEventListener('click', () => {
    playClick();
    switchScreen('screen-home');
  });

  // Teacher
  els.btnBackTeacher.addEventListener('click', () => {
    playClick();
    switchScreen('screen-home');
  });

  // Settings
  els.btnBackSettings.addEventListener('click', () => {
    playClick();
    switchScreen('screen-home');
  });

  // Global keyboard shortcuts (Esc to back)
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (_currentScreen === 'screen-review') {
        switchScreen('screen-results');
      } else if (_currentScreen === 'screen-certificate') {
        switchScreen('screen-final-results');
      } else if (['screen-player-setup', 'screen-leaderboard', 'screen-teacher', 'screen-settings', 'screen-map'].includes(_currentScreen)) {
        switchScreen('screen-home');
      }
    }
  });
}

/* ══════════════════════════════════════════════════════════════ */
/*  Application Initialization                                   */
/* ══════════════════════════════════════════════════════════════ */

async function bootstrap() {
  try {
    initHomeStars();
    initSettings();
    registerEventListeners();

    // Initialize game engine (loads JSON data and profile saves)
    await initEngine();

    updateHomeButtons();
  } catch (err) {
    console.error('IP Detectives failed to initialise:', err);
  }
}

// Kick off when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootstrap);
} else {
  bootstrap();
}
