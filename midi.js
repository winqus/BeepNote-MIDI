let isRegistering = false;
var registeredNotes = new Set();
let beepSound = null;
const beepCheckbox = document.getElementById('myCheckbox');
const registerButton = document.getElementById('registerButton');
registerButton.addEventListener('click', toggleRegistration);
const clearRegisterButton = document.getElementById('clearRegisterButton');
clearRegisterButton.addEventListener('click', clearNoteRegister);

function loadBeepSound(url) {
  return new Promise((resolve, reject) => {
    const audio = new Audio();
    audio.addEventListener('canplaythrough', () => {
      resolve(audio);
    });
    audio.addEventListener('error', reject);
    audio.src = url;
  });
}

async function initAudio() {
  beepSound = await loadBeepSound('short-beep.wav');
}

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
  document.getElementById('midi-message').innerText = 'MIDI connected';
}

function onMIDIFailure() {
  console.error('Failed to access MIDI devices');
  document.getElementById('midi-message').innerText = 'MIDI not available';
}

function setRegisteredNotesCookie() {
  const notesArray = Array.from(registeredNotes);
  const notesJson = JSON.stringify(notesArray);
  document.cookie = `registeredNotes=${notesJson}`;
}

function loadRegisteredNotesCookie() {
  const cookie = document.cookie.split(';').find((cookie) => cookie.startsWith('registeredNotes='));
  if (cookie) {
    const notesJson = cookie.split('=')[1];
    const notesArray = JSON.parse(notesJson).map((note) => Number(note));
    registeredNotes = new Set(notesArray);
    const notes = Array.from(registeredNotes)
      .sort((a, b) => a - b)
      .map((note) => midiToNoteName(note))
      .join(' ');
    document.getElementById('registeredNotes').innerHTML = notes;
  }
}

function clearRegisteredNotesCookie() {
  document.cookie = 'registeredNotes=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
}

function toggleRegistration() {
  isRegistering = !isRegistering;
  const registerButton = document.getElementById('registerButton');
  registerButton.innerHTML = isRegistering ? 'Stop Registration' : 'Start Registration';
}

function addNoteToRegister(noteNumber) {
  registeredNotes.add(Number(noteNumber));
  const notes = Array.from(registeredNotes)
    .sort((a, b) => a - b)
    .map((note) => midiToNoteName(note))
    .join(' ');
  document.getElementById('registeredNotes').innerHTML = notes;
  setRegisteredNotesCookie();
}

function clearNoteRegister() {
  registeredNotes = new Set();
  document.getElementById('registeredNotes').innerHTML = '';
  clearRegisteredNotesCookie();
}

function midiToNoteName(midiNoteNumber) {
  const octave = Math.floor(midiNoteNumber / 12) - 1;
  const notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const note = notes[midiNoteNumber % 12];
  return note + octave;
}

const activeNotes = new Set();
function onMIDIMessage(event) {
  const noteNumber = Number(event.data[1]);

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

  const keyElements = document.querySelectorAll('.key');
  const getNoteIndex = (noteNumber) => noteNumber % 12;
  const isSameNote = (note1, note2) => getNoteIndex(Number(note1)) === getNoteIndex(Number(note2));
  const activeAndRegisterdNotes = [...activeNotes].filter((note) => registeredNotes.has(note));

  keyElements.forEach((keyElement) => {
    const keyNote = Number(keyElement.dataset.note);

    if ([...activeNotes].some((note) => isSameNote(note, keyNote))) {
      if (
        [...activeNotes].filter((note) => isSameNote(note, keyNote)).length ===
        activeAndRegisterdNotes.filter((note) => isSameNote(note, keyNote)).length
      ) {
        keyElement.classList.add('registered-highlight');
        keyElement.classList.remove('highlight');
      } else {
        keyElement.classList.add('highlight');
        keyElement.classList.remove('registered-highlight');
      }
    } else {
      keyElement.classList.remove('registered-highlight');
      keyElement.classList.remove('highlight');
    }
  });
}

window.onload = loadRegisteredNotesCookie;
initAudio();