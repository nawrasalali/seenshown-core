// ============================================
// RULE ENGINE
// Evaluates conditions, produces mutations
// CRITICAL: Evaluate then Apply — never mid-tick reads
// ============================================

import { Entity, Rule, RuleCondition, WorldMutation, WorldState } from '../../types/index';
import { EntityPool } from '../ecs/EntityPool';

export class RuleEngine {
  private rules: Rule[] = [];

  load(rules: Rule[]): void {
    // Sort by priority ascending (lower = evaluated first)
    this.rules = [...rules].sort((a, b) => a.priority - b.priority);
  }

  // EVALUATE PHASE: collect all mutations, do not apply
  evaluate(pool: EntityPool, world: WorldState): WorldMutation[] {
    const mutations: WorldMutation[] = [];
    const entities = pool.getLiving();

    for (const entity of entities) {
      for (const rule of this.rules) {
        if (!this.isCooledDown(entity.id, rule.id, world)) continue;
        if (this.checkConditions(entity, rule.conditions, rule.conditionLogic, pool, world)) {
          mutations.push(...this.buildMutations(entity, rule, world));
          this.markFired(entity.id, rule.id, world);
        }
      }
    }

    return mutations;
  }

  // APPLY PHASE: apply mutations atomically after all evaluation
  apply(mutations: WorldMutation[], pool: EntityPool): void {
    const toDestroy: Set<string> = new Set();

    for (const mutation of mutations) {
      switch (mutation.type) {
        case 'SET_STATE':
          if (!toDestroy.has(mutation.entityId)) {
            pool.setState(mutation.entityId, mutation.state);
          }
          break;

        case 'SET_COMPONENT':
          if (!toDestroy.has(mutation.entityId)) {
            pool.updateComponent(mutation.entityId, mutation.component);
          }
          break;

        case 'DESTROY_ENTITY':
          toDestroy.add(mutation.entityId);
          break;

        case 'SPAWN_ENTITY': {
          pool.create(
            mutation.template,
            mutation.position,
            'alive',
            {},
            mutation.tags ?? []
          );
          break;
        }

        // EMIT_PARTICLE and RESET_COOLDOWN handled externally
        default:
          break;
      }
    }

    // Process destructions last
    for (const id of toDestroy) {
      pool.remove(id);
    }
  }

  private checkConditions(
    entity: Entity,
    conditions: RuleCondition[],
    logic: 'AND' | 'OR',
    pool: EntityPool,
    world: WorldState
  ): boolean {
    const results = conditions.map(c => this.checkCondition(entity, c, pool, world));
    return logic === 'AND' ? results.every(Boolean) : results.some(Boolean);
  }

  private checkCondition(
    entity: Entity,
    condition: RuleCondition,
    pool: EntityPool,
    world: WorldState
  ): boolean {
    switch (condition.type) {
      case 'entity_has_tag':
        return entity.tags.includes(condition.tag);

      case 'entity_not_has_tag':
        return !entity.tags.includes(condition.tag);

      case 'entity_state':
        return entity.state === condition.state;

      case 'neighbor_within': {
        const neighbors = world.spatialIndex.query(entity.position, condition.distance);
        return neighbors.some(n => {
          if (n.id === entity.id) return false;
          if (condition.tag && !n.tags.includes(condition.tag)) return false;
          if (condition.state && n.state !== condition.state) return false;
          return true;
        });
      }

      case 'component_gt': {
        const [comp, field] = condition.component.split('.');
        const val = (entity.components as any)[comp]?.[field];
        return typeof val === 'number' && val > condition.value;
      }

      case 'component_lt': {
        const [comp, field] = condition.component.split('.');
        const val = (entity.components as any)[comp]?.[field];
        return typeof val === 'number' && val < condition.value;
      }

      case 'ticks_in_state_gt':
        return entity.ticksInState > condition.ticks;

      case 'random_chance':
        return Math.random() < condition.probability;

      case 'world_count_lt':
        return pool.countByType(condition.entityType) < condition.count;

      case 'cooldown_expired':
        return true; // Already checked in isCooledDown

      default:
        return false;
    }
  }

  private buildMutations(entity: Entity, rule: Rule, _world: WorldState): WorldMutation[] {
    return rule.mutations.map(m => {
      // Inject entityId where needed
      if (m.type === 'SET_STATE' || m.type === 'SET_COMPONENT' || m.type === 'DESTROY_ENTITY') {
        return { ...m, entityId: entity.id };
      }
      if (m.type === 'SPAWN_ENTITY') {
        // Spawn adjacent to entity
        const angle = Math.random() * Math.PI * 2;
        const dist = 20;
        return {
          ...m,
          position: {
            x: entity.position.x + Math.cos(angle) * dist,
            y: entity.position.y + Math.sin(angle) * dist,
          },
        };
      }
      if (m.type === 'EMIT_PARTICLE') {
        return { ...m, position: entity.position };
      }
      return m;
    });
  }

  private isCooledDown(entityId: string, ruleId: string, world: WorldState): boolean {
    const entityCooldowns = world.ruleCooldowns.get(entityId);
    if (!entityCooldowns) return true;
    const lastFired = entityCooldowns.get(ruleId);
    if (lastFired === undefined) return true;
    const rule = this.rules.find(r => r.id === ruleId);
    if (!rule) return true;
    return world.tick - lastFired >= rule.cooldownTicks;
  }

  private markFired(entityId: string, ruleId: string, world: WorldState): void {
    if (!world.ruleCooldowns.has(entityId)) {
      world.ruleCooldowns.set(entityId, new Map());
    }
    world.ruleCooldowns.get(entityId)!.set(ruleId, world.tick);
  }
}
