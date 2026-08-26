import React, { useMemo, useState } from "react";
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
  Upload,
  X
} from "lucide-react";
import { GenomeTracks, Histogram, LineagePlot, Sparkline } from "./charts.jsx";
import { pipelineSteps, samples, variants } from "./data.js";
import { formatInjectionBlock, generateBatch, generateSequence, getSequenceProfiles } from "./sequenceGenerators.js";

const assetPath = (path) => `${import.meta.env.BASE_URL}${path}`;

const navItems = [
  { label: "Overview", icon: Home },
  { label: "Samples", icon: FlaskConical },
  { label: "Lineage", icon: Network },
  { label: "Variants", icon: Dna },
  { label: "Reports", icon: FileText }
];

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

function SamplesPanel({ selectedSample, onSelectSample, sampleFilter, onFilterChange }) {
  const visibleSamples = useMemo(() => {
    if (sampleFilter === "All") return samples;
    return samples.filter((sample) => sample.status === sampleFilter);
  }, [sampleFilter]);

  return (
    <section className="samples-panel" aria-label="Samples">
      <div className="panel-heading">
        <h2>Samples ({samples.length})</h2>
      </div>
      <SegmentControl value={sampleFilter} onChange={onFilterChange} />
      <label className="search-field">
        <Search size={17} />
        <input type="search" placeholder="Search samples..." aria-label="Search samples" />
      </label>
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

function Workspace({ selectedSample }) {
  return (
    <main className="workspace">
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
        <section className="analysis-panel lineage-panel" aria-label="Lineage placement">
          <div className="section-title">
            <div>
              <h2>Lineage Placement</h2>
              <p>Reference: Canis lupus panel</p>
            </div>
          </div>
          <LineagePlot selectedSample={selectedSample} />
        </section>

        <section className="analysis-panel genome-panel" aria-label="Genome overview">
          <div className="section-title split">
            <h2>Genome Overview</h2>
            <div className="select-row">
              <button type="button">Canis lupus ref <ChevronDown size={14} /></button>
              <button type="button">Whole Genome <ChevronDown size={14} /></button>
            </div>
          </div>
          <GenomeTracks />
        </section>
      </div>
    </main>
  );
}

function SequenceHudCard({ profile, generated, onGenerate }) {
  return (
    <article className={`sequence-card ${profile.accent}`}>
      <div className="sequence-card-head">
        <Dna size={16} />
        <span>{profile.title}</span>
        {generated ? <CheckCircle2 size={15} /> : null}
      </div>
      <code>{generated ? generated.sequence.slice(0, 34) : "Awaiting splice generation"}</code>
      <dl>
        <div><dt>Bases</dt><dd>{generated ? generated.bases : profile.length}</dd></div>
        <div><dt>GC</dt><dd>{generated ? `${generated.gc}%` : "--"}</dd></div>
      </dl>
      <button type="button" onClick={() => onGenerate(profile)}>
        <Play size={14} />
        {profile.action}
      </button>
    </article>
  );
}

function AffirmationBatchPanel({ selectedSample }) {
  const [fileName, setFileName] = useState("");
  const [affirmationText, setAffirmationText] = useState("");
  const [sequences, setSequences] = useState({});
  const [injected, setInjected] = useState(false);
  const [exported, setExported] = useState(false);
  const profiles = getSequenceProfiles();

  const hasFile = Boolean(fileName);
  const allGenerated = profiles.every((profile) => sequences[profile.id]);
  const lineCount = affirmationText ? affirmationText.split(/\r\n|\r|\n/).length : 0;

  const handleImport = async (event) => {
    const [file] = event.target.files;
    if (!file) return;

    const text = await file.text();
    setFileName(file.name || "affirmation.txt");
    setAffirmationText(text);
    setInjected(false);
    setExported(false);
  };

  const handleGenerateOne = (profile) => {
    setSequences((current) => ({
      ...current,
      [profile.id]: generateSequence(profile, selectedSample)
    }));
    setInjected(false);
    setExported(false);
  };

  const handleGenerateBatch = () => {
    setSequences(generateBatch(selectedSample));
    setInjected(false);
    setExported(false);
  };

  const handleBatchInject = () => {
    if (!hasFile || !allGenerated) return;

    const injectionBlock = formatInjectionBlock(sequences, selectedSample);
    setAffirmationText((current) => `${current.trimEnd()}\n${injectionBlock}\n`);
    setInjected(true);
    setExported(false);
  };

  const handleExport = () => {
    if (!affirmationText) return;

    const blob = new Blob([affirmationText], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName || "affirmation.txt";
    document.body.append(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    setExported(true);
  };

  return (
    <section className="affirmation-panel" aria-label="Affirmation batch splice generator">
      <div className="affirmation-head">
        <div>
          <h2>Affirmation Batch Splice</h2>
          <p>Target: affirmation.txt · Synthetic five-track splice batch</p>
        </div>
        <div className="affirmation-actions">
          <label className="command-button file-command">
            <Upload size={16} />
            Import affirmation.txt
            <input type="file" accept=".txt,text/plain" onChange={handleImport} />
          </label>
          <button className="command-button primary" type="button" onClick={handleGenerateBatch}>
            <Layers size={16} />
            Generate Batch
          </button>
          <button className="command-button confirm" type="button" disabled={!hasFile || !allGenerated} onClick={handleBatchInject}>
            <CheckCircle2 size={16} />
            Confirm Batch Inject
          </button>
          <button className="command-button" type="button" disabled={!affirmationText} onClick={handleExport}>
            <Download size={16} />
            Export affirmation.txt
          </button>
        </div>
      </div>
      <div className="affirmation-status">
        <span className={hasFile ? "ready" : ""}>{hasFile ? fileName : "No file imported"}</span>
        <span>{lineCount} lines loaded</span>
        <span>{Object.keys(sequences).length}/5 generated</span>
        <span className={injected ? "ready" : ""}>{injected ? "Batch injected" : "Pending injection"}</span>
        <span className={exported ? "ready" : ""}>{exported ? "Export launched" : "Export pending"}</span>
      </div>
      <div className="sequence-grid">
        {profiles.map((profile) => (
          <SequenceHudCard
            key={profile.id}
            profile={profile}
            generated={sequences[profile.id]}
            onGenerate={handleGenerateOne}
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

function VariantTable({ selectedSample, tab, onTabChange }) {
  const [query, setQuery] = useState("");
  const [showFlaggedOnly, setShowFlaggedOnly] = useState(false);
  const [consequence, setConsequence] = useState("All Consequences");

  const filteredVariants = useMemo(() => {
    return variants.filter((variant) => {
      const text = `${variant.chr} ${variant.position} ${variant.region} ${variant.consequence} ${variant.type}`.toLowerCase();
      const matchesQuery = text.includes(query.toLowerCase());
      const matchesTab = tab === "SNP" ? variant.type === "SNP" : variant.type === "Indel";
      const matchesStatus = !showFlaggedOnly || variant.status === "Flagged";
      const matchesConsequence = consequence === "All Consequences" || variant.impact === consequence;
      return matchesQuery && matchesTab && matchesStatus && matchesConsequence;
    });
  }, [consequence, query, showFlaggedOnly, tab]);

  return (
    <section className="variant-section" aria-label="Variant calls">
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
        <select aria-label="All filters">
          <option>All Filters</option>
          <option>PASS</option>
          <option>q10</option>
          <option>LowDepth</option>
        </select>
        <label className="checkbox-label">
          <input type="checkbox" checked={showFlaggedOnly} onChange={(event) => setShowFlaggedOnly(event.target.checked)} />
          Show flagged only
        </label>
        <span className="variant-count">12,842 variants</span>
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
            {filteredVariants.map((variant) => (
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
        <span>Rows per page: <button type="button">25 <ChevronDown size={14} /></button></span>
        <span>1-25 of 12,842</span>
        <button className="icon-button" type="button" aria-label="Previous page"><ChevronLeft size={18} /></button>
        <button className="icon-button" type="button" aria-label="Next page"><ChevronRight size={18} /></button>
      </div>
    </section>
  );
}

function Inspector({ selectedSample, reportItems, onAddToReport }) {
  const included = reportItems.includes(selectedSample.id);

  return (
    <aside className="inspector" aria-label="Sample inspector">
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

  const toggleReportItem = (sampleId) => {
    setReportItems((current) =>
      current.includes(sampleId) ? current.filter((item) => item !== sampleId) : [...current, sampleId]
    );
  };

  return (
    <div className="app-shell">
      <Sidebar activeNav={activeNav} onNavChange={setActiveNav} />
      <div className="main-shell">
        <Header running={running} onRunToggle={() => setRunning((value) => !value)} />
        <div className="content-grid">
          <SamplesPanel
            selectedSample={selectedSample}
            onSelectSample={setSelectedSample}
            sampleFilter={sampleFilter}
            onFilterChange={setSampleFilter}
          />
          <div className="middle-column">
            <Workspace selectedSample={selectedSample} />
            <AffirmationBatchPanel selectedSample={selectedSample} />
            <VariantTable selectedSample={selectedSample} tab={variantTab} onTabChange={setVariantTab} />
          </div>
          <Inspector selectedSample={selectedSample} reportItems={reportItems} onAddToReport={toggleReportItem} />
        </div>
      </div>
    </div>
  );
}
