// CONFIG

const MIN_FLOORS = 2;   
const MAX_FLOORS = 20;
const MIN_LIFTS = 1;
const MAX_LIFTS = 10;

const FLOOR_TRAVEL_MS = 2000;
const DOOR_MS = 2500; 

const UP = 1;
const DOWN = -1;


// DATA STORE

const state = {
  floors: 0,
  lifts: [],
  pendingRequests: [], 
  generation: 0        
};

const liftElements = new Map();
const callButtons = new Map();   

function createLift(id) {
  return {
    id,
    currentFloor: 1,
    direction: 0,      
    stops: [],
    servingFloor: null,
    closingFrom: null,
    reopen: false,
    isRunning: false
  };
}

function initStore(floors, lifts) {
  state.floors = floors;
  state.lifts = Array.from({ length: lifts }, (_, i) => createLift(i + 1));
  state.pendingRequests = [];
  state.generation += 1;
  liftElements.clear();
  callButtons.clear();
}

function sameCall(a, b) {
  return a.floor === b.floor && a.direction === b.direction;
}

function callKey(call) {
  return `${call.floor}:${call.direction}`;
}

function isCallKnown(call) {
  return (
    state.pendingRequests.some((queued) => sameCall(queued, call)) ||
    state.lifts.some((lift) => lift.stops.some((stop) => sameCall(stop, call))) ||
    state.lifts.some((lift) => lift.servingFloor === call.floor)
  );
}

function addStop(lift, call) {
  lift.stops.push(call);
}

function isAhead(lift, floor) {
  if (lift.direction === UP) return floor > lift.currentFloor;
  if (lift.direction === DOWN) return floor < lift.currentFloor;
  return false;
}

function stopsAhead(lift) {
  return lift.stops.filter((stop) => isAhead(lift, stop.floor));
}

function canPickUpOnTheWay(lift, call) {
  return lift.isRunning && lift.direction === call.direction && isAhead(lift, call.floor);
}

function nearestBy(items, floor, floorOf) {
  return items.reduce((best, item) =>
    Math.abs(floorOf(item) - floor) < Math.abs(floorOf(best) - floor) ? item : best
  );
}

function isBetween(floor, from, to) {
  return floor > Math.min(from, to) && floor < Math.max(from, to);
}

// How long until this lift could open its doors on that floor, or null if it
// can't take the call at all.
function estimateArrivalMs(lift, call) {
  const travel = Math.abs(call.floor - lift.currentFloor) * FLOOR_TRAVEL_MS;

  if (!lift.isRunning) return travel;
  if (!canPickUpOnTheWay(lift, call)) return null;

  // Every stop it already owes on the way costs a full door cycle, and a
  // cycle in progress has to finish before it moves at all.
  const onTheWay = lift.stops.filter((stop) => isBetween(stop.floor, lift.currentFloor, call.floor));
  const doorCycles = onTheWay.length + (lift.servingFloor === null ? 0 : 1);

  return travel + doorCycles * 2 * DOOR_MS;
}

// UI

const DOOR_HALVES = ['left', 'right'];

function floorOffset(floor) {
  return `translateY(calc(${-(floor - 1)} * var(--floor-height)))`;
}

function createCallButton(floor, direction) {
  const isUp = direction === UP;

  const button = document.createElement('button');
  button.type = 'button';
  button.className = `call-btn call-${isUp ? 'up' : 'down'}`;
  button.dataset.floor = floor;
  button.dataset.direction = direction;
  button.textContent = isUp ? 'Up' : 'Down';
  button.setAttribute('aria-pressed', 'false');

  callButtons.set(callKey({ floor, direction }), button);
  return button;
}

function setCallLit(call, lit) {
  const button = callButtons.get(callKey(call));
  if (!button) return;

  button.classList.toggle('lit', lit);
  button.setAttribute('aria-pressed', String(lit));
}

function createFloorRow(floor) {
  const row = document.createElement('div');
  row.className = 'floor';
  row.dataset.floor = floor;

  const controls = document.createElement('div');
  controls.className = 'floor-controls';

  if (floor < state.floors) {
    controls.appendChild(createCallButton(floor, UP));
  }
  if (floor > 1) {
    controls.appendChild(createCallButton(floor, DOWN));
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
  callButtons.clear();

  const building = document.createElement('div');
  building.className = 'building';
  building.style.setProperty('--lift-count', state.lifts.length);
  building.style.setProperty('--door-ms', `${DOOR_MS}ms`);
  building.addEventListener('click', onBuildingClick);

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


// ENGINE


function onBuildingClick(event) {
  const button = event.target.closest('.call-btn');
  if (!button) return;

  handleCall({
    floor: Number(button.dataset.floor),
    direction: Number(button.dataset.direction)
  });
}

function handleCall(call) {
  if (isCallKnown(call)) return;

  const closing = state.lifts.find((lift) => lift.closingFrom === call.floor);
  if (closing) {
    closing.reopen = true;
    return;
  }

  setCallLit(call, true);

  const lift = pickLift(call);
  if (!lift) {
    state.pendingRequests.push(call);
    return;
  }

  addStop(lift, call);
  if (!lift.isRunning) runLift(lift);
}

function pickLift(call) {
  const candidates = state.lifts
    .map((lift) => ({ lift, eta: estimateArrivalMs(lift, call) }))
    .filter((candidate) => candidate.eta !== null);

  if (candidates.length === 0) return null;

  // A lift that is already running wins a tie: no need to wake a second car.
  const best = candidates.reduce((a, b) =>
    b.eta < a.eta || (b.eta === a.eta && b.lift.isRunning && !a.lift.isRunning) ? b : a
  );

  return best.lift;
}

function takePendingCallsOnTheWay(lift) {
  for (let i = state.pendingRequests.length - 1; i >= 0; i -= 1) {
    if (canPickUpOnTheWay(lift, state.pendingRequests[i])) {
      addStop(lift, state.pendingRequests.splice(i, 1)[0]);
    }
  }
}

function nextDirection(lift) {
  if (stopsAhead(lift).length > 0) return lift.direction;

  const nearest = nearestBy(lift.stops, lift.currentFloor, (stop) => stop.floor);
  return Math.sign(nearest.floor - lift.currentFloor) || lift.direction;
}

function stopHere(lift) {
  const here = lift.stops.filter((stop) => stop.floor === lift.currentFloor);
  if (here.length === 0) return null;

  const sameWay = here.find((stop) => stop.direction === lift.direction);
  if (sameWay) return sameWay;

  return stopsAhead(lift).length === 0 ? here[0] : null;
}

async function runLift(lift) {
  const generation = state.generation;
  lift.isRunning = true;

  while (state.generation === generation) {
    takePendingCallsOnTheWay(lift);

    if (lift.stops.length === 0) {
      const next = state.pendingRequests.shift();
      if (!next) break;
      addStop(lift, next);
      continue;
    }

    lift.direction = nextDirection(lift);

    const stop = stopHere(lift);
    if (stop) {
      lift.stops.splice(lift.stops.indexOf(stop), 1);
      setCallLit(stop, false);

      await openAndCloseDoors(lift);
      continue;
    }

    await moveOneFloor(lift);
  }

  lift.direction = 0;
  lift.isRunning = false;
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}


async function moveOneFloor(lift) {
  const element = liftElements.get(lift.id);
  const nextFloor = lift.currentFloor + lift.direction;

  element.style.transitionDuration = `${FLOOR_TRAVEL_MS}ms`;
  element.style.transform = floorOffset(nextFloor);
  await wait(FLOOR_TRAVEL_MS);

  lift.currentFloor = nextFloor;
}

async function openAndCloseDoors(lift) {
  const element = liftElements.get(lift.id);

  do {
    lift.reopen = false;

    lift.servingFloor = lift.currentFloor;
    element.classList.add('doors-open');
    await wait(DOOR_MS);

    lift.servingFloor = null;
    lift.closingFrom = lift.currentFloor;
    element.classList.remove('doors-open');
    await wait(DOOR_MS);
    lift.closingFrom = null;
  } while (lift.reopen);
}

// WIRING

const form = document.getElementById('setup-form');
const floorsInput = document.getElementById('floors-input');
const liftsInput = document.getElementById('lifts-input');
const errorMsg = document.getElementById('error-msg');
const simulation = document.getElementById('simulation');

function validate(floors, lifts) {
  if (!Number.isInteger(floors) || !Number.isInteger(lifts)) {
    return 'Please enter whole numbers for both fields.';
  }
  if (floors < MIN_FLOORS) {
    return `Please enter at least ${MIN_FLOORS} floors — a lift needs somewhere to go.`;
  }
  if (lifts < MIN_LIFTS) {
    return `Please enter at least ${MIN_LIFTS} lift.`;
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
