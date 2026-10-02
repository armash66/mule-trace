// Test Edmonds-Karp / Dinic Max-Flow Min-Cut on a tiny known graph
function computeOptimalCut(nodes, edges, victimSeedId) {
  if (!nodes || nodes.length === 0 || !edges || edges.length === 0) {
    return { hasValidPath: false, totalFlow: 0, flowStopped: 0, percentStopped: 0, freezeCount: 0, cutNodes: [], cutEdges: [], downstreamMules: [], downstreamCount: 0, downstreamSavedPerAccount: 0 };
  }

  const inDegree = {};
  const outDegree = {};
  const inFlow = {};
  const outFlow = {};
  const nodeIds = new Set(nodes.map(n => n.id));

  nodes.forEach(n => {
    inDegree[n.id] = 0;
    outDegree[n.id] = 0;
    inFlow[n.id] = 0;
    outFlow[n.id] = 0;
  });

  const validEdges = edges.filter(e => nodeIds.has(e.src) && nodeIds.has(e.dst));

  validEdges.forEach(e => {
    const amt = Number(e.total_amount || e.amount || 10000);
    inDegree[e.dst] = (inDegree[e.dst] || 0) + 1;
    outDegree[e.src] = (outDegree[e.src] || 0) + 1;
    inFlow[e.dst] = (inFlow[e.dst] || 0) + amt;
    outFlow[e.src] = (outFlow[e.src] || 0) + amt;
  });

  let sources = nodes.filter(n => inDegree[n.id] === 0).map(n => n.id);
  if (victimSeedId && nodeIds.has(victimSeedId)) {
    sources = [victimSeedId, ...sources.filter(s => s !== victimSeedId)];
  }
  if (sources.length === 0) {
    const sortedByIn = [...nodes].sort((a, b) => (inDegree[a.id] || 0) - (inDegree[b.id] || 0));
    sources = [sortedByIn[0].id];
  }

  let sinks = nodes.filter(n => outDegree[n.id] === 0 && !sources.includes(n.id)).map(n => n.id);
  if (sinks.length === 0) {
    const nonSources = nodes.filter(n => !sources.includes(n.id));
    if (nonSources.length > 0) {
      const sortedByOut = [...nonSources].sort((a, b) => (outDegree[a.id] || 0) - (outDegree[b.id] || 0));
      sinks = sortedByOut.slice(0, Math.max(1, Math.min(3, Math.ceil(nonSources.length / 3)))).map(n => n.id);
    } else {
      sinks = [nodes[nodes.length - 1].id];
    }
  }

  // Reachability BFS
  const visited = new Set();
  const queue = [...sources];
  sources.forEach(s => visited.add(s));

  while (queue.length > 0) {
    const cur = queue.shift();
    for (const e of validEdges) {
      if (e.src === cur && !visited.has(e.dst)) {
        visited.add(e.dst);
        queue.push(e.dst);
      }
    }
  }

  const reachableSinks = sinks.filter(s => visited.has(s));
  if (reachableSinks.length === 0) {
    return { hasValidPath: false, totalFlow: 0, flowStopped: 0, percentStopped: 0, freezeCount: 0, cutNodes: [], cutEdges: [], downstreamMules: [], downstreamCount: 0, downstreamSavedPerAccount: 0 };
  }

  const SUPER_SOURCE = '__S__';
  const SUPER_SINK = '__T__';
  const totalGraphVolume = validEdges.reduce((sum, e) => sum + Number(e.total_amount || e.amount || 10000), 0);
  const INF = totalGraphVolume * 10 + 1000000;

  const adj = {};
  const addEdge = (u, v, cap, origSrc, origDst, isSplit, splitId) => {
    if (!adj[u]) adj[u] = [];
    if (!adj[v]) adj[v] = [];
    const idxU = adj[u].length;
    const idxV = adj[v].length;
    adj[u].push({ to: v, revIdx: idxV, capacity: cap, flow: 0, originalSrc: origSrc, originalDst: origDst, isNodeSplitEdge: isSplit, splitNodeId: splitId });
    adj[v].push({ to: u, revIdx: idxU, capacity: 0, flow: 0 });
  };

  nodes.forEach(n => {
    const uIn = `${n.id}_in`;
    const uOut = `${n.id}_out`;
    const nodeCap = sources.includes(n.id) ? INF : Math.max(1000, inFlow[n.id] || outFlow[n.id] || 10000);
    addEdge(uIn, uOut, nodeCap, undefined, undefined, true, n.id);
  });

  validEdges.forEach(e => {
    const amt = Number(e.total_amount || e.amount || 10000);
    addEdge(`${e.src}_out`, `${e.dst}_in`, amt, e.src, e.dst);
  });

  sources.forEach(s => addEdge(SUPER_SOURCE, `${s}_in`, INF));
  reachableSinks.forEach(t => addEdge(`${t}_out`, SUPER_SINK, INF));

  let maxFlow = 0;
  while (true) {
    const parent = {};
    const q = [SUPER_SOURCE];
    parent[SUPER_SOURCE] = null;

    while (q.length > 0 && !(SUPER_SINK in parent)) {
      const u = q.shift();
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
      const p = parent[curr];
      const edge = adj[p.u][p.edgeIdx];
      push = Math.min(push, edge.capacity - edge.flow);
      curr = p.u;
    }

    curr = SUPER_SINK;
    while (curr !== SUPER_SOURCE) {
      const p = parent[curr];
      const edge = adj[p.u][p.edgeIdx];
      edge.flow += push;
      adj[edge.to][edge.revIdx].flow -= push;
      curr = p.u;
    }

    maxFlow += push;
  }

  const reachableInResidual = new Set();
  const resQueue = [SUPER_SOURCE];
  reachableInResidual.add(SUPER_SOURCE);

  while (resQueue.length > 0) {
    const u = resQueue.shift();
    for (const edge of adj[u] || []) {
      if (edge.capacity - edge.flow > 0 && !reachableInResidual.has(edge.to)) {
        reachableInResidual.add(edge.to);
        resQueue.push(edge.to);
      }
    }
  }

  const cutNodesSet = new Set();
  const cutEdgesList = [];
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
          cutEdgesList.push({ src: edge.originalSrc, dst: edge.originalDst, capacity: edge.capacity });
          flowStopped += edge.capacity;
        }
      }
    }
  }

  if (cutNodesSet.size === 0) {
    const intermediates = nodes
      .filter(n => !sources.includes(n.id) && !reachableSinks.includes(n.id))
      .sort((a, b) => (inFlow[b.id] || 0) - (inFlow[a.id] || 0));
    if (intermediates.length > 0) {
      cutNodesSet.add(intermediates[0].id);
      flowStopped = inFlow[intermediates[0].id] || maxFlow;
    } else {
      const top = [...nodes].filter(n => !sources.includes(n.id)).sort((a, b) => (inFlow[b.id] || 0) - (inFlow[a.id] || 0))[0];
      if (top) {
        cutNodesSet.add(top.id);
        flowStopped = inFlow[top.id] || maxFlow;
      }
    }
  }

  const cutNodes = Array.from(cutNodesSet);
  const totalFlow = maxFlow > 0 ? maxFlow : totalGraphVolume;
  const computedFlowStopped = Math.min(totalFlow, flowStopped > 0 ? flowStopped : totalFlow);
  const percentStopped = totalFlow > 0 ? Math.min(100, Math.round((computedFlowStopped / totalFlow) * 100)) : 100;
  const downstreamMules = reachableSinks;
  const downstreamCount = Math.max(1, downstreamMules.length);
  const downstreamSavedPerAccount = Math.round(computedFlowStopped / downstreamCount);

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
    downstreamSavedPerAccount
  };
}

// ── Test 1: Classic Diamond Network ──
// S -> A (100k)
// S -> B (50k)
// A -> T (70k)
// B -> T (50k)
// A -> B (30k)
const testNodes1 = [
  { id: 'S', label: 'Victim Inflow' },
  { id: 'A', label: 'Hub Layer 1' },
  { id: 'B', label: 'Hub Layer 2' },
  { id: 'T', label: 'Exit Mule Cashout' }
];

const testEdges1 = [
  { src: 'S', dst: 'A', amount: 100000 },
  { src: 'S', dst: 'B', amount: 50000 },
  { src: 'A', dst: 'T', amount: 70000 },
  { src: 'B', dst: 'T', amount: 50000 },
  { src: 'A', dst: 'B', amount: 30000 }
];

const res1 = computeOptimalCut(testNodes1, testEdges1);
console.log('Test 1 (Diamond):', JSON.stringify(res1, null, 2));

// Expected Max Flow:
// Path S->A->T: 70,000
// Path S->B->T: 50,000
// Total Flow = 120,000
if (res1.totalFlow !== 120000) {
  console.error(`FAIL: Expected totalFlow 120000, got ${res1.totalFlow}`);
  process.exit(1);
} else {
  console.log('✓ Test 1 Passed: Max Flow = 120,000, stopped =', res1.flowStopped, 'Percent =', res1.percentStopped + '%');
}

// ── Test 2: Disconnected Graph ──
const testNodes2 = [
  { id: 'S', label: 'Victim' },
  { id: 'T', label: 'Sink' }
];
const testEdges2 = []; // no edges
const res2 = computeOptimalCut(testNodes2, testEdges2);
console.log('Test 2 (Disconnected):', res2);
if (res2.hasValidPath !== false) {
  console.error('FAIL: Expected hasValidPath to be false');
  process.exit(1);
} else {
  console.log('✓ Test 2 Passed: Disconnected graph detected properly.');
}

// ── Test 3: Realistic Mule Ring (Source -> 2 Hubs -> 4 Mules) ──
const testNodes3 = [
  { id: 'Victim_1', label: 'Victim' },
  { id: 'Hub_Alpha', label: 'Layer 1 Mule' },
  { id: 'Hub_Beta', label: 'Layer 1 Mule' },
  { id: 'Cashout_1', label: 'ATM Mule' },
  { id: 'Cashout_2', label: 'Crypto Mule' },
  { id: 'Cashout_3', label: 'UPI Mule' }
];

const testEdges3 = [
  { src: 'Victim_1', dst: 'Hub_Alpha', amount: 500000 },
  { src: 'Victim_1', dst: 'Hub_Beta', amount: 300000 },
  { src: 'Hub_Alpha', dst: 'Cashout_1', amount: 250000 },
  { src: 'Hub_Alpha', dst: 'Cashout_2', amount: 250000 },
  { src: 'Hub_Beta', dst: 'Cashout_3', amount: 300000 }
];

const res3 = computeOptimalCut(testNodes3, testEdges3);
console.log('Test 3 (Mule Ring):', JSON.stringify(res3, null, 2));
if (res3.totalFlow !== 800000) {
  console.error(`FAIL: Expected totalFlow 800000, got ${res3.totalFlow}`);
  process.exit(1);
} else {
  console.log('✓ Test 3 Passed: Mule Ring Max Flow = ₹8,00,000, Downstream saved per account =', res3.downstreamSavedPerAccount);
}

console.log('ALL UNIT TESTS PASSED!');
