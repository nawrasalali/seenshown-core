// ============================================
// MOVEMENT ENGINE
// Runs after rule evaluation each tick
// Handles: brownian, directed, orbit, seek, flee, static
// ============================================

import { Entity, Vector2 } from '../../types/index';
import { EntityPool } from '../ecs/EntityPool';

const CANVAS_W = 1100;
const CANVAS_H = 680;
const MARGIN = 30;

export class MovementEngine {
  private tick = 0;

  update(pool: EntityPool): void {
    this.tick++;

    for (const entity of pool.getLiving()) {
      const movement = entity.components.movement;
      if (!movement || movement.pattern === 'static') continue;

      const pos = entity.position;
      let dx = 0;
      let dy = 0;

      switch (movement.pattern) {
        case 'brownian': {
          // Smooth brownian using perlin-ish noise with angle drift
          const speed = movement.velocity ?? 1.0;
          if (!movement.angle) movement.angle = Math.random() * Math.PI * 2;
          movement.angle += (Math.random() - 0.5) * 0.4;
          dx = Math.cos(movement.angle) * speed;
          dy = Math.sin(movement.angle) * speed;
          break;
        }

        case 'directed': {
          const speed = movement.velocity ?? 0.5;
          const angle = movement.angle ?? 0;
          dx = Math.cos(angle) * speed;
          dy = Math.sin(angle) * speed;
          break;
        }

        case 'orbit': {
          // Orbit around canvas center
          const cx = CANVAS_W / 2;
          const cy = CANVAS_H / 2;
          const orbitSpeed = (movement.velocity ?? 0.5) * 0.02;
          const currentAngle = Math.atan2(pos.y - cy, pos.x - cx);
          const newAngle = currentAngle + orbitSpeed;
          const radius = Math.sqrt((pos.x - cx) ** 2 + (pos.y - cy) ** 2);
          entity.position.x = cx + Math.cos(newAngle) * radius;
          entity.position.y = cy + Math.sin(newAngle) * radius;
          continue;
        }

        case 'seek': {
          // Seek toward target entity
          if (!movement.targetId) break;
          const target = pool.get(movement.targetId);
          if (!target) break;
          const tdx = target.position.x - pos.x;
          const tdy = target.position.y - pos.y;
          const dist = Math.sqrt(tdx * tdx + tdy * tdy);
          if (dist > 5) {
            const speed = movement.velocity ?? 1.0;
            dx = (tdx / dist) * speed;
            dy = (tdy / dist) * speed;
          }
          break;
        }

        case 'flee': {
          // Flee from nearest threat
          const threats = pool.getByTag('antibiotic');
          if (threats.length === 0) break;
          let nearestDist = Infinity;
          let nearestThreat: Entity | null = null;
          for (const t of threats) {
            const d = Math.sqrt((t.position.x - pos.x) ** 2 + (t.position.y - pos.y) ** 2);
            if (d < nearestDist) { nearestDist = d; nearestThreat = t; }
          }
          if (nearestThreat && nearestDist < 80) {
            const fdx = pos.x - nearestThreat.position.x;
            const fdy = pos.y - nearestThreat.position.y;
            const dist = Math.sqrt(fdx * fdx + fdy * fdy);
            const speed = movement.velocity ?? 1.5;
            dx = (fdx / dist) * speed;
            dy = (fdy / dist) * speed;
          }
          break;
        }
      }

      // Apply movement
      entity.position.x += dx;
      entity.position.y += dy;

      // Boundary bounce with margin
      if (entity.position.x < MARGIN) {
        entity.position.x = MARGIN;
        if (movement.angle !== undefined) movement.angle = Math.PI - movement.angle;
      }
      if (entity.position.x > CANVAS_W - MARGIN) {
        entity.position.x = CANVAS_W - MARGIN;
        if (movement.angle !== undefined) movement.angle = Math.PI - movement.angle;
      }
      if (entity.position.y < MARGIN) {
        entity.position.y = MARGIN;
        if (movement.angle !== undefined) movement.angle = -movement.angle;
      }
      if (entity.position.y > CANVAS_H - MARGIN) {
        entity.position.y = CANVAS_H - MARGIN;
        if (movement.angle !== undefined) movement.angle = -movement.angle;
      }
    }
  }
}
