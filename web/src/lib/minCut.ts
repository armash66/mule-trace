import type { NetworkEdge, NetworkNode } from '../api/types';

export interface MinCutResult {
  hasValidPath: boolean;
  totalFlow: number;
  flowStopped: number;
  percentStopped: number;
  freezeCount: number;
  cutNodes: string[];
  cutEdges: { src: string; dst: string; capacity?: number }[];
  downstreamMules: string[];
  downstreamCount: number;
  downstreamSavedPerAccount: number;
  zones: {
    victimInflow: string[];
    targetHubs: string[];
    downstreamMules: string[];
  };
  cutPathNodeIds: string[];
}

export function computeOptimalCut(
  nodes: NetworkNode[],
  edges: NetworkEdge[],
  victimSeedId?: string | null
): MinCutResult {
  const emptyResult: MinCutResult = {
    hasValidPath: false,
    totalFlow: 0,
    flowStopped: 0,
    percentStopped: 0,
    freezeCount: 0,
    cutNodes: [],
    cutEdges: [],
    downstreamMules: [],
    downstreamCount: 0,
    downstreamSavedPerAccount: 0,
    zones: {
      victimInflow: [],
      targetHubs: [],
      downstreamMules: [],
    },
    cutPathNodeIds: [],
  };

  if (!nodes || nodes.length === 0 || !edges || edges.length === 0) {
    return emptyResult;
  }

  const inDegree: Record<string, number> = {};
  const outDegree: Record<string, number> = {};
  const inFlow: Record<string, number> = {};
  const outFlow: Record<string, number> = {};
  const nodeIds = new Set(nodes.map((n) => n.id));

  nodes.forEach((n) => {
    inDegree[n.id] = 0;
    outDegree[n.id] = 0;
    inFlow[n.id] = 0;
    outFlow[n.id] = 0;
  });

  const validEdges = edges.filter((e) => nodeIds.has(e.src) && nodeIds.has(e.dst));

  validEdges.forEach((e) => {
    const amt = Number((e as any).total_amount || (e as any).amount || 10000);
    inDegree[e.dst] = (inDegree[e.dst] || 0) + 1;
    outDegree[e.src] = (outDegree[e.src] || 0) + 1;
    inFlow[e.dst] = (inFlow[e.dst] || 0) + amt;
    outFlow[e.src] = (outFlow[e.src] || 0) + amt;
  });

  let sources = nodes.filter((n) => inDegree[n.id] === 0).map((n) => n.id);
  if (victimSeedId && nodeIds.has(victimSeedId)) {
    sources = [victimSeedId, ...sources.filter((s) => s !== victimSeedId)];
  }
  if (sources.length === 0) {
    const sortedByIn = [...nodes].sort(
      (a, b) => (inDegree[a.id] || 0) - (inDegree[b.id] || 0)
    );
    sources = [sortedByIn[0].id];
  }

  let sinks = nodes
    .filter((n) => outDegree[n.id] === 0 && !sources.includes(n.id))
    .map((n) => n.id);
  if (sinks.length === 0) {
    const nonSources = nodes.filter((n) => !sources.includes(n.id));
    if (nonSources.length > 0) {
      const sortedByOut = [...nonSources].sort(
        (a, b) => (outDegree[a.id] || 0) - (outDegree[b.id] || 0)
      );
      sinks = sortedByOut
        .slice(0, Math.max(1, Math.min(3, Math.ceil(nonSources.length / 3))))
        .map((n) => n.id);
    } else {
      sinks = [nodes[nodes.length - 1].id];
    }
  }

  // Reachability BFS
  const visited = new Set<string>();
  const queue = [...sources];
  sources.forEach((s) => visited.add(s));

  while (queue.length > 0) {
    const cur = queue.shift()!;
    for (const e of validEdges) {
      if (e.src === cur && !visited.has(e.dst)) {
        visited.add(e.dst);
        queue.push(e.dst);
      }
    }
  }

  const reachableSinks = sinks.filter((s) => visited.has(s));
  if (reachableSinks.length === 0) {
    return emptyResult;
  }

  const SUPER_SOURCE = '__S__';
  const SUPER_SINK = '__T__';
  const totalGraphVolume = validEdges.reduce(
    (sum, e) => sum + Number((e as any).total_amount || (e as any).amount || 10000),
    0
  );
  const INF = totalGraphVolume * 10 + 1000000;

  interface FlowEdge {
    to: string;
    revIdx: number;
    capacity: number;
    flow: number;
    originalSrc?: string;
    originalDst?: string;
    isNodeSplitEdge?: boolean;
    splitNodeId?: string;
  }

  const adj: Record<string, FlowEdge[]> = {};
  const addEdge = (
    u: string,
    v: string,
    cap: number,
    origSrc?: string,
    origDst?: string,
    isSplit?: boolean,
    splitId?: string
  ) => {
    if (!adj[u]) adj[u] = [];
    if (!adj[v]) adj[v] = [];
    const idxU = adj[u].length;
    const idxV = adj[v].length;
    adj[u].push({
      to: v,
      revIdx: idxV,
      capacity: cap,
      flow: 0,
      originalSrc: origSrc,
      originalDst: origDst,
      isNodeSplitEdge: isSplit,
      splitNodeId: splitId,
    });
    adj[v].push({ to: u, revIdx: idxU, capacity: 0, flow: 0 });
  };

  nodes.forEach((n) => {
    const uIn = `${n.id}_in`;
    const uOut = `${n.id}_out`;
    const nodeCap = sources.includes(n.id)
      ? INF
      : Math.max(1000, inFlow[n.id] || outFlow[n.id] || 10000);
    addEdge(uIn, uOut, nodeCap, undefined, undefined, true, n.id);
  });

  validEdges.forEach((e) => {
    const amt = Number((e as any).total_amount || (e as any).amount || 10000);
    addEdge(`${e.src}_out`, `${e.dst}_in`, amt, e.src, e.dst);
  });

  sources.forEach((s) => addEdge(SUPER_SOURCE, `${s}_in`, INF));
  reachableSinks.forEach((t) => addEdge(`${t}_out`, SUPER_SINK, INF));

  let maxFlow = 0;
  while (true) {
    const parent: Record<string, { u: string; edgeIdx: number } | null> = {};
    const q: string[] = [SUPER_SOURCE];
    parent[SUPER_SOURCE] = null;

    while (q.length > 0 && !(SUPER_SINK in parent)) {
      const u = q.shift()!;
      const edgesU = adj[u] || [];
      for (let i = 0; i < edgesU.length; i++) {
        const edge = edgesU[i];
        if (edge.capacity - edge.flow > 0 && !(edge.to in parent)) {
          parent[edge.to] = { u, edgeIdx: i };
          q.push(edge.to);
        }
      }
    }

    if (!(SUPER_SINK in parent)) break;

    let push = Infinity;
    let curr = SUPER_SINK;
    while (curr !== SUPER_SOURCE) {
      const p = parent[curr]!;
      const edge = adj[p.u][p.edgeIdx];
      push = Math.min(push, edge.capacity - edge.flow);
      curr = p.u;
    }

    curr = SUPER_SINK;
    while (curr !== SUPER_SOURCE) {
      const p = parent[curr]!;
      const edge = adj[p.u][p.edgeIdx];
      edge.flow += push;
      adj[edge.to][edge.revIdx].flow -= push;
      curr = p.u;
    }

    maxFlow += push;
  }

  const reachableInResidual = new Set<string>();
  const resQueue: string[] = [SUPER_SOURCE];
  reachableInResidual.add(SUPER_SOURCE);

  while (resQueue.length > 0) {
    const u = resQueue.shift()!;
    for (const edge of adj[u] || []) {
      if (edge.capacity - edge.flow > 0 && !reachableInResidual.has(edge.to)) {
        reachableInResidual.add(edge.to);
        resQueue.push(edge.to);
      }
    }
  }

  const cutNodesSet = new Set<string>();
  const cutEdgesList: { src: string; dst: string; capacity?: number }[] = [];
  let flowStopped = 0;

  for (const u of Object.keys(adj)) {
    if (!reachableInResidual.has(u)) continue;
    for (const edge of adj[u]) {
      if (!reachableInResidual.has(edge.to)) {
        if (edge.isNodeSplitEdge && edge.splitNodeId) {
          if (!sources.includes(edge.splitNodeId)) {
            cutNodesSet.add(edge.splitNodeId);
            flowStopped += edge.flow > 0 ? edge.flow : edge.capacity;
          }
        } else if (edge.originalSrc && edge.originalDst) {
          cutEdgesList.push({
            src: edge.originalSrc,
            dst: edge.originalDst,
            capacity: edge.capacity,
          });
          flowStopped += edge.capacity;
        }
      }
    }
  }

  if (cutNodesSet.size === 0) {
    const intermediates = nodes
      .filter((n) => !sources.includes(n.id) && !reachableSinks.includes(n.id))
      .sort((a, b) => (inFlow[b.id] || 0) - (inFlow[a.id] || 0));
    if (intermediates.length > 0) {
      cutNodesSet.add(intermediates[0].id);
      flowStopped = inFlow[intermediates[0].id] || maxFlow;
    } else {
      const top = [...nodes]
        .filter((n) => !sources.includes(n.id))
        .sort((a, b) => (inFlow[b.id] || 0) - (inFlow[a.id] || 0))[0];
      if (top) {
        cutNodesSet.add(top.id);
        flowStopped = inFlow[top.id] || maxFlow;
      }
    }
  }

  const cutNodes = Array.from(cutNodesSet);
  const totalFlow = maxFlow > 0 ? maxFlow : totalGraphVolume;
  const computedFlowStopped = Math.min(
    totalFlow,
    flowStopped > 0 ? flowStopped : totalFlow
  );
  const percentStopped =
    totalFlow > 0
      ? Math.min(100, Math.round((computedFlowStopped / totalFlow) * 100))
      : 100;
  const downstreamMules = reachableSinks;
  const downstreamCount = Math.max(1, downstreamMules.length);
  const downstreamSavedPerAccount = Math.round(
    computedFlowStopped / downstreamCount
  );

  // Group into 3 zones for CytoscapeGraph:
  // Zone 1: Victim Inflow (sources)
  // Zone 2: Target Hubs (cut nodes + intermediate forwarding nodes)
  // Zone 3: Downstream Mules (reachable sinks / cash-out mules)
  const victimInflow = sources;
  const hubSet = new Set<string>();
  cutNodes.forEach((id) => {
    if (!victimInflow.includes(id) && !downstreamMules.includes(id)) {
      hubSet.add(id);
    }
  });

  nodes.forEach((n) => {
    if (
      !victimInflow.includes(n.id) &&
      !downstreamMules.includes(n.id) &&
      visited.has(n.id)
    ) {
      hubSet.add(n.id);
    }
  });

  if (hubSet.size === 0 && cutNodes.length > 0) {
    cutNodes.forEach((id) => hubSet.add(id));
  }

  const targetHubs = Array.from(hubSet);

  const cutPathNodeIds = Array.from(
    new Set([...victimInflow, ...targetHubs, ...downstreamMules])
  );

  return {
    hasValidPath: true,
    totalFlow,
    flowStopped: computedFlowStopped,
    percentStopped,
    freezeCount: cutNodes.length,
    cutNodes,
    cutEdges: cutEdgesList,
    downstreamMules,
    downstreamCount,
    downstreamSavedPerAccount,
    zones: {
      victimInflow,
      targetHubs,
      downstreamMules,
    },
    cutPathNodeIds,
  };
}
