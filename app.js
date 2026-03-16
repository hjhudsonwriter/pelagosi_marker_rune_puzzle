
const state = {
  started: false,
  stage: 0, // 0 intro, 1 restore missing rune, 2 activation, 3 solved
  selectedRune: null,
  missingRune: 'tide',
  sequenceSolution: ['tide', 'depth', 'anchor'],
  sequenceInput: [],
  socketFilled: false,
  locked: false
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
  socketSlot: document.getElementById('socketSlot'),
  tokenRow: document.getElementById('tokenRow'),
  runeTokens: Array.from(document.querySelectorAll('.rune-token')),
  activationRunes: document.getElementById('activationRunes'),
  activationButtons: Array.from(document.querySelectorAll('.activation-rune')),
  sequencePanel: document.getElementById('sequencePanel'),
  trackerDots: Array.from(document.querySelectorAll('.tracker-dot')),
  markerFrame: document.getElementById('markerFrame'),
  surgeOverlay: document.getElementById('surgeOverlay')
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

function safePlay(sound) {
  if (!sound) return;
  sound.currentTime = 0;
  sound.play().catch(() => {
    // Ignore autoplay restrictions until player interaction unlocks audio.
  });
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

function clearSelectedRune() {
  state.selectedRune = null;
  elements.runeTokens.forEach(token => token.classList.remove('selected'));
}

function resetSequenceTracker() {
  state.sequenceInput = [];
  elements.trackerDots.forEach(dot => dot.classList.remove('filled'));
  elements.activationButtons.forEach(button => {
    button.classList.remove('correct', 'wrong');
    button.disabled = false;
  });
}


function initializeIdle() {
  state.started = false;
  state.stage = 0;
  state.locked = false;
  state.socketFilled = false;
  clearSelectedRune();
  resetSequenceTracker();

  elements.socketSlot.innerHTML = `
    <img src="assets/runes/socket-triangle.svg" alt="">
    <span>Missing Rune</span>
  `;
  elements.socketSlot.classList.remove('filled');
  elements.activationRunes.classList.add('hidden');
  elements.sequencePanel.classList.add('hidden');
  elements.runeTokens.forEach(token => token.classList.remove('placed'));
  elements.tokenRow.classList.remove('hidden');
  document.body.classList.remove('stage-solved');

  setStatus(
    'Awaiting the trial',
    'Press BEGIN to open the ritual instructions.'
  );
}

function resetToStageOne() {
  state.started = true;
  state.stage = 1;
  state.locked = false;
  state.socketFilled = false;
  clearSelectedRune();
  resetSequenceTracker();

  elements.socketSlot.innerHTML = `
    <img src="assets/runes/socket-triangle.svg" alt="">
    <span>Missing Rune</span>
  `;
  elements.socketSlot.classList.remove('filled');
  elements.activationRunes.classList.add('hidden');
  elements.sequencePanel.classList.add('hidden');
  elements.runeTokens.forEach(token => token.classList.remove('placed'));
  elements.tokenRow.classList.remove('hidden');
  document.body.classList.remove('stage-solved');
  setStatus(
    'Stage I, Restore the Spiral',
    'Determine which rune completes the pattern, then place it into the broken socket.'
  );
}

function startTrial() {
  closeModal(elements.rulesModal);
  resetToStageOne();
}

function handleSocketPlacement(rune) {
  if (state.locked || state.stage !== 1) return;

  const token = elements.runeTokens.find(item => item.dataset.rune === rune);
  if (!token || token.classList.contains('placed')) return;

  if (rune === state.missingRune) {
    state.socketFilled = true;
    state.locked = true;
    safePlay(audio.runePlace);

    elements.socketSlot.classList.add('filled');
    elements.socketSlot.innerHTML = `
      <img src="assets/runes/rune-${rune}.svg" alt="${rune} rune">
    `;
    token.classList.add('placed');
    clearSelectedRune();

    setStatus(
      'Stage I complete',
      'The missing rune settles into place. The Marker stirs, and its base begins to glow.'
    );

    window.setTimeout(() => {
      state.stage = 2;
      state.locked = false;
      elements.activationRunes.classList.remove('hidden');
      elements.sequencePanel.classList.remove('hidden');
      setStatus(
        'Stage II, Awaken the Marker',
        'Press the runes in the order the sea remembers them.'
      );
    }, 900);
  } else {
    token.classList.add('wrong');
    setStatus(
      'The spiral resists',
      'That rune does not complete the repeating tide-memory. Study the rows again.'
    );
    window.setTimeout(() => token.classList.remove('wrong'), 450);
  }
}

function updateTracker() {
  elements.trackerDots.forEach((dot, index) => {
    dot.classList.toggle('filled', index < state.sequenceInput.length);
  });
}

function handleActivationPress(rune) {
  if (state.locked || state.stage !== 2) return;

  state.sequenceInput.push(rune);
  updateTracker();

  const currentIndex = state.sequenceInput.length - 1;
  const expectedRune = state.sequenceSolution[currentIndex];
  const button = elements.activationButtons.find(item => item.dataset.rune === rune);

  if (rune === expectedRune) {
    if (button) {
      button.classList.add('correct');
      button.disabled = true;
    }
    safePlay(audio.runeClick);

    if (state.sequenceInput.length === state.sequenceSolution.length) {
      solvePuzzle();
    } else {
      const nextHint = state.sequenceInput.length === 1
        ? 'The first remembered rune was true. Continue the ocean order.'
        : 'The Marker hums more deeply. One rune remains.';
      setStatus('The Marker listens', nextHint);
    }
  } else {
    if (button) {
      button.classList.add('wrong');
    }
    failActivation();
  }
}

function failActivation() {
  state.locked = true;
  safePlay(audio.puzzleFail);
  setStatus(
    'The sea rejects the order',
    'A violent surge crashes inward. The ritual collapses and the Marker resets.'
  );

  elements.surgeOverlay.classList.add('active');
  elements.markerFrame.classList.add('shake');

  window.setTimeout(() => {
    elements.surgeOverlay.classList.remove('active');
    elements.markerFrame.classList.remove('shake');
    resetToStageOne();
  }, 1500);
}

function solvePuzzle() {
  state.stage = 3;
  state.locked = true;
  safePlay(audio.puzzleSolve);
  setStatus(
    'The Marker remembers',
    'Water drains from the base of the pillar as a seam opens into the caverns below.'
  );

  document.body.classList.add('stage-solved');

  window.setTimeout(() => safePlay(audio.cavernOpen), 650);
  window.setTimeout(() => openModal(elements.successModal), 1800);
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
  resetToStageOne();
});

elements.resetButton.addEventListener('click', () => {
  closeModal(elements.successModal);
  closeModal(elements.rulesModal);
  resetToStageOne();
});

elements.runeTokens.forEach(token => {
  token.addEventListener('click', () => {
    if (state.stage !== 1 || state.locked || token.classList.contains('placed')) return;
    const isSelected = token.classList.contains('selected');
    clearSelectedRune();
    if (!isSelected) {
      token.classList.add('selected');
      state.selectedRune = token.dataset.rune;
    }
  });

  token.addEventListener('dragstart', event => {
    if (state.stage !== 1 || state.locked || token.classList.contains('placed')) {
      event.preventDefault();
      return;
    }
    token.classList.add('selected');
    state.selectedRune = token.dataset.rune;
    event.dataTransfer.setData('text/plain', token.dataset.rune);
  });

  token.addEventListener('dragend', () => {
    token.classList.remove('selected');
  });
});

elements.socketSlot.addEventListener('click', () => {
  if (state.stage !== 1 || state.locked || !state.selectedRune) return;
  handleSocketPlacement(state.selectedRune);
});

elements.socketSlot.addEventListener('dragover', event => {
  if (state.stage !== 1 || state.locked) return;
  event.preventDefault();
  elements.socketSlot.classList.add('active-drop');
});

elements.socketSlot.addEventListener('dragleave', () => {
  elements.socketSlot.classList.remove('active-drop');
});

elements.socketSlot.addEventListener('drop', event => {
  event.preventDefault();
  elements.socketSlot.classList.remove('active-drop');
  if (state.stage !== 1 || state.locked) return;
  const rune = event.dataTransfer.getData('text/plain');
  handleSocketPlacement(rune);
});

elements.activationButtons.forEach(button => {
  button.addEventListener('click', () => {
    handleActivationPress(button.dataset.rune);
  });
});

document.addEventListener('keydown', event => {
  if (event.key === 'Escape') {
    closeModal(elements.rulesModal);
    closeModal(elements.successModal);
  }
});

initializeIdle();
