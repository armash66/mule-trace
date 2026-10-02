import React, { useEffect, useRef, useState, useMemo } from 'react';
import cytoscape from 'cytoscape';
import type { Core } from 'cytoscape';
import type { NetworkEdge, NetworkNode } from '../api/types';
import { getThemeColors } from '../lib/theme';
import { computeOptimalCut, type MinCutResult } from '../lib/minCut';
import { WhyThisCutPanel } from './WhyThisCutPanel';
import { useStore } from '../store/store';
import { RotateCcw } from 'lucide-react';
import './CytoscapeGraph.css';

interface CytoscapeGraphProps {
  nodes: NetworkNode[];
  edges: NetworkEdge[];
  selectedId?: string | null;
  recommendedFreezeId?: string | null;
  ringId?: string | null;
  onNodeClick?: (nodeId: string) => void;
  height?: string | number;
  savedAmountFormatted?: string;
  isSimulationActive?: boolean;
  activeEdgeId?: string | null;
  settledEdgeIds?: string[];
  freezeNodeId?: string | null;
  freezeLabel?: string;
  identityOverlay?: {
    nodes: { id: string; label: string; type: string }[];
    edges: { src: string; dst: string; label: string; type: string }[];
    relatedAccountIds: string[];
  } | null;
}

export const CytoscapeGraph: React.FC<CytoscapeGraphProps> = ({
  nodes,
  edges,
  selectedId,
  recommendedFreezeId,
  ringId,
  onNodeClick,
  height = '100%',
  savedAmountFormatted = '₹4.1L',
  isSimulationActive = false,
  activeEdgeId = null,
  settledEdgeIds = [],
  freezeNodeId = null,
  freezeLabel,
  identityOverlay = null,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const cyRef = useRef<Core | null>(null);
  const [cutLabelPos, setCutLabelPos] = useState<{ x: number; y: number } | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const dashOffsetRef = useRef<number>(0);

  // Optimal Cut states
  const [isOptimalCut, setIsOptimalCut] = useState(false);
  const [whyCutOpen, setWhyCutOpen] = useState(false);
  const originalPositionsRef = useRef<Record<string, { x: number; y: number }>>({});

  const { activeRunId, selectedRingId } = useStore();
  const backendOffline = useStore((s) => (s as any).backendOffline) || false;
  const isLive = !backendOffline && !!activeRunId && !activeRunId.toLowerCase().includes('sample') && !activeRunId.toLowerCase().includes('demo');
  const datasetTag: 'LIVE' | 'SAMPLE' = isLive ? 'LIVE' : 'SAMPLE';

  // Compute Max-Flow / Min-Cut (Memoized, non-blocking)
  const minCutResult: MinCutResult = useMemo(() => {
    return computeOptimalCut(nodes, edges, selectedId || freezeNodeId || recommendedFreezeId);
  }, [nodes, edges, selectedId, freezeNodeId, recommendedFreezeId]);

  // Initialize or update Cytoscape graph
  useEffect(() => {
    if (!containerRef.current || nodes.length === 0) return;

    const theme = getThemeColors();
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

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

    // If cy instance exists and is in simulation mode, update elements incrementally for smooth animation
    if (cyRef.current && isSimulationActive) {
      const cy = cyRef.current;
      const existingNodes = new Set(cy.nodes().map((n) => n.id()));
      const existingEdges = new Set(cy.edges().map((e) => e.id()));

      // Add new nodes with scale + fade
      nodes.forEach((n) => {
        if (!existingNodes.has(n.id)) {
          let shape = 'ellipse';
          if (n.id.startsWith('DEV_') || n.id.includes('device') || n.id.startsWith('D-')) shape = 'rectangle';
          else if (n.id.startsWith('IP_') || n.id.includes('ip') || n.id.includes('.')) shape = 'diamond';
          else if (n.id.startsWith('RING_') || n.id.includes('ATM') || n.id.includes('OFFRAMP')) shape = 'hexagon';

          const isFreeze = n.id === (freezeNodeId || recommendedFreezeId);
          const size = isFreeze ? 28 : (n.id.includes('ATM') || n.id.includes('OFFRAMP') ? 24 : 20);

          const addedNode = cy.add({
            group: 'nodes',
            data: {
              id: n.id,
              label: n.id,
              nodeSize: size,
              nodeShape: shape,
            },
            style: {
              opacity: 0,
            },
          });

          // Scale + fade animation
          if (!reducedMotion) {
            addedNode.animate(
              {
                style: {
                  opacity: 1,
                },
              },
              {
                duration: 350,
              }
            );
          } else {
            addedNode.style('opacity', 1);
          }
        }
      });

      // Add new edges in direction of flow
      edges.forEach((e, idx) => {
        const edgeId = (e as any).id || `e_${e.src}_${e.dst}_${idx}`;
        if (!existingEdges.has(edgeId) && cy.getElementById(e.src).length > 0 && cy.getElementById(e.dst).length > 0) {
          cy.add({
            group: 'edges',
            data: {
              id: edgeId,
              source: e.src,
              target: e.dst,
            },
          });
        }
      });

      // Update active and settled edge classes
      cy.edges().removeClass('active-flow settled-flow');
      if (activeEdgeId) {
        const activeEdge = cy.getElementById(activeEdgeId);
        if (activeEdge.length > 0) {
          activeEdge.addClass('active-flow');
        } else {
          const lastEdge = edges[edges.length - 1];
          if (lastEdge) {
            const match = cy.edges(`[source = "${lastEdge.src}"][target = "${lastEdge.dst}"]`);
            if (match.length > 0) match.addClass('active-flow');
          }
        }
      }

      settledEdgeIds.forEach((eid) => {
        const settled = cy.getElementById(eid);
        if (settled.length > 0) settled.addClass('settled-flow');
      });

      // Update freeze target node
      cy.nodes().removeClass('freeze-target');
      const targetFreeze = freezeNodeId || recommendedFreezeId;
      if (targetFreeze) {
        const fNode = cy.getElementById(targetFreeze);
        if (fNode.length > 0) fNode.addClass('freeze-target');
      }

      return;
    }

    // Full graph initialization (fresh or non-simulation view)
    const elements: cytoscape.ElementDefinition[] = [];

    nodes.forEach((n) => {
      let shape = 'ellipse';
      if (n.id.startsWith('DEV_') || n.id.includes('device') || n.id.startsWith('D-')) shape = 'rectangle';
      else if (n.id.startsWith('IP_') || n.id.includes('ip') || n.id.includes('.')) shape = 'diamond';
      else if (n.id.startsWith('RING_') || n.id.includes('ATM') || n.id.includes('OFFRAMP')) shape = 'hexagon';

      const isTop = n.id === topNodeId;
      const isFreeze = n.id === (freezeNodeId || recommendedFreezeId);
      const size = isFreeze ? 28 : (isTop ? 26 : Math.max(16, Math.min(32, 14 + (degreeMap[n.id] || 1) * 3)));

      elements.push({
        group: 'nodes',
        data: {
          id: n.id,
          label: n.id,
          score: n.score,
          isTop: isTop ? 1 : 0,
          isFreeze: isFreeze ? 1 : 0,
          nodeSize: size,
          nodeShape: shape,
        },
        classes: isFreeze ? 'freeze-target' : '',
      });
    });

    edges.forEach((e, idx) => {
      const edgeId = (e as any).id || `e_${e.src}_${e.dst}_${idx}`;
      elements.push({
        group: 'edges',
        data: {
          id: edgeId,
          source: e.src,
          target: e.dst,
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
            'border-width': 1,
            'border-color': 'rgba(255, 255, 255, 0.15)',
            label: isSimulationActive ? 'data(label)' : '',
            'font-family': 'JetBrains Mono, monospace',
            'font-size': '10px',
            'font-weight': 500,
            color: theme.ink,
            'text-valign': 'bottom',
            'text-margin-y': 6,
            'transition-property': 'opacity, background-color, border-width, border-color',
            'transition-duration': 0.25,
          },
        },
        {
          selector: 'node[nodeShape = "rectangle"]',
          style: {
            shape: 'rectangle',
          },
        },
        {
          selector: 'node[nodeShape = "diamond"]',
          style: {
            shape: 'diamond',
          },
        },
        {
          selector: 'node[nodeShape = "hexagon"]',
          style: {
            shape: 'hexagon',
          },
        },
        // Top-risk node
        {
          selector: 'node[isTop = 1]',
          style: {
            'background-color': theme.signal,
            width: 26,
            height: 26,
            label: 'data(label)',
            'border-width': 2,
            'border-style': 'dashed',
            'border-color': theme.signal,
            'border-opacity': 0.9,
          },
        },
        // Freeze target node
        {
          selector: 'node.freeze-target',
          style: {
            'border-width': 3,
            'border-color': '#FF9F1C',
            'border-style': 'solid',
            'border-opacity': 1,
            label: 'data(label)',
            color: '#FF9F1C',
            'font-weight': 700,
          },
        },
        // Show label on hover
        {
          selector: 'node.hovered',
          style: {
            label: 'data(label)',
          },
        },
        // Neighbor nodes style
        {
          selector: 'node.neighbor',
          style: {
            'background-color': theme.paper2,
            'border-width': 1.5,
            'border-color': theme.ink,
          },
        },
        // Faded style
        {
          selector: '.faded',
          style: {
            opacity: 0.25,
          },
        },
        // Cut-receded nodes (25% opacity while preserving entity glyph shape)
        {
          selector: 'node.cut-receded',
          style: {
            opacity: 0.25,
          },
        },
        {
          selector: 'edge.cut-receded',
          style: {
            opacity: 0.12,
          },
        },
        // Identity Overlay: shared device/phone/IP nodes & dashed edges
        {
          selector: 'node.identity-overlay-node',
          style: {
            'background-color': '#FF9F1C',
            'border-width': 2,
            'border-color': '#FFFFFF',
            'border-style': 'dashed',
            label: 'data(label)',
            color: '#FF9F1C',
            'font-family': 'JetBrains Mono, monospace',
            'font-size': '10px',
            'font-weight': 700,
            opacity: 1,
            'z-index': 100,
          },
        },
        {
          selector: 'edge.identity-overlay-edge',
          style: {
            width: 2,
            'line-style': 'dashed',
            'line-color': '#FF9F1C',
            opacity: 0.95,
            label: 'data(label)',
            'font-family': 'JetBrains Mono, monospace',
            'font-size': '9px',
            'font-weight': 600,
            color: '#FF9F1C',
            'text-rotation': 'autorotate',
            'target-arrow-shape': 'none',
            'z-index': 99,
          },
        },
        {
          selector: 'node.identity-receded',
          style: {
            opacity: 0.25,
          },
        },
        {
          selector: 'edge.identity-receded',
          style: {
            opacity: 0.12,
          },
        },
        // Default edges
        {
          selector: 'edge',
          style: {
            width: 1,
            'line-color': theme.ink,
            opacity: 0.5,
            'target-arrow-color': theme.ink,
            'target-arrow-shape': 'triangle',
            'curve-style': 'bezier',
            'arrow-scale': 0.8,
            'transition-property': 'opacity',
            'transition-duration': 0.25,
          },
        },
        // Simulation: Active money-carrying edge
        {
          selector: 'edge.active-flow',
          style: {
            width: 3.5,
            'line-color': '#FF4B4B',
            'target-arrow-color': '#FF4B4B',
            'target-arrow-shape': 'triangle',
            'arrow-scale': 1.1,
            opacity: 1,
            'line-style': reducedMotion ? 'solid' : 'dashed',
            'line-dash-pattern': [5, 14],
            'line-dash-offset': 0,
            'z-index': 99,
          },
        },
        // Simulation: Settled edge
        {
          selector: 'edge.settled-flow',
          style: {
            width: 1.5,
            'line-color': 'rgba(255, 75, 75, 0.35)',
            'target-arrow-color': 'rgba(255, 75, 75, 0.35)',
            opacity: 0.35,
            'line-style': 'solid',
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

    // Record original node positions for seamless easing restoration
    const captureOriginalPositions = () => {
      const positions: Record<string, { x: number; y: number }> = {};
      cy.nodes().forEach((n) => {
        positions[n.id()] = { ...n.position() };
      });
      originalPositionsRef.current = positions;
    };

    cy.ready(captureOriginalPositions);
    cy.on('layoutstop', captureOriginalPositions);

    const updateCutLabel = () => {
      const targetId = freezeNodeId || recommendedFreezeId;
      if (!targetId) {
        setCutLabelPos(null);
        return;
      }
      const targetNode = cy.getElementById(targetId);
      if (targetNode && targetNode.length > 0) {
        const renderedPos = targetNode.renderedPosition();
        setCutLabelPos({ x: renderedPos.x, y: renderedPos.y });
      } else {
        setCutLabelPos(null);
      }
    };

    cy.on('render pan zoom', updateCutLabel);

    cy.on('mouseover', 'node', (e) => {
      e.target.addClass('hovered');
    });
    cy.on('mouseout', 'node', (e) => {
      e.target.removeClass('hovered');
    });

    const applySelection = (nodeId: string) => {
      const selectedNode = cy.getElementById(nodeId);
      if (!selectedNode || selectedNode.length === 0) {
        cy.elements().removeClass('faded neighbor');
        return;
      }

      const neighborhood = selectedNode.closedNeighborhood();
      const neighbors = selectedNode.neighborhood('node');

      cy.elements().addClass('faded');
      neighborhood.removeClass('faded');

      cy.nodes().removeClass('neighbor');
      neighbors.forEach((n) => {
        if (n.data('isTop') !== 1) {
          n.addClass('neighbor');
        }
      });

      if (!reducedMotion && !isOptimalCut) {
        cy.animate({
          fit: {
            eles: neighborhood,
            padding: 40,
          },
          duration: 400,
        });
      }
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

    cy.on('tap', (evt) => {
      if (evt.target === cy) {
        cy.elements().removeClass('faded neighbor');
        if (!reducedMotion && !isOptimalCut) {
          cy.animate({
            fit: {
              eles: cy.elements(),
              padding: 30,
            },
            duration: 400,
          });
        }
      }
    });

    cyRef.current = cy;
    setTimeout(updateCutLabel, 100);

    return () => {
      cy.destroy();
      cyRef.current = null;
    };
  }, [nodes, edges, selectedId, recommendedFreezeId, isSimulationActive, onNodeClick]);

  // Single travelling dot animation on active edge (Simulation mode)
  useEffect(() => {
    if (!isSimulationActive) {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }
      return;
    }

    const animateEdgeFlow = () => {
      if (!cyRef.current) return;
      dashOffsetRef.current = (dashOffsetRef.current - 1.2) % 19;
      const activeEles = cyRef.current.edges('.active-flow');
      if (activeEles.length > 0) {
        activeEles.style('line-dash-offset', dashOffsetRef.current);
      }
      animFrameRef.current = requestAnimationFrame(animateEdgeFlow);
    };

    animFrameRef.current = requestAnimationFrame(animateEdgeFlow);

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }
    };
  }, [isSimulationActive, activeEdgeId]);

  // ── Identity & Device Fingerprint Overlay Effect ──
  useEffect(() => {
    const cy = cyRef.current;
    if (!cy || nodes.length === 0) return;

    // Clean up any existing overlay nodes/edges and receded classes
    cy.elements('.identity-overlay-node, .identity-overlay-edge').remove();
    cy.elements().removeClass('identity-receded');

    if (identityOverlay && identityOverlay.nodes.length > 0) {
      // 1. Add overlay nodes
      identityOverlay.nodes.forEach((n) => {
        let shape = 'ellipse';
        if (n.type === 'SHARED_DEVICE') shape = 'rectangle';
        else if (n.type === 'SHARED_IP') shape = 'diamond';

        cy.add({
          group: 'nodes',
          data: {
            id: n.id,
            label: n.label,
            nodeShape: shape,
            nodeSize: 26,
          },
          classes: 'identity-overlay-node',
        });
      });

      // 2. Add dashed overlay edges
      identityOverlay.edges.forEach((e) => {
        if (cy.getElementById(e.src).length > 0 && cy.getElementById(e.dst).length > 0) {
          cy.add({
            group: 'edges',
            data: {
              id: `id_overlay_${e.src}_${e.dst}_${e.type}`,
              source: e.src,
              target: e.dst,
              label: e.label,
            },
            classes: 'identity-overlay-edge',
          });
        }
      });

      // 3. Recede unrelated nodes to 25% opacity
      const relatedSet = new Set(identityOverlay.relatedAccountIds);
      cy.nodes().forEach((n) => {
        if (!n.hasClass('identity-overlay-node') && !relatedSet.has(n.id())) {
          n.addClass('identity-receded');
        }
      });

      cy.edges().forEach((e) => {
        if (!e.hasClass('identity-overlay-edge')) {
          e.addClass('identity-receded');
        }
      });

      // 4. Position overlay nodes gracefully near their connected cluster
      const overlayNodes = cy.nodes('.identity-overlay-node');
      overlayNodes.forEach((on) => {
        const connectedNodes = on.neighborhood('node:not(.identity-overlay-node)').nodes();
        if (connectedNodes.length > 0) {
          let sumX = 0;
          let sumY = 0;
          connectedNodes.forEach((cn) => {
            const pos = cn.position();
            sumX += pos.x;
            sumY += pos.y;
          });
          const avgX = sumX / connectedNodes.length;
          const avgY = sumY / connectedNodes.length;
          on.position({ x: avgX + (Math.random() - 0.5) * 60, y: avgY - 60 });
        }
      });
    }
  }, [identityOverlay, nodes]);

  // ── Optimal Cut Layout Animation Effect (500-700ms ease-inout, never teleport) ──
  useEffect(() => {
    const cy = cyRef.current;
    if (!cy || nodes.length === 0) return;

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const animDuration = reducedMotion ? 0 : 600; // 600ms within 500-700ms requirement

    if (isOptimalCut) {
      // 1. Capture current positions if not yet captured
      if (Object.keys(originalPositionsRef.current).length === 0) {
        const positions: Record<string, { x: number; y: number }> = {};
        cy.nodes().forEach((n) => {
          positions[n.id()] = { ...n.position() };
        });
        originalPositionsRef.current = positions;
      }

      if (!minCutResult.hasValidPath) {
        return;
      }

      // 2. Compute 3-zone layout coordinates: Left to Right
      const w = cy.width() || 600;
      const h = cy.height() || 350;

      const xZone1 = w * 0.20; // Victim Inflow
      const xZone2 = w * 0.50; // Target Hubs
      const xZone3 = w * 0.80; // Downstream Cash-Out Mules

      const yMarginTop = 65; // Below zone headers
      const yMarginBottom = 40;
      const usableH = Math.max(140, h - yMarginTop - yMarginBottom);

      const victimNodes = minCutResult.zones.victimInflow;
      const hubNodes = minCutResult.zones.targetHubs;
      const muleNodes = minCutResult.zones.downstreamMules;

      const assignY = (index: number, total: number) => {
        if (total <= 1) return yMarginTop + usableH / 2;
        return yMarginTop + (index / (total - 1)) * usableH;
      };

      // Animate Zone 1 (Victims)
      victimNodes.forEach((id, idx) => {
        const node = cy.getElementById(id);
        if (node.length > 0) {
          const y = assignY(idx, victimNodes.length);
          const xOffset = victimNodes.length > 3 ? (idx % 2 === 0 ? -18 : 18) : 0;
          const targetPos = { x: xZone1 + xOffset, y };
          if (animDuration > 0) {
            node.animate({ position: targetPos }, { duration: animDuration, easing: 'ease-in-out' });
          } else {
            node.position(targetPos);
          }
        }
      });

      // Animate Zone 2 (Target Hubs)
      hubNodes.forEach((id, idx) => {
        const node = cy.getElementById(id);
        if (node.length > 0) {
          const y = assignY(idx, hubNodes.length);
          const xOffset = hubNodes.length > 3 ? (idx % 2 === 0 ? -22 : 22) : 0;
          const targetPos = { x: xZone2 + xOffset, y };
          if (animDuration > 0) {
            node.animate({ position: targetPos }, { duration: animDuration, easing: 'ease-in-out' });
          } else {
            node.position(targetPos);
          }
        }
      });

      // Animate Zone 3 (Downstream Mules)
      muleNodes.forEach((id, idx) => {
        const node = cy.getElementById(id);
        if (node.length > 0) {
          const y = assignY(idx, muleNodes.length);
          const xOffset = muleNodes.length > 3 ? (idx % 2 === 0 ? -18 : 18) : 0;
          const targetPos = { x: xZone3 + xOffset, y };
          if (animDuration > 0) {
            node.animate({ position: targetPos }, { duration: animDuration, easing: 'ease-in-out' });
          } else {
            node.position(targetPos);
          }
        }
      });

      // Recede nodes not on cut path to 25% opacity (entity glyph shapes preserved)
      const cutPathSet = new Set(minCutResult.cutPathNodeIds);
      cy.nodes().forEach((n) => {
        if (!cutPathSet.has(n.id())) {
          n.addClass('cut-receded');
        } else {
          n.removeClass('cut-receded');
        }
      });

      cy.edges().forEach((e) => {
        const srcReceded = !cutPathSet.has(e.data('source'));
        const dstReceded = !cutPathSet.has(e.data('target'));
        if (srcReceded || dstReceded) {
          e.addClass('cut-receded');
        } else {
          e.removeClass('cut-receded');
        }
      });
    } else {
      // Toggling off: Animate back to original layout positions (500-700ms ease-inout, never teleport)
      const orig = originalPositionsRef.current;
      cy.nodes().forEach((n) => {
        n.removeClass('cut-receded');
        const pos = orig[n.id()];
        if (pos) {
          if (animDuration > 0) {
            n.animate({ position: pos }, { duration: animDuration, easing: 'ease-in-out' });
          } else {
            n.position(pos);
          }
        }
      });
      cy.edges().removeClass('cut-receded');
    }
  }, [isOptimalCut, minCutResult, nodes]);

  // Reset Layout Handler
  const handleResetLayout = () => {
    setIsOptimalCut(false);
    setWhyCutOpen(false);

    const cy = cyRef.current;
    if (!cy) return;

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const animDuration = reducedMotion ? 0 : 600;

    const orig = originalPositionsRef.current;
    cy.nodes().forEach((n) => {
      n.removeClass('cut-receded faded neighbor');
      const pos = orig[n.id()];
      if (pos) {
        if (animDuration > 0) {
          n.animate({ position: pos }, { duration: animDuration, easing: 'ease-in-out' });
        } else {
          n.position(pos);
        }
      }
    });
    cy.edges().removeClass('cut-receded');

    if (animDuration > 0) {
      setTimeout(() => {
        cy.fit(undefined, 30);
      }, animDuration + 20);
    } else {
      cy.fit(undefined, 30);
    }
  };

  const handleToggleOptimalCut = () => {
    setIsOptimalCut((prev) => !prev);
  };

  const handleKeyDownToggle = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleToggleOptimalCut();
    }
  };

  return (
    <div className="cy-graph-container" style={{ height }}>
      {/* ── Graph Toolbar: Optimal Cut Switch & Reset Layout ──── */}
      <div className="cy-toolbar">
        <button
          type="button"
          role="switch"
          aria-checked={isOptimalCut}
          aria-pressed={isOptimalCut}
          tabIndex={0}
          onClick={handleToggleOptimalCut}
          onKeyDown={handleKeyDownToggle}
          className="toggle-optimal-cut"
          title="Toggle Optimal Cut"
        >
          <div className="switch-track">
            <div className="switch-thumb" />
          </div>
          <span>Optimal Cut</span>
        </button>

        <button
          type="button"
          className="btn-reset-layout"
          onClick={handleResetLayout}
          title="Reset layout"
          aria-label="Reset layout"
        >
          <RotateCcw size={12} />
          <span>Reset layout</span>
        </button>
      </div>

      {/* ── 3 Zones Background Columns (Visible when Optimal Cut is ON) ── */}
      {isOptimalCut && minCutResult.hasValidPath && (
        <div className="zones-overlay" aria-hidden="true">
          <div className="zone-col victim">
            <span className="zone-header-label">Victim Inflow</span>
          </div>
          <div className="zone-col hub">
            <span className="zone-header-label">Target Hubs</span>
          </div>
          <div className="zone-col mule">
            <span className="zone-header-label">Downstream Cash-Out Mules</span>
          </div>
        </div>
      )}

      {/* ── "No flow path found" when cut has no path ───────── */}
      {isOptimalCut && !minCutResult.hasValidPath && (
        <div className="no-flow-badge" role="status">
          No flow path found
        </div>
      )}

      {/* ── Glowing Dashed Amber Cut Line & Scissors Badge ─────── */}
      {isOptimalCut && minCutResult.hasValidPath && (
        <div className="cut-line-wrapper" style={{ left: '65%' }}>
          <div className="cut-line-amber" />
          <button
            type="button"
            className="cut-badge-button"
            onClick={() => setWhyCutOpen(true)}
            title="Click to view why this cut"
            aria-label={`Optimal cut stops ${minCutResult.percentStopped}% of flow with ${minCutResult.freezeCount} freezes. Click for details.`}
          >
            {/* SVG Scissors Icon (Strictly SVG, NOT an emoji) */}
            <svg
              className="cut-scissors-svg"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <circle cx="6" cy="6" r="3" />
              <circle cx="6" cy="18" r="3" />
              <line x1="20" y1="4" x2="8.12" y2="15.88" />
              <line x1="14.47" y1="14.48" x2="20" y2="20" />
              <line x1="8.12" y1="8.12" x2="12" y2="12" />
            </svg>
            <span className="cut-badge-text">
              Optimal cut · stops {minCutResult.percentStopped}% of flow with {minCutResult.freezeCount} freeze{minCutResult.freezeCount > 1 ? 's' : ''}
            </span>
          </button>
        </div>
      )}

      {/* ── Canvas Cytoscape container ───────────────────────── */}
      <div ref={containerRef} className="cy-canvas-host" />

      {/* ── "Why this cut" Side Panel (Desktop) / Bottom Sheet (Mobile) ── */}
      <WhyThisCutPanel
        result={minCutResult}
        datasetTag={datasetTag}
        isOpen={whyCutOpen}
        onClose={() => setWhyCutOpen(false)}
        ringId={ringId || selectedRingId}
      />

      {/* "Cut here / Freeze here" label with 1px line to target node (Simulation mode or default) */}
      {!isOptimalCut && cutLabelPos && (
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
              backgroundColor: isSimulationActive ? '#FF9F1C' : 'var(--ink)',
            }}
          />
          <span
            className="mono"
            style={{
              fontSize: '11px',
              backgroundColor: isSimulationActive ? '#1C150A' : 'var(--paper)',
              padding: '2px 8px',
              border: `1px solid ${isSimulationActive ? '#FF9F1C' : 'var(--ink)'}`,
              color: isSimulationActive ? '#FF9F1C' : 'var(--ink)',
              whiteSpace: 'nowrap',
              fontWeight: 600,
              boxShadow: isSimulationActive ? '0 0 10px rgba(255, 159, 28, 0.4)' : 'none',
            }}
          >
            {isSimulationActive ? (freezeLabel || 'Freeze here') : `Cut here · saves ${savedAmountFormatted}`}
          </span>
        </div>
      )}

      {/* Cytoscape Zoom Controls */}
      <div className="cy-zoom-controls">
        <button
          type="button"
          onClick={() => cyRef.current?.zoom(cyRef.current.zoom() * 1.25)}
          className="cy-zoom-btn"
          aria-label="Zoom in"
        >
          +
        </button>
        <button
          type="button"
          onClick={() => cyRef.current?.zoom(cyRef.current.zoom() * 0.8)}
          className="cy-zoom-btn"
          aria-label="Zoom out"
        >
          -
        </button>
        <button
          type="button"
          onClick={() => cyRef.current?.fit(undefined, 30)}
          className="cy-zoom-btn"
          aria-label="Fit graph"
        >
          Fit
        </button>
      </div>
    </div>
  );
};
