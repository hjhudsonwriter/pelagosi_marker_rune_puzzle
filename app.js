const RUNES = ['anchor', 'tide', 'depth'];
const ROUND_CONFIG = [
  { length: 3, flash: 950, gap: 260 },
  { length: 4, flash: 700, gap: 220 },
  { length: 5, flash: 520, gap: 180 }
];

const ROUND_SUCCESS_COPY = [
  { title: 'ROUND I COMPLETE', text: 'THE MARKER STIRS' },
  { title: 'ROUND II COMPLETE', text: 'THE MEMORY DEEPENS' },
  { title: 'ROUND III COMPLETE', text: 'THE MARKER ACCEPTS THE RETURN' }
];

const CLUE_TEXTS = [
  'The Marker is cycling through something deliberate. It feels less like language than recall.',
  'The first pattern lands cleanly. This is a remembered order, not a random flicker.',
  'A stronger echo follows: the damage to the Marker was deliberate. Something was taken from it.',
  'The restored keystone reveals the truth: the Marker was not broken. The piece was removed deliberately, and its inner face bears an Aurushi sunburst.'
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
  inputTracker: document.getElementById('inputTracker'),
  phasePrompt: document.getElementById('phasePrompt'),
  roundSuccessOverlay: document.getElementById('roundSuccessOverlay'),
  roundSuccessTitle: document.getElementById('roundSuccessTitle'),
  roundSuccessText: document.getElementById('roundSuccessText')
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
  elements.sequenceDisplay.classList.remove('showing', 'awaiting-input');
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

function setRoundAura(level = 0) {
  document.body.classList.remove('round-awake-1', 'round-awake-2');

  if (level >= 1) {
    document.body.classList.add('round-awake-1');
  }

  if (level >= 2) {
    document.body.classList.add('round-awake-2');
  }
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

function triggerDeepTremor(duration = 1100) {
  window.clearTimeout(deepTremorTimer);
  elements.markerFrame.classList.add('deep-tremor');

  deepTremorTimer = window.setTimeout(() => {
    elements.markerFrame.classList.remove('deep-tremor');
  }, duration);
}

function resetVisualState() {
  state.runToken += 1;

  document.body.classList.remove('stage-solved', 'screen-flash', 'round-awake-1', 'round-awake-2');
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

  clearDisplay();
  hideRoundSuccessOverlay();
  elements.sequenceDisplay.classList.remove('awaiting-input');

  elements.memoryCaption.textContent = 'Watch the Marker.';
  setStatus(
    `Round ${state.roundIndex + 1}, Observe`,
    'The runes are moving. Hold the order in memory.'
  );

  showPhasePrompt('WATCH THE MARKER', 850);

  await sleep(650);

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

  clearDisplay();
  elements.sequenceDisplay.classList.add('awaiting-input');
  showPhasePrompt('REPEAT THE ORDER', 950);

  await sleep(450);

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
  clearDisplay();

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

  resetVisualState();
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
  const successCopy = ROUND_SUCCESS_COPY[state.roundIndex] || ROUND_SUCCESS_COPY[0];

  elements.roundPips[state.roundIndex]?.classList.add('complete');
  elements.roundPips[state.roundIndex]?.classList.remove('current');

  if (finishedRound === 1) {
    setRoundAura(1);
    setClueText(1);
    setStatus(
      'The Marker listens',
      'The first sequence lands true. The Marker stirs and calls for more.'
    );
    elements.memoryCaption.textContent = 'The Marker stirs.';
    showRoundSuccessOverlay(successCopy.title, successCopy.text, 1250);
  } else if (finishedRound === 2) {
    setRoundAura(2);
    setClueText(2);
    setStatus(
      'The memory deepens',
      'The second reply is accepted. The glow strengthens and the tide tightens around the stone.'
    );
    elements.memoryCaption.textContent = 'The memory deepens.';
    showRoundSuccessOverlay(successCopy.title, successCopy.text, 1250);
  }

  if (finishedRound >= ROUND_CONFIG.length) {
    solveTrial();
    return;
  }

  window.setTimeout(() => {
    startRound(state.roundIndex + 1);
  }, 1900);
}

function handleFailure() {
  state.phase = 'failed';
  state.locked = true;
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

function solveTrial() {
  state.phase = 'solved';
  state.locked = true;
  setClueText(3);
  setRoundAura(2);

  showRoundSuccessOverlay('ROUND III COMPLETE', 'THE MARKER ACCEPTS THE RETURN', 1500);

  setStatus(
    'The keystone returns',
    'The restored piece settles into the Marker. Pale runes bloom across the stone.'
  );
  elements.memoryCaption.textContent = 'The Marker accepts the returned piece.';
  document.body.classList.add('stage-solved');

  window.setTimeout(() => {
    safePlay(audio.puzzleSolve);
  }, 120);

  window.setTimeout(() => {
    setStatus(
      'The tide steadies',
      'The Marker sinks slowly beneath the sea. The surrounding water calms and stabilises.'
    );
    elements.memoryCaption.textContent = 'The tide stills.';
  }, 900);

  window.setTimeout(() => {
    setStatus(
      'A deliberate removal',
      'The Marker was never broken. On the inner face of the keystone, an etched sunburst reveals Aurushi involvement.'
    );
    elements.memoryCaption.textContent = 'The truth rises with the silence.';
  }, 2100);

  window.setTimeout(() => {
    setStatus(
      'Something shifts below',
      'The sea closes slowly over the stone. The runes dim. For a moment the water is perfectly still. Then far below… something shifts.'
    );
    elements.memoryCaption.textContent = 'The sea is still.';
    safePlay(audio.cavernOpen);
    triggerDeepTremor(1100);
  }, 3400);

  window.setTimeout(() => {
    openModal(elements.successModal);
  }, 4700);
}

function handleRuneInput(rune, button) {
  if (state.phase !== 'input' || state.locked) return;

  const sequence = getRoundSequence();
  const inputIndex = state.currentInput.length;
  const expectedRune = sequence[inputIndex];

  state.currentInput.push(rune);
  elements.sequenceDisplay.classList.remove('awaiting-input');

  if (rune === expectedRune) {
    safePlay(audio.runeClick);
    fillInputSlot(inputIndex, rune, false);
    button.classList.add('correct');

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

    window.setTimeout(() => {
      button.classList.remove('wrong');
    }, 320);

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
