// =============================
//  NETFLIX-STYLE SUBTITLE CLIENT
// =============================
console.log("APP.JS VERSION 10 LOADED");

// Elements
const startBtn = document.getElementById("start");
const captions = document.getElementById("captions");

// State
let audioContext;
let processorNode;
let recording = false;

let lastSendTime = 0;
const SEND_EVERY_MS = 1000;   // 1-second chunks ideal for subtitle mode

// Subtitle buffers
let subtitleBuffer = "";       // build partial sentence here
let displayedSentences = [];   // only keep the last 1–2 subtitles
const MAX_SENTENCES = 2;


// =============================
//  UTILITY: float32 → int16
// =============================
function float32ToInt16(float32Array) {
    const int16 = new Int16Array(float32Array.length);
    for (let i = 0; i < float32Array.length; i++) {
        let s = Math.max(-1, Math.min(1, float32Array[i]));
        int16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
    }
    return int16;
}


// =============================
//  SUBTITLE HANDLER (Netflix style)
// =============================
function updateSubtitlesFromChunk(chunkText) {
    if (!chunkText || !chunkText.trim()) return;

    // Clean internal newlines, extra whitespace
    chunkText = chunkText.replace(/\s+/g, " ").trim();

const normalized = chunkText
    .toLowerCase()
    .replace(/[^\w\s]/g, "")
    .trim();

// Ignore very short or filler-only output
if (
    normalized.length < 4 ||
    ["thank you", "thanks", "okay", "ok", "um", "uh"].includes(normalized)
) {
    return;
}

    // Add the phrase as-is (no sentence detection)
    displayedSentences.push(chunkText);

    // Keep only the last 1–2 captions
    if (displayedSentences.length > MAX_SENTENCES) {
        displayedSentences = displayedSentences.slice(-MAX_SENTENCES);
    }

    // Render
    captions.innerHTML = "";
    for (const phrase of displayedSentences) {
        const p = document.createElement("p");
        p.textContent = phrase;
        captions.appendChild(p);
    }
}


// =============================
//  SEND PCM TO BACKEND
// =============================
async function sendAudioToServer(pcm16) {
    try {
        const resp = await fetch("http://127.0.0.1:8000/transcribe", {
            method: "POST",
            body: pcm16
        });

        if (!resp.ok) {
            console.error("Server returned error:", resp.status);
            return;
        }

        const data = await resp.json();

        updateSubtitlesFromChunk(data.text);

    } catch (err) {
        console.error("sendAudioToServer failed:", err);
    }
}

let floatBuffer = [];     // collect 1-second of audio
const REQUIRED_SAMPLES = 120000;   // 1 second at 48kHz

// =============================
//  START CAPTURE
// =============================
async function startCapture() {

    if (recording) return;
    recording = true;

    startBtn.style.display = "none";

    // Create audio context at 48kHz
    audioContext = new AudioContext({ sampleRate: 48000 });

    // Load audio worklet
    await audioContext.audioWorklet.addModule("/static/pcm-processor.js");

    // Request microphone
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const source = audioContext.createMediaStreamSource(stream);

    // Create processor node
    processorNode = new AudioWorkletNode(audioContext, "pcm-generator");

    // Handle messages from Worklet (Float32Array PCM frames)
   processorNode.port.onmessage = (event) => {
    const floats = event.data;

    // accumulate
    floatBuffer.push(...floats);

    // do we have 1 second yet?
    if (floatBuffer.length >= REQUIRED_SAMPLES) {

        // slice 1 second
        const oneSecond = floatBuffer.slice(0, REQUIRED_SAMPLES);
        floatBuffer = floatBuffer.slice(REQUIRED_SAMPLES);

        // convert to Int16
        const pcm16 = float32ToInt16(oneSecond);

        // send to backend
        sendAudioToServer(pcm16);
    }
 
};

    // Connect audio graph
    source.connect(processorNode);
    processorNode.connect(audioContext.destination); // keeps processor alive
}


// =============================
//  BUTTON HANDLER
// =============================
startBtn.onclick = startCapture;
