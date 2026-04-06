// ============================================
// SIMULATION RUNTIME
// Orchestrates: ECS → Rules → Timeline → Render
// This is the engine's main loop
// ============================================

import { SimulationGraph, WorldMutation, WorldState } from '../types/index';
import { EntityPool } from './ecs/EntityPool';
import { QuadTree } from './ecs/QuadTree';
import { RuleEngine } from './rules/RuleEngine';
import { TimelineEngine } from './timeline/TimelineEngine';
import { MovementEngine } from './movement/MovementEngine';

export type SimulationEvent =
  | { type: 'tick'; tick: number }
  | { type: 'mutation'; mutations: WorldMutation[] }
  | { type: 'narration'; text: string }
  | { type: 'complete' }
  | { type: 'state_change'; entityId: string };

type EventCallback = (event: SimulationEvent) => void;

export class SimulationRuntime {
  public pool: EntityPool;
  private rules: RuleEngine;
  private timeline: TimelineEngine;
  private movement: MovementEngine;
  private world: WorldState;
  private listeners: EventCallback[] = [];
  private narrationIndex = 0;
  private graph: SimulationGraph | null = null;

  // Rule evaluation runs at half render rate (30fps equivalent)
  private ruleEvalCounter = 0;
  private RULE_EVAL_INTERVAL = 2; // every 2 ticks

  constructor() {
    this.pool = new EntityPool();
    this.rules = new RuleEngine();
    this.timeline = new TimelineEngine();
    this.movement = new MovementEngine();
    this.world = this.createWorld();

    this.timeline.onTick((tick) => this.onTick(tick));
  }

  load(graph: SimulationGraph): void {
    this.reset();
    this.graph = graph;

    // Configure timeline
    this.timeline.configure(graph.maxTicks, graph.ticksPerSecond);

    // Load rules
    this.rules.load(graph.rules);

    // Spawn initial entities
    for (const entity of graph.entities) {
      this.pool.create(
        entity.type,
        entity.position,
        entity.state,
        entity.components,
        entity.tags
      );
    }

    // Initial snapshot
    this.timeline.saveSnapshot(this.pool);
    this.rebuildSpatialIndex();
  }

  start(): void {
    this.timeline.start();
  }

  pause(): void {
    this.timeline.pause();
  }

  resume(): void {
    this.timeline.resume();
  }

  setSpeed(speed: 1 | 2 | 4 | 8): void {
    this.timeline.setSpeed(speed);
  }

  scrubTo(tick: number): void {
    this.timeline.scrubTo(tick, this.pool);
    this.rebuildSpatialIndex();
    this.emit({ type: 'tick', tick: this.timeline.getCurrentTick() });
  }

  replay(): void {
    this.reset();
    if (this.graph) this.load(this.graph);
    this.start();
  }

  on(callback: EventCallback): () => void {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(l => l !== callback);
    };
  }

  getCurrentTick(): number {
    return this.timeline.getCurrentTick();
  }

  getProgress(): number {
    return this.timeline.getProgress();
  }

  private onTick(tick: number): void {
    // Tick entity counters
    this.pool.tick();

    // Movement update every tick (60fps)
    this.movement.update(this.pool);

    // EVALUATE + APPLY rules at 30fps
    this.ruleEvalCounter++;
    let mutations: WorldMutation[] = [];

    if (this.ruleEvalCounter >= this.RULE_EVAL_INTERVAL) {
      this.ruleEvalCounter = 0;
      this.rebuildSpatialIndex();
      mutations = this.rules.evaluate(this.pool, this.world);
      this.rules.apply(mutations, this.pool);
      this.world.tick = tick;

      // Apply health decay
      this.applyHealthDecay();
    }

    // Snapshot
    this.timeline.saveSnapshot(this.pool);

    // Fire narration hooks
    this.checkNarration(tick);

    // Emit tick event (triggers render)
    this.emit({ type: 'tick', tick });

    if (mutations.length > 0) {
      this.emit({ type: 'mutation', mutations });
    }

    // Check completion
    if (this.timeline.isComplete()) {
      this.timeline.pause();
      this.emit({ type: 'complete' });
    }
  }

  private applyHealthDecay(): void {
    for (const entity of this.pool.getLiving()) {
      const health = entity.components.health;
      if (!health || health.decayRate === 0) continue;
      health.current -= health.decayRate;
      if (health.current <= 0) {
        this.pool.setState(entity.id, 'dying');
      }
    }
  }

  private rebuildSpatialIndex(): void {
    this.world.spatialIndex.clear();
    for (const entity of this.pool.getLiving()) {
      this.world.spatialIndex.insert(entity);
    }
  }

  private checkNarration(tick: number): void {
    if (!this.graph) return;
    const hooks = this.graph.narration;
    while (
      this.narrationIndex < hooks.length &&
      hooks[this.narrationIndex].tick <= tick
    ) {
      this.emit({ type: 'narration', text: hooks[this.narrationIndex].text });
      this.narrationIndex++;
    }
  }

  private emit(event: SimulationEvent): void {
    for (const listener of this.listeners) {
      listener(event);
    }
  }

  private reset(): void {
    this.timeline.reset();
    this.pool.clear();
    this.world = this.createWorld();
    this.narrationIndex = 0;
    this.ruleEvalCounter = 0;
  }

  private createWorld(): WorldState {
    return {
      tick: 0,
      entities: new Map(),
      spatialIndex: new QuadTree(1200, 800),
      ruleCooldowns: new Map(),
    };
  }
}
