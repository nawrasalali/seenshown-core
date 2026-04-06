// ============================================
// SEENSHOWN — CORE TYPE DEFINITIONS
// The single source of truth for all types
// ============================================

// --- VECTOR ---
export interface Vector2 {
  x: number;
  y: number;
}

// --- ENTITY TYPES ---
export type EntityType =
  // Biology
  | 'bacterium_normal'
  | 'bacterium_resistant'
  | 'virus'
  | 'host_cell'
  | 'immune_cell'
  | 'antibiotic_molecule'
  | 'antibody'
  | 'neuron'
  | 'glucose_molecule'
  | 'insulin_molecule'
  // Social
  | 'person_unaware'
  | 'person_heard'
  | 'person_spreading'
  | 'person_dismissed'
  | 'person_immune';

export type EntityState =
  | 'alive'
  | 'infected'
  | 'dying'
  | 'dead'
  | 'active'
  | 'inactive'
  | 'spreading'
  | 'heard'
  | 'unaware'
  | 'dismissed';

export type EntityDomain = 'biology' | 'social';

// --- COMPONENTS ---
export interface HealthComponent {
  current: number;
  max: number;
  decayRate: number;  // per tick
}

export interface MovementComponent {
  velocity: number;
  pattern: 'brownian' | 'directed' | 'orbit' | 'static' | 'seek' | 'flee';
  targetId?: string;
  angle?: number;
}

export interface ReproductionComponent {
  cooldown: number;
  currentCooldown: number;
  enabled: boolean;
  maxPopulation: number;
}

export interface SocialComponent {
  group: 'popular' | 'mid' | 'fringe' | 'isolated';
  connections: string[];
  trustThreshold: number;
  energy: number;
}

export interface KnowledgeComponent {
  knowsRumour: boolean;
  believesRumour: boolean;
  certainty: number;
}

export type ComponentMap = {
  health?: HealthComponent;
  movement?: MovementComponent;
  reproduction?: ReproductionComponent;
  social?: SocialComponent;
  knowledge?: KnowledgeComponent;
};

// --- ENTITY ---
export interface Entity {
  id: string;
  type: EntityType;
  position: Vector2;
  state: EntityState;
  components: ComponentMap;
  tags: string[];
  ticksInState: number;
  ticksAlive: number;
}

// --- VISUAL CONFIG ---
export interface EntityVisualConfig {
  shape: 'circle' | 'hexagon' | 'triangle' | 'star';
  radius: number;
  color: string;
  borderColor?: string;
  borderStyle?: 'solid' | 'jagged' | 'double' | 'dashed';
  glowColor?: string;
  glowIntensity?: number;
}

// --- RULE CONDITION ---
export type RuleCondition =
  | { type: 'entity_has_tag'; tag: string }
  | { type: 'entity_not_has_tag'; tag: string }
  | { type: 'entity_state'; state: EntityState }
  | { type: 'neighbor_within'; distance: number; tag?: string; state?: EntityState }
  | { type: 'component_gt'; component: string; value: number }
  | { type: 'component_lt'; component: string; value: number }
  | { type: 'ticks_in_state_gt'; ticks: number }
  | { type: 'random_chance'; probability: number }
  | { type: 'world_count_lt'; entityType: EntityType; count: number }
  | { type: 'cooldown_expired' };

// --- WORLD MUTATION ---
export type WorldMutation =
  | { type: 'SET_STATE'; entityId: string; state: EntityState }
  | { type: 'SET_COMPONENT'; entityId: string; component: Partial<ComponentMap> }
  | { type: 'SPAWN_ENTITY'; template: EntityType; position: Vector2; tags?: string[] }
  | { type: 'DESTROY_ENTITY'; entityId: string }
  | { type: 'EMIT_PARTICLE'; position: Vector2; effect: ParticleEffectType; color?: string }
  | { type: 'RESET_COOLDOWN'; entityId: string; ruleId: string };

export type ParticleEffectType =
  | 'deflect'
  | 'absorb'
  | 'divide'
  | 'bind'
  | 'signal'
  | 'die'
  | 'whisper'
  | 'spread';

// --- RULE ---
export interface Rule {
  id: string;
  conditions: RuleCondition[];
  conditionLogic: 'AND' | 'OR';
  mutations: WorldMutation[];
  priority: number;
  cooldownTicks: number;
}

// --- NARRATION HOOK ---
export interface NarrationHook {
  tick: number;
  text: string;
  highlight?: string[];  // entity IDs to highlight when this fires
}

// --- PARAMETER DEFINITION ---
export interface ParameterDef {
  type: 'int' | 'float' | 'bool';
  min: number;
  max: number;
  default: number;
  step?: number;
  label: string;
  description: string;
}

// --- SIMULATION TEMPLATE ---
export interface SimulationTemplate {
  id: string;
  domain: EntityDomain;
  title: string;
  description: string;
  parameters: Record<string, ParameterDef>;
  entityTemplates: Record<EntityType, Partial<Entity>>;
  visualConfig: Record<EntityType, EntityVisualConfig>;
  rules: Rule[];
  initialSpawn: SpawnConfig[];
  narration: NarrationHook[];
  maxTicks: number;
  ticksPerSecond: number;
}

export interface SpawnConfig {
  entityType: EntityType;
  countFormula: string;  // e.g. "initial_bacteria * 0.9"
  distribution: 'random' | 'clustered' | 'grid' | 'brownian_field';
  tags?: string[];
}

// --- SIMULATION GRAPH (runtime instance) ---
export interface SimulationGraph {
  templateId: string;
  domain: EntityDomain;
  title: string;
  parameters: Record<string, number>;
  entities: Entity[];
  rules: Rule[];
  narration: NarrationHook[];
  maxTicks: number;
  ticksPerSecond: number;
}

// --- SNAPSHOT ---
export interface Snapshot {
  tick: number;
  entities: Map<string, Entity>;
  timestamp: number;
}

// --- WORLD STATE ---
export interface WorldState {
  tick: number;
  entities: Map<string, Entity>;
  spatialIndex: SpatialIndex;
  ruleCooldowns: Map<string, Map<string, number>>;  // entityId → ruleId → lastFiredTick
}

export interface SpatialIndex {
  query(position: Vector2, radius: number): Entity[];
  insert(entity: Entity): void;
  clear(): void;
}

// --- LLM PIPELINE TYPES ---
export interface IntentClassificationResult {
  templateId: string;
  confidence: number;
  parameterOverrides: Record<string, number>;
  fallback: boolean;
  closestMatch?: string;
}

export interface SimulationRequest {
  query: string;
  domain?: EntityDomain;
  templateId?: string;
  parameters?: Record<string, number>;
}

export interface SimulationResponse {
  simulationGraph: SimulationGraph;
  narration: NarrationHook[];
  templateUsed: string;
  confidence: number;
}

// --- UI STATE ---
export type PlaybackState = 'idle' | 'playing' | 'paused' | 'complete';
export type UserMode = 'watch' | 'explore' | 'control';

export interface UIState {
  playback: PlaybackState;
  currentTick: number;
  maxTick: number;
  speed: 1 | 2 | 4 | 8;
  zoom: number;
  selectedEntityId: string | null;
  userMode: UserMode;
  narrationVisible: boolean;
  audioEnabled: boolean;
  parametersVisible: boolean;
}
