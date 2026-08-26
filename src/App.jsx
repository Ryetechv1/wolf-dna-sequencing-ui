import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Activity,
  AlertTriangle,
  Bell,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Columns3,
  Dna,
  Download,
  FileDown,
  FileText,
  FlaskConical,
  HelpCircle,
  Home,
  Layers,
  Menu,
  Network,
  Play,
  RotateCw,
  Search,
  Settings,
  Square,
  Upload,
  Volume2,
  X
} from "lucide-react";
import { GenomeTracks, Histogram, LineagePlot, Sparkline } from "./charts.jsx";
import { lineageClusters, pipelineSteps, samples, variants } from "./data.js";
import {
  formatInjectionBlock,
  formatSequenceCount,
  generateBatch,
  generateNextSequence,
  getDefaultTargetStructure,
  getSequenceCapacity,
  getSequenceProfiles,
  getTargetStructures
} from "./sequenceGenerators.js";
import {
  buildSrt,
  buildSsml,
  buildTtsScript,
  getDefaultTtsProfile,
  getDefaultTtsReadMode,
  getTtsProfiles,
  getTtsReadModes,
  getTtsStats
} from "./ttsExport.js";

const assetPath = (path) => `${import.meta.env.BASE_URL}${path}`;

const navItems = [
  { label: "Overview", icon: Home },
  { label: "Samples", icon: FlaskConical },
  { label: "Lineage", icon: Network },
  { label: "Variants", icon: Dna },
  { label: "Reports", icon: FileText }
];

const genomeReferences = [
  { value: "wolf", label: "Canis lupus ref" },
  { value: "human", label: "Human GRCh38 ref" },
  { value: "compare", label: "Wolf/Human compare" }
];

const genomeScopes = [
  { value: "whole", label: "Whole Genome" },
  { value: "autosomes", label: "Autosomes 1-12" },
  { value: "mtdna", label: "mtDNA" },
  { value: "hotspots", label: "Variant Hotspots" }
];

const createEmptyBatchState = (targetId = "") => ({
  exhausted: {},
  injected: false,
  sequences: {},
  targetId,
  usedCounts: {}
});

const createInitialBatchStates = () => ({
  human: createEmptyBatchState(getDefaultTargetStructure("human").id),
  wolf: createEmptyBatchState(getDefaultTargetStructure("wolf").id)
});

function getExportFileName(fileName, suffix, extension) {
  const stem = (fileName || "affirmation")
    .replace(/\.[^.]+$/, "")
    .replace(/[^a-z0-9-]+/gi, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase() || "affirmation";
  return `${stem}-${suffix}.${extension}`;
}

function downloadTextFile(content, fileName, type = "text/plain;charset=utf-8") {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function StatusPill({ status }) {
  return <span className={`status-pill ${status.toLowerCase()}`}>{status}</span>;
}

function Logo() {
  return (
    <div className="logo-mark" aria-hidden="true">
      <Dna size={22} />
    </div>
  );
}

function Sidebar({ activeNav, onNavChange }) {
  return (
    <aside className="sidebar">
      <div className="brand">
        <Logo />
        <span>LupineSeq</span>
      </div>
      <nav className="nav-list" aria-label="Primary navigation">
        {navItems.map(({ label, icon: Icon }) => (
          <button
            key={label}
            className={activeNav === label ? "nav-item active" : "nav-item"}
            type="button"
            onClick={() => onNavChange(label)}
          >
            <Icon size={19} />
            <span>{label}</span>
          </button>
        ))}
      </nav>
      <div className="sidebar-tools">
        <button className="nav-item muted" type="button">
          <X size={18} />
          <span>Collapse</span>
        </button>
        <button className="nav-item muted" type="button">
          <Settings size={18} />
          <span>Settings</span>
        </button>
        <button className="nav-item muted" type="button">
          <HelpCircle size={18} />
          <span>Help</span>
        </button>
      </div>
    </aside>
  );
}

function Pipeline({ running }) {
  return (
    <div className="pipeline" aria-label="Pipeline progress">
      <div className="pipeline-copy">
        <span>Pipeline</span>
        <strong>Step 5 of 7</strong>
      </div>
      <div className="pipeline-steps">
        {pipelineSteps.map((step, index) => (
          <span key={step} className={index <= 5 ? "complete" : ""}>
            <i />
            <b>{step}</b>
          </span>
        ))}
      </div>
      <div className={running ? "run-state running" : "run-state"}>
        <strong>{running ? "RUNNING" : "READY"}</strong>
        <span>{running ? "ETA 01:42:18" : "Awaiting run"}</span>
      </div>
    </div>
  );
}

function Header({ running, onRunToggle }) {
  return (
    <header className="topbar">
      <div className="title-area">
        <button className="icon-button" type="button" aria-label="Open menu">
          <Menu size={21} />
        </button>
        <div>
          <h1>Northern Range Cohort <ChevronDown size={18} /></h1>
          <p>Run ID: NR-2025-05-12-001 <span /> Started: May 12, 2025 08:14 <span /> Platform: Illumina NovaSeq 6000</p>
        </div>
      </div>
      <Pipeline running={running} />
      <div className="top-actions">
        <button className="icon-button" type="button" aria-label="Notifications">
          <Bell size={19} />
        </button>
        <button className="avatar" type="button" aria-label="Researcher profile">SR</button>
      </div>
      <div className="command-row">
        <button className="command-button" type="button">
          <Upload size={17} />
          Import FASTQ
        </button>
        <button className="command-button primary" type="button" onClick={onRunToggle}>
          <Play size={17} />
          {running ? "Pause Pipeline" : "Run Pipeline"}
        </button>
        <button className="command-button" type="button">
          <FileDown size={17} />
          Export Report
        </button>
        <span className="last-updated">Last updated: 10:32:14 <RotateCw size={14} /></span>
      </div>
    </header>
  );
}

function SegmentControl({ value, onChange }) {
  const options = [
    { label: "All", count: samples.length },
    { label: "Flagged", count: samples.filter((sample) => sample.status === "Flagged").length },
    { label: "Passed", count: samples.filter((sample) => sample.status === "Passed").length }
  ];

  return (
    <div className="segments" role="tablist" aria-label="Sample status filter">
      {options.map((option) => (
        <button
          key={option.label}
          className={value === option.label ? "active" : ""}
          type="button"
          role="tab"
          aria-selected={value === option.label}
          onClick={() => onChange(option.label)}
        >
          {option.label} <span>{option.count}</span>
        </button>
      ))}
    </div>
  );
}

function SamplesPanel({ selectedSample, onSelectSample, sampleFilter, onFilterChange, panelRef }) {
  const [query, setQuery] = useState("");
  const visibleSamples = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return samples.filter((sample) => {
      const matchesStatus = sampleFilter === "All" || sample.status === sampleFilter;
      const searchable = `${sample.id} ${sample.species} ${sample.latin} ${sample.lineage} ${sample.location} ${sample.labId}`.toLowerCase();
      return matchesStatus && (!normalizedQuery || searchable.includes(normalizedQuery));
    });
  }, [query, sampleFilter]);

  return (
    <section className="samples-panel" aria-label="Samples" ref={panelRef}>
      <div className="panel-heading">
        <h2>Samples ({visibleSamples.length}/{samples.length})</h2>
      </div>
      <SegmentControl value={sampleFilter} onChange={onFilterChange} />
      <div className={query ? "search-field has-clear" : "search-field"}>
        <Search size={17} />
        <input value={query} onChange={(event) => setQuery(event.target.value)} type="search" placeholder="Search samples..." aria-label="Search samples" />
        {query ? (
          <button type="button" aria-label="Clear sample search" onClick={() => setQuery("")}>
            <X size={14} />
          </button>
        ) : null}
      </div>
      <div className="sample-list">
        {visibleSamples.map((sample) => (
          <button
            key={sample.id}
            className={selectedSample.id === sample.id ? "sample-row active" : "sample-row"}
            type="button"
            onClick={() => onSelectSample(sample)}
          >
            <i className={sample.status.toLowerCase()} />
            <span>
              <strong>{sample.id}</strong>
              <em>{sample.species}</em>
            </span>
            <small>
              <b>Q30</b>
              {sample.q30.toFixed(1)}
            </small>
            <small>
              <b>Coverage</b>
              {sample.coverage.toFixed(1)}x
            </small>
            {sample.status === "Flagged" ? <AlertTriangle size={18} className="warn-icon" /> : <Activity size={17} className="ok-icon" />}
          </button>
        ))}
        {visibleSamples.length === 0 ? (
          <div className="empty-samples">No samples match the current filter.</div>
        ) : null}
      </div>
    </section>
  );
}

function QcCard({ label, value, note, children }) {
  return (
    <article className="qc-card">
      <span>{label}</span>
      <strong>{value}</strong>
      <div className="mini-chart">{children}</div>
      <small>{note} <Activity size={13} /></small>
    </article>
  );
}

function Workspace({ selectedSample, overviewRef, lineageRef }) {
  const [genomeReference, setGenomeReference] = useState("wolf");
  const [genomeScope, setGenomeScope] = useState("whole");
  const [lineageFocus, setLineageFocus] = useState("selected");
  const lineageOptions = useMemo(
    () => [
      { value: "selected", label: "Selected Lineage" },
      { value: "all", label: "All Lineages" },
      ...lineageClusters.map((cluster) => ({ value: cluster.label, label: cluster.label }))
    ],
    []
  );

  return (
    <main className="workspace" ref={overviewRef}>
      <section className="qc-section" aria-label="QC summary">
        <div className="section-title">
          <h2>QC Summary - {selectedSample.id}</h2>
        </div>
        <div className="qc-grid">
          <QcCard label="Q30" value={`${selectedSample.q30.toFixed(1)}%`} note="Target >= 85%">
            <Sparkline variant="q30" />
          </QcCard>
          <QcCard label="Coverage" value={`${selectedSample.coverage.toFixed(1)}x`} note="Target >= 20x">
            <Sparkline variant="coverage" />
          </QcCard>
          <QcCard label="GC Balance" value={`${selectedSample.gc.toFixed(1)}%`} note="Target 45-55%">
            <Histogram />
          </QcCard>
          <QcCard label="Heterozygosity" value={selectedSample.heterozygosity} note="Typical 0.0008-0.0016">
            <Sparkline variant="heterozygosity" />
          </QcCard>
          <QcCard label="mtDNA Haplotype" value={selectedSample.haplotype} note={`Conf. ${selectedSample.confidence.toFixed(1)}%`}>
            <p className="latin-note">Canis lupus</p>
          </QcCard>
        </div>
      </section>

      <div className="analysis-grid">
        <section className="analysis-panel lineage-panel" aria-label="Lineage placement" ref={lineageRef}>
          <div className="section-title">
            <div>
              <h2>Lineage Placement</h2>
              <p>Reference: Canis lupus panel</p>
            </div>
            <select value={lineageFocus} onChange={(event) => setLineageFocus(event.target.value)} aria-label="Lineage focus">
              {lineageOptions.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>
          <LineagePlot selectedSample={selectedSample} focus={lineageFocus} />
        </section>

        <section className="analysis-panel genome-panel" aria-label="Genome overview">
          <div className="section-title split">
            <h2>Genome Overview</h2>
            <div className="select-row">
              <select value={genomeReference} onChange={(event) => setGenomeReference(event.target.value)} aria-label="Genome reference">
                {genomeReferences.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
              <select value={genomeScope} onChange={(event) => setGenomeScope(event.target.value)} aria-label="Genome scope">
                {genomeScopes.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>
          </div>
          <GenomeTracks reference={genomeReference} scope={genomeScope} />
        </section>
      </div>
    </main>
  );
}

function SequenceHudCard({ profile, generated, targetLabel, usedCount, possibleCount, exhausted, onGenerate }) {
  const displayUsed = formatSequenceCount(usedCount);
  const nextLabel = generated ? "Generate Next" : profile.action;
  const focusLabel = generated ? generated.targetLabel : targetLabel;

  return (
    <article className={`sequence-card ${profile.accent} ${exhausted ? "exhausted" : ""}`}>
      <div className="sequence-card-head">
        <Dna size={16} />
        <span>{profile.title}</span>
        {generated ? <CheckCircle2 size={15} /> : null}
      </div>
      <code>{generated ? generated.sequence.slice(0, 34) : "Awaiting splice generation"}</code>
      <small className="sequence-focus">{focusLabel}</small>
      <small className="sequence-pool">
        {exhausted ? "Sequence space exhausted" : `${displayUsed}/${possibleCount} used`}
      </small>
      <dl>
        <div><dt>Bases</dt><dd>{generated ? generated.bases : profile.length}</dd></div>
        <div><dt>GC</dt><dd>{generated ? `${generated.gc}%` : "--"}</dd></div>
        <div><dt>Run</dt><dd>{generated ? `#${formatSequenceCount(generated.usedCount)}` : "--"}</dd></div>
      </dl>
      <button type="button" disabled={exhausted} aria-label={`${targetLabel} ${nextLabel} ${profile.title}`} onClick={() => onGenerate(profile)}>
        <Play size={14} />
        {exhausted ? "Pool Exhausted" : nextLabel}
      </button>
    </article>
  );
}

function SpliceLane({
  batch,
  hasFile,
  onGenerateBatch,
  onGenerateOne,
  onInject,
  onTargetChange,
  possibleCounts,
  profiles,
  target
}) {
  const allGenerated = profiles.every((profile) => batch.sequences[profile.id]);
  const allExhausted = profiles.every((profile) => batch.exhausted[profile.id]);
  const totalBases = Object.values(batch.sequences).reduce((sum, entry) => sum + entry.bases, 0);
  const uniqueUsedCount = Object.values(batch.usedCounts).reduce((total, count) => total + count, 0);

  return (
    <div className={`splice-lane ${target.key}`}>
      <div className="splice-lane-head">
        <div>
          <h3>{target.title}</h3>
          <p>{target.sample.id} · {target.sample.latin}</p>
        </div>
        <StatusPill status={batch.injected ? "Passed" : target.sample.status} />
      </div>
      <label className="target-control">
        <span>{target.shortLabel} target structure</span>
        <select
          value={target.focus.id}
          onChange={(event) => onTargetChange(target.key, event.target.value)}
          aria-label={`${target.shortLabel} target structure`}
        >
          {target.options.map((option) => (
            <option key={option.id} value={option.id}>{option.label}</option>
          ))}
        </select>
      </label>
      <div className="target-system">{target.focus.system}</div>
      <div className="lane-actions">
        <button className="command-button primary" type="button" disabled={allExhausted} onClick={() => onGenerateBatch(target.key)}>
          <Layers size={16} />
          Generate {target.shortLabel} Batch
        </button>
        <button className="command-button confirm" type="button" disabled={!hasFile || !allGenerated} onClick={() => onInject(target.key)}>
          <CheckCircle2 size={16} />
          Confirm {target.shortLabel} Inject
        </button>
      </div>
      <div className="lane-status">
        <span>{Object.keys(batch.sequences).length}/5 generated</span>
        <span>{formatSequenceCount(uniqueUsedCount)} used</span>
        <span>{totalBases ? `${totalBases} bases` : "No bases staged"}</span>
      </div>
      <div className="sequence-grid">
        {profiles.map((profile) => (
          <SequenceHudCard
            key={`${target.key}-${profile.id}`}
            profile={profile}
            targetLabel={target.focus.label}
            generated={batch.sequences[profile.id]}
            usedCount={batch.usedCounts[profile.id] || 0}
            possibleCount={possibleCounts[profile.id]}
            exhausted={Boolean(batch.exhausted[profile.id])}
            onGenerate={(nextProfile) => onGenerateOne(target.key, nextProfile)}
          />
        ))}
      </div>
    </div>
  );
}

function AffirmationBatchPanel({ humanTarget, onBatchInject, selectedSample }) {
  const [fileName, setFileName] = useState("");
  const [affirmationText, setAffirmationText] = useState("");
  const [batchStates, setBatchStates] = useState(createInitialBatchStates);
  const [exported, setExported] = useState(false);
  const [ttsProfileId, setTtsProfileId] = useState(getDefaultTtsProfile().id);
  const [ttsReadMode, setTtsReadMode] = useState(getDefaultTtsReadMode().id);
  const [ttsVoiceUri, setTtsVoiceUri] = useState("");
  const [ttsVoices, setTtsVoices] = useState([]);
  const [ttsPreviewing, setTtsPreviewing] = useState(false);
  const profiles = getSequenceProfiles();
  const ttsProfiles = getTtsProfiles();
  const ttsReadModes = getTtsReadModes();
  const ttsProfile = ttsProfiles.find((profile) => profile.id === ttsProfileId) || getDefaultTtsProfile();
  const ttsScript = useMemo(
    () => affirmationText ? buildTtsScript(affirmationText, ttsReadMode) : "",
    [affirmationText, ttsReadMode]
  );
  const ttsStats = useMemo(() => getTtsStats(ttsScript), [ttsScript]);
  const ttsEstimatedMinutes = ttsStats.estimatedSeconds ? Math.max(1, Math.ceil(ttsStats.estimatedSeconds / 60)) : 0;
  const supportsTtsPreview = typeof window !== "undefined"
    && "speechSynthesis" in window
    && "SpeechSynthesisUtterance" in window;
  const targetOptions = useMemo(
    () => ({
      human: getTargetStructures("human"),
      wolf: getTargetStructures("wolf")
    }),
    []
  );
  const targets = useMemo(
    () => [
      {
        key: "wolf",
        title: "Wolf Splicing",
        shortLabel: "Wolf",
        focus: targetOptions.wolf.find((option) => option.id === batchStates.wolf.targetId) || getDefaultTargetStructure("wolf"),
        options: targetOptions.wolf,
        sample: selectedSample
      },
      {
        key: "human",
        title: "Human Splicing",
        shortLabel: "Human",
        focus: targetOptions.human.find((option) => option.id === batchStates.human.targetId) || getDefaultTargetStructure("human"),
        options: targetOptions.human,
        sample: humanTarget
      }
    ],
    [batchStates.human.targetId, batchStates.wolf.targetId, humanTarget, selectedSample, targetOptions]
  );
  const targetMap = useMemo(
    () => Object.fromEntries(targets.map((target) => [target.key, target])),
    [targets]
  );
  const possibleCounts = useMemo(
    () => Object.fromEntries(
      targets.map((target) => [
        target.key,
        Object.fromEntries(
          profiles.map((profile) => [profile.id, formatSequenceCount(getSequenceCapacity(profile, target.focus))])
        )
      ])
    ),
    [profiles, targets]
  );

  const hasFile = Boolean(fileName);
  const totalUniqueUsed = Object.values(batchStates).reduce(
    (sum, batch) => sum + Object.values(batch.usedCounts).reduce((total, count) => total + count, 0),
    0
  );
  const lineCount = affirmationText ? affirmationText.split(/\r\n|\r|\n/).length : 0;

  useEffect(() => {
    setBatchStates((current) => ({
      human: createEmptyBatchState(current.human.targetId || getDefaultTargetStructure("human").id),
      wolf: createEmptyBatchState(current.wolf.targetId || getDefaultTargetStructure("wolf").id)
    }));
    setExported(false);
  }, [selectedSample.id]);

  useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      return undefined;
    }

    const synth = window.speechSynthesis;
    const refreshVoices = () => {
      setTtsVoices(synth.getVoices().filter((voice) => voice.lang.toLowerCase().startsWith("en")));
    };

    refreshVoices();
    if (synth.addEventListener) {
      synth.addEventListener("voiceschanged", refreshVoices);
    } else {
      synth.onvoiceschanged = refreshVoices;
    }

    return () => {
      synth.cancel();
      if (synth.removeEventListener) {
        synth.removeEventListener("voiceschanged", refreshVoices);
      } else if (synth.onvoiceschanged === refreshVoices) {
        synth.onvoiceschanged = null;
      }
    };
  }, []);

  const handleImport = async (event) => {
    const [file] = event.target.files;
    if (!file) return;

    const text = await file.text();
    setFileName(file.name || "affirmation.txt");
    setAffirmationText(text);
    setBatchStates((current) => Object.fromEntries(
      Object.entries(current).map(([key, batch]) => [key, { ...batch, injected: false }])
    ));
    setExported(false);
  };

  const handleTargetChange = (targetKey, targetId) => {
    setBatchStates((current) => ({
      ...current,
      [targetKey]: createEmptyBatchState(targetId)
    }));
    setExported(false);
  };

  const handleGenerateOne = (targetKey, profile) => {
    setBatchStates((current) => {
      const batch = current[targetKey] || createEmptyBatchState();
      const focus = targetMap[targetKey].focus;
      const result = generateNextSequence(profile, targetMap[targetKey].sample, batch.usedCounts[profile.id] || 0, focus);

      return {
        ...current,
        [targetKey]: {
          ...batch,
          exhausted: {
            ...batch.exhausted,
            [profile.id]: result.exhausted
          },
          injected: result.sequence ? false : batch.injected,
          sequences: result.sequence
            ? {
              ...batch.sequences,
              [profile.id]: result.sequence
            }
            : batch.sequences,
          targetId: focus.id,
          usedCounts: result.sequence
            ? {
              ...batch.usedCounts,
              [profile.id]: result.nextUsedCount
            }
            : batch.usedCounts
        }
      };
    });
    setExported(false);
  };

  const handleGenerateBatch = (targetKey) => {
    setBatchStates((current) => {
      const batch = current[targetKey] || createEmptyBatchState();
      const focus = targetMap[targetKey].focus;
      const nextBatch = generateBatch(targetMap[targetKey].sample, batch.usedCounts, focus);

      return {
        ...current,
        [targetKey]: {
          exhausted: nextBatch.exhausted,
          injected: Object.keys(nextBatch.sequences).length > 0 ? false : batch.injected,
          sequences: {
            ...batch.sequences,
            ...nextBatch.sequences
          },
          targetId: focus.id,
          usedCounts: nextBatch.usedCounts
        }
      };
    });
    setExported(false);
  };

  const handleBatchInject = (targetKey) => {
    const target = targetMap[targetKey];
    const batch = batchStates[targetKey];
    const allGenerated = profiles.every((profile) => batch.sequences[profile.id]);
    if (!hasFile || !allGenerated) return;

    const sequenceEntries = Object.values(batch.sequences);
    const injectionBlock = formatInjectionBlock(batch.sequences, target.sample, {
      sourceKey: target.key,
      subjectLabel: target.title
    });
    const event = {
      fileName: fileName || "affirmation.txt",
      generatedAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
      id: `${target.key}-${target.sample.id}-${Date.now()}`,
      sampleId: target.sample.id,
      sequenceCount: sequenceEntries.length,
      sourceSampleId: selectedSample.id,
      subjectKey: target.key,
      subjectLabel: target.title,
      targetLabel: target.focus.label,
      targetSystem: target.focus.system,
      totalBases: sequenceEntries.reduce((sum, entry) => sum + entry.bases, 0),
      uniqueUsed: Object.values(batch.usedCounts).reduce((sum, count) => sum + count, 0)
    };

    setAffirmationText((current) => `${current.trimEnd()}\n${injectionBlock}\n`);
    setBatchStates((current) => ({
      ...current,
      [targetKey]: {
        ...current[targetKey],
        injected: true
      }
    }));
    onBatchInject(event);
    setExported(false);
  };

  const handleExport = () => {
    if (!affirmationText) return;

    downloadTextFile(affirmationText, fileName || "affirmation.txt");
    setExported(true);
  };

  const handlePreviewTts = () => {
    if (!ttsScript || !supportsTtsPreview) return;

    const synth = window.speechSynthesis;
    const utterance = new window.SpeechSynthesisUtterance(ttsScript.slice(0, 5000));
    const selectedVoice = ttsVoices.find((voice) => voice.voiceURI === ttsVoiceUri);
    synth.cancel();
    if (selectedVoice) {
      utterance.voice = selectedVoice;
      utterance.lang = selectedVoice.lang;
    } else {
      utterance.lang = "en-US";
    }
    utterance.pitch = ttsProfile.previewPitch;
    utterance.rate = ttsProfile.previewRate;
    utterance.onend = () => setTtsPreviewing(false);
    utterance.onerror = () => setTtsPreviewing(false);
    setTtsPreviewing(true);
    synth.speak(utterance);
  };

  const handleStopTts = () => {
    if (supportsTtsPreview) {
      window.speechSynthesis.cancel();
    }
    setTtsPreviewing(false);
  };

  const handleExportTtsScript = () => {
    if (!ttsScript) return;

    downloadTextFile(ttsScript, getExportFileName(fileName, "tts-script", "txt"));
  };

  const handleExportTtsSsml = () => {
    if (!ttsScript) return;

    downloadTextFile(
      buildSsml(ttsScript, ttsProfile),
      getExportFileName(fileName, "hq-tts", "ssml"),
      "application/ssml+xml;charset=utf-8"
    );
  };

  const handleExportTtsSrt = () => {
    if (!ttsScript) return;

    downloadTextFile(
      buildSrt(ttsScript),
      getExportFileName(fileName, "tts-captions", "srt"),
      "application/x-subrip;charset=utf-8"
    );
  };

  return (
    <section className="affirmation-panel" aria-label="Affirmation batch splice generator">
      <div className="affirmation-head">
        <div>
          <h2>Affirmation Batch Splice</h2>
          <p>Target: affirmation.txt · Wolf and human synthetic splice batches</p>
        </div>
        <div className="affirmation-actions">
          <label className="command-button file-command">
            <Upload size={16} />
            Import affirmation.txt
            <input type="file" accept=".txt,text/plain" onChange={handleImport} />
          </label>
          <button className="command-button" type="button" disabled={!affirmationText} onClick={handleExport}>
            <Download size={16} />
            Export affirmation.txt
          </button>
        </div>
      </div>
      <div className="affirmation-status">
        <span className={hasFile ? "ready" : ""}>{hasFile ? fileName : "No file imported"}</span>
        <span>{lineCount} lines loaded</span>
        <span>{formatSequenceCount(totalUniqueUsed)} unique strings used</span>
        <span>{targets.filter((target) => batchStates[target.key].injected).length}/2 batches injected</span>
        <span className={exported ? "ready" : ""}>{exported ? "Export launched" : "Export pending"}</span>
      </div>
      <div className="tts-panel" aria-label="High quality TTS export">
        <div className="tts-panel-head">
          <div>
            <h3>HQ TTS Export</h3>
            <p>{ttsStats.words} words · {ttsEstimatedMinutes} min est. · {ttsStats.characters} chars</p>
          </div>
          <span className={ttsScript ? "status-pill passed" : "status-pill flagged"}>{ttsScript ? "Ready" : "Idle"}</span>
        </div>
        <div className="tts-controls">
          <label>
            <span>Style</span>
            <select value={ttsProfileId} onChange={(event) => setTtsProfileId(event.target.value)} aria-label="TTS voice style">
              {ttsProfiles.map((profile) => (
                <option key={profile.id} value={profile.id}>{profile.label}</option>
              ))}
            </select>
          </label>
          <label>
            <span>Read mode</span>
            <select value={ttsReadMode} onChange={(event) => setTtsReadMode(event.target.value)} aria-label="TTS read mode">
              {ttsReadModes.map((mode) => (
                <option key={mode.id} value={mode.id}>{mode.label}</option>
              ))}
            </select>
          </label>
          <label>
            <span>Voice</span>
            <select value={ttsVoiceUri} onChange={(event) => setTtsVoiceUri(event.target.value)} disabled={!supportsTtsPreview} aria-label="TTS preview voice">
              <option value="">System default</option>
              {ttsVoices.map((voice) => (
                <option key={voice.voiceURI} value={voice.voiceURI}>{voice.name}</option>
              ))}
            </select>
          </label>
        </div>
        <div className="tts-actions">
          <button className="command-button" type="button" disabled={!ttsScript || !supportsTtsPreview} onClick={ttsPreviewing ? handleStopTts : handlePreviewTts}>
            {ttsPreviewing ? <Square size={15} /> : <Volume2 size={16} />}
            {ttsPreviewing ? "Stop TTS" : "Preview TTS"}
          </button>
          <button className="command-button" type="button" disabled={!ttsScript} onClick={handleExportTtsScript}>
            <FileText size={16} />
            Export Script
          </button>
          <button className="command-button primary" type="button" disabled={!ttsScript} onClick={handleExportTtsSsml}>
            <FileDown size={16} />
            Export HQ SSML
          </button>
          <button className="command-button" type="button" disabled={!ttsScript} onClick={handleExportTtsSrt}>
            <Download size={16} />
            Export SRT
          </button>
        </div>
      </div>
      <div className="splice-lanes">
        {targets.map((target) => (
          <SpliceLane
            key={target.key}
            batch={batchStates[target.key]}
            hasFile={hasFile}
            onGenerateBatch={handleGenerateBatch}
            onGenerateOne={handleGenerateOne}
            onInject={handleBatchInject}
            onTargetChange={handleTargetChange}
            possibleCounts={possibleCounts[target.key]}
            profiles={profiles}
            target={target}
          />
        ))}
      </div>
      <div className="affirmation-preview">
        <span>affirmation.txt preview</span>
        <pre>{affirmationText || "Import a text file to stage the batch injection."}</pre>
      </div>
    </section>
  );
}

function VariantTable({ selectedSample, tab, onTabChange, sectionRef }) {
  const [query, setQuery] = useState("");
  const [showFlaggedOnly, setShowFlaggedOnly] = useState(false);
  const [consequence, setConsequence] = useState("All Consequences");
  const [qualityFilter, setQualityFilter] = useState("All Filters");
  const [rowsPerPage, setRowsPerPage] = useState(5);
  const [page, setPage] = useState(1);

  const filteredVariants = useMemo(() => {
    return variants.filter((variant) => {
      const text = `${variant.chr} ${variant.position} ${variant.region} ${variant.consequence} ${variant.type}`.toLowerCase();
      const matchesQuery = text.includes(query.toLowerCase());
      const matchesTab = tab === "SNP" ? variant.type === "SNP" : variant.type === "Indel";
      const matchesStatus = !showFlaggedOnly || variant.status === "Flagged";
      const matchesConsequence = consequence === "All Consequences" || variant.impact === consequence;
      const matchesFilter = qualityFilter === "All Filters" || variant.filter === qualityFilter;
      return matchesQuery && matchesTab && matchesStatus && matchesConsequence && matchesFilter;
    });
  }, [consequence, qualityFilter, query, showFlaggedOnly, tab]);
  const pageCount = Math.max(1, Math.ceil(filteredVariants.length / rowsPerPage));
  const currentPage = Math.min(page, pageCount);
  const firstRow = filteredVariants.length === 0 ? 0 : (currentPage - 1) * rowsPerPage + 1;
  const pagedVariants = filteredVariants.slice(firstRow - 1, firstRow - 1 + rowsPerPage);
  const lastRow = filteredVariants.length === 0 ? 0 : Math.min(firstRow + pagedVariants.length - 1, filteredVariants.length);

  useEffect(() => {
    setPage(1);
  }, [consequence, qualityFilter, query, rowsPerPage, showFlaggedOnly, tab]);

  return (
    <section className="variant-section" aria-label="Variant calls" ref={sectionRef}>
      <div className="variant-heading">
        <h2>Variant Calls - {selectedSample.id}</h2>
        <div className="variant-tabs" role="tablist" aria-label="Variant type">
          {["SNP", "Indel"].map((option) => (
            <button
              key={option}
              className={tab === option ? "active" : ""}
              type="button"
              role="tab"
              aria-selected={tab === option}
              onClick={() => onTabChange(option)}
            >
              {option}
            </button>
          ))}
        </div>
      </div>
      <div className="table-toolbar">
        <label className="search-field variant-search">
          <Search size={17} />
          <input value={query} onChange={(event) => setQuery(event.target.value)} type="search" placeholder="Search variants..." aria-label="Search variants" />
        </label>
        <select value={consequence} onChange={(event) => setConsequence(event.target.value)} aria-label="Consequence filter">
          <option>All Consequences</option>
          <option>High</option>
          <option>Moderate</option>
          <option>Low</option>
        </select>
        <select value={qualityFilter} onChange={(event) => setQualityFilter(event.target.value)} aria-label="Quality filter">
          <option>All Filters</option>
          <option>PASS</option>
          <option>q10</option>
          <option>LowDepth</option>
        </select>
        <label className="checkbox-label">
          <input type="checkbox" checked={showFlaggedOnly} onChange={(event) => setShowFlaggedOnly(event.target.checked)} />
          Show flagged only
        </label>
        <span className="variant-count">{filteredVariants.length} visible calls</span>
        <button className="tool-button" type="button"><Columns3 size={16} /> Columns</button>
        <button className="icon-button bordered" type="button" aria-label="Download variants"><Download size={17} /></button>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Chr</th>
              <th>Position</th>
              <th>Ref</th>
              <th>Alt</th>
              <th>Type</th>
              <th>Gene / Region</th>
              <th>Consequence</th>
              <th>Impact</th>
              <th>Genotype</th>
              <th>Depth</th>
              <th>GQ</th>
              <th>Filter</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {pagedVariants.map((variant) => (
              <tr key={`${variant.chr}-${variant.position}`}>
                <td>{variant.chr}</td>
                <td>{variant.position}</td>
                <td>{variant.ref}</td>
                <td>{variant.alt}</td>
                <td>{variant.type}</td>
                <td>{variant.region}</td>
                <td>{variant.consequence}</td>
                <td><span className={`impact ${variant.impact.toLowerCase()}`}>{variant.impact}</span></td>
                <td>{variant.genotype}</td>
                <td>{variant.depth}</td>
                <td>{variant.gq}</td>
                <td>{variant.filter}</td>
                <td><StatusPill status={variant.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
        {filteredVariants.length === 0 ? (
          <div className="empty-table">No variant calls match the current filters.</div>
        ) : null}
      </div>
      <div className="pagination-row">
        <span>
          Rows per page:
          <select value={rowsPerPage} onChange={(event) => setRowsPerPage(Number(event.target.value))} aria-label="Rows per page">
            <option value={3}>3</option>
            <option value={5}>5</option>
            <option value={25}>25</option>
          </select>
        </span>
        <span>{firstRow}-{lastRow} of {filteredVariants.length}</span>
        <button className="icon-button" type="button" disabled={currentPage <= 1} aria-label="Previous page" onClick={() => setPage((value) => Math.max(1, value - 1))}><ChevronLeft size={18} /></button>
        <button className="icon-button" type="button" disabled={currentPage >= pageCount} aria-label="Next page" onClick={() => setPage((value) => Math.min(pageCount, value + 1))}><ChevronRight size={18} /></button>
      </div>
    </section>
  );
}

function Inspector({ injectionEvents, panelRef, selectedSample, reportItems, onAddToReport }) {
  const included = reportItems.includes(selectedSample.id);
  const sampleInjections = injectionEvents.filter((event) => event.sourceSampleId === selectedSample.id);
  const latestInjection = sampleInjections[0];

  return (
    <aside className="inspector" aria-label="Sample inspector" ref={panelRef}>
      <div className="inspector-head">
        <h2>Sample Inspector</h2>
        <div>
          <button className="icon-button" type="button" aria-label="Inspector menu">...</button>
          <button className="icon-button" type="button" aria-label="Close inspector"><X size={18} /></button>
        </div>
      </div>
      <div className="inspector-title">
        <div>
          <h3>{selectedSample.id}</h3>
          <p>{selectedSample.species} (<em>{selectedSample.latin}</em>)</p>
          <p>{selectedSample.sex} <span /> {selectedSample.age}</p>
        </div>
        <StatusPill status={selectedSample.status} />
      </div>
      <figure className="wolf-figure">
        <img src={assetPath("assets/wolf-dna.png")} alt="Gray wolf with translucent DNA helix" />
      </figure>
      <dl className="details-list">
        <div><dt>Sample ID</dt><dd>{selectedSample.id}</dd></div>
        <div><dt>Collection Date</dt><dd>{selectedSample.collectionDate}</dd></div>
        <div><dt>Location</dt><dd>{selectedSample.location}</dd></div>
        <div><dt>Tissue</dt><dd>{selectedSample.tissue}</dd></div>
        <div><dt>Collector</dt><dd>{selectedSample.collector}</dd></div>
        <div><dt>Lab ID</dt><dd>{selectedSample.labId}</dd></div>
        <div><dt>Notes</dt><dd>{selectedSample.notes}</dd></div>
      </dl>
      <dl className="details-list sectioned">
        <div><dt>Reads (Pairs)</dt><dd>{selectedSample.reads}</dd></div>
        <div><dt>Q30</dt><dd>{selectedSample.q30.toFixed(1)}%</dd></div>
        <div><dt>Coverage</dt><dd>{selectedSample.coverage.toFixed(1)}x</dd></div>
        <div><dt>Insert Size</dt><dd>{selectedSample.insert}</dd></div>
        <div><dt>GC Content</dt><dd>{selectedSample.gc.toFixed(1)}%</dd></div>
      </dl>
      <dl className="details-list sectioned">
        <div><dt>Haplotype</dt><dd>{selectedSample.haplotype}</dd></div>
        <div><dt>Lineage</dt><dd>{selectedSample.lineage}</dd></div>
        <div><dt>Confidence</dt><dd>{selectedSample.confidence.toFixed(1)}%</dd></div>
      </dl>
      <section className="injection-summary" aria-label="Batch injection summary">
        <h4>Batch Injects</h4>
        {latestInjection ? (
          <>
            <dl className="details-list compact">
              <div><dt>Latest</dt><dd>{latestInjection.subjectLabel}</dd></div>
              <div><dt>Focus</dt><dd>{latestInjection.targetLabel}</dd></div>
              <div><dt>System</dt><dd>{latestInjection.targetSystem}</dd></div>
              <div><dt>Target</dt><dd>{latestInjection.sampleId}</dd></div>
              <div><dt>Sequences</dt><dd>{latestInjection.sequenceCount}</dd></div>
              <div><dt>Bases</dt><dd>{latestInjection.totalBases}</dd></div>
              <div><dt>Runs Used</dt><dd>{latestInjection.uniqueUsed}</dd></div>
              <div><dt>Time</dt><dd>{latestInjection.generatedAt}</dd></div>
            </dl>
            <div className="injection-stack">
              {sampleInjections.slice(0, 3).map((event) => (
                <span key={event.id}>{event.subjectLabel}: {event.targetLabel} focus into {event.fileName}</span>
              ))}
            </div>
          </>
        ) : (
          <p>No batch injects staged for this sample.</p>
        )}
      </section>
      <button className={included ? "report-button included" : "report-button"} type="button" onClick={() => onAddToReport(selectedSample.id)}>
        <FileText size={17} />
        {included ? "Added to Report" : "Add to Report"}
      </button>
    </aside>
  );
}

export default function App() {
  const [selectedSample, setSelectedSample] = useState(samples[3]);
  const [sampleFilter, setSampleFilter] = useState("All");
  const [variantTab, setVariantTab] = useState("SNP");
  const [running, setRunning] = useState(true);
  const [activeNav, setActiveNav] = useState("Overview");
  const [reportItems, setReportItems] = useState([]);
  const [injectionEvents, setInjectionEvents] = useState([]);
  const overviewRef = useRef(null);
  const samplesRef = useRef(null);
  const lineageRef = useRef(null);
  const variantsRef = useRef(null);
  const reportsRef = useRef(null);
  const sectionRefs = {
    Lineage: lineageRef,
    Overview: overviewRef,
    Reports: reportsRef,
    Samples: samplesRef,
    Variants: variantsRef
  };
  const humanTarget = useMemo(
    () => ({
      id: `HS-${selectedSample.id.split("-")[1] || selectedSample.id}`,
      species: "Human",
      latin: "Homo sapiens",
      lineage: "Homo sapiens",
      status: "Passed"
    }),
    [selectedSample.id]
  );

  const toggleReportItem = (sampleId) => {
    setReportItems((current) =>
      current.includes(sampleId) ? current.filter((item) => item !== sampleId) : [...current, sampleId]
    );
  };

  const recordBatchInjection = (event) => {
    setInjectionEvents((current) => [event, ...current].slice(0, 12));
  };

  const handleNavChange = (label) => {
    setActiveNav(label);
    sectionRefs[label]?.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="app-shell">
      <Sidebar activeNav={activeNav} onNavChange={handleNavChange} />
      <div className="main-shell">
        <Header running={running} onRunToggle={() => setRunning((value) => !value)} />
        <div className="content-grid">
          <SamplesPanel
            selectedSample={selectedSample}
            onSelectSample={setSelectedSample}
            sampleFilter={sampleFilter}
            onFilterChange={setSampleFilter}
            panelRef={samplesRef}
          />
          <div className="middle-column">
            <Workspace selectedSample={selectedSample} overviewRef={overviewRef} lineageRef={lineageRef} />
            <AffirmationBatchPanel humanTarget={humanTarget} selectedSample={selectedSample} onBatchInject={recordBatchInjection} />
            <VariantTable selectedSample={selectedSample} sectionRef={variantsRef} tab={variantTab} onTabChange={setVariantTab} />
          </div>
          <Inspector injectionEvents={injectionEvents} panelRef={reportsRef} selectedSample={selectedSample} reportItems={reportItems} onAddToReport={toggleReportItem} />
        </div>
      </div>
    </div>
  );
}
