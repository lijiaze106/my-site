
const powerSwitch = document.getElementById("machine-switch");
const machineHand = document.getElementById("machine-hand");
const machineMessage = document.getElementById("machine-message");
const machineStatus = document.getElementById("machine-status");
const machineLight = document.getElementById("machine-light");
const resetButton = document.getElementById("reset-button");
const machine = document.querySelector(".machine");
const machineFace = document.querySelector(".machine-face");
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

let isBusy = false;
let actionTimer = null;
let dragState = null;

function resetMachine() {
  clearTimeout(actionTimer);
  machineHand.classList.remove("active");
  machineFace.classList.remove("is-responding");
  machine.style.removeProperty("--orbit-x");
  machine.style.removeProperty("--orbit-y");
  resetMachineTilt();
  powerSwitch.checked = false;
  machineLight.classList.remove("on");
  machineMessage.textContent = "Awaiting a questionable decision.";
  machineStatus.textContent = "The machine is standing by. Make your move.";
  isBusy = false;
}

function activateMachine() {
  if (isBusy) {
    powerSwitch.checked = false;
    return;
  }

  if (!powerSwitch.checked) {
    machineStatus.textContent = "The machine is standing by. Make your move.";
    machineLight.classList.remove("on");
    return;
  }

  isBusy = true;
  machineLight.classList.add("on");
  machineMessage.textContent = "Well, that was unnecessary.";
  machineStatus.textContent = "The machine is preparing its rebuttal.";

  actionTimer = setTimeout(() => {
    machineHand.classList.remove("active");
    machineFace.classList.add("is-responding");

    // Restart the animation.
    void machineHand.offsetWidth;
    machineHand.classList.add("active");

    machineMessage.textContent = "Absolutely not.";
    machineStatus.textContent = "The machine is switching itself off.";

    actionTimer = setTimeout(() => {
      powerSwitch.checked = false;
      machineLight.classList.remove("on");
      machineMessage.textContent = "Point made.";
      machineStatus.textContent = "The machine has turned itself off.";

      actionTimer = setTimeout(() => {
        machineHand.classList.remove("active");
        machineFace.classList.remove("is-responding");
        machineMessage.textContent = "Awaiting a questionable decision.";
        machineStatus.textContent = "The machine is standing by. Make your move.";
        isBusy = false;
      }, 1000);
    }, 500);
  }, 500);
}

function resetMachineTilt() {
  machine.classList.remove("is-tilting");
  machine.style.removeProperty("--tilt-x");
  machine.style.removeProperty("--tilt-y");
  machine.style.removeProperty("--shine-x");
  machine.style.removeProperty("--shine-y");
}

function clampAngle(angle) {
  return Math.max(-35, Math.min(35, angle));
}

function finishDrag(event) {
  if (!dragState || dragState.pointerId !== event.pointerId) {
    return;
  }

  if (machine.hasPointerCapture(event.pointerId)) {
    machine.releasePointerCapture(event.pointerId);
  }

  dragState = null;
  machine.classList.remove("is-dragging");
}

machine.addEventListener("pointerdown", event => {
  if (reducedMotion.matches || event.button !== 0 || event.target.closest(".switch")) {
    return;
  }

  dragState = {
    pointerId: event.pointerId,
    startX: event.clientX,
    startY: event.clientY,
    orbitX: Number.parseFloat(machine.style.getPropertyValue("--orbit-x")) || 0,
    orbitY: Number.parseFloat(machine.style.getPropertyValue("--orbit-y")) || 0,
    moved: false
  };
  machine.setPointerCapture(event.pointerId);
});

machine.addEventListener("pointermove", event => {
  if (reducedMotion.matches) {
    return;
  }

  const bounds = machine.getBoundingClientRect();
  const x = (event.clientX - bounds.left) / bounds.width;
  const y = (event.clientY - bounds.top) / bounds.height;

  if (dragState?.pointerId === event.pointerId) {
    const deltaX = event.clientX - dragState.startX;
    const deltaY = event.clientY - dragState.startY;
    dragState.moved ||= Math.abs(deltaX) + Math.abs(deltaY) > 3;

    if (dragState.moved) {
      machine.classList.add("is-dragging");
      machine.classList.remove("is-tilting");
      machine.style.removeProperty("--tilt-x");
      machine.style.removeProperty("--tilt-y");
      machine.style.setProperty("--orbit-x", `${clampAngle(dragState.orbitX - deltaY * 0.35)}deg`);
      machine.style.setProperty("--orbit-y", `${clampAngle(dragState.orbitY + deltaX * 0.4)}deg`);
      machine.style.setProperty("--shine-x", `${x * 100}%`);
      machine.style.setProperty("--shine-y", `${y * 100}%`);
    }

    return;
  }

  if (event.pointerType === "touch") {
    return;
  }

  machine.classList.add("is-tilting");
  machine.style.setProperty("--tilt-x", `${(0.5 - y) * 10}deg`);
  machine.style.setProperty("--tilt-y", `${(x - 0.5) * 10}deg`);
  machine.style.setProperty("--shine-x", `${x * 100}%`);
  machine.style.setProperty("--shine-y", `${y * 100}%`);
});

machine.addEventListener("pointerleave", resetMachineTilt);
machine.addEventListener("pointerup", finishDrag);
machine.addEventListener("pointercancel", finishDrag);
machine.addEventListener("keydown", event => {
  if (reducedMotion.matches) {
    return;
  }

  const orbitX = Number.parseFloat(machine.style.getPropertyValue("--orbit-x")) || 0;
  const orbitY = Number.parseFloat(machine.style.getPropertyValue("--orbit-y")) || 0;
  const step = 6;

  if (event.key === "ArrowUp") {
    machine.style.setProperty("--orbit-x", `${clampAngle(orbitX + step)}deg`);
  } else if (event.key === "ArrowDown") {
    machine.style.setProperty("--orbit-x", `${clampAngle(orbitX - step)}deg`);
  } else if (event.key === "ArrowLeft") {
    machine.style.setProperty("--orbit-y", `${clampAngle(orbitY - step)}deg`);
  } else if (event.key === "ArrowRight") {
    machine.style.setProperty("--orbit-y", `${clampAngle(orbitY + step)}deg`);
  } else {
    return;
  }

  event.preventDefault();
});
reducedMotion.addEventListener("change", event => {
  if (event.matches) {
    dragState = null;
    machine.classList.remove("is-dragging");
    resetMachineTilt();
    machine.style.removeProperty("--orbit-x");
    machine.style.removeProperty("--orbit-y");
  }
});

powerSwitch.addEventListener("change", activateMachine);
resetButton.addEventListener("click", resetMachine);