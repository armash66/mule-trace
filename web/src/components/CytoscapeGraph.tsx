import React, { useEffect, useRef } from 'react';
import cytoscape from 'cytoscape';
import type { Core } from 'cytoscape';
import type { NetworkEdge, NetworkNode } from '../api/types';
import { formatLakhs } from '../lib/utils';
import { ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';

interface CytoscapeGraphProps {
  nodes: NetworkNode[];
  edges: NetworkEdge[];
  selectedId?: string | null;
  recommendedFreezeId?: string | null;
  onNodeClick?: (nodeId: string) => void;
  height?: string | number;
}

export const CytoscapeGraph: React.FC<CytoscapeGraphProps> = ({
  nodes,
  edges,
  selectedId,
  recommendedFreezeId,
  onNodeClick,
  height = '100%',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const cyRef = useRef<Core | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Convert to Cytoscape elements
    const elements: cytoscape.ElementDefinition[] = [];

    nodes.forEach((n) => {
      let color = 'var(--risk-low)';
      if (n.score >= 75) color = 'var(--signal)';
      else if (n.score >= 40) color = 'var(--ink-2)';
      else color = 'var(--ink-2)';

      const isFreeze = n.id === recommendedFreezeId;
      const isSelected = n.id === selectedId;

      elements.push({
        group: 'nodes',
        data: {
          id: n.id,
          label: n.id,
          score: n.score,
          color: color,
          isFreeze: isFreeze ? 1 : 0,
          isSelected: isSelected ? 1 : 0,
        },
      });
    });

    edges.forEach((e, idx) => {
      elements.push({
        group: 'edges',
        data: {
          id: `e_${e.src}_${e.dst}_${idx}`,
          source: e.src,
          target: e.dst,
          label: formatLakhs(e.total_amount),
          amount: e.total_amount,
        },
      });
    });

    // Destroy existing instance if any
    if (cyRef.current) {
      cyRef.current.destroy();
    }

    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const textColor = isDark ? 'var(--paper)' : 'var(--ink)';
    const edgeColor = isDark ? 'var(--ink)' : 'var(--ink)';

    const cy = cytoscape({
      container: containerRef.current,
      elements: elements,
      style: [
        {
          selector: 'node',
          style: {
            'background-color': 'data(color)',
            label: 'data(label)',
            'font-family': 'JetBrains Mono, monospace',
            'font-size': '11px',
            'font-weight': 600,
            color: textColor,
            'text-valign': 'bottom',
            'text-margin-y': 6,
            width: 36,
            height: 36,
            'border-width': 2,
            'border-color': 'var(--paper)',
            'transition-property': 'background-color, border-width, border-color, width, height',
            'transition-duration': 0.2,
          },
        },
        {
          selector: 'node[isSelected = 1]',
          style: {
            'border-width': 4,
            'border-color': 'var(--ink)',
            width: 44,
            height: 44,
          },
        },
        {
          selector: 'node[isFreeze = 1]',
          style: {
            'border-width': 4,
            'border-color': 'var(--signal)',
            width: 44,
            height: 44,
          },
        },
        {
          selector: 'edge',
          style: {
            width: 2,
            'line-color': edgeColor,
            'target-arrow-color': edgeColor,
            'target-arrow-shape': 'triangle',
            'curve-style': 'bezier',
            'arrow-scale': 1.1,
            label: 'data(label)',
            'font-family': 'JetBrains Mono, monospace',
            'font-size': '10px',
            color: isDark ? 'var(--ink-2)' : 'var(--ink-2)',
            'text-background-opacity': 0.85,
            'text-background-color': isDark ? 'var(--ink)' : 'var(--paper)',
            'text-background-padding': '2px',
            'text-background-shape': 'roundrectangle',
          },
        },
      ],
      layout: {
        name: 'breadthfirst',
        directed: true,
        padding: 40,
        spacingFactor: 1.3,
      },
      minZoom: 0.3,
      maxZoom: 2.5,
      wheelSensitivity: 0.25,
    });

    cy.on('tap', 'node', (evt) => {
      const node = evt.target;
      if (onNodeClick) {
        onNodeClick(node.id());
      }
    });

    cyRef.current = cy;

    return () => {
      cy.destroy();
    };
  }, [nodes, edges, selectedId, recommendedFreezeId, onNodeClick]);

  const handleZoomIn = () => cyRef.current?.zoom(cyRef.current.zoom() * 1.25);
  const handleZoomOut = () => cyRef.current?.zoom(cyRef.current.zoom() * 0.8);
  const handleFit = () => cyRef.current?.fit(undefined, 30);

  return (
    <div style={{ position: 'relative', width: '100%', height: height, overflow: 'hidden' }}>
      <div ref={containerRef} style={{ width: '100%', height: '100%' }} />

      {/* Floating Controls */}
      <div
        style={{
          position: 'absolute',
          bottom: '16px',
          right: '16px',
          display: 'flex',
          gap: '6px',
          backgroundColor: 'var(--surface)',
          padding: '4px',
          border: '1px solid var(--line)',
          }}
      >
        <button
          onClick={handleZoomIn}
          title="Zoom In"
          style={{
            background: 'transparent',
            border: 'none',
            color: 'var(--ink-2)',
            padding: '4px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <ZoomIn size={15} />
        </button>
        <button
          onClick={handleZoomOut}
          title="Zoom Out"
          style={{
            background: 'transparent',
            border: 'none',
            color: 'var(--ink-2)',
            padding: '4px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <ZoomOut size={15} />
        </button>
        <button
          onClick={handleFit}
          title="Fit Network"
          style={{
            background: 'transparent',
            border: 'none',
            color: 'var(--ink-2)',
            padding: '4px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <Maximize2 size={15} />
        </button>
      </div>

      {/* Legend */}
      <div
        style={{
          position: 'absolute',
          top: '16px',
          left: '16px',
          backgroundColor: 'var(--surface)',
          padding: '8px 12px',
          border: '1px solid var(--line)',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          fontSize: '11px',
          color: 'var(--ink-2)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span style={{ width: 8, height: 8, backgroundColor: 'var(--signal)' }} />
          <span>High Risk (≥75)</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span style={{ width: 8, height: 8, backgroundColor: 'var(--ink-2)' }} />
          <span>Mid Risk</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span style={{ width: 8, height: 8, backgroundColor: 'var(--ink-2)' }} />
          <span>Low Risk</span>
        </div>
      </div>
    </div>
  );
};
