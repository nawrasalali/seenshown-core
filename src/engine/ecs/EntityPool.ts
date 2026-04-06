// ============================================
// ENTITY POOL
// Manages all entities in the simulation
// ============================================

import { Entity, EntityType, EntityState, Vector2, ComponentMap } from '../../types/index';

let _idCounter = 0;
const generateId = (): string => `e_${++_idCounter}_${Date.now()}`;

export class EntityPool {
  private entities: Map<string, Entity> = new Map();

  create(
    type: EntityType,
    position: Vector2,
    state: EntityState,
    components: ComponentMap = {},
    tags: string[] = []
  ): Entity {
    const entity: Entity = {
      id: generateId(),
      type,
      position: { ...position },
      state,
      components: { ...components },
      tags: [...tags],
      ticksInState: 0,
      ticksAlive: 0,
    };
    this.entities.set(entity.id, entity);
    return entity;
  }

  get(id: string): Entity | undefined {
    return this.entities.get(id);
  }

  getAll(): Entity[] {
    return Array.from(this.entities.values());
  }

  getByType(type: EntityType): Entity[] {
    return this.getAll().filter(e => e.type === type);
  }

  getByState(state: EntityState): Entity[] {
    return this.getAll().filter(e => e.state === state);
  }

  getByTag(tag: string): Entity[] {
    return this.getAll().filter(e => e.tags.includes(tag));
  }

  getLiving(): Entity[] {
    return this.getAll().filter(e => e.state !== 'dead');
  }

  remove(id: string): void {
    this.entities.delete(id);
  }

  count(): number {
    return this.entities.size;
  }

  countByType(type: EntityType): number {
    return this.getByType(type).length;
  }

  countByState(state: EntityState): number {
    return this.getByState(state).length;
  }

  tick(): void {
    for (const entity of this.entities.values()) {
      entity.ticksAlive++;
      entity.ticksInState++;
    }
  }

  setState(id: string, state: EntityState): void {
    const entity = this.entities.get(id);
    if (entity && entity.state !== state) {
      entity.state = state;
      entity.ticksInState = 0;
    }
  }

  updateComponent(id: string, component: Partial<ComponentMap>): void {
    const entity = this.entities.get(id);
    if (entity) {
      entity.components = { ...entity.components, ...component };
    }
  }

  // Deep clone for snapshot
  snapshot(): Map<string, Entity> {
    const clone = new Map<string, Entity>();
    for (const [id, entity] of this.entities) {
      clone.set(id, JSON.parse(JSON.stringify(entity)));
    }
    return clone;
  }

  restore(snapshot: Map<string, Entity>): void {
    this.entities.clear();
    for (const [id, entity] of snapshot) {
      this.entities.set(id, JSON.parse(JSON.stringify(entity)));
    }
  }

  clear(): void {
    this.entities.clear();
    _idCounter = 0;
  }
}
