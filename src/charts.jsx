import React from "react";
import { lineageClusters } from "./data.js";

const sparkValues = {
  q30: [40, 36, 42, 39, 47, 44, 45, 49, 43, 51, 46, 48, 52, 50, 45, 47, 53, 58, 55, 61, 56, 63, 60],
  coverage: [28, 35, 31, 38, 40, 43, 39, 45, 48, 41, 46, 42, 37, 35, 39, 32, 36, 43, 29, 34],
  heterozygosity: [22, 24, 25, 27, 26, 30, 31, 29, 32, 34, 35, 33, 31, 30, 29, 28, 30, 29, 31, 30, 32, 31]
};

export function Sparkline({ variant = "q30" }) {
  const values = sparkValues[variant];
  const max = Math.max(...values);
  const min = Math.min(...values);
  const points = values
    .map((value, index) => {
      const x = (index / (values.length - 1)) * 118;
      const y = 42 - ((value - min) / (max - min)) * 24;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  return (
    <svg className="sparkline" viewBox="0 0 118 48" role="img" aria-label={`${variant} trend`}>
      <polyline points={points} fill="none" stroke="#6fe181" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
      <line x1="0" x2="118" y1="42" y2="42" stroke="rgba(188, 213, 223, 0.16)" />
    </svg>
  );
}

export function Histogram() {
  const bars = [8, 10, 12, 15, 19, 24, 31, 37, 44, 52, 61, 72, 84, 95, 88, 76, 61, 48, 39, 31, 24, 18, 14, 10];

  return (
    <svg className="histogram" viewBox="0 0 132 54" role="img" aria-label="GC balance distribution">
      <line x1="4" x2="128" y1="45" y2="45" stroke="rgba(209, 226, 233, 0.2)" />
      {bars.map((bar, index) => {
        const height = bar * 0.36;
        return (
          <rect
            key={index}
            x={index * 5.2 + 5}
            y={45 - height}
            width="3.2"
            height={height}
            rx="1.2"
            fill={index > 10 && index < 16 ? "#37d3df" : "rgba(75, 177, 190, 0.48)"}
          />
        );
      })}
      <text x="4" y="53" fill="#8da1ab" fontSize="8">0</text>
      <text x="60" y="53" fill="#8da1ab" fontSize="8">50</text>
      <text x="116" y="53" fill="#8da1ab" fontSize="8">100</text>
    </svg>
  );
}

export function LineagePlot({ selectedSample }) {
  return (
    <div className="lineage-content">
      <svg className="lineage-plot" viewBox="0 0 340 240" role="img" aria-label="Lineage placement scatter plot">
        <defs>
          <filter id="lineageGlow" x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <line x1="38" y1="202" x2="296" y2="202" stroke="rgba(201, 222, 229, 0.32)" />
        <line x1="38" y1="202" x2="38" y2="26" stroke="rgba(201, 222, 229, 0.32)" />
        <text x="300" y="212" fill="#9eafb8" fontSize="12">PC1</text>
        <text x="22" y="24" fill="#9eafb8" fontSize="12" transform="rotate(-90 22 24)">PC2</text>
        {lineageClusters.map((cluster) =>
          cluster.points.map(([x, y], pointIndex) => (
            <circle
              key={`${cluster.label}-${pointIndex}`}
              cx={38 + x * 2.28}
              cy={202 - y * 1.72}
              r={cluster.label === "Other Canids" ? 3.2 : 4}
              fill={cluster.color}
              opacity={cluster.label === selectedSample.lineage || selectedSample.lineage === "Canis lupus" ? 0.92 : 0.48}
              filter="url(#lineageGlow)"
            />
          ))
        )}
        <circle cx="192" cy="84" r="9" fill="none" stroke="#f8fbfd" strokeWidth="2" />
        <circle cx="192" cy="84" r="3.5" fill="#f8fbfd" />
        <text x="208" y="88" fill="#eef7fa" fontSize="12">{selectedSample.id}</text>
      </svg>
      <div className="legend-list" aria-label="Lineage legend">
        {lineageClusters.map((cluster) => (
          <span key={cluster.label}>
            <i style={{ background: cluster.color }} />
            {cluster.label}
          </span>
        ))}
      </div>
    </div>
  );
}

export function GenomeTracks() {
  const coverage = Array.from({ length: 116 }, (_, index) => {
    const wave = Math.sin(index / 8) * 8 + Math.cos(index / 15) * 5;
    return Math.max(12, Math.round(25 + wave + ((index * 11) % 9)));
  });

  return (
    <div className="genome-chart" aria-label="Genome overview chart">
      <div className="chromosomes">
        {Array.from({ length: 38 }, (_, index) => (
          <span key={index}>
            <b>{index + 1}</b>
            <i />
          </span>
        ))}
      </div>
      <div className="track-labels">
        <span>Coverage (x)</span>
        <span>Variant Density (SNP + Indel)</span>
      </div>
      <svg className="coverage-track" viewBox="0 0 720 92" role="img" aria-label="Coverage and variant density">
        <line x1="0" y1="24" x2="720" y2="24" stroke="rgba(213, 230, 236, 0.24)" strokeDasharray="5 7" />
        <line x1="0" y1="64" x2="720" y2="64" stroke="rgba(213, 230, 236, 0.14)" />
        {coverage.map((height, index) => (
          <rect
            key={`coverage-${index}`}
            x={index * 6.2}
            y={64 - height}
            width="4.6"
            height={height}
            rx="1.4"
            fill="rgba(38, 199, 211, 0.58)"
          />
        ))}
        {Array.from({ length: 94 }, (_, index) => {
          const height = 16 + ((index * 17) % 36);
          const flagged = index % 17 === 0 || index % 31 === 0;
          return (
            <rect
              key={`variant-${index}`}
              x={index * 7.55}
              y={90 - height}
              width="3.6"
              height={height}
              rx="1.1"
              fill={flagged ? "#f3b84b" : "#2fe4c7"}
            />
          );
        })}
      </svg>
      <div className="variant-key">
        <span><i className="snp" />SNP</span>
        <span><i className="indel" />Indel</span>
      </div>
    </div>
  );
}
