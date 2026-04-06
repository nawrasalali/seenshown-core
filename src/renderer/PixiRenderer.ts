// ============================================
// PIXI RENDERER
// WebGL simulation canvas via PixiJS v7
// Entities → sprites, particles, connections
// ============================================

import { useEffect, useRef, useCallback } from 'react';
import * as PIXI from 'pixi.js';
import { Entity, EntityVisualConfig } from '../types/index';
import { runtime } from '../store/simulationStore';
import { useSimulationStore } from '../store/simulationStore';

// Visual config per entity type (hardcoded for MVP — loaded from template later)
const VISUAL_DEFAULTS: Record<string, { color: number; radius: number; glowColor?: number }> = {
  bacterium_normal:    { color: 0xF97316, radius: 8,  glowColor: 0xF97316 },
  bacterium_resistant: { color: 0xDC2626, radius: 9,  glowColor: 0xDC2626 },
  antibiotic_molecule: { color: 0xE2E8F0, radius: 5,  glowColor: 0xFFFFFF },
  virus:               { color: 0xA855F7, radius: 6,  glowColor: 0xA855F7 },
  host_cell:           { color: 0x2DD4BF, radius: 22, glowColor: 0x2DD4BF },
  immune_cell:         { color: 0x3B82F6, radius: 14, glowColor: 0x3B82F6 },
  person_unaware:      { color: 0x475569, radius: 10 },
  person_heard:        { color: 0xF59E0B, radius: 10, glowColor: 0xFCD34D },
  person_spreading:    { color: 0xEF4444, radius: 11, glowColor: 0xFCA5A5 },
  person_dismissed:    { color: 0x22C55E, radius: 10 },
  person_immune:       { color: 0x6366F1, radius: 10 },
};

const STATE_ALPHA: Record<string, number> = {
  alive:     1.0,
  active:    1.0,
  spreading: 1.0,
  unaware:   0.75,
  heard:     1.0,
  dismissed: 1.0,
  infected:  1.0,
  dying:     0.4,
  dead:      0.0,
};

interface ParticleEffect {
  x: number; y: number;
  vx: number; vy: number;
  color: number;
  alpha: number;
  life: number;
  maxLife: number;
  radius: number;
  type: string;
}

export function usePixiRenderer(containerRef: React.RefObject<HTMLDivElement>) {
  const appRef = useRef<PIXI.Application | null>(null);
  const entitySprites = useRef<Map<string, PIXI.Graphics>>(new Map());
  const particleLayer = useRef<PIXI.Container | null>(null);
  const entityLayer = useRef<PIXI.Container | null>(null);
  const particles = useRef<ParticleEffect[]>([]);
  const selectEntity = useSimulationStore(s => s.selectEntity);
  const zoom = useSimulationStore(s => s.ui.zoom);

  // Init PixiJS
  useEffect(() => {
    if (!containerRef.current || appRef.current) return;

    const app = new PIXI.Application({
      width: containerRef.current.clientWidth || 1100,
      height: containerRef.current.clientHeight || 680,
      backgroundColor: 0x0A0E1A,
      antialias: true,
      resolution: window.devicePixelRatio || 1,
      autoDensity: true,
    });

    containerRef.current.appendChild(app.view as HTMLCanvasElement);
    appRef.current = app;

    // Layers
    const bg = new PIXI.Container();
    const entities = new PIXI.Container();
    const parts = new PIXI.Container();
    const ui = new PIXI.Container();

    app.stage.addChild(bg, entities, parts, ui);
    entityLayer.current = entities;
    particleLayer.current = parts;

    // Grid background
    drawGrid(bg, app.screen.width, app.screen.height);

    // Ticker: render particles + connections
    app.ticker.add(() => {
      updateParticles(parts);
    });

    return () => {
      app.destroy(true, { children: true, texture: true });
      appRef.current = null;
      entitySprites.current.clear();
    };
  }, [containerRef]);

  // Zoom
  useEffect(() => {
    if (!entityLayer.current || !particleLayer.current) return;
    entityLayer.current.scale.set(zoom);
    particleLayer.current.scale.set(zoom);
    // Center pivot
    entityLayer.current.pivot.set(550, 340);
    entityLayer.current.position.set(
      (appRef.current?.screen.width ?? 1100) / 2,
      (appRef.current?.screen.height ?? 680) / 2
    );
  }, [zoom]);

  // Render entities (called every tick from runtime event)
  const renderEntities = useCallback(() => {
    if (!entityLayer.current || !appRef.current) return;

    const layer = entityLayer.current;
    const liveEntities = runtime.pool.getLiving();
    const liveIds = new Set(liveEntities.map(e => e.id));

    // Remove sprites for destroyed entities
    for (const [id, sprite] of entitySprites.current) {
      if (!liveIds.has(id)) {
        layer.removeChild(sprite);
        sprite.destroy();
        entitySprites.current.delete(id);
      }
    }

    // Update or create sprites
    for (const entity of liveEntities) {
      let sprite = entitySprites.current.get(entity.id);

      if (!sprite) {
        sprite = createEntitySprite(entity);
        sprite.interactive = true;
        sprite.cursor = 'pointer';
        sprite.on('pointerdown', () => selectEntity(entity));
        layer.addChild(sprite);
        entitySprites.current.set(entity.id, sprite);
      }

      // Update position + visual state
      const visual = VISUAL_DEFAULTS[entity.type] ?? { color: 0x888888, radius: 8 };
      const alpha = STATE_ALPHA[entity.state] ?? 1.0;

      // Smooth visual position interpolation (renderer only — actual position owned by engine)
      sprite.x += (entity.position.x - sprite.x) * 0.18;
      sprite.y += (entity.position.y - sprite.y) * 0.18;

      // Alpha fade
      sprite.alpha += (alpha - sprite.alpha) * 0.1;

      // Pulse for spreading/infected states
      if (entity.state === 'spreading' || entity.state === 'infected') {
        const pulse = 1 + Math.sin(Date.now() * 0.004 + entity.id.charCodeAt(2)) * 0.08;
        sprite.scale.set(pulse);
      } else if (entity.state === 'dying') {
        sprite.scale.set(Math.max(0.05, sprite.scale.x - 0.004));
      } else {
        sprite.scale.x += (1 - sprite.scale.x) * 0.1;
        sprite.scale.y = sprite.scale.x;
      }
    }
  }, [selectEntity]);

  // Emit a particle effect
  const emitParticle = useCallback((x: number, y: number, type: string, color: number) => {
    const count = type === 'die' ? 8 : type === 'divide' ? 6 : 4;
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2 + Math.random() * 0.5;
      const speed = 0.8 + Math.random() * 1.5;
      particles.current.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color,
        alpha: 0.9,
        life: 0,
        maxLife: 40 + Math.random() * 20,
        radius: type === 'die' ? 4 : 3,
        type,
      });
    }
  }, []);

  // Wire to runtime
  useEffect(() => {
    const unsubscribe = runtime.on((event) => {
      if (event.type === 'tick') {
        renderEntities();
      }
      if (event.type === 'mutation') {
        for (const mutation of event.mutations) {
          if (mutation.type === 'EMIT_PARTICLE') {
            const colorHex = parseInt((mutation.color ?? '#ffffff').replace('#', ''), 16);
            emitParticle(mutation.position.x, mutation.position.y, mutation.effect, colorHex);
          }
        }
      }
    });
    return unsubscribe;
  }, [renderEntities, emitParticle]);

  function updateParticles(layer: PIXI.Container) {
    layer.removeChildren();
    const alive: ParticleEffect[] = [];

    for (const p of particles.current) {
      p.life++;
      p.x += p.vx;
      p.y += p.vy;
      p.vx *= 0.95;
      p.vy *= 0.95;
      p.alpha = (1 - p.life / p.maxLife) * 0.9;

      if (p.life < p.maxLife) {
        const g = new PIXI.Graphics();
        g.beginFill(p.color, p.alpha);
        g.drawCircle(0, 0, p.radius * (1 - p.life / p.maxLife));
        g.endFill();
        g.x = p.x;
        g.y = p.y;
        layer.addChild(g);
        alive.push(p);
      }
    }
    particles.current = alive;
  }
}

function createEntitySprite(entity: Entity): PIXI.Graphics {
  const visual = VISUAL_DEFAULTS[entity.type] ?? { color: 0x888888, radius: 8 };
  const g = new PIXI.Graphics();

  // Glow effect
  if (visual.glowColor) {
    g.beginFill(visual.glowColor, 0.12);
    g.drawCircle(0, 0, visual.radius * 2.2);
    g.endFill();
  }

  // Main body
  g.beginFill(visual.color, 1);
  g.lineStyle(1.5, darken(visual.color, 0.7), 0.8);
  g.drawCircle(0, 0, visual.radius);
  g.endFill();

  // Inner highlight
  g.beginFill(0xFFFFFF, 0.15);
  g.drawCircle(-visual.radius * 0.2, -visual.radius * 0.2, visual.radius * 0.4);
  g.endFill();

  g.x = entity.position.x;
  g.y = entity.position.y;

  return g;
}

function drawGrid(container: PIXI.Container, width: number, height: number) {
  const g = new PIXI.Graphics();
  g.lineStyle(1, 0x1E293B, 0.4);

  for (let x = 0; x < width; x += 40) {
    g.moveTo(x, 0);
    g.lineTo(x, height);
  }
  for (let y = 0; y < height; y += 40) {
    g.moveTo(0, y);
    g.lineTo(width, y);
  }

  container.addChild(g);
}

function darken(color: number, factor: number): number {
  const r = ((color >> 16) & 0xFF) * factor;
  const g = ((color >> 8) & 0xFF) * factor;
  const b = (color & 0xFF) * factor;
  return (Math.round(r) << 16) | (Math.round(g) << 8) | Math.round(b);
}
