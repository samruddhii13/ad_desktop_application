/**
 * levelView.js — Manages a single level play session.
 *
 * Flow:
 *  1. Load questions for the zone + level.
 *  2. Present them one at a time via quizTypes.
 *  3. Track correct/incorrect answers.
 *  4. When done, call onComplete with the results.
 */

import { renderQuestion } from './quizTypes.js';
import { getQuestionsForLevel, getFinalQuizQuestions, ZONE_META, LEVEL_NAMES } from './gameEngine.js';

/* ── State ───────────────────────────────────────────────────── */
let _questions     = [];
let _currentIdx    = 0;
let _correctCount  = 0;
let _wrongQuestions = [];
let _allAnswers    = [];   // { question, isCorrect }
let _onComplete    = null;
let _isFinalQuiz   = false;

/* ── DOM references ──────────────────────────────────────────── */
let _container  = null;   // #level-content
let _progressEl = null;   // #level-progress
let _scoreEl    = null;   // #level-score

/**
 * Start a level.
 * @param {string}      zone
 * @param {string}      level
 * @param {HTMLElement}  container  — #level-content
 * @param {HTMLElement}  progressEl — #level-progress
 * @param {HTMLElement}  scoreEl    — #level-score
 * @param {function}     onComplete — callback({ correctCount, totalCount, wrongQuestions, allAnswers })
 */
export function startLevel(zone, level, container, progressEl, scoreEl, onComplete) {
  _container     = container;
  _progressEl    = progressEl;
  _scoreEl       = scoreEl;
  _onComplete    = onComplete;
  _isFinalQuiz   = false;
  _currentIdx    = 0;
  _correctCount  = 0;
  _wrongQuestions = [];
  _allAnswers    = [];

  _questions = getQuestionsForLevel(zone, level);

  if (_questions.length === 0) {
    container.innerHTML = '<p style="text-align:center;color:var(--text-muted);">No questions found for this level.</p>';
    return;
  }

  renderCurrentQuestion();
}

/**
 * Start the final quiz (10 mixed questions).
 */
export function startFinalQuiz(container, progressEl, scoreEl, onComplete) {
  _container     = container;
  _progressEl    = progressEl;
  _scoreEl       = scoreEl;
  _onComplete    = onComplete;
  _isFinalQuiz   = true;
  _currentIdx    = 0;
  _correctCount  = 0;
  _wrongQuestions = [];
  _allAnswers    = [];

  _questions = getFinalQuizQuestions();
  renderCurrentQuestion();
}

/* ── Internal ────────────────────────────────────────────────── */

function renderCurrentQuestion() {
  const total = _questions.length;

  // Update progress bar
  const pct = Math.round((_currentIdx / total) * 100);
  _progressEl.innerHTML = `
    <span>Q${_currentIdx + 1}/${total}</span>
    <div class="progress-bar"><div class="progress-bar-fill" style="width:${pct}%"></div></div>
  `;

  // Update score
  _scoreEl.textContent = `Score: ${_correctCount * 20}`;

  // Render question
  renderQuestion(_container, _questions[_currentIdx], handleAnswer, _currentIdx, total);
}

function handleAnswer(isCorrect, question) {
  if (isCorrect) {
    _correctCount++;
  } else {
    _wrongQuestions.push(question);
  }
  _allAnswers.push({ question, isCorrect });

  _currentIdx++;

  if (_currentIdx >= _questions.length) {
    // Level finished
    if (_onComplete) {
      _onComplete({
        correctCount:   _correctCount,
        totalCount:     _questions.length,
        wrongQuestions:  _wrongQuestions,
        allAnswers:     _allAnswers
      });
    }
  } else {
    renderCurrentQuestion();
  }
}
