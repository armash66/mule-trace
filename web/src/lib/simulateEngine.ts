import type { NetworkEdge, NetworkNode } from '../api/types';
import scenariosData from '../data/scenarios.json';

export interface SimulationAlert {
  alert_id: string;
  rule_id?: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM';
  title: string;
  ring_id: string;
  account_id?: string;
  message?: string;
  detail: string;
}

export interface FreezePoint {
  account_id: string;
  amount_stoppable: number;
  label: string;
}

export interface SimulationPayload {
  type?: 'transaction';
  step: number;
  total_steps: number;
  is_offline_fallback?: boolean;
  transaction?: any;
  stolen_moving: number;
  money_out: number;
  time_to_intercept: number;
  new_alerts?: SimulationAlert[];
  all_alerts_count?: number;
  active_edge_id: string | null;
  settled_edge_ids: string[];
  freeze_point: FreezePoint | null;
  nodes: NetworkNode[];
  edges: NetworkEdge[];
}

export interface SimulationSummary {
  events_processed: number;
  total_events: number;
  alerts_raised: number;
  initial_amount: number;
  stolen_moving: number;
  money_out: number;
  money_intercepted: number;
  time_to_intercept: number;
  is_offline_fallback?: boolean;
}

export interface SimulationCallbacks {
  onTransaction: (payload: SimulationPayload) => void;
  onAlert: (alert: SimulationAlert) => void;
  onComplete: (summary: SimulationSummary) => void;
  onError?: (err: any) => void;
}

export interface ScenarioDefinition {
  id: string;
  title: string;
  description: string;
  hops: number;
  initial_amount: number;
  target_ring_id: string;
  victim_account: string;
  primary_hub: string;
  interception_account: string;
  transactions: any[];
}

class SimulationEngine {
  private activeScenarioId: string = 'digital_arrest';
  private speed: number = 1.0;
  private isPaused: boolean = false;
  private isRunning: boolean = false;
  private isOfflineFallback: boolean = false;
  private callbacks: SimulationCallbacks | null = null;
  private eventSource: EventSource | null = null;
  private fallbackTimer: any = null;
  private currentStepIndex: number = 0;
  private history: any[] = [];
  private allAlerts: SimulationAlert[] = [];
  private moneyOut: number = 0;
  private firstAlertTime: number | null = null;
  private startTime: number = 0;
  private nodesDict: Record<string, NetworkNode> = {};
  private edgesList: NetworkEdge[] = [];

  public getActiveScenario(): ScenarioDefinition {
    const scenarios = scenariosData as Record<string, ScenarioDefinition>;
    return (
      scenarios[this.activeScenarioId] ||
      scenarios['digital_arrest'] || {
        id: 'digital_arrest',
        title: 'Digital Arrest Scam',
        description: 'Coerced victim liquidation to mule accounts.',
        hops: 4,
        initial_amount: 1500000,
        target_ring_id: 'RNG-DIGITAL-ARREST',
        victim_account: 'ACC-003606',
        primary_hub: 'ACC-RING07-00',
        interception_account: 'ACC-RING07-00',
        transactions: [],
      }
    );
  }

  public getIsOfflineFallback(): boolean {
    return this.isOfflineFallback;
  }

  public start(scenarioId: string, speed: number = 1.0, callbacks: SimulationCallbacks): void {
    this.stop();

    this.activeScenarioId = scenarioId;
    this.speed = speed;
    this.callbacks = callbacks;
    this.isRunning = true;
    this.isPaused = false;
    this.isOfflineFallback = false;
    this.currentStepIndex = 0;
    this.history = [];
    this.allAlerts = [];
    this.moneyOut = 0;
    this.firstAlertTime = null;
    this.startTime = Date.now();
    this.nodesDict = {};
    this.edgesList = [];

    // Try connecting to SSE stream endpoint first
    try {
      const sseUrl = `/api/v1/simulate/stream?scenario_id=${encodeURIComponent(scenarioId)}&speed=${speed}`;
      const es = new EventSource(sseUrl);
      this.eventSource = es;

      let receivedFirstMessage = false;

      es.onmessage = (event) => {
        receivedFirstMessage = true;
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'transaction') {
            const payload: SimulationPayload = {
              ...data,
              is_offline_fallback: false,
            };
            this.callbacks?.onTransaction(payload);
            if (data.new_alerts && Array.isArray(data.new_alerts)) {
              data.new_alerts.forEach((alt: SimulationAlert) => {
                this.callbacks?.onAlert(alt);
              });
            }
          } else if (data.type === 'complete') {
            const summary: SimulationSummary = {
              ...data.summary,
              is_offline_fallback: false,
            };
            this.stop();
            this.callbacks?.onComplete(summary);
          }
        } catch (parseErr) {
          console.warn('Simulation SSE parse error:', parseErr);
        }
      };

      es.onerror = () => {
        // Fall back to client simulation engine if SSE fails or disconnects before data
        if (!receivedFirstMessage) {
          es.close();
          this.eventSource = null;
          this.startClientEngine();
        }
      };
    } catch {
      this.startClientEngine();
    }
  }

  private startClientEngine(): void {
    this.isOfflineFallback = true;
    this.runClientStep();
  }

  private runClientStep(): void {
    if (!this.isRunning || this.isPaused) return;

    const scenario = this.getActiveScenario();
    const txns = scenario.transactions;

    if (this.currentStepIndex >= txns.length) {
      // Completed
      const initialStolen = scenario.initial_amount;
      const intercepted = Math.max(0, initialStolen - this.moneyOut);
      const elapsedSec = (Date.now() - this.startTime) / 1000;
      const summary: SimulationSummary = {
        events_processed: this.history.length,
        total_events: txns.length,
        alerts_raised: this.allAlerts.length,
        initial_amount: initialStolen,
        stolen_moving: Math.max(0, initialStolen - this.moneyOut),
        money_out: this.moneyOut,
        money_intercepted: intercepted,
        time_to_intercept: this.firstAlertTime || elapsedSec,
        is_offline_fallback: true,
      };
      this.stop();
      this.callbacks?.onComplete(summary);
      return;
    }

    const txn = txns[this.currentStepIndex];
    this.history.push(txn);

    if (txn.is_terminal) {
      this.moneyOut += Number(txn.amount);
    }

    const elapsedSec = (Date.now() - this.startTime) / 1000;
    const initialStolen = scenario.initial_amount;
    const stolenMoving = Math.max(0, initialStolen - this.moneyOut);

    // Rule evaluations
    const newAlerts: SimulationAlert[] = [];
    const src = txn.src;
    const ringId = scenario.target_ring_id;

    // Rule 1: Rapid Fan-Out
    const outbound = this.history.filter((t) => t.src === src);
    if (outbound.length >= 3) {
      const totalOut = outbound.reduce((sum, t) => sum + Number(t.amount), 0);
      const fanAlertId = `ALT-FAN-${src}`;
      if (!this.allAlerts.some((a) => a.alert_id === fanAlertId)) {
        const alt: SimulationAlert = {
          alert_id: fanAlertId,
          rule_id: 'RULE_RAPID_FANOUT',
          severity: 'CRITICAL',
          title: 'Rapid fan-out detected',
          ring_id: ringId,
          account_id: src,
          detail: `Hub ${src} dispersed ₹${(totalOut / 100000).toFixed(1)}L across multiple receivers in minutes.`,
        };
        newAlerts.push(alt);
        this.allAlerts.push(alt);
        if (this.firstAlertTime === null) this.firstAlertTime = elapsedSec;
      }
    }

    // Rule 2: Device collision
    if (txn.device && !txn.device.startsWith('DEV-VIC') && !txn.device.startsWith('D-ATM')) {
      const devTxns = this.history.filter((t) => t.device === txn.device);
      const distinctAccts = new Set(devTxns.map((t) => t.src));
      if (distinctAccts.size >= 2) {
        const devAlertId = `ALT-DEV-${txn.device}`;
        if (!this.allAlerts.some((a) => a.alert_id === devAlertId)) {
          const alt: SimulationAlert = {
            alert_id: devAlertId,
            rule_id: 'RULE_SHARED_DEVICE',
            severity: 'HIGH',
            title: 'Hardware collision detected',
            ring_id: ringId,
            account_id: src,
            detail: `Device fingerprint ${txn.device} operating across multiple syndicate accounts.`,
          };
          newAlerts.push(alt);
          this.allAlerts.push(alt);
        }
      }
    }

    // Rule 3: Terminal Cashout
    if (txn.is_terminal) {
      const cashoutId = `ALT-CASHOUT-${txn.dst}`;
      if (!this.allAlerts.some((a) => a.alert_id === cashoutId)) {
        const alt: SimulationAlert = {
          alert_id: cashoutId,
          rule_id: 'RULE_CASHOUT',
          severity: 'CRITICAL',
          title: 'Terminal cash-out extraction',
          ring_id: ringId,
          account_id: txn.dst,
          detail: `Funds reaching terminal cash-out sink ${txn.dst} (${txn.channel || 'ATM'}).`,
        };
        newAlerts.push(alt);
        this.allAlerts.push(alt);
      }
    }

    // Graph nodes & edges
    const interceptionAcc = scenario.interception_account || src;
    for (const nid of [txn.src, txn.dst]) {
      if (!this.nodesDict[nid]) {
        const isInterception = nid === interceptionAcc;
        const isHub = nid === scenario.primary_hub;
        const isTerm = bool(txn.is_terminal && nid === txn.dst);
        const score = isInterception || isHub ? 96 : isTerm ? 30 : 82;
        this.nodesDict[nid] = {
          id: nid,
          score,
          patterns: [isHub ? 'fan' : 'chain'],
          age_days: 14,
        };
      }
    }

    const currentEdgeId = `e_${txn.src}_${txn.dst}_${txn.step}`;
    this.edgesList.push({
      src: txn.src,
      dst: txn.dst,
      total_amount: Number(txn.amount),
      count: 1,
      first_time: String(elapsedSec),
    } as NetworkEdge);

    const stoppableRupees = Math.max(0, initialStolen - this.moneyOut);

    const payload: SimulationPayload = {
      type: 'transaction',
      step: txn.step,
      total_steps: txns.length,
      is_offline_fallback: true,
      transaction: txn,
      stolen_moving: stolenMoving,
      money_out: this.moneyOut,
      time_to_intercept: this.firstAlertTime || elapsedSec,
      new_alerts: newAlerts,
      all_alerts_count: this.allAlerts.length,
      active_edge_id: currentEdgeId,
      settled_edge_ids: this.edgesList.slice(0, -1).map((e) => `${e.src}->${e.dst}`),
      freeze_point: {
        account_id: interceptionAcc,
        amount_stoppable: stoppableRupees,
        label: `Freeze here · stops ₹${(stoppableRupees / 100000).toFixed(1)}L`,
      },
      nodes: Object.values(this.nodesDict),
      edges: [...this.edgesList],
    };

    this.callbacks?.onTransaction(payload);
    newAlerts.forEach((alt) => this.callbacks?.onAlert(alt));

    this.currentStepIndex++;

    const delayMs = (txn.delay_ms || 500) / this.speed;
    this.fallbackTimer = setTimeout(() => {
      this.runClientStep();
    }, delayMs);
  }

  public pause(): void {
    this.isPaused = true;
    if (this.fallbackTimer) {
      clearTimeout(this.fallbackTimer);
      this.fallbackTimer = null;
    }
  }

  public resume(): void {
    if (this.isPaused && this.isRunning) {
      this.isPaused = false;
      if (this.isOfflineFallback) {
        this.runClientStep();
      }
    }
  }

  public setSpeed(speed: number): void {
    this.speed = speed;
  }

  public stop(): void {
    this.isRunning = false;
    this.isPaused = false;
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
    if (this.fallbackTimer) {
      clearTimeout(this.fallbackTimer);
      this.fallbackTimer = null;
    }
  }
}

function bool(val: any): boolean {
  return Boolean(val);
}

export const simulationEngine = new SimulationEngine();
