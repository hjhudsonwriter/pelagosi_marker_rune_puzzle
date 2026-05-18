/* Pelagosi Puzzle Trials
   Two selectable puzzle modes:
   1. The Marker Remembers: original memory-sequence trial.
   2. The Tidal Sequence: new four-pillar rune + direction flow puzzle.
*/

const MEMORY_RUNES = ['anchor', 'tide', 'depth', 'life', 'remains'];
const MEMORY_ROUND_CONFIG = [
  { length: 3, flash: 950, gap: 260 },
  { length: 4, flash: 700, gap: 220 },
  { length: 5, flash: 520, gap: 180 }
];

const MEMORY_ROUND_SUCCESS_COPY = [
  { title: 'ROUND I COMPLETE', text: 'THE MARKER STIRS' },
  { title: 'ROUND II COMPLETE', text: 'THE MEMORY DEEPENS' },
  { title: 'ROUND III COMPLETE', text: 'THE MARKER ACCEPTS THE RETURN' }
];

const MEMORY_CLUE_TEXTS = [
  'The Marker is cycling through something deliberate. It feels less like language than recall.',
  'The first pattern lands cleanly. This is a remembered order, not a random flicker.',
  'A stronger echo follows: the damage to the Marker was deliberate. Something was taken from it.',
  'The restored keystone reveals the truth: the Marker was not broken. The piece was removed deliberately, and its inner face bears an Aurushi sunburst.'
];

const MODE_COPY = {
  memory: {
    eyebrow: 'Pelagosi Memory Trial',
    title: 'The Marker Remembers',
    hero: 'The runes do not sit still. Watch the sequence, hold it in memory, then answer the Marker in kind.',
    inscriptionTitle: 'Inscription',
    inscription: '“What the sea takes, it names first.<br>What is named, it carries.<br>What is carried, it returns.”',
    legend: [
      ['⚓', 'Anchor, that which holds'],
      ['☾', 'Tide, that which moves'],
      ['≈', 'Depth, that which waits below'],
      ['✦', 'Life, that which quickens'],
      ['⟡', 'Remains, that which endures']
    ],
    structureTitle: 'Trial Structure',
    structureItems: ['Round I, 3 runes', 'Round II, 4 runes', 'Round III, 5 runes'],
    structureCopy: 'The sequence is shown first. Once it fades, repeat it exactly from five possible rune choices.',
    clueTitle: 'Recovered Impression',
    notes: 'A failed reply unleashes a tidal surge. Any creature within 15 feet must make a DC 12 Dexterity save or be knocked prone and pushed 10 feet.'
  },
  tidal: {
    eyebrow: 'Pelagosi Flow Trial',
    title: 'The Tidal Sequence',
    hero: 'Four pillars surround the basin. Rotate their runes and currents until the chamber remembers how water should move.',
    inscriptionTitle: 'Wall Inscription',
    inscription: '“Flow follows memory.<br>Memory seeks depth.<br>Depth breaks upon stone.<br>Stone returns the current.”',
    legend: [
      ['💧', 'Flow, magic and arcana in motion'],
      ['🐚', 'Echo, memory of the sea'],
      ['≈', 'Depth, hidden truth below'],
      ['🪨', 'Stone, permanence and resistance'],
      ['🌀', 'Current, movement and destiny'],
      ['⚓', 'Anchor, restraint and stability']
    ],
    structureTitle: 'Sequence Rules',
    structureItems: ['Top-left flows right', 'Top-right flows down', 'Bottom-right flows left', 'Bottom-left flows up'],
    structureCopy: 'The arrows must create a clockwise loop, while the runes read Flow → Echo → Depth → Stone around the basin.',
    clueTitle: 'Chamber Response',
    notes: 'Wrong alignments disturb the water but do not instantly reset the chamber. Each failed check makes the pressure stranger.'
  }
};

const TIDAL_RUNES = ['flow', 'echo', 'depth', 'stone', 'current', 'anchor'];
const TIDAL_DIRECTIONS = ['up', 'right', 'down', 'left'];
const TIDAL_DIRECTION_SYMBOLS = {
  up: '↑',
  right: '→',
  down: '↓',
  left: '←'
};

const TIDAL_PILLAR_ORDER = ['topLeft', 'topRight', 'bottomRight', 'bottomLeft'];
const TIDAL_SOLUTION = {
  topLeft: { rune: 'flow', direction: 'right' },
  topRight: { rune: 'echo', direction: 'down' },
  bottomRight: { rune: 'depth', direction: 'left' },
  bottomLeft: { rune: 'stone', direction: 'up' }
};

const TIDAL_START = {
  topLeft: { runeIndex: 4, directionIndex: 0 },      // Current, up
  topRight: { runeIndex: 5, directionIndex: 3 },     // Anchor, left
  bottomRight: { runeIndex: 2, directionIndex: 2 },  // Depth, down
  bottomLeft: { runeIndex: 1, directionIndex: 1 }    // Echo, right
};

const TIDAL_ATTEMPT_COPY = [
  {
    title: 'THE BASIN RIPPLES',
    text: 'The water rises a finger-width, then falls. Some of the sequence is remembered, but the current is incomplete.',
    status: 'The basin ripples. Some elements are aligned, but the current still breaks before completing the loop.'
  },
  {
    title: 'STONE GRINDS BELOW',
    text: 'A hidden mechanism turns somewhere behind the walls. The room is listening more closely now.',
    status: 'The pillars grind beneath the floor. The chamber has accepted part of the pattern, but not the whole truth.'
  },
  {
    title: 'THE WATER REVERSES',
    text: 'The suspended streams overhead briefly flow backward. The pressure in the room tightens.',
    status: 'The water overhead reverses for a heartbeat. The wrong order is beginning to disturb the chamber.'
  },
  {
    title: 'THE CHAMBER REJECTS THE FLOW',
    text: 'A cold surge crosses the floor. The pillars remain active, but the basin refuses to open.',
    status: 'A cold surge washes across the stones. The puzzle remains active, but the room is now restless.'
  }
];

const memoryState = {
  started: false,
  phase: 'idle',
  roundIndex: -1,
  masterSequence: [],
  currentInput: [],
  locked: false,
  runToken: 0
};

const tidalState = {
  started: false,
  solved: false,
  locked: true,
  attempts: 0,
  feedbackActive: false,
  runToken: 0,
  pillars: structuredCloneSafe(TIDAL_START)
};

const appState = {
  currentMode: 'memory'
};

const elements = {
  puzzleSelect: document.getElementById('puzzleSelect'),
  beginButton: document.getElementById('beginButton'),
  resetButton: document.getElementById('resetButton'),
  modeEyebrow: document.getElementById('modeEyebrow'),
  modeTitle: document.getElementById('modeTitle'),
  modeCopy: document.getElementById('modeCopy'),
  inscriptionTitle: document.getElementById('inscriptionTitle'),
  inscriptionText: document.getElementById('inscriptionText'),
  legendList: document.getElementById('legendList'),
  structureTitle: document.getElementById('structureTitle'),
  structureList: document.getElementById('structureList'),
  structureCopy: document.getElementById('structureCopy'),
  clueTitle: document.getElementById('clueTitle'),
  clueText: document.getElementById('clueText'),
  trialNotes: document.getElementById('trialNotes'),
  stageLabel: document.getElementById('stageLabel'),
  statusText: document.getElementById('statusText'),

  memoryPuzzleStage: document.getElementById('memoryPuzzleStage'),
  markerFrame: document.getElementById('markerFrame'),
  rulesModal: document.getElementById('rulesModal'),
  successModal: document.getElementById('successModal'),
  startTrialButton: document.getElementById('startTrialButton'),
  closeRulesButton: document.getElementById('closeRulesButton'),
  playAgainButton: document.getElementById('playAgainButton'),
  roundDescription: document.getElementById('roundDescription'),
  roundLabel: document.getElementById('roundLabel'),
  roundPips: Array.from(document.querySelectorAll('.round-pip')),
  surgeOverlay: document.getElementById('surgeOverlay'),
  memoryCaption: document.getElementById('memoryCaption'),
  sequenceDisplay: document.getElementById('sequenceDisplay'),
  displayRuneImage: document.getElementById('displayRuneImage'),
  sequencePlaceholder: document.getElementById('sequencePlaceholder'),
  inputButtons: Array.from(document.querySelectorAll('.memory-rune-button')),
  inputTracker: document.getElementById('inputTracker'),
  phasePrompt: document.getElementById('phasePrompt'),
  roundSuccessOverlay: document.getElementById('roundSuccessOverlay'),
  roundSuccessTitle: document.getElementById('roundSuccessTitle'),
  roundSuccessText: document.getElementById('roundSuccessText'),

  tidalPuzzleStage: document.getElementById('tidalPuzzleStage'),
  tidalFrame: document.getElementById('tidalFrame'),
  tidalRulesModal: document.getElementById('tidalRulesModal'),
  tidalSuccessModal: document.getElementById('tidalSuccessModal'),
  closeTidalRulesButton: document.getElementById('closeTidalRulesButton'),
  startTidalButton: document.getElementById('startTidalButton'),
  playTidalAgainButton: document.getElementById('playTidalAgainButton'),
  checkTidalButton: document.getElementById('checkTidalButton'),
  randomiseTidalButton: document.getElementById('randomiseTidalButton'),
  tidalAttemptLabel: document.getElementById('tidalAttemptLabel'),
  tidalDescription: document.getElementById('tidalDescription'),
  tidalEventOverlay: document.getElementById('tidalEventOverlay'),
  tidalEventTitle: document.getElementById('tidalEventTitle'),
  tidalEventText: document.getElementById('tidalEventText'),
  tidalPillars: Array.from(document.querySelectorAll('.tidal-pillar')),
  tidalRuneButtons: Array.from(document.querySelectorAll('.tidal-rune-button')),
  tidalArrowButtons: Array.from(document.querySelectorAll('.tidal-arrow-button')),
  tidalPips: Array.from(document.querySelectorAll('.tidal-pip'))
};

const audio = {
  runePlace: new Audio('assets/audio/rune-place.wav'),
  runeClick: new Audio('assets/audio/rune-click.wav'),
  puzzleFail: new Audio('assets/audio/puzzle-fail.wav'),
  puzzleSolve: new Audio('assets/audio/puzzle-solve.wav'),
  cavernOpen: new Audio('assets/audio/cavern-open.wav')
};

Object.values(audio).forEach(sound => {
  sound.preload = 'auto';
  sound.volume = 0.85;
});

let phasePromptTimer = null;
let roundSuccessTimer = null;
let deepTremorTimer = null;
let tidalEventTimer = null;

function structuredCloneSafe(value) {
  return JSON.parse(JSON.stringify(value));
}

function getRuneImagePath(rune) {
  return `assets/runes/rune_${rune}.png`;
}

function getLabelFromId(id) {
  const words = id.replace(/([A-Z])/g, ' $1').replace(/^./, char => char.toUpperCase());
  return words.trim();
}

function safePlay(sound) {
  if (!sound) return;
  sound.currentTime = 0;
  sound.play().catch(() => {
    // Browser autoplay restrictions are ignored until the user interacts.
  });
}

function sleep(ms) {
  return new Promise(resolve => window.setTimeout(resolve, ms));
}

function setStatus(stageText, bodyText) {
  elements.stageLabel.textContent = stageText;
  elements.statusText.textContent = bodyText;
}

function openModal(modal) {
  modal?.classList.remove('hidden');
}

function closeModal(modal) {
  modal?.classList.add('hidden');
}

function closeAllModals() {
  [elements.rulesModal, elements.successModal, elements.tidalRulesModal, elements.tidalSuccessModal].forEach(closeModal);
}

function updateModeCopy(mode) {
  const copy = MODE_COPY[mode];
  elements.modeEyebrow.textContent = copy.eyebrow;
  elements.modeTitle.textContent = copy.title;
  elements.modeCopy.textContent = copy.hero;
  elements.inscriptionTitle.textContent = copy.inscriptionTitle;
  elements.inscriptionText.innerHTML = copy.inscription;
  elements.structureTitle.textContent = copy.structureTitle;
  elements.structureCopy.textContent = copy.structureCopy;
  elements.clueTitle.textContent = copy.clueTitle;
  elements.trialNotes.textContent = copy.notes;

  elements.legendList.innerHTML = '';
  copy.legend.forEach(([mark, text]) => {
    const item = document.createElement('li');
    item.innerHTML = `<span class="legend-mark">${mark}</span> ${text}`;
    elements.legendList.appendChild(item);
  });

  elements.structureList.innerHTML = '';
  copy.structureItems.forEach(text => {
    const item = document.createElement('span');
    item.textContent = text;
    elements.structureList.appendChild(item);
  });
}

function setActivePuzzle(mode) {
  appState.currentMode = mode;
  document.body.classList.toggle('mode-memory', mode === 'memory');
  document.body.classList.toggle('mode-tidal', mode === 'tidal');

  elements.memoryPuzzleStage.classList.toggle('active', mode === 'memory');
  elements.tidalPuzzleStage.classList.toggle('active', mode === 'tidal');

  updateModeCopy(mode);
  closeAllModals();

  if (mode === 'memory') {
    resetMemoryToIdle();
  } else {
    resetTidalToIdle();
  }
}

/* -------------------------
   MEMORY TRIAL FUNCTIONS
------------------------- */

function setMemoryClueText(index) {
  elements.clueText.textContent = MEMORY_CLUE_TEXTS[index] || MEMORY_CLUE_TEXTS[0];
}

function setInputEnabled(enabled) {
  elements.inputButtons.forEach(button => {
    button.disabled = !enabled;
    if (!enabled) {
      button.classList.remove('correct', 'wrong');
    }
  });
}

function clearDisplay(showPlaceholder = true) {
  elements.sequenceDisplay.classList.remove('showing', 'awaiting-input');
  elements.displayRuneImage.classList.add('hidden');

  if (showPlaceholder) {
    elements.sequencePlaceholder.classList.remove('hidden');
  } else {
    elements.sequencePlaceholder.classList.add('hidden');
  }
}

function clearDisplayForSequenceGap() {
  clearDisplay(false);
}

function showRune(rune) {
  elements.displayRuneImage.src = getRuneImagePath(rune);
  elements.displayRuneImage.alt = `${rune} rune`;
  elements.sequencePlaceholder.classList.add('hidden');
  elements.displayRuneImage.classList.remove('hidden');
  elements.sequenceDisplay.classList.add('showing');
}

function buildMasterSequence(maxLength = 5) {
  const sequence = [];

  while (sequence.length < maxLength) {
    const previous = sequence[sequence.length - 1] || null;
    const pool = MEMORY_RUNES.filter(rune => rune !== previous);
    const nextRune = pool[Math.floor(Math.random() * pool.length)];
    sequence.push(nextRune);
  }

  return sequence;
}

function getRoundSequence() {
  if (memoryState.roundIndex < 0) return [];
  return memoryState.masterSequence.slice(0, MEMORY_ROUND_CONFIG[memoryState.roundIndex].length);
}

function createInputTracker(length) {
  elements.inputTracker.innerHTML = '';

  for (let index = 0; index < length; index += 1) {
    const slot = document.createElement('div');
    slot.className = 'input-slot';

    const image = document.createElement('img');
    image.alt = '';
    slot.appendChild(image);

    elements.inputTracker.appendChild(slot);
  }
}

function fillInputSlot(index, rune, isWrong = false) {
  const slots = Array.from(elements.inputTracker.querySelectorAll('.input-slot'));
  const slot = slots[index];
  if (!slot) return;

  const image = slot.querySelector('img');
  image.src = getRuneImagePath(rune);
  slot.classList.add('filled');

  if (isWrong) {
    slot.classList.add('wrong');
  }
}

function updateRoundUI() {
  const visibleRound = memoryState.roundIndex + 1;
  const config = MEMORY_ROUND_CONFIG[memoryState.roundIndex] || { length: 0 };

  elements.roundLabel.textContent = `Round ${visibleRound} of ${MEMORY_ROUND_CONFIG.length}`;
  elements.roundDescription.textContent = `Round ${visibleRound} remembers ${config.length} runes before the sequence fades. Five rune choices are available below.`;

  elements.roundPips.forEach((pip, index) => {
    pip.classList.toggle('complete', index < memoryState.roundIndex);
    pip.classList.toggle('current', index === memoryState.roundIndex);
  });
}

function setRoundAura(level = 0) {
  document.body.classList.remove('round-awake-1', 'round-awake-2');

  if (level >= 1) document.body.classList.add('round-awake-1');
  if (level >= 2) document.body.classList.add('round-awake-2');
}

function hidePhasePrompt() {
  window.clearTimeout(phasePromptTimer);
  elements.phasePrompt.classList.remove('active');
  elements.phasePrompt.classList.add('hidden');
}

function showPhasePrompt(text, duration = 900) {
  window.clearTimeout(phasePromptTimer);

  elements.phasePrompt.textContent = text;
  elements.phasePrompt.classList.remove('hidden');

  window.requestAnimationFrame(() => {
    elements.phasePrompt.classList.add('active');
  });

  phasePromptTimer = window.setTimeout(() => {
    elements.phasePrompt.classList.remove('active');

    window.setTimeout(() => {
      elements.phasePrompt.classList.add('hidden');
    }, 260);
  }, duration);
}

function hideRoundSuccessOverlay() {
  window.clearTimeout(roundSuccessTimer);
  elements.roundSuccessOverlay.classList.remove('active');
  elements.roundSuccessOverlay.classList.add('hidden');
  elements.markerFrame.classList.remove('round-success-flash');
  document.body.classList.remove('screen-flash');
}

function showRoundSuccessOverlay(title, text, duration = 1250) {
  window.clearTimeout(roundSuccessTimer);

  elements.roundSuccessTitle.textContent = title;
  elements.roundSuccessText.textContent = text;
  elements.roundSuccessOverlay.classList.remove('hidden');

  window.requestAnimationFrame(() => {
    elements.roundSuccessOverlay.classList.add('active');
  });

  elements.markerFrame.classList.add('round-success-flash');
  document.body.classList.add('screen-flash');

  roundSuccessTimer = window.setTimeout(() => {
    elements.roundSuccessOverlay.classList.remove('active');
    elements.markerFrame.classList.remove('round-success-flash');
    document.body.classList.remove('screen-flash');

    window.setTimeout(() => {
      elements.roundSuccessOverlay.classList.add('hidden');
    }, 300);
  }, duration);
}

function triggerDeepTremor(target = elements.markerFrame, duration = 1100) {
  window.clearTimeout(deepTremorTimer);
  target.classList.add('deep-tremor');

  deepTremorTimer = window.setTimeout(() => {
    target.classList.remove('deep-tremor');
  }, duration);
}

function resetMemoryVisualState() {
  memoryState.runToken += 1;

  document.body.classList.remove('stage-solved', 'screen-flash', 'round-awake-1', 'round-awake-2', 'tidal-started', 'tidal-solved');
  elements.markerFrame.classList.remove('shake', 'round-success-flash', 'deep-tremor');
  elements.surgeOverlay.classList.remove('active');

  window.clearTimeout(phasePromptTimer);
  window.clearTimeout(roundSuccessTimer);
  window.clearTimeout(deepTremorTimer);

  hidePhasePrompt();
  hideRoundSuccessOverlay();
  setInputEnabled(false);
  clearDisplay();

  elements.memoryCaption.textContent = 'The Marker is still.';
  elements.roundLabel.textContent = `Round 0 of ${MEMORY_ROUND_CONFIG.length}`;
  elements.roundDescription.textContent = 'Three remembered sequences. Each one grows longer and faster, with five possible runes to choose from.';
  elements.roundPips.forEach(pip => pip.classList.remove('complete', 'current'));
  elements.inputTracker.innerHTML = '';
  setMemoryClueText(0);
}

function resetMemoryToIdle() {
  memoryState.started = false;
  memoryState.phase = 'idle';
  memoryState.roundIndex = -1;
  memoryState.masterSequence = [];
  memoryState.currentInput = [];
  memoryState.locked = false;

  resetMemoryVisualState();

  setStatus('Awaiting the trial', 'Press BEGIN to open the ritual instructions.');
}

async function playRoundSequence(roundToken) {
  const config = MEMORY_ROUND_CONFIG[memoryState.roundIndex];
  const sequence = getRoundSequence();

  clearDisplay(true);
  hideRoundSuccessOverlay();
  elements.sequenceDisplay.classList.remove('awaiting-input');

  elements.memoryCaption.textContent = 'Watch the Marker.';
  setStatus(`Round ${memoryState.roundIndex + 1}, Observe`, 'The runes are moving. Hold the order in memory.');
  showPhasePrompt('WATCH THE MARKER', 850);

  await sleep(650);

  for (const rune of sequence) {
    if (roundToken !== memoryState.runToken) return;

    showRune(rune);
    safePlay(audio.runePlace);
    await sleep(config.flash);

    if (roundToken !== memoryState.runToken) return;

    clearDisplayForSequenceGap();
    await sleep(config.gap);
  }

  if (roundToken !== memoryState.runToken) return;

  clearDisplayForSequenceGap();
  elements.sequenceDisplay.classList.add('awaiting-input');
  showPhasePrompt('REPEAT THE ORDER', 950);

  await sleep(450);

  if (roundToken !== memoryState.runToken) return;

  memoryState.phase = 'input';
  memoryState.currentInput = [];
  createInputTracker(sequence.length);
  setInputEnabled(true);
  elements.memoryCaption.textContent = 'Repeat the remembered order.';
  setStatus(`Round ${memoryState.roundIndex + 1}, Reply`, 'Now answer the Marker. Click the runes in the exact order they appeared.');
}

function startRound(roundIndex) {
  memoryState.roundIndex = roundIndex;
  memoryState.phase = 'showing';
  memoryState.currentInput = [];
  memoryState.locked = false;

  updateRoundUI();
  setInputEnabled(false);
  createInputTracker(MEMORY_ROUND_CONFIG[roundIndex].length);
  clearDisplay();

  const roundToken = ++memoryState.runToken;
  playRoundSequence(roundToken);
}

function resetTrialAndRestart() {
  memoryState.started = true;
  memoryState.phase = 'showing';
  memoryState.roundIndex = -1;
  memoryState.currentInput = [];
  memoryState.locked = false;
  memoryState.masterSequence = buildMasterSequence(MEMORY_ROUND_CONFIG[MEMORY_ROUND_CONFIG.length - 1].length);

  resetMemoryVisualState();
  startRound(0);
}

function startMemoryTrial() {
  closeModal(elements.rulesModal);
  resetTrialAndRestart();
}

function handleRoundSuccess() {
  setInputEnabled(false);
  memoryState.phase = 'success';
  safePlay(audio.puzzleSolve);

  const finishedRound = memoryState.roundIndex + 1;
  const successCopy = MEMORY_ROUND_SUCCESS_COPY[memoryState.roundIndex] || MEMORY_ROUND_SUCCESS_COPY[0];

  elements.roundPips[memoryState.roundIndex]?.classList.add('complete');
  elements.roundPips[memoryState.roundIndex]?.classList.remove('current');

  if (finishedRound === 1) {
    setRoundAura(1);
    setMemoryClueText(1);
    setStatus('The Marker listens', 'The first sequence lands true. The Marker stirs and calls for more.');
    elements.memoryCaption.textContent = 'The Marker stirs.';
    showRoundSuccessOverlay(successCopy.title, successCopy.text, 1250);
  } else if (finishedRound === 2) {
    setRoundAura(2);
    setMemoryClueText(2);
    setStatus('The memory deepens', 'The second reply is accepted. The glow strengthens and the tide tightens around the stone.');
    elements.memoryCaption.textContent = 'The memory deepens.';
    showRoundSuccessOverlay(successCopy.title, successCopy.text, 1250);
  }

  if (finishedRound >= MEMORY_ROUND_CONFIG.length) {
    solveMemoryTrial();
    return;
  }

  window.setTimeout(() => {
    startRound(memoryState.roundIndex + 1);
  }, 1900);
}

function handleFailure() {
  memoryState.phase = 'failed';
  memoryState.locked = true;
  setInputEnabled(false);
  hidePhasePrompt();
  hideRoundSuccessOverlay();
  safePlay(audio.puzzleFail);

  setStatus(
    'The sea rejects the order',
    'A tidal surge crashes inward. Any creature within 15 feet must make a DC 12 Dexterity save or be knocked prone and pushed 10 feet. The Marker resets.'
  );

  elements.memoryCaption.textContent = 'The sequence breaks apart.';
  elements.surgeOverlay.classList.add('active');
  elements.markerFrame.classList.add('shake');

  window.setTimeout(() => {
    elements.surgeOverlay.classList.remove('active');
    elements.markerFrame.classList.remove('shake');
    resetTrialAndRestart();
  }, 1700);
}

function solveMemoryTrial() {
  memoryState.phase = 'solved';
  memoryState.locked = true;
  setMemoryClueText(3);
  setRoundAura(2);

  showRoundSuccessOverlay('ROUND III COMPLETE', 'THE MARKER ACCEPTS THE RETURN', 1500);

  setStatus('The keystone returns', 'The restored piece settles into the Marker. Pale runes bloom across the stone.');
  elements.memoryCaption.textContent = 'The Marker accepts the returned piece.';
  document.body.classList.add('stage-solved');

  window.setTimeout(() => safePlay(audio.puzzleSolve), 120);

  window.setTimeout(() => {
    setStatus('The tide steadies', 'The Marker sinks slowly beneath the sea. The surrounding water calms and stabilises.');
    elements.memoryCaption.textContent = 'The tide stills.';
  }, 900);

  window.setTimeout(() => {
    setStatus('A deliberate removal', 'The Marker was never broken. On the inner face of the keystone, an etched sunburst reveals Aurushi involvement.');
    elements.memoryCaption.textContent = 'The truth rises with the silence.';
  }, 2100);

  window.setTimeout(() => {
    setStatus('Something shifts below', 'The sea closes slowly over the stone. The runes dim. For a moment the water is perfectly still. Then far below… something shifts.');
    elements.memoryCaption.textContent = 'The sea is still.';
    safePlay(audio.cavernOpen);
    triggerDeepTremor(elements.markerFrame, 1100);
  }, 3400);

  window.setTimeout(() => openModal(elements.successModal), 4700);
}

function handleRuneInput(rune, button) {
  if (memoryState.phase !== 'input' || memoryState.locked) return;

  const sequence = getRoundSequence();
  const inputIndex = memoryState.currentInput.length;
  const expectedRune = sequence[inputIndex];

  memoryState.currentInput.push(rune);
  elements.sequenceDisplay.classList.remove('awaiting-input');

  if (rune === expectedRune) {
    safePlay(audio.runeClick);
    fillInputSlot(inputIndex, rune, false);
    button.classList.add('correct');

    if (memoryState.currentInput.length === sequence.length) {
      handleRoundSuccess();
    } else {
      setStatus(`Round ${memoryState.roundIndex + 1}, Reply`, 'Correct so far. Continue the remembered order.');
    }
  } else {
    fillInputSlot(inputIndex, rune, true);
    button.classList.add('wrong');

    window.setTimeout(() => button.classList.remove('wrong'), 320);
    handleFailure();
  }
}

/* -------------------------
   TIDAL SEQUENCE FUNCTIONS
------------------------- */

function resetTidalFeedback() {
  tidalState.feedbackActive = false;
  elements.tidalPillars.forEach(pillar => {
    pillar.classList.remove('rune-correct', 'direction-correct', 'pillar-complete');
  });
  elements.tidalPips.forEach(pip => {
    pip.classList.remove('rune-correct', 'direction-correct', 'complete');
  });
}

function renderTidalPillars() {
  elements.tidalPillars.forEach(pillarEl => {
    const id = pillarEl.dataset.pillar;
    const state = tidalState.pillars[id];
    const rune = TIDAL_RUNES[state.runeIndex];
    const direction = TIDAL_DIRECTIONS[state.directionIndex];
    const solution = TIDAL_SOLUTION[id];

    const runeButton = pillarEl.querySelector('.tidal-rune-button');
    const arrowButton = pillarEl.querySelector('.tidal-arrow-button');
    const image = runeButton.querySelector('img');
    const label = runeButton.querySelector('span');

    image.src = getRuneImagePath(rune);
    image.alt = `${rune} rune`;
    label.textContent = getLabelFromId(rune);
    arrowButton.textContent = TIDAL_DIRECTION_SYMBOLS[direction];

    runeButton.disabled = tidalState.locked;
    arrowButton.disabled = tidalState.locked;

    const runeCorrect = rune === solution.rune;
    const directionCorrect = direction === solution.direction;
    const complete = runeCorrect && directionCorrect;

    if (tidalState.feedbackActive || tidalState.solved) {
      pillarEl.classList.toggle('rune-correct', runeCorrect);
      pillarEl.classList.toggle('direction-correct', directionCorrect);
      pillarEl.classList.toggle('pillar-complete', complete);
    }
  });

  elements.tidalAttemptLabel.textContent = `Attempts: ${tidalState.attempts}`;
  renderTidalProgress();
}

function renderTidalProgress() {
  elements.tidalPips.forEach(pip => {
    const id = pip.dataset.pillar;
    const state = tidalState.pillars[id];
    const rune = TIDAL_RUNES[state.runeIndex];
    const direction = TIDAL_DIRECTIONS[state.directionIndex];
    const solution = TIDAL_SOLUTION[id];
    const runeCorrect = rune === solution.rune;
    const directionCorrect = direction === solution.direction;
    const complete = runeCorrect && directionCorrect;

    if (tidalState.feedbackActive || tidalState.solved) {
      pip.classList.toggle('rune-correct', runeCorrect);
      pip.classList.toggle('direction-correct', directionCorrect);
      pip.classList.toggle('complete', complete);
    } else {
      pip.classList.remove('rune-correct', 'direction-correct', 'complete');
    }
  });
}

function getTidalCorrectCount() {
  return TIDAL_PILLAR_ORDER.reduce((total, id) => {
    const state = tidalState.pillars[id];
    const rune = TIDAL_RUNES[state.runeIndex];
    const direction = TIDAL_DIRECTIONS[state.directionIndex];
    const solution = TIDAL_SOLUTION[id];
    return total + (rune === solution.rune ? 1 : 0) + (direction === solution.direction ? 1 : 0);
  }, 0);
}

function isTidalSolved() {
  return TIDAL_PILLAR_ORDER.every(id => {
    const state = tidalState.pillars[id];
    const rune = TIDAL_RUNES[state.runeIndex];
    const direction = TIDAL_DIRECTIONS[state.directionIndex];
    const solution = TIDAL_SOLUTION[id];
    return rune === solution.rune && direction === solution.direction;
  });
}

function setTidalControlsEnabled(enabled) {
  tidalState.locked = !enabled;
  elements.tidalRuneButtons.forEach(button => { button.disabled = !enabled; });
  elements.tidalArrowButtons.forEach(button => { button.disabled = !enabled; });
  elements.checkTidalButton.disabled = !enabled;
  elements.randomiseTidalButton.disabled = !enabled;
}

function showTidalEvent(title, text, duration = 1450) {
  window.clearTimeout(tidalEventTimer);
  elements.tidalEventTitle.textContent = title;
  elements.tidalEventText.textContent = text;
  elements.tidalEventOverlay.classList.remove('hidden');
  elements.tidalFrame.classList.add('tidal-pulse');

  window.requestAnimationFrame(() => {
    elements.tidalEventOverlay.classList.add('active');
  });

  tidalEventTimer = window.setTimeout(() => {
    elements.tidalEventOverlay.classList.remove('active');
    elements.tidalFrame.classList.remove('tidal-pulse');
    window.setTimeout(() => elements.tidalEventOverlay.classList.add('hidden'), 280);
  }, duration);
}

function resetTidalToIdle() {
  tidalState.started = false;
  tidalState.solved = false;
  tidalState.locked = true;
  tidalState.attempts = 0;
  tidalState.feedbackActive = false;
  tidalState.runToken += 1;
  tidalState.pillars = structuredCloneSafe(TIDAL_START);

  document.body.classList.remove('tidal-started', 'tidal-solved', 'screen-flash', 'stage-solved', 'round-awake-1', 'round-awake-2');
  elements.tidalFrame.classList.remove('tidal-pulse', 'deep-tremor', 'shake');
  elements.tidalEventOverlay.classList.remove('active');
  elements.tidalEventOverlay.classList.add('hidden');
  window.clearTimeout(tidalEventTimer);

  resetTidalFeedback();
  setTidalControlsEnabled(false);
  renderTidalPillars();

  elements.clueText.textContent = 'The pillars are dormant. Each one carries a rune-face and a flow notch. The central basin is dark.';
  elements.tidalDescription.textContent = 'Press BEGIN to wake the chamber. Then rotate each pillar rune and arrow to restore the flow.';
  setStatus('Awaiting the sequence', 'Press BEGIN to open the Tidal Sequence instructions.');
}

function startTidalSequence() {
  closeModal(elements.tidalRulesModal);
  tidalState.started = true;
  tidalState.solved = false;
  tidalState.locked = false;
  tidalState.feedbackActive = false;
  document.body.classList.add('tidal-started');
  document.body.classList.remove('tidal-solved');
  setTidalControlsEnabled(true);
  resetTidalFeedback();
  renderTidalPillars();
  safePlay(audio.runePlace);

  elements.clueText.textContent = 'Ancient text nearby reads: Flow follows memory. Memory seeks depth. Depth breaks upon stone. Stone returns the current.';
  elements.tidalDescription.textContent = 'Create the clockwise current: top-left → top-right → bottom-right → bottom-left → top-left.';
  setStatus('The chamber wakes', 'The pillars unlock. Rotate their runes and arrows, then check the alignment.');
}

function rotateTidalRune(id) {
  if (tidalState.locked || tidalState.solved) return;
  const pillar = tidalState.pillars[id];
  pillar.runeIndex = (pillar.runeIndex + 1) % TIDAL_RUNES.length;
  resetTidalFeedback();
  renderTidalPillars();
  safePlay(audio.runeClick);
  setStatus('Rune rotated', `${getLabelFromId(id)} now bears the ${getLabelFromId(TIDAL_RUNES[pillar.runeIndex])} rune.`);
}

function rotateTidalDirection(id) {
  if (tidalState.locked || tidalState.solved) return;
  const pillar = tidalState.pillars[id];
  pillar.directionIndex = (pillar.directionIndex + 1) % TIDAL_DIRECTIONS.length;
  resetTidalFeedback();
  renderTidalPillars();
  safePlay(audio.runePlace);
  setStatus('Flow rotated', `${getLabelFromId(id)} now points ${TIDAL_DIRECTIONS[pillar.directionIndex]}.`);
}

function randomiseTidalPillars() {
  if (tidalState.locked || tidalState.solved) return;

  do {
    TIDAL_PILLAR_ORDER.forEach(id => {
      tidalState.pillars[id] = {
        runeIndex: Math.floor(Math.random() * TIDAL_RUNES.length),
        directionIndex: Math.floor(Math.random() * TIDAL_DIRECTIONS.length)
      };
    });
  } while (isTidalSolved());

  resetTidalFeedback();
  renderTidalPillars();
  safePlay(audio.runePlace);
  setStatus('The pillars shuffle', 'The chamber grinds as the rune-faces turn to new positions.');
}

function checkTidalAlignment() {
  if (tidalState.locked || tidalState.solved) return;

  tidalState.feedbackActive = true;
  tidalState.attempts += 1;
  renderTidalPillars();

  const correctCount = getTidalCorrectCount();

  if (isTidalSolved()) {
    solveTidalSequence();
    return;
  }

  safePlay(audio.puzzleFail);
  elements.tidalFrame.classList.add('shake');
  window.setTimeout(() => elements.tidalFrame.classList.remove('shake'), 540);

  const copy = TIDAL_ATTEMPT_COPY[Math.min(tidalState.attempts - 1, TIDAL_ATTEMPT_COPY.length - 1)];
  const correctText = `${correctCount} of 8 alignments are currently correct.`;
  showTidalEvent(copy.title, correctText, 1500);

  elements.clueText.textContent = `${copy.text} ${correctText}`;
  setStatus('Alignment incomplete', copy.status);
}

function solveTidalSequence() {
  tidalState.solved = true;
  tidalState.locked = true;
  tidalState.feedbackActive = true;
  setTidalControlsEnabled(false);
  renderTidalPillars();

  safePlay(audio.puzzleSolve);
  document.body.classList.add('tidal-solved', 'screen-flash');
  showTidalEvent('THE CURRENT COMPLETES', 'The basin fills without source.', 1800);

  setStatus('The current completes', 'The four pillars lock into a closed clockwise flow. The basin begins to glow from below.');
  elements.clueText.textContent = 'The room accepts the sequence: Flow remembers Echo, Echo sinks to Depth, Depth breaks upon Stone, and Stone returns the Current.';

  window.setTimeout(() => {
    setStatus('Water rises upward', 'The suspended streams overhead reverse direction, pouring into the basin from below.');
    elements.tidalDescription.textContent = 'The chamber is opening. The hidden mechanism beneath Middlemount has accepted the sequence.';
  }, 950);

  window.setTimeout(() => {
    safePlay(audio.cavernOpen);
    triggerDeepTremor(elements.tidalFrame, 1300);
    setStatus('Stone unlocks', 'Behind the northern arch, ancient stone shifts aside. Whatever Maerys came here to witness lies beyond.');
  }, 2200);

  window.setTimeout(() => {
    document.body.classList.remove('screen-flash');
    openModal(elements.tidalSuccessModal);
  }, 3600);
}

/* -------------------------
   EVENTS
------------------------- */

elements.beginButton.addEventListener('click', () => {
  if (appState.currentMode === 'memory') {
    openModal(elements.rulesModal);
  } else {
    openModal(elements.tidalRulesModal);
  }
});

elements.puzzleSelect.addEventListener('change', event => {
  setActivePuzzle(event.target.value);
});

elements.closeRulesButton.addEventListener('click', () => closeModal(elements.rulesModal));
elements.startTrialButton.addEventListener('click', startMemoryTrial);
elements.playAgainButton.addEventListener('click', () => {
  closeModal(elements.successModal);
  resetTrialAndRestart();
});

elements.closeTidalRulesButton.addEventListener('click', () => closeModal(elements.tidalRulesModal));
elements.startTidalButton.addEventListener('click', startTidalSequence);
elements.playTidalAgainButton.addEventListener('click', () => {
  closeModal(elements.tidalSuccessModal);
  resetTidalToIdle();
  openModal(elements.tidalRulesModal);
});

elements.resetButton.addEventListener('click', () => {
  closeAllModals();
  if (appState.currentMode === 'memory') {
    resetTrialAndRestart();
  } else {
    resetTidalToIdle();
  }
});

elements.inputButtons.forEach(button => {
  button.addEventListener('click', () => {
    handleRuneInput(button.dataset.rune, button);
  });
});

elements.tidalRuneButtons.forEach(button => {
  button.addEventListener('click', () => rotateTidalRune(button.dataset.pillar));
});

elements.tidalArrowButtons.forEach(button => {
  button.addEventListener('click', () => rotateTidalDirection(button.dataset.pillar));
});

elements.checkTidalButton.addEventListener('click', checkTidalAlignment);
elements.randomiseTidalButton.addEventListener('click', randomiseTidalPillars);

document.addEventListener('keydown', event => {
  if (event.key === 'Escape') {
    closeAllModals();
  }
});

setActivePuzzle('memory');
