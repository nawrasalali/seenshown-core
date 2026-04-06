// ============================================
// SIMULATION STORE
// Central state for the running simulation
// ============================================

import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import {
  SimulationGraph,
  NarrationHook,
  UIState,
  PlaybackState,
  UserMode,
  Entity,
} from '../types/index';
import { SimulationRuntime } from '../engine/SimulationRuntime';

// Single runtime instance — lives outside React tree
export const runtime = new SimulationRuntime();

interface SimulationState {
  // Current simulation
  graph: SimulationGraph | null;
  isLoading: boolean;
  loadError: string | null;

  // UI state
  ui: UIState;

  // Live data (updated every tick)
  currentTick: number;
  entityCount: number;
  narrationHistory: NarrationHook[];
  currentNarration: string;

  // Selected entity for inspector
  selectedEntity: Entity | null;

  // Actions
  loadSimulation: (query: string, templateId?: string) => Promise<void>;
  play: () => void;
  pause: () => void;
  replay: () => void;
  scrubTo: (tick: number) => void;
  setSpeed: (speed: 1 | 2 | 4 | 8) => void;
  setZoom: (zoom: number) => void;
  selectEntity: (entity: Entity | null) => void;
  setUserMode: (mode: UserMode) => void;
  toggleAudio: () => void;
  toggleParameters: () => void;
  setTick: (tick: number) => void;
  setNarration: (text: string) => void;
  setComplete: () => void;
  updateParameters: (params: Record<string, number>) => void;
}

export const useSimulationStore = create<SimulationState>()(
  immer((set, get) => ({
    graph: null,
    isLoading: false,
    loadError: null,

    ui: {
      playback: 'idle',
      currentTick: 0,
      maxTick: 1800,
      speed: 1,
      zoom: 1,
      selectedEntityId: null,
      userMode: 'watch',
      narrationVisible: true,
      audioEnabled: true,
      parametersVisible: false,
    },

    currentTick: 0,
    entityCount: 0,
    narrationHistory: [],
    currentNarration: '',
    selectedEntity: null,

    loadSimulation: async (query: string, templateId?: string) => {
      set(state => {
        state.isLoading = true;
        state.loadError = null;
        state.ui.playback = 'idle';
        state.currentNarration = '';
        state.narrationHistory = [];
      });

      try {
        // Call API — pass templateId directly to skip LLM classification when known
        const { api } = await import('../lib/api');
        const data = await api.simulate({ query, templateId });

        // Load template JSON — path includes domain subdirectory
        const domain = data.domain ?? 'biology';
        let template: any;
        const templateRes = await fetch(`/templates/${domain}/${data.templateId}.json`);
        if (!templateRes.ok) {
          // Fallback: try without domain prefix
          const fallback = await fetch(`/templates/${data.templateId}.json`);
          if (!fallback.ok) throw new Error(`Template "${data.templateId}" not found. Run: npm run copy-templates`);
          template = await fallback.json();
        } else {
          template = await templateRes.json();
        }

        // Override narration with LLM-generated version
        const graph: SimulationGraph = {
          ...template,
          narration: data.narration ?? template.narration,
          parameters: data.parameterOverrides ?? {},
          entities: spawnEntities(template),
        };

        // Load into runtime
        runtime.load(graph);

        // Wire runtime events to store
        wireRuntimeEvents();

        set(state => {
          state.graph = graph;
          state.isLoading = false;
          state.ui.playback = 'playing';
          state.ui.maxTick = graph.maxTicks;
          state.ui.currentTick = 0;
          state.currentTick = 0;
        });

        // Track
        try {
          const { track } = await import('../lib/analytics');
          track.simulationStarted(graph.templateId, graph.domain, 'input');
        } catch { /* analytics non-fatal */ }

        // Start the simulation
        runtime.start();

      } catch (err: any) {
        set(state => {
          state.isLoading = false;
          state.loadError = err.message ?? 'Unknown error';
        });
        try {
          const { track } = await import('../lib/analytics');
          track.queryFailed(err.message ?? 'unknown');
        } catch { /* analytics non-fatal */ }
      }
    },

    play: () => {
      runtime.resume();
      set(state => { state.ui.playback = 'playing'; });
    },

    pause: () => {
      runtime.pause();
      set(state => { state.ui.playback = 'paused'; });
    },

    replay: () => {
      runtime.replay();
      set(state => {
        state.ui.playback = 'playing';
        state.currentTick = 0;
        state.ui.currentTick = 0;
        state.currentNarration = '';
        state.narrationHistory = [];
        state.selectedEntity = null;
      });
    },

    scrubTo: (tick: number) => {
      runtime.scrubTo(tick);
      set(state => {
        state.currentTick = tick;
        state.ui.currentTick = tick;
      });
    },

    setSpeed: (speed) => {
      runtime.setSpeed(speed);
      set(state => { state.ui.speed = speed; });
    },

    setZoom: (zoom) => {
      set(state => { state.ui.zoom = Math.max(0.5, Math.min(3, zoom)); });
    },

    selectEntity: (entity) => {
      set(state => {
        state.selectedEntity = entity;
        state.ui.selectedEntityId = entity?.id ?? null;
        // Auto-switch to explore mode on first click
        if (entity && state.ui.userMode === 'watch') {
          state.ui.userMode = 'explore';
        }
      });
    },

    setUserMode: (mode) => {
      set(state => { state.ui.userMode = mode; });
    },

    toggleAudio: () => {
      set(state => { state.ui.audioEnabled = !state.ui.audioEnabled; });
    },

    toggleParameters: () => {
      set(state => { state.ui.parametersVisible = !state.ui.parametersVisible; });
    },

    setTick: (tick) => {
      set(state => {
        state.currentTick = tick;
        state.ui.currentTick = tick;
        state.entityCount = runtime.pool.count();
      });
    },

    setNarration: (text) => {
      set(state => {
        state.currentNarration = text;
        state.narrationHistory.push({ tick: state.currentTick, text });
      });
      // TTS
      if (get().ui.audioEnabled && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const utt = new SpeechSynthesisUtterance(text);
        utt.rate = 0.95;
        utt.pitch = 1.0;
        window.speechSynthesis.speak(utt);
      }
    },

    setComplete: () => {
      set(state => { state.ui.playback = 'complete'; });
    },

    updateParameters: (params: Record<string, number>) => {
      // Write new param values into the graph, then re-spawn and restart
      set(state => {
        if (!state.graph) return;
        state.graph.parameters = { ...state.graph.parameters, ...params };
        // Re-spawn entities with new parameter values
        state.graph.entities = spawnEntities(state.graph);
        state.ui.playback = 'playing';
        state.currentTick = 0;
        state.ui.currentTick = 0;
        state.currentNarration = '';
        state.narrationHistory = [];
        state.selectedEntity = null;
      });
      // Reload runtime with updated graph
      const { graph } = useSimulationStore.getState();
      if (graph) {
        runtime.load(graph);
        wireRuntimeEvents();
        runtime.start();
      }
    },
  }))
);

// Wire runtime events to store
// Stores the unsubscribe function so it can be cleaned up before each new simulation
let _runtimeUnsubscribe: (() => void) | null = null;

function wireRuntimeEvents() {
  // Clean up previous listener before registering a new one
  if (_runtimeUnsubscribe) {
    _runtimeUnsubscribe();
    _runtimeUnsubscribe = null;
  }

  _runtimeUnsubscribe = runtime.on((event) => {
    const store = useSimulationStore.getState();
    switch (event.type) {
      case 'tick':
        store.setTick(event.tick);
        break;
      case 'narration':
        store.setNarration(event.text);
        break;
      case 'complete':
        store.setComplete();
        break;
    }
  });
}

// ---- Entity initial state mapping ----
// Determines which EntityState to use based on entity type name
function initialStateForType(entityType: string): string {
  if (entityType.includes('spreading')) return 'spreading';
  if (entityType.includes('heard'))     return 'heard';
  if (entityType.includes('dismissed')) return 'dismissed';
  if (entityType.includes('immune'))    return 'alive';  // immune_cell is alive
  if (entityType.includes('unaware'))   return 'unaware';
  return 'alive';
}

// ---- Movement velocity by entity role ----
function velocityForDistribution(distribution: string, entityType: string): number {
  if (distribution === 'brownian_field') return 1.8;   // molecules / antibiotic
  if (entityType.includes('immune'))     return 0.8;   // immune cells seek targets
  if (entityType.includes('person'))     return 0.4;   // people meander slowly
  if (entityType.includes('virus'))      return 1.2;   // viruses drift actively
  return 0.5;                                          // default
}

// ---- Safe formula evaluator ----
// Parses numeric expressions like "Math.round(80 * (1 - 0.1))" without eval.
// Supports: +  -  *  /  Math.round  Math.floor  Math.ceil  parentheses  literals
function evalCountFormula(formula: string, defaults: Record<string, number>): number {
  // Step 1: substitute known parameter names with their numeric values
  const substituted = formula.replace(
    /\b([a-zA-Z_][a-zA-Z0-9_]*)\b/g,
    (match) => {
      if (defaults[match] !== undefined) return String(defaults[match]);
      // Keep Math identifiers intact
      if (match === 'Math' || match === 'round' || match === 'floor' || match === 'ceil') return match;
      return '0'; // unknown identifier → 0
    }
  );

  // Step 2: safe whitelist — only digits, operators, parens, dots, spaces, Math calls
  const safe = substituted.replace(/\s+/g, '');
  if (!/^[\d+\-*/().,]+$/.test(
    safe
      .replace(/Math\.round/g, '')
      .replace(/Math\.floor/g, '')
      .replace(/Math\.ceil/g, '')
  )) {
    return 0;
  }

  // Step 3: recursive descent parser
  let pos = 0;
  const s = substituted.replace(/\s+/g, '');

  function parseExpr(): number { return parseAddSub(); }

  function parseAddSub(): number {
    let left = parseMulDiv();
    while (pos < s.length && (s[pos] === '+' || s[pos] === '-')) {
      const op = s[pos++];
      const right = parseMulDiv();
      left = op === '+' ? left + right : left - right;
    }
    return left;
  }

  function parseMulDiv(): number {
    let left = parseUnary();
    while (pos < s.length && (s[pos] === '*' || s[pos] === '/')) {
      const op = s[pos++];
      const right = parseUnary();
      left = op === '*' ? left * right : (right !== 0 ? left / right : 0);
    }
    return left;
  }

  function parseUnary(): number {
    if (s[pos] === '-') { pos++; return -parseAtom(); }
    if (s[pos] === '+') { pos++; return parseAtom(); }
    return parseAtom();
  }

  function parseAtom(): number {
    // Math.round / Math.floor / Math.ceil
    const mathMatch = s.slice(pos).match(/^Math\.(round|floor|ceil)\(/);
    if (mathMatch) {
      pos += mathMatch[0].length;
      const inner = parseExpr();
      if (s[pos] === ')') pos++;
      return mathMatch[1] === 'round' ? Math.round(inner)
           : mathMatch[1] === 'floor' ? Math.floor(inner)
           : Math.ceil(inner);
    }

    // Parenthesised expression
    if (s[pos] === '(') {
      pos++;
      const val = parseExpr();
      if (s[pos] === ')') pos++;
      return val;
    }

    // Numeric literal (including decimals)
    const numMatch = s.slice(pos).match(/^(\d+\.?\d*)/);
    if (numMatch) {
      pos += numMatch[0].length;
      return parseFloat(numMatch[0]);
    }

    return 0;
  }

  try {
    const result = parseExpr();
    if (!isFinite(result) || isNaN(result)) return 0;
    return Math.min(500, Math.max(0, Math.round(result)));
  } catch {
    return 0;
  }
}

// ---- Canvas layout constants ----
const CANVAS_W = 1100;
const CANVAS_H = 680;
const MARGIN   = 60;

// ---- Position generators ----
function randomPosition(): { x: number; y: number } {
  return {
    x: MARGIN + Math.random() * (CANVAS_W - MARGIN * 2),
    y: MARGIN + Math.random() * (CANVAS_H - MARGIN * 2),
  };
}

function clusteredPosition(clusterIndex: number, totalClusters: number): { x: number; y: number } {
  // Distribute cluster centres across the canvas, then scatter within each cluster
  const cols   = Math.ceil(Math.sqrt(totalClusters));
  const col    = clusterIndex % cols;
  const row    = Math.floor(clusterIndex / cols);
  const cx     = MARGIN * 2 + col * ((CANVAS_W - MARGIN * 4) / Math.max(cols - 1, 1));
  const cy     = MARGIN * 2 + row * ((CANVAS_H - MARGIN * 4) / Math.max(Math.ceil(totalClusters / cols) - 1, 1));
  return {
    x: Math.max(MARGIN, Math.min(CANVAS_W - MARGIN, cx + (Math.random() - 0.5) * 180)),
    y: Math.max(MARGIN, Math.min(CANVAS_H - MARGIN, cy + (Math.random() - 0.5) * 180)),
  };
}

// Main spawn function — converts template initialSpawn config into Entity[]
function spawnEntities(template: any): any[] {
  const entities: any[] = [];

  // Extract parameter defaults
  const defaults: Record<string, number> = {};
  for (const [key, def] of Object.entries(template.parameters ?? {})) {
    defaults[key] = (def as any).default ?? 0;
  }

  let clusterIndex = 0;
  const spawnGroups = template.initialSpawn ?? [];
  const totalClusters = spawnGroups.filter((s: any) => s.distribution === 'clustered').length;

  for (const spawn of spawnGroups) {
    const count = evalCountFormula(spawn.countFormula, defaults);
    if (count <= 0) continue;

    const isCluster     = spawn.distribution === 'clustered';
    const isBrownian    = spawn.distribution === 'brownian_field';
    const thisCluster   = isCluster ? clusterIndex++ : -1;

    const velocity = velocityForDistribution(spawn.distribution, spawn.entityType);
    const state    = initialStateForType(spawn.entityType);

    for (let i = 0; i < count; i++) {
      const position = isCluster
        ? clusteredPosition(thisCluster, totalClusters)
        : randomPosition();

      // Spread clustered entities within the cluster
      if (isCluster) {
        position.x += (Math.random() - 0.5) * 120;
        position.y += (Math.random() - 0.5) * 120;
        position.x = Math.max(MARGIN, Math.min(CANVAS_W - MARGIN, position.x));
        position.y = Math.max(MARGIN, Math.min(CANVAS_H - MARGIN, position.y));
      }

      entities.push({
        id: `init_${spawn.entityType}_${i}_${Math.random().toString(36).slice(2, 7)}`,
        type: spawn.entityType,
        position,
        state,
        components: {
          health: { current: 100, max: 100, decayRate: 0 },
          movement: {
            velocity,
            pattern: isBrownian ? 'brownian' : 'brownian',
            angle: Math.random() * Math.PI * 2,
          },
        },
        tags: spawn.tags ?? [],
        ticksInState: 0,
        ticksAlive: 0,
      });
    }
  }

  return entities;
}
