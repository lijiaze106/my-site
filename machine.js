
const powerSwitch = document.getElementById("machine-switch");
const machineHand = document.getElementById("machine-hand");
const machineMessage = document.getElementById("machine-message");
const machineStatus = document.getElementById("machine-status");
const machineLight = document.getElementById("machine-light");
const resetButton = document.getElementById("reset-button");

let isBusy = false;
let actionTimer = null;

function resetMachine() {
  clearTimeout(actionTimer);
  machineHand.classList.remove("active");
  powerSwitch.checked = false;
  machineLight.classList.remove("on");
  machineMessage.textContent = "Go ahead. Turn me on.";
  machineStatus.textContent = "The machine is sleeping.";
  isBusy = false;
}

function activateMachine() {
  if (isBusy) {
    powerSwitch.checked = false;
    return;
  }

  if (!powerSwitch.checked) {
    machineStatus.textContent = "The machine is sleeping.";
    machineLight.classList.remove("on");
    return;
  }

  isBusy = true;
  machineLight.classList.add("on");
  machineMessage.textContent = "Oh no... what have you done?";
  machineStatus.textContent = "The machine is preparing a response.";

  actionTimer = setTimeout(() => {
    machineHand.classList.remove("active");

    // Restart the animation.
    void machineHand.offsetWidth;
    machineHand.classList.add("active");

    machineMessage.textContent = "I said no!";
    machineStatus.textContent = "The machine is switching itself off.";

    actionTimer = setTimeout(() => {
      powerSwitch.checked = false;
      machineLight.classList.remove("on");
      machineMessage.textContent = "There. All better.";
      machineStatus.textContent = "The machine has turned itself off.";

      actionTimer = setTimeout(() => {
        machineHand.classList.remove("active");
        machineMessage.textContent = "Go ahead. Turn me on.";
        machineStatus.textContent = "The machine is sleeping.";
        isBusy = false;
      }, 1000);
    }, 500);
  }, 500);
}

powerSwitch.addEventListener("change", activateMachine);
resetButton.addEventListener("click", resetMachine);