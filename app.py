from flask import Flask, request, jsonify
from flask_cors import CORS
import numpy as np
import requests
import io
import wave
import time

app = Flask(__name__, static_folder="static")
CORS(app)

WHISPER_URL = "http://host.docker.internal:9000/inference"

SAMPLE_RATE_IN = 48000   # from browser
SAMPLE_RATE_OUT = 16000  # whisper expects 16k


def resample_to_16k(pcm_bytes, original_rate=SAMPLE_RATE_IN):
    """Convert PCM16 raw audio from original_rate -> 16k."""
    if not pcm_bytes:
        return b""

    pcm_int16 = np.frombuffer(pcm_bytes, dtype=np.int16).astype(np.float32)

    duration = len(pcm_int16) / original_rate
    target_length = int(duration * SAMPLE_RATE_OUT)

    if target_length <= 0:
        return b""

    resampled = np.interp(
        np.linspace(0, len(pcm_int16), target_length, endpoint=False),
        np.arange(len(pcm_int16)),
        pcm_int16,
    )

    return resampled.astype(np.int16).tobytes()


def pcm_to_wav_bytes(pcm_bytes, sample_rate=SAMPLE_RATE_OUT):
    """Wrap raw PCM16 mono into a WAV file in memory."""
    buf = io.BytesIO()
    with wave.open(buf, "wb") as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)  # int16
        wf.setframerate(sample_rate)
        wf.writeframes(pcm_bytes)
    return buf.getvalue()


@app.route("/")
def index():
    return app.send_static_file("index.html")


@app.route("/transcribe", methods=["POST"])
def transcribe():
    chunk = request.data
    if not chunk:
        return jsonify({"text": ""})

    # 1) Resample just THIS chunk to 16k
    pcm_16k = resample_to_16k(chunk, SAMPLE_RATE_IN)
    print("chunk_16k size:", len(pcm_16k))

    if not pcm_16k:
        return jsonify({"text": ""})

    # 2) Wrap in WAV
    wav_bytes = pcm_to_wav_bytes(pcm_16k)

    files = {
        "file": ("audio.wav", wav_bytes, "audio/wav")
    }

    # 3) Send to whisper server
    t0 = time.time()
    resp = requests.post(WHISPER_URL, files=files)
    t1 = time.time()

    print("Whisper processing time:", t1 - t0)

    if resp.status_code != 200:
        print("Whisper server error:", resp.text)
        return jsonify({"text": ""})

    try:
        data = resp.json()
    except Exception as e:
        print("JSON parse error:", e, "body:", resp.text[:200])
        return jsonify({"text": ""})

    text = (data.get("text") or "").strip()

    return jsonify({"text": text})

@app.after_request
def add_no_cache_headers(response):
    response.headers["Cache-Control"] = "no-store"
    return response

if __name__ == "__main__":
    print(">>> Starting Flask server…")
    app.run(host="0.0.0.0", port=8000)
