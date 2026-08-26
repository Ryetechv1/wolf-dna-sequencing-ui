const sequenceProfiles = [
  {
    id: "gene",
    title: "Gene Sequence",
    action: "Generate Gene",
    label: "synthetic_gene",
    alphabet: "ATGC",
    length: 96,
    motif: "ATG",
    ending: "TAA",
    accent: "cyan"
  },
  {
    id: "chromosome",
    title: "Chromosome Sequence",
    action: "Generate Chromosome",
    label: "synthetic_chromosome",
    alphabet: "ATGC",
    length: 128,
    motif: "TTAGGG",
    ending: "CCGA",
    accent: "green"
  },
  {
    id: "rna",
    title: "RNA Sequence",
    action: "Generate RNA",
    label: "synthetic_rna",
    alphabet: "AUGC",
    length: 90,
    motif: "AUG",
    ending: "UAA",
    accent: "amber"
  },
  {
    id: "mitochondrial",
    title: "Mitochondrial Sequence",
    action: "Generate Mitochondrial",
    label: "synthetic_mtdna",
    alphabet: "AATTGCC",
    length: 104,
    motif: "ATTA",
    ending: "GGCT",
    accent: "violet"
  },
  {
    id: "dna",
    title: "DNA Sequence",
    action: "Generate DNA",
    label: "synthetic_dna",
    alphabet: "ATGC",
    length: 112,
    motif: "GCTA",
    ending: "AGTC",
    accent: "ice"
  }
];

export function getSequenceProfiles() {
  return sequenceProfiles;
}

function uniqueAlphabet(profile) {
  return [...new Set(profile.alphabet.split(""))];
}

function variableBodyLength(profile) {
  return Math.max(0, profile.length - profile.motif.length - profile.ending.length);
}

export function getSequenceCapacity(profile) {
  return BigInt(uniqueAlphabet(profile).length) ** BigInt(variableBodyLength(profile));
}

export function formatSequenceCount(value) {
  const text = String(value);
  if (text.length > 9) {
    return `${text[0]}.${text.slice(1, 3)}e+${text.length - 1}`;
  }

  return Number(text).toLocaleString("en-US");
}

function hashBigInt(seed) {
  let value = 1469598103934665603n;
  for (let index = 0; index < seed.length; index += 1) {
    value ^= BigInt(seed.charCodeAt(index));
    value *= 1099511628211n;
  }

  return value;
}

function greatestCommonDivisor(left, right) {
  let a = left < 0n ? -left : left;
  let b = right < 0n ? -right : right;

  while (b !== 0n) {
    const next = a % b;
    a = b;
    b = next;
  }

  return a;
}

function getSequenceIndex(profile, sampleId, generationIndex) {
  const capacity = getSequenceCapacity(profile);
  const seed = `${sampleId}-${profile.id}-${profile.length}`;
  const offset = hashBigInt(`${seed}-offset`) % capacity;
  let stride = (hashBigInt(`${seed}-stride`) % capacity) || 1n;

  while (greatestCommonDivisor(stride, capacity) !== 1n) {
    stride = (stride + 1n) % capacity || 1n;
  }

  return (offset + BigInt(generationIndex) * stride) % capacity;
}

function buildSequence(profile, sampleId, generationIndex) {
  const alphabet = uniqueAlphabet(profile);
  const bodyLength = variableBodyLength(profile);
  let index = getSequenceIndex(profile, sampleId, generationIndex);
  const body = Array.from({ length: bodyLength }, () => {
    const baseIndex = Number(index % BigInt(alphabet.length));
    index /= BigInt(alphabet.length);
    return alphabet[baseIndex];
  }).join("");

  return `${profile.motif}${body}${profile.ending}`;
}

function gcPercent(sequence) {
  const gcCount = sequence.split("").filter((base) => base === "G" || base === "C").length;
  return Math.round((gcCount / sequence.length) * 1000) / 10;
}

export function generateSequence(profile, sample, generationIndex = 0) {
  const sequence = buildSequence(profile, sample.id, generationIndex);
  const usedCount = generationIndex + 1;
  return {
    id: profile.id,
    title: profile.title,
    label: profile.label,
    sampleId: sample.id,
    lineage: sample.lineage,
    accent: profile.accent,
    sequence,
    bases: sequence.length,
    gc: gcPercent(sequence),
    usedCount,
    possibleCount: formatSequenceCount(getSequenceCapacity(profile)),
    splice: `${profile.motif} + synthetic body + ${profile.ending}`
  };
}

export function generateNextSequence(profile, sample, usedCount = 0) {
  if (BigInt(usedCount) >= getSequenceCapacity(profile)) {
    return {
      exhausted: true,
      sequence: null,
      nextUsedCount: usedCount
    };
  }

  return {
    exhausted: false,
    sequence: generateSequence(profile, sample, usedCount),
    nextUsedCount: usedCount + 1
  };
}

export function generateBatch(sample, usedCounts = {}) {
  return sequenceProfiles.reduce(
    (batch, profile) => {
      const result = generateNextSequence(profile, sample, usedCounts[profile.id] || 0);
      batch.exhausted[profile.id] = result.exhausted;
      batch.usedCounts[profile.id] = result.nextUsedCount;

      if (result.sequence) {
        batch.sequences[profile.id] = result.sequence;
      }

      return batch;
    },
    {
      exhausted: {},
      sequences: {},
      usedCounts: { ...usedCounts }
    }
  );
}

export function formatInjectionBlock(sequences, sample) {
  const entries = sequenceProfiles
    .map((profile) => sequences[profile.id])
    .filter(Boolean);

  const fastaEntries = entries
    .map((entry) => {
      const header = [
        `>LupineSeq_${entry.label}_${entry.sampleId}`,
        "source=synthetic_ui_demo",
        `lineage=${entry.lineage.replace(/\s+/g, "_")}`,
        `bases=${entry.bases}`,
        `gc=${entry.gc}%`,
        `splice="${entry.splice}"`
      ].join(" ");
      return `${header}\n${entry.sequence}`;
    })
    .join("\n\n");

  return [
    "",
    "=== LupineSeq Batch Splice Injection ===",
    `Sample: ${sample.id} (${sample.species}, ${sample.latin})`,
    "Note: Synthetic demonstration sequences generated by the UI; not for wet-lab synthesis, diagnosis, or field release.",
    fastaEntries,
    "=== End LupineSeq Batch Splice Injection ==="
  ].join("\n");
}
