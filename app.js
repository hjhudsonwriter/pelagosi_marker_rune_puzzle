const RUNES = ['anchor', 'tide', 'depth'];
const ROUND_CONFIG = [
  { length: 3, flash: 950, gap: 260 },
  { length: 4, flash: 700, gap: 220 },
  { length: 5, flash: 520, gap: 180 }
];

const CLUE_TEXTS = [
  'The Marker is cycling through something deliberate. It feels less like language than recall.',
  'The first pattern lands cleanly. This is a remembered order, not a random flicker.',
  'A stronger echo follows: the damage to the Marker was deliberate. Something was taken from it.',
  'The sequence resolves into a memory. The missing keystone was cut free and carried below.'
];

const state = {
  started: false,
  phase: 'idle', // idle, showing, input, success, failed, solved
  roundIndex: -1,
  masterSequence: [],
  currentInput: [],
  locked: false,
  runToken: 0
};

const elements = {
  beginButton: document.getElementById('beginButton'),
  resetButton: document.getElementById('resetButton'),
  rulesModal: document.getElementById('rulesModal'),
  successModal: document.getElementById('successModal'),
  startTrialButton: document.getElementById('startTrialButton'),
  closeRulesButton: document.getElementById('closeRulesButton'),
  playAgainButton: document.getElementById('playAgainButton'),
  stageLabel: document.getElementById('stageLabel'),
  statusText: document.getElementById('statusText'),
  roundDescription: document.getElementById('roundDescription'),
  roundLabel: document.getElementById('roundLabel'),
  roundPips: Array.from(document.querySelectorAll('.round-pip')),
  clueText: document.getElementById('clueText'),
  markerFrame: document.getElementById('markerFrame'),
  surgeOverlay: document.getElementById('surgeOverlay'),
  memoryCaption: document.getElementById('memoryCaption'),
  sequenceDisplay: document.getElementById('sequenceDisplay'),
  displayRuneImage: document.getElementById('displayRuneImage'),
  sequencePlaceholder: document.getElementById('sequencePlaceholder'),
  inputRunes: document.getElementById('inputRunes'),
  inputButtons: Array.from(document.querySelectorAll('.memory-rune-button')),
  inputTracker: document.getElementById('inputTracker')
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

function getRuneImagePath(rune) {
  return `assets/runes/rune_${rune}.png`;
}

function safePlay(sound) {
  if (!sound) return;
  sound.currentTime = 0;
  sound.play().catch(() => {
    // Ignore autoplay restrictions until player interaction unlocks audio.
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
  modal.classList.remove('hidden');
}

function closeModal(modal) {
  modal.classList.add('hidden');
}

function setClueText(index) {
  elements.clueText.textContent = CLUE_TEXTS[index] || CLUE_TEXTS[0];
}

function setInputEnabled(enabled) {
  elements.inputButtons.forEach(button => {
    button.disabled = !enabled;
    if (!enabled) {
      button.classList.remove('correct', 'wrong');
    }
  });
}

function clearDisplay() {
  elements.sequenceDisplay.classList.remove('showing');
  elements.displayRuneImage.classList.add('hidden');
  elements.sequencePlaceholder.classList.remove('hidden');
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
    const pool = RUNES.filter(rune => rune !== previous);
    const nextRune = pool[Math.floor(Math.random() * pool.length)];
    sequence.push(nextRune);
  }

  return sequence;
}

function getRoundSequence() {
  if (state.roundIndex < 0) return [];
  return state.masterSequence.slice(0, ROUND_CONFIG[state.roundIndex].length);
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
  const visibleRound = state.roundIndex + 1;
  const config = ROUND_CONFIG[state.roundIndex] || { length: 0 };

  elements.roundLabel.textContent = `Round ${visibleRound} of ${ROUND_CONFIG.length}`;
  elements.roundDescription.textContent = `Round ${visibleRound} remembers ${config.length} runes before the sequence fades.`;

  elements.roundPips.forEach((pip, index) => {
    pip.classList.toggle('complete', index < state.roundIndex);
    pip.classList.toggle('current', index === state.roundIndex);
  });
}

function resetVisualState() {
  state.runToken += 1;
  document.body.classList.remove('stage-solved');
  elements.markerFrame.classList.remove('shake');
  elements.surgeOverlay.classList.remove('active');
  setInputEnabled(false);
  clearDisplay();
  elements.memoryCaption.textContent = 'The Marker is still.';
  elements.roundLabel.textContent = `Round 0 of ${ROUND_CONFIG.length}`;
  elements.roundDescription.textContent = 'Three remembered sequences. Each one grows longer and faster.';
  elements.roundPips.forEach(pip => pip.classList.remove('complete', 'current'));
  elements.inputTracker.innerHTML = '';
  setClueText(0);
}

function initializeIdle() {
  state.started = false;
  state.phase = 'idle';
  state.roundIndex = -1;
  state.masterSequence = [];
  state.currentInput = [];
  state.locked = false;

  resetVisualState();

  setStatus(
    'Awaiting the trial',
    'Press BEGIN to open the ritual instructions.'
  );
}

async function playRoundSequence(roundToken) {
  const config = ROUND_CONFIG[state.roundIndex];
  const sequence = getRoundSequence();

  elements.memoryCaption.textContent = 'Watch the Marker.';
  setStatus(
    `Round ${state.roundIndex + 1}, Observe`,
    'The runes are moving. Hold the order in memory.'
  );

  await sleep(500);

  for (const rune of sequence) {
    if (roundToken !== state.runToken) return;

    showRune(rune);
    safePlay(audio.runePlace);
    await sleep(config.flash);

    if (roundToken !== state.runToken) return;

    clearDisplay();
    await sleep(config.gap);
  }

  if (roundToken !== state.runToken) return;

  state.phase = 'input';
  state.currentInput = [];
  createInputTracker(sequence.length);
  setInputEnabled(true);
  elements.memoryCaption.textContent = 'Repeat the remembered order.';
  setStatus(
    `Round ${state.roundIndex + 1}, Reply`,
    'Now answer the Marker. Click the runes in the exact order they appeared.'
  );
}

function startRound(roundIndex) {
  state.roundIndex = roundIndex;
  state.phase = 'showing';
  state.currentInput = [];
  state.locked = false;

  updateRoundUI();
  setInputEnabled(false);
  createInputTracker(ROUND_CONFIG[roundIndex].length);

  const roundToken = ++state.runToken;
  playRoundSequence(roundToken);
}

function resetTrialAndRestart() {
  state.started = true;
  state.phase = 'showing';
  state.roundIndex = -1;
  state.currentInput = [];
  state.locked = false;
  state.masterSequence = buildMasterSequence(ROUND_CONFIG[ROUND_CONFIG.length - 1].length);

  document.body.classList.remove('stage-solved');
  elements.markerFrame.classList.remove('shake');
  elements.surgeOverlay.classList.remove('active');
  clearDisplay();
  setClueText(0);

  startRound(0);
}

function startTrial() {
  closeModal(elements.rulesModal);
  resetTrialAndRestart();
}

function handleRoundSuccess() {
  setInputEnabled(false);
  state.phase = 'success';
  safePlay(audio.puzzleSolve);

  const finishedRound = state.roundIndex + 1;
  elements.roundPips[state.roundIndex]?.classList.add('complete');
  elements.roundPips[state.roundIndex]?.classList.remove('current');

  if (finishedRound === 1) {
    setClueText(1);
    setStatus(
      'The Marker listens',
      'The first sequence lands true. The pattern tightens and begins again.'
    );
  } else if (finishedRound === 2) {
    setClueText(2);
    setStatus(
      'The Marker yields a memory-fragment',
      'The second reply is accepted. A sharper echo suggests the missing piece was taken, not worn away.'
    );
  }

  if (finishedRound >= ROUND_CONFIG.length) {
    solveTrial();
    return;
  }

  window.setTimeout(() => {
    startRound(state.roundIndex + 1);
  }, 1350);
}

function handleFailure() {
  state.phase = 'failed';
  state.locked = true;
  setInputEnabled(false);
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

function solveTrial() {
  state.phase = 'solved';
  state.locked = true;
  setClueText(3);
  setStatus(
    'The Marker remembers',
    'The final reply resolves. Water drains from the base of the pillar as a seam opens below.'
  );
  elements.memoryCaption.textContent = 'The remembered code is complete.';
  document.body.classList.add('stage-solved');

  window.setTimeout(() => safePlay(audio.cavernOpen), 650);
  window.setTimeout(() => openModal(elements.successModal), 1800);
}

function handleRuneInput(rune, button) {
  if (state.phase !== 'input' || state.locked) return;

  const sequence = getRoundSequence();
  const inputIndex = state.currentInput.length;
  const expectedRune = sequence[inputIndex];

  state.currentInput.push(rune);

  if (rune === expectedRune) {
    safePlay(audio.runeClick);
    fillInputSlot(inputIndex, rune, false);
    button.classList.add('correct');
    window.setTimeout(() => button.classList.remove('correct'), 220);

    if (state.currentInput.length === sequence.length) {
      handleRoundSuccess();
    } else {
      setStatus(
        `Round ${state.roundIndex + 1}, Reply`,
        'Correct so far. Continue the remembered order.'
      );
    }
  } else {
    fillInputSlot(inputIndex, rune, true);
    button.classList.add('wrong');
    window.setTimeout(() => button.classList.remove('wrong'), 320);
    handleFailure();
  }
}

elements.beginButton.addEventListener('click', () => {
  openModal(elements.rulesModal);
});

elements.closeRulesButton.addEventListener('click', () => {
  closeModal(elements.rulesModal);
});

elements.startTrialButton.addEventListener('click', startTrial);

elements.playAgainButton.addEventListener('click', () => {
  closeModal(elements.successModal);
  resetTrialAndRestart();
});

elements.resetButton.addEventListener('click', () => {
  closeModal(elements.rulesModal);
  closeModal(elements.successModal);
  resetTrialAndRestart();
});

elements.inputButtons.forEach(button => {
  button.addEventListener('click', () => {
    handleRuneInput(button.dataset.rune, button);
  });
});

document.addEventListener('keydown', event => {
  if (event.key === 'Escape') {
    closeModal(elements.rulesModal);
    closeModal(elements.successModal);
  }
});

initializeIdle();
