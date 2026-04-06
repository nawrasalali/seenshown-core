// ============================================
// QUADTREE SPATIAL INDEX
// O(log n) proximity queries for rule evaluation
// ============================================

import { Entity, Vector2, SpatialIndex } from '../../types/index';

interface Bounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

const MAX_OBJECTS = 10;
const MAX_LEVELS = 5;

class QuadNode {
  bounds: Bounds;
  level: number;
  objects: Entity[] = [];
  nodes: QuadNode[] = [];

  constructor(bounds: Bounds, level: number = 0) {
    this.bounds = bounds;
    this.level = level;
  }

  private split(): void {
    const halfW = this.bounds.width / 2;
    const halfH = this.bounds.height / 2;
    const x = this.bounds.x;
    const y = this.bounds.y;

    this.nodes = [
      new QuadNode({ x: x + halfW, y, width: halfW, height: halfH }, this.level + 1),
      new QuadNode({ x, y, width: halfW, height: halfH }, this.level + 1),
      new QuadNode({ x, y: y + halfH, width: halfW, height: halfH }, this.level + 1),
      new QuadNode({ x: x + halfW, y: y + halfH, width: halfW, height: halfH }, this.level + 1),
    ];
  }

  private getIndex(entity: Entity): number {
    const midX = this.bounds.x + this.bounds.width / 2;
    const midY = this.bounds.y + this.bounds.height / 2;
    const inTop = entity.position.y < midY;
    const inBottom = entity.position.y >= midY;
    if (entity.position.x < midX) {
      if (inTop) return 1;
      if (inBottom) return 2;
    } else {
      if (inTop) return 0;
      if (inBottom) return 3;
    }
    return -1;
  }

  insert(entity: Entity): void {
    if (this.nodes.length > 0) {
      const index = this.getIndex(entity);
      if (index !== -1) {
        this.nodes[index].insert(entity);
        return;
      }
    }

    this.objects.push(entity);

    if (this.objects.length > MAX_OBJECTS && this.level < MAX_LEVELS) {
      if (this.nodes.length === 0) this.split();
      let i = 0;
      while (i < this.objects.length) {
        const index = this.getIndex(this.objects[i]);
        if (index !== -1) {
          this.nodes[index].insert(this.objects.splice(i, 1)[0]);
        } else {
          i++;
        }
      }
    }
  }

  retrieve(position: Vector2, radius: number, result: Entity[]): void {
    const { x, y, width, height } = this.bounds;
    // Check if query circle intersects this node
    const nearX = Math.max(x, Math.min(position.x, x + width));
    const nearY = Math.max(y, Math.min(position.y, y + height));
    const dx = position.x - nearX;
    const dy = position.y - nearY;
    if (dx * dx + dy * dy > radius * radius) return;

    result.push(...this.objects);
    for (const node of this.nodes) {
      node.retrieve(position, radius, result);
    }
  }

  clear(): void {
    this.objects = [];
    this.nodes = [];
  }
}

export class QuadTree implements SpatialIndex {
  private root: QuadNode;

  constructor(width: number = 1200, height: number = 800) {
    this.root = new QuadNode({ x: 0, y: 0, width, height });
  }

  insert(entity: Entity): void {
    this.root.insert(entity);
  }

  query(position: Vector2, radius: number): Entity[] {
    const result: Entity[] = [];
    this.root.retrieve(position, radius, result);
    // Filter to exact circle (quadtree returns bounding box)
    return result.filter(e => {
      const dx = e.position.x - position.x;
      const dy = e.position.y - position.y;
      return Math.sqrt(dx * dx + dy * dy) <= radius;
    });
  }

  clear(): void {
    this.root.clear();
  }
}
