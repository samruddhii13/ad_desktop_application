/**
 * gameEngine.js — Core game-state manager for IP Detectives.
 *
 * Responsibilities:
 *  - Manages the current profile and its progress.
 *  - Loads / caches all game data (questions, tidbits, recaps, ranks).
 *  - Scores answers, awards stars, tracks wrong-topic analytics.
 *  - Determines which levels are unlocked.
 *  - Computes ranks from total points.
 */

import { loadProfiles, saveProfiles, loadGameData } from './storage.js';

/* ══════════════════════════════════════════════════════════════ */
/*  Constants                                                    */
/* ══════════════════════════════════════════════════════════════ */

export const ZONES  = ['patent', 'trademark', 'copyright', 'design'];
export const LEVELS = ['basic', 'intermediate', 'advanced'];

export const ZONE_META = {
  patent:    { name: 'Patent Lab',       emoji: '🔬', color: 'patent' },
  trademark: { name: 'Trademark Tower',  emoji: '™️',  color: 'trademark' },
  copyright: { name: 'Copyright Cinema', emoji: '©️',  color: 'copyright' },
  design:    { name: 'Design Studio',    emoji: '🎨', color: 'design' }
};

export const LEVEL_NAMES = {
  basic:        'Basic',
  intermediate: 'Intermediate',
  advanced:     'Advanced'
};

/** Points awarded per correct answer. */
const POINTS_PER_CORRECT = 20;

/** Points for completing a level (bonus). */
const LEVEL_BONUS = 30;

/* ══════════════════════════════════════════════════════════════ */
/*  State                                                        */
/* ══════════════════════════════════════════════════════════════ */

let _saveData   = null;   // { profiles: { id: { ... } } }
let _profileId  = null;   // currently active profile id
let _questions   = [];     // all questions from questions.json
let _tidbits     = [];     // all tidbits
let _recaps      = {};     // zone → recap
let _ranks       = [];     // sorted rank list

/* ══════════════════════════════════════════════════════════════ */
/*  Initialisation                                               */
/* ══════════════════════════════════════════════════════════════ */

/** Load all game data from JSON files and the save file. */
export async function init() {
  const [questionsData, tidbitsData, recapsData, ranksData, saveData] = await Promise.all([
    loadGameData('questions.json'),
    loadGameData('tidbits.json'),
    loadGameData('recaps.json'),
    loadGameData('ranks.json'),
    loadProfiles()
  ]);
  _questions = questionsData?.questions  || [];
  _tidbits   = tidbitsData?.tidbits      || [];
  _recaps    = recapsData?.recaps        || {};
  _ranks     = ranksData?.ranks          || [];
  _saveData  = saveData;
}

/* ══════════════════════════════════════════════════════════════ */
/*  Profile management                                           */
/* ══════════════════════════════════════════════════════════════ */

/** Create a fresh progress structure for a new profile. */
function freshProgress() {
  const zones = {};
  for (const z of ZONES) {
    zones[z] = {};
    for (let i = 0; i < LEVELS.length; i++) {
      zones[z][LEVELS[i]] = {
        completed: false,
        stars: 0,
        bestScore: 0,
        totalQuestions: 0,
        correctAnswers: 0
      };
    }
  }
  return {
    totalPoints: 0,
    totalStars:  0,
    zones,
    wrongTopics: { patent: 0, trademark: 0, copyright: 0, design: 0 },
    finalQuiz: { completed: false, score: 0, total: 0 },
    completedZones: []
  };
}

/** Get a list of all profiles (for player-select and leaderboard). */
export function getProfiles() {
  return Object.entries(_saveData.profiles).map(([id, p]) => ({
    id, ...p
  }));
}

/** Check if any profiles exist. */
export function hasProfiles() {
  return Object.keys(_saveData.profiles).length > 0;
}

/**
 * Create a new profile. Returns the profile id.
 * @param {string} name — the student's name (trimmed, non-empty)
 */
export async function createProfile(name) {
  const trimmed = (name || '').trim();
  if (!trimmed) {
    throw new Error('Profile name cannot be empty');
  }
  if (!_saveData || typeof _saveData.profiles !== 'object') {
    _saveData = { profiles: {} };
  }
  const id = 'p_' + Date.now();
  _saveData.profiles[id] = {
    name: trimmed,
    createdAt: new Date().toISOString(),
    ...freshProgress()
  };
  await persist();
  return id;
}

/** Delete a profile by id. */
export async function deleteProfile(id) {
  delete _saveData.profiles[id];
  if (_profileId === id) _profileId = null;
  await persist();
}

/** Set the active profile. */
export function setActiveProfile(id) {
  _profileId = id;
}

/** Get the active profile data (or null). */
export function getProfile() {
  if (!_profileId) return null;
  return _saveData.profiles[_profileId] || null;
}

export function getProfileId() {
  return _profileId;
}

/* ══════════════════════════════════════════════════════════════ */
/*  Level queries                                                */
/* ══════════════════════════════════════════════════════════════ */

/**
 * Check if a level is unlocked for the active profile.
 * Rules: the first level (basic) of the first zone is always unlocked.
 * Within a zone, each level unlocks after the previous is completed.
 * Zones themselves are always accessible (any zone, any order),
 * but within each zone levels are sequential.
 */
export function isLevelUnlocked(zone, level) {
  const p = getProfile();
  if (!p) return false;
  const li = LEVELS.indexOf(level);
  if (li === 0) return true;                       // basic is always unlocked
  const prevLevel = LEVELS[li - 1];
  return p.zones[zone][prevLevel].completed;       // previous level must be done
}

/** Get the progress of a specific level. */
export function getLevelProgress(zone, level) {
  const p = getProfile();
  if (!p) return null;
  return p.zones[zone][level];
}

/** Check whether all 3 levels of a zone are completed. */
export function isZoneCompleted(zone) {
  const p = getProfile();
  if (!p) return false;
  return LEVELS.every(lv => p.zones[zone][lv].completed);
}

/** Check whether ALL zones are completed. */
export function allZonesCompleted() {
  return ZONES.every(z => isZoneCompleted(z));
}

/** Check whether the final quiz is completed. */
export function isFinalQuizCompleted() {
  const p = getProfile();
  return p?.finalQuiz?.completed || false;
}

/* ══════════════════════════════════════════════════════════════ */
/*  Questions                                                    */
/* ══════════════════════════════════════════════════════════════ */

/**
 * Get questions for a given zone + level.
 * Returns a shuffled copy limited to 5–6 questions.
 */
export function getQuestionsForLevel(zone, level) {
  const pool = _questions.filter(q => q.zone === zone && q.level === level);
  return shuffle([...pool]).slice(0, 6);
}

/** Get 10 final-quiz questions. */
export function getFinalQuizQuestions() {
  const pool = _questions.filter(q => q.zone === 'final');
  return shuffle([...pool]).slice(0, 10);
}

/* ══════════════════════════════════════════════════════════════ */
/*  Scoring                                                      */
/* ══════════════════════════════════════════════════════════════ */

/**
 * Record the results of a completed level.
 * @param {string} zone
 * @param {string} level
 * @param {number} correctCount — number of correct answers
 * @param {number} totalCount   — total questions answered
 * @param {object[]} wrongQuestions — questions answered incorrectly
 * @returns {{ score, stars, isNewBest }} result summary
 */
export async function recordLevelResult(zone, level, correctCount, totalCount, wrongQuestions) {
  const p = getProfile();
  if (!p) return { score: 0, stars: 0, isNewBest: false };

  const score = correctCount * POINTS_PER_CORRECT + (correctCount === totalCount ? LEVEL_BONUS : 0);
  const pct   = totalCount > 0 ? correctCount / totalCount : 0;
  const stars = pct >= 0.9 ? 3 : pct >= 0.6 ? 2 : pct >= 0.3 ? 1 : 0;

  const lp = p.zones[zone][level];
  const isNewBest = score > lp.bestScore;

  if (isNewBest) {
    // Adjust total points: remove old score, add new
    p.totalPoints = p.totalPoints - lp.bestScore + score;
    // Adjust total stars
    p.totalStars = p.totalStars - lp.stars + stars;

    lp.bestScore       = score;
    lp.stars           = stars;
    lp.correctAnswers  = correctCount;
    lp.totalQuestions  = totalCount;
  }

  lp.completed = true;

  // Track wrong topics for teacher analytics
  for (const wq of wrongQuestions) {
    const topicZone = wq.zone || zone;
    p.wrongTopics[topicZone] = (p.wrongTopics[topicZone] || 0) + 1;
  }

  // Check if zone just completed
  if (isZoneCompleted(zone) && !p.completedZones.includes(zone)) {
    p.completedZones.push(zone);
  }

  await persist();
  return { score, stars, isNewBest };
}

/**
 * Record final quiz results.
 * @returns {{ score, total, rank }}
 */
export async function recordFinalQuiz(correctCount, totalCount) {
  const p = getProfile();
  if (!p) return { score: 0, total: 0, rank: getRank(0) };

  const score = correctCount * POINTS_PER_CORRECT + (correctCount === totalCount ? LEVEL_BONUS : 0);

  if (!p.finalQuiz.completed || score > p.finalQuiz.score) {
    p.totalPoints = p.totalPoints - (p.finalQuiz.score || 0) + score;
    p.finalQuiz = { completed: true, score, total: totalCount, correct: correctCount };
  }

  await persist();
  return { score, total: totalCount, rank: getRank(p.totalPoints) };
}

/* ══════════════════════════════════════════════════════════════ */
/*  Ranks                                                        */
/* ══════════════════════════════════════════════════════════════ */

/** Compute the rank for a given point total. */
export function getRank(points) {
  let rank = _ranks[0] || { title: 'Rookie', emoji: '🔰' };
  for (const r of _ranks) {
    if (points >= r.minPoints) rank = r;
  }
  return rank;
}

/** Get rank for the current profile. */
export function getProfileRank() {
  const p = getProfile();
  return getRank(p ? p.totalPoints : 0);
}

/* ══════════════════════════════════════════════════════════════ */
/*  Tidbits & Recaps                                             */
/* ══════════════════════════════════════════════════════════════ */

/** Get a random tidbit for a zone. */
export function getRandomTidbit(zone) {
  const pool = _tidbits.filter(t => t.zone === zone);
  if (pool.length === 0) return null;
  return pool[Math.floor(Math.random() * pool.length)];
}

/** Get the recap for a zone. */
export function getRecap(zone) {
  return _recaps[zone] || null;
}

/* ══════════════════════════════════════════════════════════════ */
/*  Reset                                                        */
/* ══════════════════════════════════════════════════════════════ */

/** Delete ALL profiles and reset save data. */
export async function resetAll() {
  _saveData = { profiles: {} };
  _profileId = null;
  await persist();
}

/* ══════════════════════════════════════════════════════════════ */
/*  Helpers                                                      */
/* ══════════════════════════════════════════════════════════════ */

/** Save current state to disk. */
async function persist() {
  await saveProfiles(_saveData);
}

/** Fisher–Yates shuffle. */
function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
