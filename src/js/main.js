const MAX_FLOORS = 20;
const MAX_LIFTS = 10;


const state = {
  floors: 0,
  lifts: [],           // { id, currentFloor, targetFloor, isBusy }
  pendingRequests: []  
};

const liftElements = new Map();

function createLift(id) {
  return {
    id,
    currentFloor: 1,
    targetFloor: null,  
    isBusy: false       
  };
}

function initStore(floors, lifts) {
  state.floors = floors;
  state.lifts = Array.from({ length: lifts }, (_, i) => createLift(i + 1));
  state.pendingRequests = [];
  liftElements.clear();
}

function getFreeLifts() {
  return state.lifts.filter((lift) => !lift.isBusy);
}

function isFloorCovered(floor) {
  return state.lifts.some(
    (lift) => lift.targetFloor === floor || (!lift.isBusy && lift.currentFloor === floor)
  );
}

function assignLift(lift, floor) {
  lift.isBusy = true;
  lift.targetFloor = floor;
}

function releaseLift(lift) {
  lift.currentFloor = lift.targetFloor;
  lift.targetFloor = null;
  lift.isBusy = false;
}

function enqueueRequest(floor) {
  state.pendingRequests.push(floor);
}

function dequeueRequest() {
  return state.pendingRequests.shift() ?? null;
}



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
  initStore(floors, lifts);

  simulation.classList.remove('hidden');
  console.log('state', state);
});
