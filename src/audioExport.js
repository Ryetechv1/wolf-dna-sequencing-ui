import meSpeakConfig from "mespeak/src/mespeak_config.json";
import enUsVoice from "mespeak/voices/en/en-us.json";

let meSpeakPromise;

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

async function loadMeSpeak() {
  if (!meSpeakPromise) {
    meSpeakPromise = import("mespeak").then((module) => {
      const meSpeak = module.default || module;
      if (!meSpeak.isConfigLoaded?.()) {
        meSpeak.loadConfig(meSpeakConfig);
      }
      if (!meSpeak.isVoiceLoaded?.("en/en-us")) {
        meSpeak.loadVoice(enUsVoice);
      }
      return meSpeak;
    });
  }

  return meSpeakPromise;
}

function sanitizeSpeechText(script) {
  return script
    .replace(/<[^>]+>/g, " ")
    .replace(/&(?:amp|lt|gt|quot|apos);/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function splitSpeechSegments(script, maxLength = 850) {
  const parts = sanitizeSpeechText(script)
    .split(/(?<=[.!?])\s+|\n{2,}/)
    .map((part) => part.trim())
    .filter(Boolean);
  const segments = [];
  let current = "";

  parts.forEach((part) => {
    const next = current ? `${current} ${part}` : part;
    if (next.length > maxLength && current) {
      segments.push(current);
      current = part;
    } else {
      current = next;
    }
  });

  if (current) {
    segments.push(current);
  }

  return segments.length > 0 ? segments : ["Affirmation export ready."];
}

function toUint8Array(value) {
  if (value instanceof Uint8Array) {
    return value;
  }

  if (value instanceof ArrayBuffer) {
    return new Uint8Array(value);
  }

  if (Array.isArray(value)) {
    return Uint8Array.from(value);
  }

  throw new Error("Unsupported audio buffer returned by TTS engine.");
}

function readString(bytes, offset, length) {
  return Array.from(bytes.slice(offset, offset + length), (byte) => String.fromCharCode(byte)).join("");
}

function parseWav(bytes) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (readString(bytes, 0, 4) !== "RIFF" || readString(bytes, 8, 4) !== "WAVE") {
    throw new Error("TTS engine did not return a WAV stream.");
  }

  let cursor = 12;
  let format;
  let dataOffset = 0;
  let dataSize = 0;

  while (cursor + 8 <= bytes.length) {
    const chunkId = readString(bytes, cursor, 4);
    const chunkSize = view.getUint32(cursor + 4, true);
    const chunkStart = cursor + 8;

    if (chunkId === "fmt ") {
      format = {
        audioFormat: view.getUint16(chunkStart, true),
        bitsPerSample: view.getUint16(chunkStart + 14, true),
        channels: view.getUint16(chunkStart + 2, true),
        sampleRate: view.getUint32(chunkStart + 4, true)
      };
    } else if (chunkId === "data") {
      dataOffset = chunkStart;
      dataSize = chunkSize;
    }

    cursor = chunkStart + chunkSize + (chunkSize % 2);
  }

  if (!format || !dataOffset || !dataSize) {
    throw new Error("WAV stream is missing audio data.");
  }

  if (format.audioFormat !== 1) {
    throw new Error("Only PCM WAV output is supported.");
  }

  const bytesPerSample = format.bitsPerSample / 8;
  const frameCount = Math.floor(dataSize / bytesPerSample / format.channels);
  const samples = new Int16Array(frameCount);

  for (let frame = 0; frame < frameCount; frame += 1) {
    let mixed = 0;
    for (let channel = 0; channel < format.channels; channel += 1) {
      const offset = dataOffset + (frame * format.channels + channel) * bytesPerSample;
      if (format.bitsPerSample === 8) {
        mixed += (view.getUint8(offset) - 128) << 8;
      } else if (format.bitsPerSample === 16) {
        mixed += view.getInt16(offset, true);
      } else if (format.bitsPerSample === 32) {
        mixed += view.getInt32(offset, true) / 65536;
      } else {
        throw new Error(`Unsupported WAV bit depth: ${format.bitsPerSample}.`);
      }
    }
    samples[frame] = clamp(Math.round(mixed / format.channels), -32768, 32767);
  }

  return {
    sampleRate: format.sampleRate,
    samples
  };
}

function concatSamples(chunks) {
  const length = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const output = new Int16Array(length);
  let cursor = 0;

  chunks.forEach((chunk) => {
    output.set(chunk, cursor);
    cursor += chunk.length;
  });

  return output;
}

function writeString(view, offset, value) {
  for (let index = 0; index < value.length; index += 1) {
    view.setUint8(offset + index, value.charCodeAt(index));
  }
}

function writeWav(samples, sampleRate) {
  const headerSize = 44;
  const dataSize = samples.length * 2;
  const buffer = new ArrayBuffer(headerSize + dataSize);
  const view = new DataView(buffer);

  writeString(view, 0, "RIFF");
  view.setUint32(4, 36 + dataSize, true);
  writeString(view, 8, "WAVE");
  writeString(view, 12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeString(view, 36, "data");
  view.setUint32(40, dataSize, true);

  samples.forEach((sample, index) => {
    view.setInt16(headerSize + index * 2, sample, true);
  });

  return new Uint8Array(buffer);
}

function getSpeechOptions(profile, voiceOption) {
  return {
    amplitude: voiceOption.amplitude || 100,
    pitch: clamp((profile.audioPitch || 50) + (voiceOption.pitchOffset || 0), 0, 99),
    rawdata: "array",
    speed: clamp((profile.audioSpeed || 154) + (voiceOption.speedOffset || 0), 80, 320),
    variant: voiceOption.variant,
    voice: "en/en-us",
    wordgap: Math.max(0, (profile.audioWordGap || 0) + (voiceOption.wordGapOffset || 0))
  };
}

async function renderPcm(script, profile, voiceOption) {
  const meSpeak = await loadMeSpeak();
  const options = getSpeechOptions(profile, voiceOption);
  const silenceMs = profile.breakMs || 320;
  const chunks = [];
  let sampleRate = 0;

  splitSpeechSegments(script).forEach((segment, index, segments) => {
    const wavBytes = toUint8Array(meSpeak.speak(segment, options));
    const parsed = parseWav(wavBytes);
    if (!sampleRate) {
      sampleRate = parsed.sampleRate;
    } else if (sampleRate !== parsed.sampleRate) {
      throw new Error("TTS chunks returned inconsistent sample rates.");
    }

    chunks.push(parsed.samples);
    if (index < segments.length - 1 && silenceMs > 0) {
      chunks.push(new Int16Array(Math.round((sampleRate * silenceMs) / 1000)));
    }
  });

  return {
    sampleRate,
    samples: concatSamples(chunks)
  };
}

async function encodeMp3(samples, sampleRate) {
  const module = await import("@breezystack/lamejs");
  const Mp3Encoder = module.Mp3Encoder || module.default?.Mp3Encoder;
  if (!Mp3Encoder) {
    throw new Error("MP3 encoder is not available.");
  }

  const encoder = new Mp3Encoder(1, sampleRate, 128);
  const frames = [];
  const blockSize = 1152;

  for (let offset = 0; offset < samples.length; offset += blockSize) {
    const frame = encoder.encodeBuffer(samples.subarray(offset, offset + blockSize));
    if (frame.length > 0) {
      frames.push(frame);
    }
  }

  const tail = encoder.flush();
  if (tail.length > 0) {
    frames.push(tail);
  }

  return new Blob(frames, { type: "audio/mpeg" });
}

export async function createTtsAudioBlob(script, profile, voiceOption, format = "wav") {
  const { sampleRate, samples } = await renderPcm(script, profile, voiceOption);

  if (format === "mp3") {
    return {
      blob: await encodeMp3(samples, sampleRate),
      extension: "mp3",
      mimeType: "audio/mpeg"
    };
  }

  return {
    blob: new Blob([writeWav(samples, sampleRate)], { type: "audio/wav" }),
    extension: "wav",
    mimeType: "audio/wav"
  };
}
