/**
 * Olivia - AI Study Assistant
 * Main Popup Script
 * 
 * Handles UI interactions, tab switching, flashcards,
 * intelligent 5-question mini tests grounded strictly in user-saved notes,
 * and storage synchronization.
 */

// Sample study pack available only if user explicitly clicks "Load Starter Study Pack"
const SAMPLE_NOTES = [
  {
    id: 'sample-note-1',
    title: 'Photosynthesis & Cellular Respiration',
    content: 'Plants convert light energy into chemical energy (glucose) via chloroplasts, releasing O2. Mitochondria then break down glucose to generate ATP. The light-dependent reactions take place within the thylakoid membranes.',
    url: 'https://en.wikipedia.org/wiki/Photosynthesis',
    tag: 'Biology',
    date: 'Sample Note'
  },
  {
    id: 'sample-note-2',
    title: "Newton's Laws of Motion",
    content: 'Newton\'s First Law states that an object remains at rest or moves at a constant velocity unless acted upon by a net external force. Force equals mass times acceleration (F = m*a). The acceleration of an object depends on the net force and its mass.',
    url: 'https://en.wikipedia.org/wiki/Newton%27s_laws_of_motion',
    tag: 'Physics',
    date: 'Sample Note'
  },
  {
    id: 'sample-note-3',
    title: 'DNA Structure & Base Pairing',
    content: 'DNA forms a double helix composed of nucleotides. Adenine pairs with Thymine (A-T), and Cytosine pairs with Guanine (C-G). Watson and Crick first published this double-helix model in 1953.',
    url: 'https://en.wikipedia.org/wiki/DNA',
    tag: 'Genetics',
    date: 'Sample Note'
  }
];

const SAMPLE_FLASHCARDS = [
  {
    id: 'card-1',
    question: 'What is the primary function of mitochondria in eukaryotic cells?',
    answer: "Generating chemical energy (ATP) needed to power the cell's biochemical reactions.",
    topic: 'Biology'
  },
  {
    id: 'card-2',
    question: 'What is the chemical formula for photosynthesis?',
    answer: '6CO2 + 6H2O + light energy → C6H12O6 + 6O2',
    topic: 'Biology'
  },
  {
    id: 'card-3',
    question: "State Newton's First Law (Law of Inertia).",
    answer: 'An object will remain at rest or move at a constant speed in a straight line unless acted upon by an external net force.',
    topic: 'Physics'
  }
];

// --- Application State ---
let notes = [];
let flashcards = [];
let currentCardIndex = 0;
let currentTab = null;

// Quiz State
let selectedQuizTopic = 'all';
let quizQuestions = [];
let currentQuizIndex = 0;
let quizAnswered = false;
let quizUserAnswers = [];

// --- Helper Functions ---
function formatCurrentDate() {
  const now = new Date();
  const datePart = now.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric'
  });
  const timePart = now.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
  return `${datePart}, ${timePart}`;
}

function formatDomain(url) {
  if (!url) return '';
  try {
    const parsed = new URL(url);
    return parsed.hostname.replace(/^www\./, '');
  } catch (e) {
    return 'source link';
  }
}

function truncate(str, maxLen = 100) {
  if (!str) return '';
  return str.length > maxLen ? str.substring(0, maxLen - 3) + '...' : str;
}

function shuffleArray(arr) {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

// --- Storage Helper Functions ---
async function loadData() {
  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
    return new Promise((resolve) => {
      chrome.storage.local.get(['olivia_notes', 'olivia_cards'], (result) => {
        // Read strictly from saved storage - do NOT fallback to hardcoded science questions
        notes = (result && Array.isArray(result.olivia_notes)) ? result.olivia_notes : [];
        flashcards = (result && Array.isArray(result.olivia_cards)) ? result.olivia_cards : [];
        resolve();
      });
    });
  } else {
    // Fallback for direct browser preview
    const savedNotes = localStorage.getItem('olivia_notes');
    const savedCards = localStorage.getItem('olivia_cards');
    notes = savedNotes ? JSON.parse(savedNotes) : [];
    flashcards = savedCards ? JSON.parse(savedCards) : [];
  }
}

async function saveNotes() {
  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
    chrome.storage.local.set({ olivia_notes: notes });
  } else {
    localStorage.setItem('olivia_notes', JSON.stringify(notes));
  }
  updateBadges();
}

async function saveCards() {
  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
    chrome.storage.local.set({ olivia_cards: flashcards });
  } else {
    localStorage.setItem('olivia_cards', JSON.stringify(flashcards));
  }
  updateBadges();
}

// --- DOM Elements ---
const tabButtons = document.querySelectorAll('.tab-btn');
const panels = document.querySelectorAll('.panel');
const notesListEl = document.getElementById('notesList');
const notesCountBadge = document.getElementById('notesCount');
const cardsCountBadge = document.getElementById('cardsCount');
const quickInput = document.getElementById('quickInput');
const quickSaveBtn = document.getElementById('quickSaveBtn');

// Flashcard elements
const flashcardInner = document.getElementById('flashcardInner');
const cardQuestionEl = document.getElementById('cardQuestion');
const cardAnswerEl = document.getElementById('cardAnswer');
const cardProgressEl = document.getElementById('cardProgress');
const prevCardBtn = document.getElementById('prevCardBtn');
const nextCardBtn = document.getElementById('nextCardBtn');
const rateHardBtn = document.getElementById('rateHardBtn');
const rateGoodBtn = document.getElementById('rateGoodBtn');
const flashcardScene = document.getElementById('flashcardScene');
const flashcardControls = document.getElementById('flashcardControls');
const cardsEmptyState = document.getElementById('cardsEmptyState');
const cardsAddNotesBtn = document.getElementById('cardsAddNotesBtn');

// Quiz elements
const quizTopicSelect = document.getElementById('quizTopicSelect');
const quizNewTestBtn = document.getElementById('quizNewTestBtn');
const quizEmptyState = document.getElementById('quizEmptyState');
const quizActiveState = document.getElementById('quizActiveState');
const quizResultsState = document.getElementById('quizResultsState');
const quizEmptyTitle = document.getElementById('quizEmptyTitle');
const quizEmptyMsg = document.getElementById('quizEmptyMsg');
const quizSwitchAllTopicsBtn = document.getElementById('quizSwitchAllTopicsBtn');
const quizAddNotesBtn = document.getElementById('quizAddNotesBtn');
const quizLoadStarterBtn = document.getElementById('quizLoadStarterBtn');

const quizProgressEl = document.getElementById('quizProgress');
const quizTopicEl = document.getElementById('quizTopic');
const quizProgressFill = document.getElementById('quizProgressFill');
const quizQuestionEl = document.getElementById('quizQuestion');
const quizOptionsEl = document.getElementById('quizOptions');
const quizFeedbackEl = document.getElementById('quizFeedback');
const nextQuizBtn = document.getElementById('nextQuizBtn');

// Results elements
const scoreFractionEl = document.getElementById('scoreFraction');
const scorePctEl = document.getElementById('scorePct');
const remarkTagEl = document.getElementById('remarkTag');
const remarkDescEl = document.getElementById('remarkDesc');
const understoodTopicsListEl = document.getElementById('understoodTopicsList');
const reviseTopicsListEl = document.getElementById('reviseTopicsList');
const revisionSuggestionsListEl = document.getElementById('revisionSuggestionsList');
const breakdownListEl = document.getElementById('breakdownList');
const restartQuizBtn = document.getElementById('restartQuizBtn');
const resultsNotesBtn = document.getElementById('resultsNotesBtn');

const resetDataBtn = document.getElementById('resetDataBtn');
const pageStatusText = document.querySelector('.page-status .status-text');

// --- Initialization ---
document.addEventListener('DOMContentLoaded', async () => {
  await loadData();
  initTabs();
  renderNotes();
  syncFlashcardsFromNotes();   // Auto-generate flashcards from saved notes
  updateTopicSelector();
  initQuiz();
  updateBadges();
  detectActiveTab();

  // Storage listener for real-time updates when user saves a note
  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.onChanged) {
    chrome.storage.onChanged.addListener((changes, areaName) => {
      if (areaName === 'local' && changes.olivia_notes) {
        notes = changes.olivia_notes.newValue || [];
        renderNotes();
        updateBadges();
        updateTopicSelector();
        syncFlashcardsFromNotes(); // Re-generate flashcards when notes update
        // If quiz was showing empty, try updating it
        if (quizEmptyState.style.display !== 'none') {
          initQuiz();
        }
      }
    });
  }

  // Quick Note event listeners
  quickSaveBtn.addEventListener('click', handleQuickSave);
  quickInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleQuickSave();
  });

  // "Add a Note" button in empty flashcards state
  if (cardsAddNotesBtn) {
    cardsAddNotesBtn.addEventListener('click', () => {
      const notesTabBtn = document.querySelector('[data-tab="notes"]');
      if (notesTabBtn) notesTabBtn.click();
      if (quickInput) quickInput.focus();
    });
  }

  // Flashcard flip & navigation
  flashcardInner.addEventListener('click', () => {
    flashcardInner.classList.toggle('is-flipped');
  });

  prevCardBtn.addEventListener('click', () => {
    flashcardInner.classList.remove('is-flipped');
    currentCardIndex = (currentCardIndex - 1 + flashcards.length) % flashcards.length;
    renderFlashcard();
  });

  nextCardBtn.addEventListener('click', () => {
    flashcardInner.classList.remove('is-flipped');
    currentCardIndex = (currentCardIndex + 1) % flashcards.length;
    renderFlashcard();
  });

  rateHardBtn.addEventListener('click', () => {
    flashcardInner.classList.remove('is-flipped');
    currentCardIndex = (currentCardIndex + 1) % flashcards.length;
    renderFlashcard();
  });

  rateGoodBtn.addEventListener('click', () => {
    flashcardInner.classList.remove('is-flipped');
    currentCardIndex = (currentCardIndex + 1) % flashcards.length;
    renderFlashcard();
  });

  // Quiz Navigation buttons
  nextQuizBtn.addEventListener('click', handleNextQuizStep);
  restartQuizBtn.addEventListener('click', () => startFreshQuiz(selectedQuizTopic));
  quizNewTestBtn.addEventListener('click', () => startFreshQuiz(selectedQuizTopic));

  quizTopicSelect.addEventListener('change', (e) => {
    selectedQuizTopic = e.target.value;
    startFreshQuiz(selectedQuizTopic);
  });

  quizSwitchAllTopicsBtn.addEventListener('click', () => {
    selectedQuizTopic = 'all';
    quizTopicSelect.value = 'all';
    startFreshQuiz('all');
  });

  quizAddNotesBtn.addEventListener('click', () => {
    const notesTabBtn = document.querySelector('[data-tab="notes"]');
    if (notesTabBtn) notesTabBtn.click();
    quickInput.focus();
  });

  quizLoadStarterBtn.addEventListener('click', handleLoadStarter);

  resultsNotesBtn.addEventListener('click', () => {
    const notesTabBtn = document.querySelector('[data-tab="notes"]');
    if (notesTabBtn) notesTabBtn.click();
  });

  resetDataBtn.addEventListener('click', handleResetData);
});

// --- Tab Navigation Logic ---
function initTabs() {
  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const tabTarget = btn.getAttribute('data-tab');

      // Update active tab button
      tabButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      // Update active panel
      panels.forEach(p => p.classList.remove('active'));
      const activePanel = document.getElementById(`${tabTarget}Panel`);
      if (activePanel) {
        activePanel.classList.add('active');
        if (tabTarget === 'quiz') {
          updateTopicSelector();
          if (quizQuestions.length === 0) {
            initQuiz();
          }
        }
        if (tabTarget === 'flashcards') {
          syncFlashcardsFromNotes(); // Always sync from latest notes when tab is opened
        }
      }
    });
  });
}

// --- Notes Management ---
function renderNotes() {
  notesListEl.innerHTML = '';

  if (notes.length === 0) {
    notesListEl.innerHTML = `
      <div style="text-align: center; padding: 28px 12px; color: var(--text-muted);">
        <p style="font-weight: 500; font-size: 13px; color: var(--text-secondary);">No notes saved yet</p>
        <p style="font-size: 11.5px; margin-top: 6px; line-height: 1.5;">
          Highlight any text on a webpage, right-click, and select 
          <span style="color: #c084fc; font-weight: 600;">"Save to Olivia"</span>!
        </p>
      </div>
    `;
    return;
  }

  notes.forEach((note) => {
    const card = document.createElement('div');
    card.className = 'note-card';

    // Source URL pill with external link icon
    const domainHtml = note.url ? `
      <a href="${escapeHtml(note.url)}" target="_blank" rel="noopener noreferrer" class="note-source-link" title="${escapeHtml(note.url)}">
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
          <polyline points="15 3 21 3 21 9"></polyline>
          <line x1="10" y1="14" x2="21" y2="3"></line>
        </svg>
        <span>${escapeHtml(formatDomain(note.url))}</span>
      </a>
    ` : '';

    card.innerHTML = `
      <div class="note-top">
        <h4 class="note-title" title="${escapeHtml(note.title)}">${escapeHtml(note.title)}</h4>
        <button class="note-delete-btn" data-id="${note.id}" title="Delete note">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="3 6 5 6 21 6"></polyline>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
          </svg>
        </button>
      </div>
      <p class="note-content">${escapeHtml(note.content)}</p>
      <div class="note-meta">
        <div class="note-meta-tags">
          <span class="tag-pill">#${escapeHtml(note.tag || 'Study')}</span>
          ${domainHtml}
        </div>
        <span class="note-date">${escapeHtml(note.date)}</span>
      </div>
    `;

    card.querySelector('.note-delete-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      deleteNote(note.id);
    });

    notesListEl.appendChild(card);
  });
}

function handleQuickSave() {
  const text = quickInput.value.trim();
  if (!text) return;

  const pageTitle = (currentTab && currentTab.title) ? currentTab.title : 'Study Note';
  const pageUrl = (currentTab && currentTab.url) ? currentTab.url : '';

  const newNote = {
    id: 'note-' + Date.now(),
    title: pageTitle.length > 45 ? pageTitle.substring(0, 42) + '...' : pageTitle,
    content: text,
    url: pageUrl,
    tag: 'QuickNote',
    date: formatCurrentDate()
  };

  notes.unshift(newNote);
  saveNotes();
  renderNotes();
  updateTopicSelector();
  syncFlashcardsFromNotes(); // Regenerate flashcards from updated notes
  quickInput.value = '';

  const notesTabBtn = document.querySelector('[data-tab="notes"]');
  if (notesTabBtn) notesTabBtn.click();
}

function deleteNote(id) {
  notes = notes.filter(n => n.id !== id);
  saveNotes();
  renderNotes();
  updateTopicSelector();
  syncFlashcardsFromNotes(); // Regenerate flashcards after deletion
  initQuiz();
}

function updateBadges() {
  if (notesCountBadge) notesCountBadge.textContent = notes.length;
  if (cardsCountBadge) cardsCountBadge.textContent = flashcards.length;
}

// --- Flashcard Logic ---

/**
 * Generates flashcards from user's saved notes using extractive NLP.
 * Extracts definitions, facts, named entities, cause-effect, and key statements.
 * Never uses hardcoded sample content.
 */
function generateFlashcardsFromNotes(targetNotes) {
  const generated = [];
  const seenFronts = new Set();

  targetNotes.forEach(note => {
    const content = (note.content || '').trim();
    if (!content) return;
    const tag = note.tag || 'Study';

    // Split into sentences — accept any sentence >= 8 chars
    const sentences = content
      .split(/(?<=[.!?])\s+|\n+/)
      .map(s => s.trim())
      .filter(s => s.length >= 8);

    sentences.forEach((sentence, sIdx) => {
      // --- Pattern 1: Definition sentences ("X is/are/was Y", "X refers to Y", "X means Y") ---
      const defMatch = sentence.match(
        /^([A-Z][^,.:;!?]{2,50}?)\s+(?:is|are|was|were|refers to|means|can be defined as|is defined as)\s+(.{10,})/i
      );
      if (defMatch) {
        const front = `What is ${defMatch[1].trim()}?`;
        const back = defMatch[2].trim().replace(/[.!?]+$/, '') + '.';
        if (!seenFronts.has(front)) {
          seenFronts.add(front);
          generated.push({
            id: `fc-def-${note.id}-${sIdx}`,
            question: front,
            answer: back,
            topic: tag,
            noteTitle: note.title
          });
        }
      }

      // --- Pattern 2: Cause-effect / process ("X causes Y", "X leads to Y", "X results in Y") ---
      const causeMatch = sentence.match(
        /(.{8,60}?)\s+(?:causes?|leads? to|results? in|produces?|triggers?|enables?|generates?)\s+(.{8,})/i
      );
      if (causeMatch) {
        const front = `What does "${causeMatch[1].trim()}" cause or result in?`;
        const back = causeMatch[2].trim().replace(/[.!?]+$/, '') + '.';
        if (!seenFronts.has(front)) {
          seenFronts.add(front);
          generated.push({
            id: `fc-cause-${note.id}-${sIdx}`,
            question: front,
            answer: back,
            topic: tag,
            noteTitle: note.title
          });
        }
      }

      // --- Pattern 3: Date / year facts ("In YYYY, X happened" or "X in YYYY") ---
      const dateMatch = sentence.match(/\b(1[0-9]{3}|20[0-2][0-9])\b/);
      if (dateMatch) {
        const year = dateMatch[1];
        const front = `What happened in ${year} according to your saved note on "${note.title}"?`;
        if (!seenFronts.has(front)) {
          seenFronts.add(front);
          generated.push({
            id: `fc-date-${note.id}-${sIdx}`,
            question: front,
            answer: sentence.trim(),
            topic: tag,
            noteTitle: note.title
          });
        }
      }

      // --- Pattern 4: Named entity "Who/What" cards (capitalised multi-word proper nouns) ---
      const entityMatch = sentence.match(/\b([A-Z][a-z]+(?: [A-Z][a-z]+)+)\b/);
      if (entityMatch) {
        const entity = entityMatch[1];
        const front = `What role does "${entity}" play, based on your saved notes?`;
        if (!seenFronts.has(front)) {
          seenFronts.add(front);
          generated.push({
            id: `fc-entity-${note.id}-${sIdx}`,
            question: front,
            answer: sentence.trim(),
            topic: tag,
            noteTitle: note.title
          });
        }
      }

      // --- Pattern 5: Key statement card for every meaningful sentence (>= 30 chars) ---
      // Only one per note to avoid flooding; pick the longest sentence
    });

    // One "key fact" card per note — use the longest sentence as a statement question
    const longest = sentences.reduce((a, b) => (b.length > a.length ? b : a), '');
    if (longest.length >= 20) {
      const front = `What key idea is stated in your saved note: "${note.title}"?`;
      if (!seenFronts.has(front)) {
        seenFronts.add(front);
        generated.push({
          id: `fc-key-${note.id}`,
          question: front,
          answer: longest.trim(),
          topic: tag,
          noteTitle: note.title
        });
      }
    }
  });

  return generated;
}

/**
 * Syncs the flashcards array from notes, saves to storage, and re-renders.
 * Called whenever notes change or the flashcards tab is opened.
 */
function syncFlashcardsFromNotes() {
  // If user explicitly loaded SAMPLE_FLASHCARDS (starter pack), keep them
  const hasSampleCards = flashcards.some(c => c.id && c.id.startsWith('card-'));
  if (hasSampleCards && notes.some(n => n.id && n.id.startsWith('sample-note'))) {
    // Starter pack is active — don't override
    renderFlashcardView();
    return;
  }

  if (notes.length === 0) {
    // No notes at all — clear any stale generated cards
    flashcards = [];
    saveCards();
    renderFlashcardView();
    return;
  }

  // Regenerate from current notes
  const freshCards = generateFlashcardsFromNotes(notes);
  flashcards = freshCards;
  currentCardIndex = 0;
  saveCards();
  renderFlashcardView();
}

function renderFlashcardView() {
  if (flashcards.length === 0) {
    if (cardsEmptyState) cardsEmptyState.style.display = 'block';
    if (flashcardScene) flashcardScene.style.display = 'none';
    if (flashcardControls) flashcardControls.style.display = 'none';
    if (cardProgressEl) cardProgressEl.textContent = '0 Cards';
    return;
  }
  if (cardsEmptyState) cardsEmptyState.style.display = 'none';
  if (flashcardScene) flashcardScene.style.display = '';
  if (flashcardControls) flashcardControls.style.display = '';
  renderFlashcard();
}

function renderFlashcard() {
  if (flashcards.length === 0) return;

  // Clamp index in case notes were deleted
  if (currentCardIndex >= flashcards.length) currentCardIndex = 0;

  const current = flashcards[currentCardIndex];
  cardQuestionEl.textContent = current.question;
  cardAnswerEl.textContent = current.answer;
  cardProgressEl.textContent = `Card ${currentCardIndex + 1} of ${flashcards.length}`;
}

// ==========================================================================
// Dynamic Quiz Engine Grounded Strictly in User's Saved Notes
// ==========================================================================

function updateTopicSelector() {
  if (!quizTopicSelect) return;

  const previousValue = quizTopicSelect.value || 'all';
  quizTopicSelect.innerHTML = '';

  // 1. All Topics option
  const allOpt = document.createElement('option');
  allOpt.value = 'all';
  allOpt.textContent = `🌟 All Topics (${notes.length} saved notes)`;
  quizTopicSelect.appendChild(allOpt);

  if (notes.length === 0) {
    selectedQuizTopic = 'all';
    return;
  }

  // 2. Distinct Topic Tags
  const tagCounts = {};
  notes.forEach(n => {
    const tag = (n.tag || 'Study').trim();
    tagCounts[tag] = (tagCounts[tag] || 0) + 1;
  });

  const tagGroup = document.createElement('optgroup');
  tagGroup.label = 'Filter By Topic';
  Object.keys(tagCounts).sort().forEach(tag => {
    const opt = document.createElement('option');
    opt.value = `tag:${tag}`;
    opt.textContent = `#${tag} (${tagCounts[tag]} note${tagCounts[tag] > 1 ? 's' : ''})`;
    tagGroup.appendChild(opt);
  });
  if (Object.keys(tagCounts).length > 0) {
    quizTopicSelect.appendChild(tagGroup);
  }

  // 3. Individual Notes
  if (notes.length > 1) {
    const noteGroup = document.createElement('optgroup');
    noteGroup.label = 'Filter By Specific Note';
    notes.forEach(n => {
      const opt = document.createElement('option');
      opt.value = `note:${n.id}`;
      opt.textContent = `📄 ${truncate(n.title, 32)}`;
      noteGroup.appendChild(opt);
    });
    quizTopicSelect.appendChild(noteGroup);
  }

  // Restore selection if valid
  const exists = Array.from(quizTopicSelect.options).some(o => o.value === previousValue);
  if (exists) {
    quizTopicSelect.value = previousValue;
    selectedQuizTopic = previousValue;
  } else {
    quizTopicSelect.value = 'all';
    selectedQuizTopic = 'all';
  }
}

/**
 * Extracts questions strictly from the provided user notes.
 * NO generic/hardcoded science questions are used.
 */
function extractQuestionsFromNotes(targetNotes) {
  if (!targetNotes || targetNotes.length === 0) {
    return { questions: [], statementCount: 0 };
  }

  const questions = [];
  const allSentences = [];
  const allTerms = new Set();
  const noteTitles = targetNotes.map(n => n.title);

  // 1. Extract valid sentences and candidate terms from user's notes
  // Minimum length reduced to 12 chars to catch short but real facts
  targetNotes.forEach(note => {
    const raw = (note.content || '')
      .split(/(?<=[.!?])\s+|\n+/)
      .map(s => s.trim())
      .filter(s => s.length >= 12 && s.length <= 400);

    raw.forEach(sentence => {
      allSentences.push({ sentence, note });

      // Extract proper nouns and key capitalized entities
      const matches = sentence.match(/\b[A-Z][a-zA-Z0-9'-]+(?:\s+[A-Z][a-zA-Z0-9'-]+)*\b/g);
      if (matches) {
        matches.forEach(m => {
          if (m.length >= 3 && !['The', 'This', 'That', 'These', 'Those', 'There', 'When', 'What', 'Where', 'Which', 'Who', 'Although', 'Because', 'According', 'Key', 'An', 'It'].includes(m)) {
            allTerms.add(m);
          }
        });
      }

      // Also extract salient non-stop domain words for rich distractors
      const words = sentence.split(/\s+/).map(w => w.replace(/[^a-zA-Z0-9'-]/g, '')).filter(w => w.length >= 4);
      words.forEach(w => {
        if (!['that', 'this', 'with', 'from', 'have', 'were', 'which', 'their', 'there', 'about', 'would', 'these', 'other', 'been', 'some'].includes(w.toLowerCase())) {
          allTerms.add(w);
        }
      });
    });
  });

  const termPool = Array.from(allTerms);

  // Helper to create 3 unique distractors safely without infinite loops
  function getUniqueDistractors(correctItem, pool, fallbackGenerator) {
    const distractors = [];
    const filtered = (pool || []).filter(item => item && item.toLowerCase() !== correctItem.toLowerCase());
    const shuffled = shuffleArray([...new Set(filtered)]);

    for (const d of shuffled) {
      if (distractors.length >= 3) break;
      if (!distractors.includes(d)) distractors.push(d);
    }

    let attempt = 1;
    while (distractors.length < 3 && attempt <= 6) {
      const generated = fallbackGenerator(correctItem, attempt);
      attempt++;
      if (generated && !distractors.includes(generated) && generated.toLowerCase() !== correctItem.toLowerCase()) {
        distractors.push(generated);
      }
    }
    return distractors.slice(0, 3);
  }

  // Helper to create a plausible false statement grounded in the text
  function makePlausibleDistractor(sentence, attempt) {
    if (attempt === 1) {
      const swaps = [
        [/\bis\b/i, 'is not'],
        [/\bwas\b/i, 'was not'],
        [/\bare\b/i, 'are not'],
        [/\bwere\b/i, 'were not'],
        [/\bcan\b/i, 'cannot'],
        [/\balways\b/i, 'rarely'],
        [/\bprimary\b/i, 'secondary'],
        [/\bdrastically\b/i, 'minimally'],
        [/\brapid\b/i, 'stagnant'],
        [/\bquickly\b/i, 'slowly'],
        [/\bthree\b/i, 'four'],
        [/\bbegan\b/i, 'ended']
      ];
      for (const [pattern, replacement] of swaps) {
        if (pattern.test(sentence)) {
          return sentence.replace(pattern, replacement);
        }
      }
    }
    if (attempt === 2) {
      return 'The saved text states the opposite of: ' + sentence.charAt(0).toLowerCase() + sentence.slice(1);
    }
    if (attempt === 3) {
      return 'The text explicitly disproves that ' + sentence.charAt(0).toLowerCase() + sentence.slice(1);
    }
    return 'Contrary to your saved text, ' + sentence.charAt(0).toLowerCase() + sentence.slice(1) + ` (Variant ${attempt})`;
  }

  // 2. Generate questions from sentences
  const seenQuestions = new Set();

  allSentences.forEach(({ sentence, note }, idx) => {
    const topic = note.tag || note.title || 'Study';

    // Type 1: Key entity / Term Cloze (Fill-in-the-blank)
    // Relaxed: only require termPool.length >= 1 (not >= 3); distractors use fallback generator
    let selectedTerm = null;
    for (const term of termPool) {
      if (sentence.includes(term) && term.length >= 3) {
        selectedTerm = term;
        break;
      }
    }

    if (selectedTerm) {
      const blankedSentence = sentence.replace(selectedTerm, '______');
      const distractors = getUniqueDistractors(selectedTerm, termPool, (t, i) => `${t} (Alt ${i})`);
      if (distractors.length === 3) {
        const qText = `Fill in the blank (from your note on "${note.title}"):\n"${blankedSentence}"`;
        if (!seenQuestions.has(qText)) {
          seenQuestions.add(qText);
          const options = shuffleArray([selectedTerm, ...distractors]);
          questions.push({
            id: `q-cloze-${note.id}-${idx}`,
            topic: topic,
            noteTitle: note.title,
            question: qText,
            options: options,
            correctIndex: options.indexOf(selectedTerm),
            correctAnswer: selectedTerm,
            explanation: `From your saved note: "${sentence}"`
          });
        }
      }
    }

    // Type 2: Direct Factual Statement — key fix: use a UNIQUE qText per sentence (include idx)
    const otherSentenceDistractors = allSentences
      .filter(x => x.sentence !== sentence)
      .map(x => makePlausibleDistractor(x.sentence, 1));

    const statementDistractors = getUniqueDistractors(
      sentence,
      otherSentenceDistractors,
      (s, i) => makePlausibleDistractor(s, i)
    );

    if (statementDistractors.length === 3) {
      // FIX: Include sentence index in qText so each sentence gets its own unique question slot
      const qText = `[Q${idx + 1}] From your saved note on "${note.title}", which statement is directly confirmed?`;
      if (!seenQuestions.has(qText)) {
        seenQuestions.add(qText);
        const stmtOptions = shuffleArray([sentence, ...statementDistractors]);
        questions.push({
          id: `q-stmt-${note.id}-${idx}`,
          topic: topic,
          noteTitle: note.title,
          question: `From your saved note on "${note.title}", which statement is directly confirmed?`,
          options: stmtOptions,
          correctIndex: stmtOptions.indexOf(sentence),
          correctAnswer: sentence,
          explanation: `Directly confirmed in your saved note "${note.title}": "${sentence}"`
        });
      }
    }

    // Type 3: Note Title Attribution (when multiple distinct notes exist)
    if (noteTitles.length >= 4) {
      const titleDistractors = getUniqueDistractors(note.title, noteTitles, (t, i) => `Saved Note ${i}`);
      if (titleDistractors.length === 3) {
        const qText = `Which of your saved notes contains this finding or statement?\n"${truncate(sentence, 105)}"`;
        if (!seenQuestions.has(qText)) {
          seenQuestions.add(qText);
          const titleOptions = shuffleArray([note.title, ...titleDistractors]);
          questions.push({
            id: `q-attr-${note.id}-${idx}`,
            topic: topic,
            noteTitle: note.title,
            question: qText,
            options: titleOptions,
            correctIndex: titleOptions.indexOf(note.title),
            correctAnswer: note.title,
            explanation: `This statement was saved under note title: "${note.title}".`
          });
        }
      }
    }
  });

  return { questions, statementCount: allSentences.length };
}

function initQuiz() {
  startFreshQuiz(selectedQuizTopic);
}

function showQuizView(view) {
  quizEmptyState.style.display = view === 'empty' ? 'block' : 'none';
  quizActiveState.style.display = view === 'active' ? 'block' : 'none';
  quizResultsState.style.display = view === 'results' ? 'block' : 'none';
}

function startFreshQuiz(topicSelection = 'all') {
  selectedQuizTopic = topicSelection;

  // Filter notes based on user's selected topic or specific note
  let targetNotes = [];
  let topicLabel = 'All Saved Notes';

  if (topicSelection === 'all') {
    targetNotes = [...notes];
    topicLabel = 'All Saved Notes';
  } else if (topicSelection.startsWith('tag:')) {
    const tag = topicSelection.replace('tag:', '');
    targetNotes = notes.filter(n => (n.tag || 'Study').toLowerCase() === tag.toLowerCase());
    topicLabel = `#${tag}`;
  } else if (topicSelection.startsWith('note:')) {
    const noteId = topicSelection.replace('note:', '');
    targetNotes = notes.filter(n => n.id === noteId);
    topicLabel = targetNotes[0] ? targetNotes[0].title : 'Selected Note';
  }

  // Extract questions strictly from user's notes
  const { questions: extractedQuestions, statementCount } = extractQuestionsFromNotes(targetNotes);

  // Diagnostic log (non-sensitive: only counts, not note content)
  console.log(`[Olivia Quiz] Topic: "${topicLabel}" | Notes: ${targetNotes.length} | Sentences found: ${statementCount} | Questions generated: ${extractedQuestions.length}`);

  // Honest handling: If fewer than 5 reliable questions can be made, explain clearly
  if (extractedQuestions.length < 5) {
    quizQuestions = [];
    currentQuizIndex = 0;
    quizUserAnswers = [];
    showQuizView('empty');
    quizEmptyTitle.textContent = notes.length === 0 
      ? 'No Saved Notes Yet' 
      : `Need More Content in ${topicLabel}`;

    if (notes.length === 0) {
      quizEmptyMsg.innerHTML = `
        Olivia generates quizzes directly from the text you select and save from the web.
        <br><br>
        <strong>How to start:</strong> Highlight any text on a webpage, right-click, and choose 
        <span style="color: #c084fc; font-weight: 600;">"Save to Olivia"</span>!
      `;
      quizSwitchAllTopicsBtn.style.display = 'none';
    } else {
      const sentenceNote = statementCount === 1 ? 'sentence' : 'sentences';
      quizEmptyMsg.innerHTML = `
        Olivia found <strong>${extractedQuestions.length}</strong> question(s) from
        <strong>${statementCount}</strong> ${sentenceNote} in <em>${escapeHtml(topicLabel)}</em>.
        <br>At least <strong>5 questions</strong> are required for a complete mini-test.
        <br><br>
        <strong>Tip:</strong> Save longer paragraphs (multiple sentences) from the web, or switch to 
        <strong>All Topics</strong> to combine all your notes.
      `;

      // Check if All Topics has enough
      const { questions: allQuestions } = extractQuestionsFromNotes(notes);
      quizSwitchAllTopicsBtn.style.display = (topicSelection !== 'all' && allQuestions.length >= 5) ? 'inline-flex' : 'none';
    }
    return;
  }

  // Pick exactly 5 distinct, non-repeated questions
  const shuffledCandidates = shuffleArray(extractedQuestions).slice(0, 5);

  quizQuestions = shuffledCandidates.map(q => {
    return {
      id: q.id,
      topic: q.topic,
      noteTitle: q.noteTitle,
      question: q.question,
      options: q.options,
      correctIndex: q.correctIndex,
      correctAnswer: q.correctAnswer,
      explanation: q.explanation
    };
  });

  currentQuizIndex = 0;
  quizAnswered = false;
  quizUserAnswers = [];

  showQuizView('active');
  renderCurrentQuizQuestion();
}

function renderCurrentQuizQuestion() {
  const q = quizQuestions[currentQuizIndex];
  if (!q) return;

  quizAnswered = false;
  quizProgressEl.textContent = `Question ${currentQuizIndex + 1} of 5`;
  quizTopicEl.textContent = `#${q.topic}`;
  quizProgressFill.style.width = `${((currentQuizIndex + 1) / 5) * 100}%`;

  quizQuestionEl.textContent = q.question;
  quizFeedbackEl.style.display = 'none';
  quizFeedbackEl.className = 'quiz-feedback';
  nextQuizBtn.style.display = 'none';

  quizOptionsEl.innerHTML = '';
  const letters = ['A', 'B', 'C', 'D'];

  q.options.forEach((opt, idx) => {
    const optBtn = document.createElement('div');
    optBtn.className = 'quiz-option';
    optBtn.innerHTML = `
      <div class="quiz-option-marker">${letters[idx]}</div>
      <span>${escapeHtml(opt)}</span>
    `;

    optBtn.addEventListener('click', () => {
      if (quizAnswered) return;
      handleAnswerSelect(idx, q);
    });

    quizOptionsEl.appendChild(optBtn);
  });
}

function handleAnswerSelect(selectedIndex, q) {
  quizAnswered = true;
  const isCorrect = selectedIndex === q.correctIndex;
  const allOptionEls = quizOptionsEl.querySelectorAll('.quiz-option');

  // Record student's response for the results summary
  quizUserAnswers[currentQuizIndex] = {
    question: q.question,
    topic: q.topic,
    noteTitle: q.noteTitle,
    options: q.options,
    selectedIndex: selectedIndex,
    correctIndex: q.correctIndex,
    isCorrect: isCorrect,
    userChoice: q.options[selectedIndex],
    correctChoice: q.options[q.correctIndex],
    explanation: q.explanation
  };

  // Visual option highlights: green for correct, red for incorrect
  if (isCorrect) {
    allOptionEls[selectedIndex].classList.add('correct');
    quizFeedbackEl.innerHTML = `✨ <strong>Correct!</strong> ${escapeHtml(q.explanation)}`;
    quizFeedbackEl.className = 'quiz-feedback success';
  } else {
    allOptionEls[selectedIndex].classList.add('incorrect');
    allOptionEls[q.correctIndex].classList.add('correct');
    quizFeedbackEl.innerHTML = `❌ <strong>Not quite.</strong> The correct answer is: <strong>${escapeHtml(q.correctAnswer)}</strong>`;
    quizFeedbackEl.className = 'quiz-feedback error';
  }

  quizFeedbackEl.style.display = 'block';

  // Update button label
  if (currentQuizIndex < 4) {
    nextQuizBtn.textContent = 'Next Question →';
  } else {
    nextQuizBtn.textContent = 'See Results 🎉';
  }
  nextQuizBtn.style.display = 'inline-flex';
}

function handleNextQuizStep() {
  if (currentQuizIndex < 4) {
    currentQuizIndex++;
    renderCurrentQuizQuestion();
  } else {
    renderQuizResults();
  }
}

function renderQuizResults() {
  showQuizView('results');

  const total = quizUserAnswers.length || 5;
  const score = quizUserAnswers.filter(a => a && a.isCorrect).length;
  const pct = Math.round((score / total) * 100);

  scoreFractionEl.textContent = `${score}/${total}`;
  scorePctEl.textContent = `${pct}%`;

  // Performance Remark
  remarkTagEl.className = 'remark-pill';
  if (score === 5) {
    remarkTagEl.classList.add('excellent');
    remarkTagEl.textContent = 'Mastery! 🌟';
    remarkDescEl.textContent = 'Outstanding work! You answered every question correctly on your saved notes.';
  } else if (score === 4) {
    remarkTagEl.classList.add('excellent');
    remarkTagEl.textContent = 'Excellent! 🎉';
    remarkDescEl.textContent = 'Great grasp of your saved material! Review the missed concept below to reach 100%.';
  } else if (score === 3) {
    remarkTagEl.classList.add('good');
    remarkTagEl.textContent = 'Good Effort 👍';
    remarkDescEl.textContent = 'Solid foundation, but a few concepts in your notes need a quick reinforcement.';
  } else if (score >= 1) {
    remarkTagEl.classList.add('needs-work');
    remarkTagEl.textContent = 'Needs Revision 📚';
    remarkDescEl.textContent = 'A few key topics tripped you up. Revisit the revision suggestions below.';
  } else {
    remarkTagEl.classList.add('needs-work');
    remarkTagEl.textContent = 'Needs Practice 💪';
    remarkDescEl.textContent = 'Don’t be discouraged—spend 10 minutes reviewing your saved text and retake the quiz!';
  }

  // 1. Topics Understood (from correctly answered questions)
  const correctAnswers = quizUserAnswers.filter(a => a && a.isCorrect);
  const understoodTopics = [...new Set(correctAnswers.map(a => a.topic))];

  understoodTopicsListEl.innerHTML = '';
  if (understoodTopics.length === 0) {
    understoodTopicsListEl.innerHTML = `
      <span class="topic-status-pill none">None yet — review notes and retake the test!</span>
    `;
  } else {
    understoodTopics.forEach(topic => {
      const pill = document.createElement('span');
      pill.className = 'topic-status-pill understood';
      pill.innerHTML = `✓ ${escapeHtml(topic)}`;
      understoodTopicsListEl.appendChild(pill);
    });
  }

  // 2. Topics to Revise (from incorrectly answered questions)
  const missedAnswers = quizUserAnswers.filter(a => a && !a.isCorrect);
  const reviseTopics = [...new Set(missedAnswers.map(a => a.topic))];

  reviseTopicsListEl.innerHTML = '';
  if (reviseTopics.length === 0) {
    reviseTopicsListEl.innerHTML = `
      <span class="topic-status-pill none">✨ None! All tested topics answered correctly.</span>
    `;
  } else {
    reviseTopics.forEach(topic => {
      const pill = document.createElement('span');
      pill.className = 'topic-status-pill revise';
      pill.innerHTML = `⚠️ ${escapeHtml(topic)}`;
      reviseTopicsListEl.appendChild(pill);
    });
  }

  // 3. Grounded Revision Suggestions
  revisionSuggestionsListEl.innerHTML = '';
  if (score === 5) {
    revisionSuggestionsListEl.innerHTML = `
      <li class="revision-item">
        <span class="revision-bullet">✦</span>
        <span>You have mastered all tested notes! Keep highlighting and saving new articles online to expand your study deck.</span>
      </li>
      <li class="revision-item">
        <span class="revision-bullet">✦</span>
        <span>Use the <strong>Flashcards</strong> section to maintain long-term retention through active recall.</span>
      </li>
    `;
  } else {
    missedAnswers.forEach(ans => {
      const item = document.createElement('li');
      item.className = 'revision-item';
      item.innerHTML = `
        <span class="revision-bullet">✦</span>
        <span>Re-read your saved note on <strong>"${escapeHtml(ans.noteTitle || ans.topic)}"</strong> to review: <em>"${truncate(ans.correctChoice, 80)}"</em></span>
      `;
      revisionSuggestionsListEl.appendChild(item);
    });

    const generalItem = document.createElement('li');
    generalItem.className = 'revision-item';
    generalItem.innerHTML = `
      <span class="revision-bullet">✦</span>
      <span>Click <strong>Retake Quiz</strong> after reviewing your notes to verify you have mastered the concepts.</span>
    `;
    revisionSuggestionsListEl.appendChild(generalItem);
  }

  // 4. Detailed Breakdown with Grounded Explanations
  breakdownListEl.innerHTML = '';
  quizUserAnswers.forEach((ans, idx) => {
    const card = document.createElement('div');
    card.className = 'breakdown-card';

    const statusBadge = ans.isCorrect
      ? `<span class="breakdown-badge correct">✓ Correct</span>`
      : `<span class="breakdown-badge incorrect">✗ Missed</span>`;

    const answerDetails = ans.isCorrect
      ? `
        <div class="breakdown-answers">
          <span class="ans-correct">✓ Your answer: ${escapeHtml(ans.userChoice)}</span>
        </div>
      `
      : `
        <div class="breakdown-answers">
          <span class="ans-wrong">✗ Your choice: ${escapeHtml(ans.userChoice)}</span>
          <span class="ans-correct">✓ Correct answer: ${escapeHtml(ans.correctChoice)}</span>
          <div class="breakdown-explanation">💡 <strong>Grounding in Saved Text:</strong> ${escapeHtml(ans.explanation)}</div>
        </div>
      `;

    card.innerHTML = `
      <div class="breakdown-top">
        <span class="breakdown-q-title">Q${idx + 1} • #${escapeHtml(ans.topic)}</span>
        ${statusBadge}
      </div>
      <p class="breakdown-prompt">${escapeHtml(ans.question)}</p>
      ${answerDetails}
    `;

    breakdownListEl.appendChild(card);
  });
}

// User-initiated load of sample notes for optional demo
function handleLoadStarter() {
  notes = [...SAMPLE_NOTES];
  flashcards = [...SAMPLE_FLASHCARDS];
  saveNotes();
  saveCards();
  renderNotes();
  renderFlashcardView();
  updateTopicSelector();
  initQuiz();
}

// --- Reset Data ---
function handleResetData() {
  if (confirm('Clear all saved notes and flashcards?')) {
    notes = [];
    flashcards = [];
    saveNotes();
    saveCards();
    renderNotes();
    syncFlashcardsFromNotes(); // Properly show empty state
    updateTopicSelector();
    initQuiz();
    alert('All study data cleared. You can now save your own notes from web pages!');
  }
}

// --- Chrome Active Tab Detector ---
function detectActiveTab() {
  if (typeof chrome !== 'undefined' && chrome.tabs && chrome.tabs.query) {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs && tabs[0]) {
        currentTab = tabs[0];
        const title = currentTab.title || 'Active Webpage';
        if (pageStatusText) {
          pageStatusText.textContent = title.length > 18 ? title.substring(0, 16) + '...' : title;
          pageStatusText.title = title;
        }
      }
    });
  }
}

// --- Utilities ---
function escapeHtml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
