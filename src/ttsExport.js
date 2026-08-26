const ttsProfiles = [
  {
    id: "studio",
    label: "Studio",
    rate: "medium",
    pitch: "+0st",
    previewRate: 0.94,
    previewPitch: 1,
    breakMs: 420
  },
  {
    id: "clinical",
    label: "Clinical",
    rate: "slow",
    pitch: "+1st",
    previewRate: 0.88,
    previewPitch: 1.05,
    breakMs: 320
  },
  {
    id: "cinematic",
    label: "Cinematic",
    rate: "slow",
    pitch: "-2st",
    previewRate: 0.82,
    previewPitch: 0.88,
    breakMs: 620
  }
];

const readModes = [
  { id: "summary", label: "Narrated Summary" },
  { id: "bases", label: "Exact Base Readout" },
  { id: "full", label: "Full File" }
];

const blockPattern = /=== LupineSeq Batch Splice Injection ===([\s\S]*?)=== End LupineSeq Batch Splice Injection ===/g;
const sequencePattern = /^>LupineSeq_(\w+)_synthetic_(\w+)_(\S+)([^\n]*)\n([AUGCT]+)/gm;

export function getTtsProfiles() {
  return ttsProfiles;
}

export function getTtsReadModes() {
  return readModes;
}

export function getDefaultTtsProfile() {
  return ttsProfiles[0];
}

export function getDefaultTtsReadMode() {
  return readModes[0];
}

function parseMetadata(header) {
  return {
    bases: header.match(/\bbases=(\d+)/)?.[1] || "",
    gc: header.match(/\bgc=([\d.]+)%/)?.[1] || "",
    structure: (header.match(/\bstructure=([^\s]+)/)?.[1] || "").replaceAll("_", " "),
    system: (header.match(/\bsystem=([^\s]+)/)?.[1] || "").replaceAll("_", " ")
  };
}

function parseInjectionBlocks(text) {
  return [...text.matchAll(blockPattern)].map((match) => {
    const body = match[1].trim();
    const lines = body.split(/\r\n|\r|\n/);
    const target = lines.find((line) => line.startsWith("Target:"))?.replace("Target:", "").trim() || "Batch Splicing";
    const sample = lines.find((line) => line.startsWith("Sample:"))?.replace("Sample:", "").trim() || "Unknown sample";
    const focus = lines.find((line) => line.startsWith("Focus:"))?.replace("Focus:", "").trim() || "Unspecified focus";
    const sequences = [...body.matchAll(sequencePattern)].map((sequenceMatch) => {
      const [, subject, sequenceType, sampleId, header, sequence] = sequenceMatch;
      return {
        bases: Number(parseMetadata(header).bases || sequence.length),
        gc: parseMetadata(header).gc,
        sampleId,
        sequence,
        sequenceType,
        structure: parseMetadata(header).structure,
        subject
      };
    });

    return {
      focus,
      sample,
      sequences,
      target
    };
  });
}

function getBaseAffirmation(text) {
  return text.replace(blockPattern, "").trim();
}

function cleanSpeechText(value) {
  return value
    .replace(/^>.*$/gm, "")
    .replace(/\b[AUGCT]{24,}\b/g, "sequence block")
    .replace(/[=_]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function withSentenceEnding(value) {
  return /[.!?]$/.test(value) ? value : `${value}.`;
}

function formatSequenceName(value) {
  const names = {
    chromosome: "chromosome",
    dna: "DNA",
    gene: "gene",
    mtdna: "mitochondrial DNA",
    rna: "RNA"
  };

  return names[value] || value;
}

function spellBases(sequence) {
  return sequence.split("").join(" ");
}

function buildSummary(blocks) {
  if (blocks.length === 0) {
    return [];
  }

  return blocks.map((block) => {
    const totalBases = block.sequences.reduce((sum, sequence) => sum + sequence.bases, 0);
    const sequenceWord = block.sequences.length === 1 ? "sequence" : "sequences";
    const sequenceSummary = block.sequences
      .map((sequence) => `${formatSequenceName(sequence.sequenceType)}, ${sequence.bases} bases${sequence.gc ? `, ${sequence.gc} percent GC` : ""}`)
      .join("; ");

    return `${block.target}. ${block.sample}. Focus ${block.focus}. ${block.sequences.length} ${sequenceWord} staged, ${totalBases} total bases. ${sequenceSummary}.`;
  });
}

function buildBaseReadout(blocks) {
  return blocks.flatMap((block) => [
    `${block.target}. ${block.sample}. Focus ${block.focus}.`,
    ...block.sequences.map((sequence) =>
      `${formatSequenceName(sequence.sequenceType)} sequence, ${sequence.bases} bases. ${spellBases(sequence.sequence)}.`
    )
  ]);
}

export function buildTtsScript(text, mode = "summary") {
  const baseAffirmation = getBaseAffirmation(text);
  const blocks = parseInjectionBlocks(text);
  const lead = baseAffirmation
    ? [`Affirmation file. ${withSentenceEnding(cleanSpeechText(baseAffirmation))}`]
    : ["Affirmation file."];

  if (mode === "bases") {
    return [...lead, ...buildBaseReadout(blocks)].join("\n\n");
  }

  if (mode === "full") {
    return cleanSpeechText(text);
  }

  return [...lead, ...buildSummary(blocks)].join("\n\n");
}

function escapeXml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\"", "&quot;")
    .replaceAll("'", "&apos;");
}

export function buildSsml(script, profile = getDefaultTtsProfile()) {
  const paragraphs = script
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
    .map((paragraph) => {
      const sentences = paragraph
        .split(/(?<=[.!?])\s+/)
        .map((sentence) => sentence.trim())
        .filter(Boolean)
        .map((sentence) => `<s>${escapeXml(sentence)}</s>`)
        .join(`<break time="${profile.breakMs}ms"/>`);
      return `<p>${sentences}</p>`;
    })
    .join("\n  ");

  return `<speak xml:lang="en-US">\n  <prosody rate="${profile.rate}" pitch="${profile.pitch}">\n  ${paragraphs}\n  </prosody>\n</speak>\n`;
}

function formatSrtTime(seconds) {
  const milliseconds = Math.floor((seconds % 1) * 1000);
  const wholeSeconds = Math.floor(seconds);
  const hours = Math.floor(wholeSeconds / 3600);
  const minutes = Math.floor((wholeSeconds % 3600) / 60);
  const secs = wholeSeconds % 60;
  const pad = (value, width = 2) => String(value).padStart(width, "0");
  return `${pad(hours)}:${pad(minutes)}:${pad(secs)},${pad(milliseconds, 3)}`;
}

function estimateDuration(text) {
  const words = text.split(/\s+/).filter(Boolean).length;
  return Math.max(2.2, words / 2.35);
}

function splitCaption(caption, maxWords = 18) {
  const words = caption.split(/\s+/).filter(Boolean);
  if (words.length <= maxWords) {
    return [caption];
  }

  const chunks = [];
  for (let index = 0; index < words.length; index += maxWords) {
    chunks.push(words.slice(index, index + maxWords).join(" "));
  }

  return chunks;
}

export function buildSrt(script) {
  const captions = script
    .split(/(?<=[.!?])\s+|\n{2,}/)
    .map((caption) => caption.trim())
    .filter(Boolean)
    .flatMap((caption) => splitCaption(caption));
  let cursor = 0;

  return captions
    .map((caption, index) => {
      const duration = estimateDuration(caption);
      const start = cursor;
      const end = cursor + duration;
      cursor = end + 0.28;
      return `${index + 1}\n${formatSrtTime(start)} --> ${formatSrtTime(end)}\n${caption}`;
    })
    .join("\n\n")
    .concat("\n");
}

export function getTtsStats(script) {
  const words = script.split(/\s+/).filter(Boolean).length;
  const estimatedSeconds = Math.ceil(words / 2.35);
  return {
    characters: script.length,
    estimatedSeconds,
    words
  };
}
