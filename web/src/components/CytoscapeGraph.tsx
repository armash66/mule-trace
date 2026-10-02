import React, { useEffect, useRef, useState } from 'react';
import cytoscape from 'cytoscape';
import type { Core } from 'cytoscape';
import type { NetworkEdge, NetworkNode } from '../api/types';
import { getThemeColors } from '../lib/theme';

interface CytoscapeGraphProps {
  nodes: NetworkNode[];
  edges: NetworkEdge[];
  selectedId?: string | null;
  recommendedFreezeId?: string | null;
  onNodeClick?: (nodeId: string) => void;
  onEdgeClick?: (edge: NetworkEdge) => void;
  height?: string | number;
  savedAmountFormatted?: string;
}

export const CytoscapeGraph: React.FC<CytoscapeGraphProps> = ({
  nodes,
  edges,
  selectedId,
  recommendedFreezeId,
  onNodeClick,
  onEdgeClick,
  height = '100%',
  savedAmountFormatted = '₹4.1L',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const cyRef = useRef<Core | null>(null);
  const [cutLabelPos, setCutLabelPos] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (!containerRef.current || nodes.length === 0) return;

    const theme = getThemeColors();

    // Compute node degrees
    const degreeMap: Record<string, number> = {};
    nodes.forEach((n) => {
      degreeMap[n.id] = 0;
    });
    edges.forEach((e) => {
      degreeMap[e.src] = (degreeMap[e.src] || 0) + 1;
      degreeMap[e.dst] = (degreeMap[e.dst] || 0) + 1;
    });

    // Find top-risk node (highest score)
    let topNodeId = nodes[0]?.id;
    let maxScore = -1;
    nodes.forEach((n) => {
      if (n.score > maxScore) {
        maxScore = n.score;
        topNodeId = n.id;
      }
    });

    // Convert to Cytoscape elements
    const elements: cytoscape.ElementDefinition[] = [];

    nodes.forEach((n) => {
      const isTop = n.id === topNodeId;
      const deg = degreeMap[n.id] || 0;
      const size = isTop ? 26 : Math.min(22, Math.max(10, 10 + deg * 2));

      elements.push({
        group: 'nodes',
        data: {
          id: n.id,
          label: n.id,
          isTop: isTop ? 1 : 0,
          nodeSize: size,
          isFreeze: n.id === recommendedFreezeId ? 1 : 0,
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
          edgeIndex: idx,
          isTainted: e.isTainted ? 1 : 0,
        },
      });
    });

    if (cyRef.current) {
      cyRef.current.destroy();
    }

    const cy = cytoscape({
      container: containerRef.current,
      elements: elements,
      style: [
        {
          selector: 'node',
          style: {
            'background-color': theme.ink,
            width: 'data(nodeSize)',
            height: 'data(nodeSize)',
            'border-width': 0,
            label: '',
            'font-family': 'JetBrains Mono, monospace',
            'font-size': '11px',
            'font-weight': 400,
            color: theme.ink,
            'text-valign': 'bottom',
            'text-margin-y': 6,
            'transition-property': 'opacity, background-color, border-width, border-color',
            'transition-duration': 0.25,
          },
        },
        // Top-risk node: signal fill, size 26, always shows label
        {
          selector: 'node[isTop = 1]',
          style: {
            'background-color': theme.signal,
            width: 26,
            height: 26,
            label: 'data(label)',
            'border-width': 0,
          },
        },
        // Show label on hover
        {
          selector: 'node:hover',
          style: {
            label: 'data(label)',
          },
        },
        // Neighbor nodes style (applied dynamically on select)
        {
          selector: 'node.neighbor',
          style: {
            'background-color': theme.paper,
            'border-width': 1,
            'border-color': theme.ink,
          },
        },
        // Faded style
        {
          selector: '.faded',
          style: {
            opacity: 0.15,
          },
        },
        // Edges: 1px ink at 0.5 opacity, small arrowheads
        {
          selector: 'edge',
          style: {
            width: 1,
            'line-color': theme.ink,
            opacity: 0.5,
            'target-arrow-color': theme.ink,
            'target-arrow-shape': 'triangle',
            'curve-style': 'bezier',
            'arrow-scale': 0.7,
            'transition-property': 'opacity',
            'transition-duration': 0.25,
          },
        },
        {
          selector: 'edge[isTainted = 1]',
          style: {
            'line-color': theme.signal,
            'target-arrow-color': theme.signal,
            width: 2.5,
            opacity: 0.95,
          },
        },
      ],
      layout: {
        name: 'cose',
        animate: false,
        padding: 30,
        componentSpacing: 40,
        nodeOverlap: 20,
      },
      minZoom: 0.2,
      maxZoom: 3,
      wheelSensitivity: 0.2,
    });

    const updateCutLabel = () => {
      if (!recommendedFreezeId) {
        setCutLabelPos(null);
        return;
      }
      const targetNode = cy.getElementById(recommendedFreezeId);
      if (targetNode && targetNode.length > 0) {
        const renderedPos = targetNode.renderedPosition();
        setCutLabelPos({ x: renderedPos.x, y: renderedPos.y });
      } else {
        setCutLabelPos(null);
      }
    };

    cy.on('render pan zoom', updateCutLabel);

    const applySelection = (nodeId: string) => {
      const selectedNode = cy.getElementById(nodeId);
      if (!selectedNode || selectedNode.length === 0) {
        cy.elements().removeClass('faded neighbor');
        return;
      }

      const neighborhood = selectedNode.closedNeighborhood();
      const neighbors = selectedNode.neighborhood('node');

      // Fade everything outside the ring to 0.15 opacity
      cy.elements().addClass('faded');
      neighborhood.removeClass('faded');

      // Neighbour nodes: paper fill with 1px ink border
      cy.nodes().removeClass('neighbor');
      neighbors.forEach((n) => {
        if (n.data('isTop') !== 1) {
          n.addClass('neighbor');
        }
      });

      // Fit the view in 400ms
      cy.animate({
        fit: {
          eles: neighborhood,
          padding: 40,
        },
        duration: 400,
      });
    };

    if (selectedId) {
      applySelection(selectedId);
    }

    cy.on('tap', 'node', (evt) => {
      const node = evt.target;
      const clickedId = node.id();
      applySelection(clickedId);
      if (onNodeClick) {
        onNodeClick(clickedId);
      }
    });

    cy.on('tap', 'edge', (evt) => {
      const edge = edges[evt.target.data('edgeIndex') as number];
      if (edge && onEdgeClick) onEdgeClick(edge);
    });

    cy.on('tap', (evt) => {
      if (evt.target === cy) {
        cy.elements().removeClass('faded neighbor');
        cy.animate({
          fit: {
            eles: cy.elements(),
            padding: 30,
          },
          duration: 400,
        });
      }
    });

    cyRef.current = cy;
    setTimeout(updateCutLabel, 100);

    return () => {
      cy.destroy();
    };
  }, [nodes, edges, selectedId, recommendedFreezeId, onNodeClick, onEdgeClick]);

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        height: height,
        overflow: 'hidden',
        backgroundColor: 'var(--paper)',
      }}
    >
      <div ref={containerRef} style={{ width: '100%', height: '100%' }} />

      {/* "Cut here · saves ₹4.1L" label with 1px line to node */}
      {cutLabelPos && (
        <div
          style={{
            position: 'absolute',
            left: `${cutLabelPos.x + 18}px`,
            top: `${cutLabelPos.y - 12}px`,
            pointerEvents: 'none',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            zIndex: 10,
          }}
        >
          <div
            style={{
              width: '14px',
              height: '1px',
              backgroundColor: 'var(--ink)',
            }}
          />
          <span
            className="mono"
            style={{
              fontSize: '11px',
              backgroundColor: 'var(--paper)',
              padding: '2px 6px',
              border: '1px solid var(--ink)',
              color: 'var(--ink)',
              whiteSpace: 'nowrap',
            }}
          >
            Cut here · saves {savedAmountFormatted}
          </span>
        </div>
      )}

      {/* Subtle zoom controls */}
      <div
        style={{
          position: 'absolute',
          bottom: '12px',
          right: '12px',
          display: 'flex',
          gap: '4px',
          zIndex: 5,
        }}
      >
        <button
          type="button"
          onClick={() => cyRef.current?.zoom(cyRef.current.zoom() * 1.25)}
          className="mono"
          style={{
            background: 'var(--paper)',
            border: '1px solid var(--rule)',
            color: 'var(--ink)',
            padding: '2px 8px',
            cursor: 'pointer',
          }}
        >
          +
        </button>
        <button
          type="button"
          onClick={() => cyRef.current?.zoom(cyRef.current.zoom() * 0.8)}
          className="mono"
          style={{
            background: 'var(--paper)',
            border: '1px solid var(--rule)',
            color: 'var(--ink)',
            padding: '2px 8px',
            cursor: 'pointer',
          }}
        >
          -
        </button>
        <button
          type="button"
          onClick={() => cyRef.current?.fit(undefined, 30)}
          className="mono"
          style={{
            background: 'var(--paper)',
            border: '1px solid var(--rule)',
            color: 'var(--ink)',
            padding: '2px 8px',
            cursor: 'pointer',
          }}
        >
          Fit
        </button>
      </div>
    </div>
  );
};
