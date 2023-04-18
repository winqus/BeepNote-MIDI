let isRegistering = false;
let registeredNotes = new Set();
let beepSound = null;

function loadBeepSound(url) {
  return new Promise((resolve, reject) => {
    const audio = new Audio();
    audio.addEventListener("canplaythrough", () => {
      resolve(audio);
    });
    audio.addEventListener("error", reject);
    audio.src = url;
  });
}

async function init() {
  beepSound = await loadBeepSound("short-beep.wav");
}

init();

function playSound() {
  if (beepSound) {
    beepSound.currentTime = 0;
    beepSound.play();
  }
}

navigator.requestMIDIAccess().then(onMIDISuccess, onMIDIFailure);

function onMIDISuccess(midiAccess) {
  const input = midiAccess.inputs.values().next().value;
  input.onmidimessage = onMIDIMessage;
  document.getElementById("midi-message").innerText = "MIDI connected";
}

function onMIDIFailure() {
  console.error("Failed to access MIDI devices");
  document.getElementById("midi-message").innerText = "MIDI not available";
}

function setRegisteredNotesCookie() {
  const notesArray = Array.from(registeredNotes);
  const notesJson = JSON.stringify(notesArray);
  document.cookie = `registeredNotes=${notesJson}`;
}

function loadRegisteredNotesCookie() {
  const cookie = document.cookie
    .split(";")
    .find((cookie) => cookie.startsWith("registeredNotes="));
  if (cookie) {
    const notesJson = cookie.split("=")[1];
    const notesArray = JSON.parse(notesJson);
    registeredNotes = new Set(notesArray);
    const notes = Array.from(registeredNotes)
      .sort((a, b) => a - b)
      .map((note) => midiToNoteName(note))
      .join(" ");
    document.getElementById("registeredNotes").innerHTML = notes;
  }
}

function clearRegisteredNotesCookie() {
  document.cookie =
    "registeredNotes=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
}

function toggleRegistration() {
  isRegistering = !isRegistering;
  const registerButton = document.getElementById("registerButton");
  registerButton.innerHTML = isRegistering
    ? "Stop Registration"
    : "Start Registration";
}

function addNoteToRegister(noteNumber) {
  registeredNotes.add(noteNumber);
  const notes = Array.from(registeredNotes)
    .sort((a, b) => a - b)
    .map((note) => midiToNoteName(note))
    .join(" ");
  document.getElementById("registeredNotes").innerHTML = notes;
  setRegisteredNotesCookie();
}

function clearNoteRegister() {
  registeredNotes = new Set();
  document.getElementById("registeredNotes").innerHTML = "";
  clearRegisteredNotesCookie();
}

function midiToNoteName(midiNoteNumber) {
  const octave = Math.floor(midiNoteNumber / 12) - 1;
  const notes = [
    "C",
    "C#",
    "D",
    "D#",
    "E",
    "F",
    "F#",
    "G",
    "G#",
    "A",
    "A#",
    "B",
  ];
  const note = notes[midiNoteNumber % 12];
  return note + octave;
}

const activeNotes = new Set();

function onMIDIMessage(event) {
  const noteNumber = event.data[1];

  if (event.data[0] === 144) {
    activeNotes.add(noteNumber);
    if (isRegistering) {
      addNoteToRegister(noteNumber);
    } else {
      if (!registeredNotes.has(noteNumber)) {
        if (beepCheckbox.checked) {
          playSound();
        }
      }
    }
  } else if (event.data[0] === 128) {
    activeNotes.delete(noteNumber);
  }

  const keys = document.querySelectorAll(".key");
  keys.forEach((key) => {
    const keyNote = key.dataset.note;
    if (
      activeNotes.has(Number(keyNote)) ||
      [...activeNotes].some((note) => note % 12 === Number(keyNote) % 12)
    ) {
      key.classList.add("highlight");
    } else {
      key.classList.remove("highlight");
    }
  });
}

const beepCheckbox = document.getElementById("myCheckbox");

const registerButton = document.getElementById("registerButton");
registerButton.addEventListener("click", toggleRegistration);

const clearRegisterButton = document.getElementById("clearRegisterButton");
clearRegisterButton.addEventListener("click", clearNoteRegister);

window.onload = loadRegisteredNotesCookie;
