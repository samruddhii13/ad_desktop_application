/**
 * quizTypes.js — Renders the different question types inside the level-content area.
 *
 * Supported types:
 *   - multiple_choice  — standard 4-option MCQ
 *   - true_false       — True / False statement
 *   - story_case       — story context + MCQ
 *   - detective_case   — progressive clues + MCQ
 *   - drag_sort        — click-to-assign sorting into categories
 */

import { playCorrect, playWrong, playClick } from './sound.js';

/* ══════════════════════════════════════════════════════════════ */
/*  Public API                                                   */
/* ══════════════════════════════════════════════════════════════ */

/**
 * Render a question into the given container.
 *
 * @param {HTMLElement} container — the element to populate
 * @param {object}      question  — the question data object
 * @param {function}    onAnswer  — callback(isCorrect, question) when answered
 * @param {number}      index     — 0-based question index (for display)
 * @param {number}      total     — total questions in the level
 */
export function renderQuestion(container, question, onAnswer, index, total) {
  container.innerHTML = '';

  const card = document.createElement('div');
  card.className = 'question-card';

  // Type badge
  card.appendChild(createBadge(question.type));

  // Dispatch to the correct renderer
  switch (question.type) {
    case 'true_false':
      renderTrueFalse(card, question, onAnswer);
      break;
    case 'story_case':
      renderStoryCase(card, question, onAnswer);
      break;
    case 'detective_case':
      renderDetectiveCase(card, question, onAnswer);
      break;
    case 'drag_sort':
      renderDragSort(card, question, onAnswer);
      break;
    case 'multiple_choice':
    default:
      renderMultipleChoice(card, question, onAnswer);
      break;
  }

  container.appendChild(card);
}

/* ══════════════════════════════════════════════════════════════ */
/*  Type Badge                                                   */
/* ══════════════════════════════════════════════════════════════ */

function createBadge(type) {
  const badge = document.createElement('span');
  const labels = {
    multiple_choice: ['Multiple Choice', 'badge-mcq'],
    true_false:      ['True or False', 'badge-tf'],
    story_case:      ['Case Study', 'badge-story'],
    detective_case:  ['Detective Case', 'badge-detective'],
    drag_sort:       ['Sort Challenge', 'badge-sort']
  };
  const [text, cls] = labels[type] || ['Question', 'badge-mcq'];
  badge.className = `question-type-badge ${cls}`;
  badge.textContent = text;
  return badge;
}

/* ══════════════════════════════════════════════════════════════ */
/*  Multiple Choice                                              */
/* ══════════════════════════════════════════════════════════════ */

function renderMultipleChoice(card, q, onAnswer) {
  appendPrompt(card, q.prompt);
  appendOptions(card, q.options, q.correct, q.explanation, onAnswer, q);
}

/* ══════════════════════════════════════════════════════════════ */
/*  True / False                                                 */
/* ══════════════════════════════════════════════════════════════ */

function renderTrueFalse(card, q, onAnswer) {
  appendPrompt(card, q.prompt);

  const options = ['True ✅', 'False ❌'];
  const correctIdx = q.correct === true ? 0 : 1;
  appendOptions(card, options, correctIdx, q.explanation, onAnswer, q);
}

/* ══════════════════════════════════════════════════════════════ */
/*  Story Case                                                   */
/* ══════════════════════════════════════════════════════════════ */

function renderStoryCase(card, q, onAnswer) {
  // Story box
  if (q.story) {
    const storyBox = document.createElement('div');
    storyBox.className = 'story-box';
    storyBox.textContent = q.story;
    card.appendChild(storyBox);
  }
  appendPrompt(card, q.prompt);
  appendOptions(card, q.options, q.correct, q.explanation, onAnswer, q);
}

/* ══════════════════════════════════════════════════════════════ */
/*  Detective Case (Progressive Clues)                           */
/* ══════════════════════════════════════════════════════════════ */

function renderDetectiveCase(card, q, onAnswer) {
  // Story / intro
  if (q.story) {
    const storyBox = document.createElement('div');
    storyBox.className = 'story-box';
    storyBox.textContent = q.story;
    card.appendChild(storyBox);
  }

  // Clue list
  const clueList = document.createElement('div');
  clueList.className = 'clue-list';

  const clues = q.clues || [];
  clues.forEach((clueText, i) => {
    const clueEl = document.createElement('div');
    clueEl.className = 'clue-item';
    clueEl.textContent = clueText;
    clueList.appendChild(clueEl);
  });
  card.appendChild(clueList);

  // Reveal-clue button
  let revealedCount = 0;

  function revealNext() {
    const items = clueList.querySelectorAll('.clue-item');
    if (revealedCount < items.length) {
      items[revealedCount].classList.add('revealed');
      revealedCount++;
      playClick();
    }
    if (revealedCount >= items.length) {
      revealBtn.style.display = 'none';
      // Show question + options after all clues
      appendPrompt(card, q.prompt);
      appendOptions(card, q.options, q.correct, q.explanation, onAnswer, q);
    }
  }

  const revealBtn = document.createElement('button');
  revealBtn.className = 'btn btn-secondary reveal-clue-btn';
  revealBtn.innerHTML = '<span class="btn-icon">🔍</span> Reveal Next Clue';
  revealBtn.addEventListener('click', revealNext);
  card.appendChild(revealBtn);

  // Auto-reveal the first clue
  setTimeout(() => revealNext(), 300);
}

/* ══════════════════════════════════════════════════════════════ */
/*  Drag / Sort (click-to-assign)                                */
/* ══════════════════════════════════════════════════════════════ */

function renderDragSort(card, q, onAnswer) {
  appendPrompt(card, q.prompt);

  const container = document.createElement('div');
  container.className = 'sort-container';

  // The items to sort
  const items = [...q.items];
  const assignments = {};   // item index → category name
  let selectedIdx = null;

  // Render item buttons
  const itemsDiv = document.createElement('div');
  itemsDiv.className = 'sort-items';

  items.forEach((item, i) => {
    const btn = document.createElement('button');
    btn.className = 'sort-item';
    btn.textContent = item.text;
    btn.dataset.idx = i;
    btn.addEventListener('click', () => {
      playClick();
      // Deselect previous
      itemsDiv.querySelectorAll('.sort-item').forEach(b => b.classList.remove('selected'));
      if (btn.classList.contains('placed')) return;
      btn.classList.add('selected');
      selectedIdx = i;
    });
    itemsDiv.appendChild(btn);
  });
  container.appendChild(itemsDiv);

  // Render category buckets
  const catsDiv = document.createElement('div');
  catsDiv.className = 'sort-categories';

  q.categories.forEach(catName => {
    const catEl = document.createElement('div');
    catEl.className = 'sort-category';
    catEl.innerHTML = `<div class="sort-category-title">${catName}</div><div class="sort-category-items"></div>`;
    catEl.addEventListener('click', () => {
      if (selectedIdx === null) return;
      playClick();
      // Assign the selected item to this category
      assignments[selectedIdx] = catName;
      const itemBtn = itemsDiv.querySelector(`[data-idx="${selectedIdx}"]`);
      itemBtn.classList.add('placed');
      itemBtn.classList.remove('selected');
      // Show tag in the category
      const tag = document.createElement('span');
      tag.className = 'placed-tag';
      tag.textContent = items[selectedIdx].text;
      catEl.querySelector('.sort-category-items').appendChild(tag);
      selectedIdx = null;

      // Check if all placed
      if (Object.keys(assignments).length === items.length) {
        checkBtn.style.display = 'inline-flex';
      }
    });
    catsDiv.appendChild(catEl);
  });
  container.appendChild(catsDiv);

  // Check button (hidden until all placed)
  const checkBtn = document.createElement('button');
  checkBtn.className = 'btn btn-primary sort-check-btn';
  checkBtn.textContent = 'Check Answers ✓';
  checkBtn.style.display = 'none';
  checkBtn.addEventListener('click', () => {
    // Score it
    let correct = 0;
    items.forEach((item, i) => {
      if (assignments[i] === item.category) correct++;
    });
    const isCorrect = correct === items.length;

    if (isCorrect) playCorrect();
    else playWrong();

    // Show explanation
    const expBox = document.createElement('div');
    expBox.className = `explanation-box ${isCorrect ? 'correct-explanation' : 'wrong-explanation'}`;
    expBox.innerHTML = `
      <div class="exp-label">${isCorrect ? '✅ All Correct!' : `❌ ${correct}/${items.length} Correct`}</div>
      <div class="exp-text">${q.explanation || ''}</div>
    `;
    card.appendChild(expBox);

    // Show "Next" button
    const nextBtn = document.createElement('button');
    nextBtn.className = 'btn btn-primary next-question-btn';
    nextBtn.textContent = 'Next →';
    nextBtn.addEventListener('click', () => onAnswer(isCorrect, q));
    card.appendChild(nextBtn);

    // Disable further interaction
    checkBtn.style.display = 'none';
    container.querySelectorAll('.sort-item, .sort-category').forEach(el => {
      el.style.pointerEvents = 'none';
    });
  });
  container.appendChild(checkBtn);

  card.appendChild(container);
}

/* ══════════════════════════════════════════════════════════════ */
/*  Shared helpers                                               */
/* ══════════════════════════════════════════════════════════════ */

function appendPrompt(card, text) {
  const prompt = document.createElement('p');
  prompt.className = 'question-prompt';
  prompt.textContent = text;
  card.appendChild(prompt);
}

/**
 * Build MCQ option buttons, handle answer click, show explanation.
 */
function appendOptions(card, options, correctIdx, explanation, onAnswer, q) {
  const list = document.createElement('div');
  list.className = 'options-list';

  const keys = ['1', '2', '3', '4'];

  options.forEach((text, i) => {
    const btn = document.createElement('button');
    btn.className = 'option-btn';
    btn.tabIndex = 0;
    btn.innerHTML = `<span class="option-key">${keys[i] || i + 1}</span><span>${text}</span>`;

    btn.addEventListener('click', () => handleOptionClick(i));
    list.appendChild(btn);
  });

  card.appendChild(list);

  // Keyboard shortcuts: 1-4
  function keyHandler(e) {
    const num = parseInt(e.key);
    if (num >= 1 && num <= options.length) {
      handleOptionClick(num - 1);
    }
  }
  document.addEventListener('keydown', keyHandler);

  let answered = false;

  function handleOptionClick(chosenIdx) {
    if (answered) return;
    answered = true;
    document.removeEventListener('keydown', keyHandler);

    const btns = list.querySelectorAll('.option-btn');
    const isCorrect = chosenIdx === correctIdx;

    btns.forEach((btn, i) => {
      btn.classList.add('answered');
      if (i === correctIdx) btn.classList.add('correct');
      if (i === chosenIdx && !isCorrect) btn.classList.add('wrong');
    });

    if (isCorrect) playCorrect();
    else playWrong();

    // Explanation
    const expBox = document.createElement('div');
    expBox.className = `explanation-box ${isCorrect ? 'correct-explanation' : 'wrong-explanation'}`;
    expBox.innerHTML = `
      <div class="exp-label">${isCorrect ? '✅ Correct!' : '❌ Not quite!'}</div>
      <div class="exp-text">${explanation || ''}</div>
    `;
    card.appendChild(expBox);

    // "Next" button
    const nextBtn = document.createElement('button');
    nextBtn.className = 'btn btn-primary next-question-btn';
    nextBtn.textContent = 'Next →';
    nextBtn.addEventListener('click', () => onAnswer(isCorrect, q));
    card.appendChild(nextBtn);
    nextBtn.focus();
  }
}
