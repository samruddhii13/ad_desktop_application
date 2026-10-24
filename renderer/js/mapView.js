/**
 * mapView.js — Renders the IP City progress map with four zone cards,
 * each containing three level buttons showing locked/unlocked/completed state.
 */

import {
  ZONES, LEVELS, ZONE_META, LEVEL_NAMES,
  isLevelUnlocked, getLevelProgress, isZoneCompleted, allZonesCompleted,
  getProfile, getProfileRank, isFinalQuizCompleted
} from './gameEngine.js';
import { playClick } from './sound.js';

/**
 * Populate the map screen.
 * @param {HTMLElement} mapContainer — #map-container
 * @param {HTMLElement} playerInfo   — #player-info
 * @param {HTMLElement} finalBtn     — #btn-final-quiz
 * @param {function}    onLevelClick — callback(zone, level)
 * @param {function}    onFinalClick — callback()
 */
export function renderMap(mapContainer, playerInfo, finalBtn, onLevelClick, onFinalClick) {
  /* ── Player info bar ────────────────────────────────────────── */
  const profile = getProfile();
  const rank = getProfileRank();

  playerInfo.innerHTML = `
    <span class="pi-name">🕵️ ${profile.name}</span>
    <span class="pi-rank">${rank.emoji} ${rank.title}</span>
    <span class="pi-score">⭐ ${profile.totalStars} stars · ${profile.totalPoints} pts</span>
  `;

  /* ── Zone cards ─────────────────────────────────────────────── */
  mapContainer.innerHTML = '';

  ZONES.forEach(zone => {
    const meta = ZONE_META[zone];
    const card = document.createElement('div');
    card.className = `zone-card ${meta.color}`;

    // Header
    const header = document.createElement('div');
    header.className = 'zone-card-header';
    header.innerHTML = `
      <div class="zone-icon">${meta.emoji}</div>
      <div>
        <div class="zone-name">${meta.name}</div>
        <div class="zone-desc">${isZoneCompleted(zone) ? '✅ Completed' : 'In progress'}</div>
      </div>
    `;
    card.appendChild(header);

    // Level buttons
    const levelsDiv = document.createElement('div');
    levelsDiv.className = 'zone-levels';

    LEVELS.forEach(level => {
      const unlocked  = isLevelUnlocked(zone, level);
      const progress  = getLevelProgress(zone, level);
      const completed = progress?.completed || false;
      const stars     = progress?.stars || 0;

      const btn = document.createElement('button');
      btn.className = 'level-btn' + (completed ? ' completed' : '') + (!unlocked ? ' locked' : '');
      btn.disabled = !unlocked;

      btn.innerHTML = `
        <span class="level-label">
          <span class="level-lock">${!unlocked ? '🔒' : completed ? '✅' : '▶️'}</span>
          <span>${LEVEL_NAMES[level]}</span>
        </span>
        <span class="level-stars">${renderStars(stars)}</span>
      `;

      if (unlocked) {
        btn.addEventListener('click', () => {
          playClick();
          onLevelClick(zone, level);
        });
      }

      levelsDiv.appendChild(btn);
    });

    card.appendChild(levelsDiv);
    mapContainer.appendChild(card);
  });

  /* ── Final quiz button ──────────────────────────────────────── */
  if (allZonesCompleted()) {
    finalBtn.style.display = 'inline-flex';
    if (isFinalQuizCompleted()) {
      finalBtn.innerHTML = '<span class="btn-icon">🏆</span> Replay Final Challenge';
    }
    finalBtn.onclick = () => {
      playClick();
      onFinalClick();
    };
  } else {
    finalBtn.style.display = 'none';
  }
}

/* ── Star rendering helper ───────────────────────────────────── */
function renderStars(count) {
  let html = '';
  for (let i = 0; i < 3; i++) {
    html += i < count
      ? '<span class="star-filled">⭐</span>'
      : '<span class="star-empty">☆</span>';
  }
  return html;
}
