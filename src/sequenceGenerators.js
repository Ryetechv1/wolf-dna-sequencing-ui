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

const targetStructureCatalogs = {
  wolf: [
    { id: "skeletal", label: "Skeletal", system: "Frame density and joint alignment", marker: "CAGTACGGA", terminal: "GATCGA" },
    { id: "muscular", label: "Muscular", system: "Fast-twitch power and endurance fibers", marker: "GCTTAACCG", terminal: "CTTAGC" },
    { id: "tail", label: "Tail", system: "Caudal balance and signaling", marker: "ATCCGTAAG", terminal: "TGCCTA" },
    { id: "fur", label: "Fur", system: "Guard coat, undercoat, and pigment banding", marker: "TTGACCGTA", terminal: "ACGTTC" },
    { id: "ears", label: "Ears", system: "Auricular shape and acoustic orientation", marker: "CGATTACCG", terminal: "TAGCCA" },
    { id: "legs", label: "Legs", system: "Stride length and limb drive", marker: "AGGCTTACA", terminal: "GCTAAC" },
    { id: "paws", label: "Paws", system: "Pads, digits, and ground contact", marker: "TACCGGATA", terminal: "CATTGG" },
    { id: "skin", label: "Skin", system: "Dermal barrier and follicle bed", marker: "CCATGGTAA", terminal: "TGACCA" },
    { id: "eyes", label: "Eyes", system: "Retinal focus and low-light acuity", marker: "GGAATCCAT", terminal: "ACTGGA" },
    { id: "head", label: "Head", system: "Cranial profile and sensory layout", marker: "AATGCCGTA", terminal: "GGCATT" },
    { id: "muzzle", label: "Muzzle", system: "Olfactory reach and jaw geometry", marker: "CTAGGATCA", terminal: "TAACGG" },
    { id: "claws", label: "Claws", system: "Keratin hook and traction edge", marker: "GTCATAGGC", terminal: "CCGTAA" },
    { id: "instinctual", label: "Instinctual", system: "Predatory attention and pack response", marker: "TGGCAATCT", terminal: "ATCGGT" }
  ],
  human: [
    { id: "skeletal", label: "Skeletal", system: "Bone matrix and posture support", marker: "GATACCGTA", terminal: "CTAGGA" },
    { id: "muscular", label: "Muscular", system: "Muscle tone and motor output", marker: "ACCGTTAGA", terminal: "GACTTC" },
    { id: "nervous", label: "Nervous", system: "Neural signaling and sensory routing", marker: "TGCAAGCTA", terminal: "CGAATG" },
    { id: "cardiovascular", label: "Cardiovascular", system: "Circulation and vascular transport", marker: "CCTAGGAAT", terminal: "TACGAC" },
    { id: "respiratory", label: "Respiratory", system: "Gas exchange and airway rhythm", marker: "AAGTCGCTA", terminal: "GGTACA" },
    { id: "digestive", label: "Digestive", system: "Nutrient processing and gut lining", marker: "GTACCTAGG", terminal: "ACTTGC" },
    { id: "endocrine", label: "Endocrine", system: "Hormonal timing and gland response", marker: "TTCGACGAT", terminal: "CAGTTA" },
    { id: "immune", label: "Immune", system: "Recognition, response, and recovery", marker: "CGGTAATCC", terminal: "TTCGGA" },
    { id: "integumentary", label: "Integumentary", system: "Skin, hair, and barrier tissue", marker: "ATGGCCTAA", terminal: "GCTTAC" },
    { id: "renal", label: "Renal", system: "Fluid balance and filtration", marker: "GCTAACGGT", terminal: "ATGCCA" },
    { id: "reproductive", label: "Reproductive", system: "Germline protection and tissue signaling", marker: "TACGATGGC", terminal: "CGTTAG" },
    { id: "ocular", label: "Ocular", system: "Vision focus and retinal handling", marker: "CCAAGTTGC", terminal: "TAGGCT" },
    { id: "craniofacial", label: "Craniofacial", system: "Skull contour and facial structure", marker: "AGTCCTGAA", terminal: "GCATTC" },
    { id: "metabolic", label: "Metabolic", system: "Energy turnover and cellular demand", marker: "CTTGAACCG", terminal: "AAGTCG" }
  ]
};

export function getSequenceProfiles() {
  return sequenceProfiles;
}

export function getTargetStructures(subjectKey = "wolf") {
  return targetStructureCatalogs[subjectKey] || targetStructureCatalogs.wolf;
}

export function getDefaultTargetStructure(subjectKey = "wolf") {
  return getTargetStructures(subjectKey)[0];
}

function uniqueAlphabet(profile) {
  return [...new Set(profile.alphabet.split(""))];
}

function normalizeTarget(profile, target) {
  if (!target) {
    return {
      id: "whole",
      label: "Whole Sample",
      system: "Unfocused sample-wide sequence",
      marker: "",
      terminal: ""
    };
  }

  const convertBases = (value) => profile.id === "rna" ? value.replaceAll("T", "U") : value;
  return {
    ...target,
    marker: convertBases(target.marker),
    terminal: convertBases(target.terminal)
  };
}

function variableBodyLength(profile, target) {
  const selectedTarget = normalizeTarget(profile, target);
  const fixedLength = profile.motif.length + selectedTarget.marker.length + selectedTarget.terminal.length + profile.ending.length;
  return Math.max(0, profile.length - fixedLength);
}

export function getSequenceCapacity(profile, target) {
  return BigInt(uniqueAlphabet(profile).length) ** BigInt(variableBodyLength(profile, target));
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

function getSequenceIndex(profile, sampleId, generationIndex, target) {
  const capacity = getSequenceCapacity(profile, target);
  const selectedTarget = normalizeTarget(profile, target);
  const seed = [
    sampleId,
    profile.id,
    profile.length,
    selectedTarget.id,
    selectedTarget.system,
    selectedTarget.marker,
    selectedTarget.terminal
  ].join("-");
  const offset = hashBigInt(`${seed}-offset`) % capacity;
  let stride = (hashBigInt(`${seed}-stride`) % capacity) || 1n;

  while (greatestCommonDivisor(stride, capacity) !== 1n) {
    stride = (stride + 1n) % capacity || 1n;
  }

  return (offset + BigInt(generationIndex) * stride) % capacity;
}

function buildSequence(profile, sampleId, generationIndex, target) {
  const alphabet = uniqueAlphabet(profile);
  const selectedTarget = normalizeTarget(profile, target);
  const bodyLength = variableBodyLength(profile, target);
  let index = getSequenceIndex(profile, sampleId, generationIndex, target);
  const body = Array.from({ length: bodyLength }, () => {
    const baseIndex = Number(index % BigInt(alphabet.length));
    index /= BigInt(alphabet.length);
    return alphabet[baseIndex];
  }).join("");

  return `${profile.motif}${selectedTarget.marker}${body}${selectedTarget.terminal}${profile.ending}`;
}

function gcPercent(sequence) {
  const gcCount = sequence.split("").filter((base) => base === "G" || base === "C").length;
  return Math.round((gcCount / sequence.length) * 1000) / 10;
}

export function generateSequence(profile, sample, generationIndex = 0, target) {
  const selectedTarget = normalizeTarget(profile, target);
  const sequence = buildSequence(profile, sample.id, generationIndex, target);
  const usedCount = generationIndex + 1;
  return {
    id: profile.id,
    title: profile.title,
    label: profile.label,
    sampleId: sample.id,
    lineage: sample.lineage,
    targetId: selectedTarget.id,
    targetLabel: selectedTarget.label,
    targetSystem: selectedTarget.system,
    targetMarker: selectedTarget.marker,
    accent: profile.accent,
    sequence,
    bases: sequence.length,
    gc: gcPercent(sequence),
    usedCount,
    possibleCount: formatSequenceCount(getSequenceCapacity(profile, target)),
    splice: `${profile.motif} + ${selectedTarget.label} marker ${selectedTarget.marker} + synthetic body + ${selectedTarget.terminal} + ${profile.ending}`
  };
}

export function generateNextSequence(profile, sample, usedCount = 0, target) {
  if (BigInt(usedCount) >= getSequenceCapacity(profile, target)) {
    return {
      exhausted: true,
      sequence: null,
      nextUsedCount: usedCount
    };
  }

  return {
    exhausted: false,
    sequence: generateSequence(profile, sample, usedCount, target),
    nextUsedCount: usedCount + 1
  };
}

export function generateBatch(sample, usedCounts = {}, target) {
  return sequenceProfiles.reduce(
    (batch, profile) => {
      const result = generateNextSequence(profile, sample, usedCounts[profile.id] || 0, target);
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

export function formatInjectionBlock(sequences, sample, options = {}) {
  const subjectLabel = options.subjectLabel || sample.species;
  const sourceKey = options.sourceKey || "sample";
  const entries = sequenceProfiles
    .map((profile) => sequences[profile.id])
    .filter(Boolean);

  const fastaEntries = entries
    .map((entry) => {
      const header = [
        `>LupineSeq_${sourceKey}_${entry.label}_${entry.sampleId}`,
        "source=synthetic_ui_demo",
        `subject=${subjectLabel.replace(/\s+/g, "_")}`,
        `organism=${sample.latin.replace(/\s+/g, "_")}`,
        `lineage=${entry.lineage.replace(/\s+/g, "_")}`,
        `focus=${entry.targetId}`,
        `structure=${entry.targetLabel.replace(/\s+/g, "_")}`,
        `system=${entry.targetSystem.replace(/\s+/g, "_")}`,
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
    `Target: ${subjectLabel}`,
    `Sample: ${sample.id} (${sample.species}, ${sample.latin})`,
    entries[0] ? `Focus: ${entries[0].targetLabel} (${entries[0].targetSystem})` : "Focus: Unspecified",
    fastaEntries,
    "=== End LupineSeq Batch Splice Injection ==="
  ].join("\n");
}
