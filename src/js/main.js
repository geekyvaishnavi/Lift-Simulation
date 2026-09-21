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

const DOOR_HALVES = ['left', 'right'];

function floorOffset(floor) {
  return `translateY(calc(${-(floor - 1)} * var(--floor-height)))`;
}

function createCallButton(floor, direction) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = `call-btn call-${direction}`;
  button.dataset.floor = floor;
  button.dataset.direction = direction;
  button.textContent = direction === 'up' ? 'Up' : 'Down';
  return button;
}

function createFloorRow(floor) {
  const row = document.createElement('div');
  row.className = 'floor';
  row.dataset.floor = floor;

  const controls = document.createElement('div');
  controls.className = 'floor-controls';

  if (floor < state.floors) {
    controls.appendChild(createCallButton(floor, 'up'));
  }
  if (floor > 1) {
    controls.appendChild(createCallButton(floor, 'down'));
  }

  const label = document.createElement('span');
  label.className = 'floor-label';
  label.textContent = `Floor ${floor}`;

  row.append(controls, label);
  return row;
}

function createLiftElement(lift) {
  const element = document.createElement('div');
  element.className = 'lift';
  element.dataset.liftId = lift.id;
  element.style.left = `calc(${lift.id - 1} * (var(--lift-width) + var(--lift-gap)))`;
  element.style.transform = floorOffset(lift.currentFloor);

  DOOR_HALVES.forEach((side) => {
    const door = document.createElement('div');
    door.className = `door door-${side}`;
    element.appendChild(door);
  });

  return element;
}

function renderSimulation() {
  simulation.innerHTML = '';
  liftElements.clear();

  const building = document.createElement('div');
  building.className = 'building';

  for (let floor = state.floors; floor >= 1; floor -= 1) {
    building.appendChild(createFloorRow(floor));
  }

  const shaft = document.createElement('div');
  shaft.className = 'shaft';

  state.lifts.forEach((lift) => {
    const element = createLiftElement(lift);
    liftElements.set(lift.id, element);
    shaft.appendChild(element);
  });

  building.appendChild(shaft);
  simulation.appendChild(building);
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
  renderSimulation();

  simulation.classList.remove('hidden');
});
