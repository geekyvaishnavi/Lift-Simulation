const MAX_FLOORS = 20;
const MAX_LIFTS = 10;

const state = {
  floors: 0,
  lifts: [],
  pendingRequests: []
};

const form = document.getElementById('setup-form');
const floorsInput = document.getElementById('floors-input');
const liftsInput = document.getElementById('lifts-input');
const errorMsg = document.getElementById('error-msg');
const simulation = document.getElementById('simulation');

function validate(floors, lifts) {
  if (!Number.isInteger(floors) || !Number.isInteger(lifts)) {
    return 'Please enter whole numbers for both fields.';
  }
  if (floors < 1 || lifts < 1) {
    return 'Floors and lifts must be at least 1.';
  }
  if (floors > MAX_FLOORS) {
    return `Please enter at most ${MAX_FLOORS} floors.`;
  }
  if (lifts > MAX_LIFTS) {
    return `Please enter at most ${MAX_LIFTS} lifts.`;
  }
  return null;
}

function buildLifts(count) {
  const lifts = [];
  for (let id = 1; id <= count; id += 1) {
    lifts.push({ id, currentFloor: 1, isBusy: false });
  }
  return lifts;
}

form.addEventListener('submit', (event) => {
  event.preventDefault();

  const floors = Number(floorsInput.value);
  const lifts = Number(liftsInput.value);

  const error = validate(floors, lifts);
  if (error) {
    errorMsg.textContent = error;
    simulation.classList.add('hidden');
    return;
  }

  errorMsg.textContent = '';

  state.floors = floors;
  state.lifts = buildLifts(lifts);
  state.pendingRequests = [];

  simulation.classList.remove('hidden');
  console.log('state', state);
});
