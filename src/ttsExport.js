const ttsProfiles = [
  {
    id: "studio",
    label: "Studio",
    rate: "medium",
    pitch: "+0st",
    audioPitch: 50,
    audioSpeed: 154,
    audioWordGap: 1,
    previewRate: 0.94,
    previewPitch: 1,
    breakMs: 420
  },
  {
    id: "clinical",
    label: "Clinical",
    rate: "slow",
    pitch: "+1st",
    audioPitch: 56,
    audioSpeed: 132,
    audioWordGap: 1,
    previewRate: 0.88,
    previewPitch: 1.05,
    breakMs: 320
  },
  {
    id: "cinematic",
    label: "Cinematic",
    rate: "slow",
    pitch: "-2st",
    audioPitch: 38,
    audioSpeed: 118,
    audioWordGap: 3,
    previewRate: 0.82,
    previewPitch: 0.88,
    breakMs: 620
  },
  {
    id: "broadcast",
    label: "Broadcast",
    rate: "medium",
    pitch: "+0st",
    audioPitch: 48,
    audioSpeed: 174,
    audioWordGap: 0,
    previewRate: 1.04,
    previewPitch: 1,
    breakMs: 280
  },
  {
    id: "meditative",
    label: "Meditative",
    rate: "x-slow",
    pitch: "+2st",
    audioPitch: 62,
    audioSpeed: 104,
    audioWordGap: 5,
    previewRate: 0.72,
    previewPitch: 1.12,
    breakMs: 760
  },
  {
    id: "field",
    label: "Field Log",
    rate: "medium",
    pitch: "-1st",
    audioPitch: 44,
    audioSpeed: 148,
    audioWordGap: 1,
    previewRate: 0.98,
    previewPitch: 0.94,
    breakMs: 360
  },
  {
    id: "oracle",
    label: "Oracle",
    rate: "slow",
    pitch: "+3st",
    audioPitch: 66,
    audioSpeed: 96,
    audioWordGap: 6,
    previewRate: 0.68,
    previewPitch: 1.18,
    breakMs: 860
  },
  {
    id: "rapid",
    label: "Rapid Review",
    rate: "fast",
    pitch: "+0st",
    audioPitch: 52,
    audioSpeed: 214,
    audioWordGap: 0,
    previewRate: 1.18,
    previewPitch: 1,
    breakMs: 180
  }
];

const readModes = [
  { id: "affirmations", label: "Affirmation List" },
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

function formatSampleLabel(sample) {
  return sample.replace(/\s*\([^)]*\)\s*$/, "").trim() || "the selected sample";
}

function formatSubject(value) {
  if (value === "wolf") return "wolf";
  if (value === "human") return "human";
  return value ? value.replace(/[_-]+/g, " ").toLowerCase() : "sample";
}

function extractFocusSystem(block) {
  const firstSequence = block.sequences[0];
  const parenthetical = block.focus.match(/\(([^)]*)\)/)?.[1] || "";

  return {
    focus: firstSequence?.structure || block.focus.replace(/\s*\([^)]*\)\s*$/, "").trim() || "the selected focus",
    system: firstSequence?.system || parenthetical
  };
}

function toAffirmationLine(value) {
  const cleaned = withSentenceEnding(cleanSpeechText(value).replace(/^[-*\d.)\s]+/, ""));
  if (!cleaned) {
    return "";
  }

  if (/^i affirm\b/i.test(cleaned)) {
    return `I${cleaned.slice(1)}`;
  }

  if (/^i\s/i.test(cleaned)) {
    return `I affirm that I${cleaned.slice(1)}`;
  }

  const normalized = cleaned.charAt(0).toLowerCase() + cleaned.slice(1);
  return `I affirm ${normalized}`;
}

function buildBaseAffirmations(text) {
  const baseAffirmation = getBaseAffirmation(text);
  if (!baseAffirmation) {
    return [];
  }

  return baseAffirmation
    .split(/\r\n|\r|\n|(?<=[.!?])\s+/)
    .map(toAffirmationLine)
    .filter(Boolean)
    .slice(0, 8);
}

function buildBlockAffirmations(block) {
  const { focus, system } = extractFocusSystem(block);
  const sample = formatSampleLabel(block.sample);
  const subject = formatSubject(block.sequences[0]?.subject || block.target.replace(/\s+Splicing$/i, ""));
  const totalBases = block.sequences.reduce((sum, sequence) => sum + sequence.bases, 0);
  const sequenceWord = block.sequences.length === 1 ? "sequence" : "sequences";
  const systemClause = system ? `, supporting ${system.toLowerCase()}` : "";

  return [
    `I affirm ${block.target} for ${sample} is focused on ${focus}${systemClause}.`,
    ...block.sequences.map((sequence) =>
      `I affirm the ${subject} ${formatSequenceName(sequence.sequenceType)} sequence is staged for ${focus} with ${sequence.bases} bases${sequence.gc ? ` at ${sequence.gc} percent GC` : ""}.`
    ),
    `I affirm ${block.target} completed ${block.sequences.length} ${sequenceWord} totaling ${totalBases} bases for ${focus}.`
  ];
}

function uniqueLines(lines) {
  const seen = new Set();
  return lines.filter((line) => {
    const key = line.toLowerCase();
    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

export function buildAffirmationList(text) {
  const blocks = parseInjectionBlocks(text);
  const baseLines = buildBaseAffirmations(text);
  const blockLines = blocks.flatMap(buildBlockAffirmations);
  const lines = uniqueLines([
    ...baseLines,
    ...blockLines
  ]);

  if (lines.length > 0) {
    return `${lines.join("\n")}\n`;
  }

  return "I affirm the imported affirmation file is ready for sequencing focus.\n";
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

  if (mode === "affirmations") {
    return buildAffirmationList(text);
  }

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
