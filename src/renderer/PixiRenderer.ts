// ========================================
// PIXI RENDERER — FIXED
// Reads visualConfig from template JSON
// Draws correct shapes: circle, triangle, hexagon, spike
// ========================================

import { useEffect, useRef, useCallback } from 'react';
import * as PIXI from 'pixi.js';
import { runtime } from '../store/simulationStore';
import { useSimulationStore } from '../store/simulationStore';

function hexStrToNum(hex: string): number {
  return parseInt(hex.replace('#', ''), 16);
}

function drawEntityShape(
  g: PIXI.Graphics,
  shape: string,
  radius: number,
  fillColor: number,
  borderColor: number,
  alpha: number,
  glowColor?: number,
  glowIntensity?: number
) {
  g.clear();
  if (glowColor !== undefined && glowIntensity && glowIntensity > 0) {
    g.beginFill(glowColor, glowIntensity * alpha * 0.4);
    g.drawCircle(0, 0, radius * 2.2);
    g.endFill();
  }
  g.lineStyle(1.5, borderColor || fillColor, alpha);
  g.beginFill(fillColor, alpha);
  switch (shape) {
    case 'triangle': {
      const r = radius;
      g.moveTo(0, -r);
      g.lineTo(r * 0.866, r * 0.5);
      g.lineTo(-r * 0.866, r * 0.5);
      g.closePath();
      break;
    }
    case 'hexagon': {
      const r = radius;
      for (let i = 0; i < 6; i++) {
        const angle = (Math.PI / 3) * i - Math.PI / 6;
        if (i === 0) g.moveTo(r * Math.cos(angle), r * Math.sin(angle));
        else g.lineTo(r * Math.cos(angle), r * Math.sin(angle));
      }
      g.closePath();
      break;
    }
    case 'spike': {
      const r = radius;
      const spikes = 8;
      const innerR = r * 0.65;
      for (let i = 0; i < spikes * 2; i++) {
        const angle = (Math.PI / spikes) * i - Math.PI / 2;
        const dist = i % 2 === 0 ? r : innerR;
        if (i === 0) g.moveTo(dist * Math.cos(angle), dist * Math.sin(angle));
        else g.lineTo(dist * Math.cos(angle), dist * Math.sin(angle));
      }
      g.closePath();
      break;
    }
    case 'diamond': {
      const r = radius;
      g.moveTo(0, -r); g.lineTo(r * 0.6, 0); g.lineTo(0, r); g.lineTo(-r * 0.6, 0); g.closePath();
      break;
    }
    case 'star': {
      const outerR = radius; const innerR = radius * 0.45; const points = 5;
      for (let i = 0; i < points * 2; i++) {
        const angle = (Math.PI / points) * i - Math.PI / 2;
        const r = i % 2 === 0 ? outerR : innerR;
        if (i === 0) g.moveTo(r * Math.cos(angle), r * Math.sin(angle));
        else g.lineTo(r * Math.cos(angle), r * Math.sin(angle));
      }
      g.closePath();
      break;
    }
    default:
      g.drawCircle(0, 0, radius);
  }
  g.endFill();
}

function getVisualConfig(entityType: string, templateVisualConfig: Record<string, any> | null) {
  if (templateVisualConfig && templateVisualConfig[entityType]) {
    const cfg = templateVisualConfig[entityType];
    return {
      shape: cfg.shape || 'circle',
      radius: cfg.radius || 8,
      color: hexStrToNum(cfg.color || '#888888'),
      borderColor: hexStrToNum(cfg.borderColor || cfg.color || '#888888'),
      glowColor: cfg.glowColor ? hexStrToNum(cfg.glowColor) : undefined,
      glowIntensity: cfg.glowIntensity || 0,
    };
  }
  const fallbacks: Record<string, any> = {
    virus:               { shape: 'triangle', radius: 7,  color: 0xA855F7, borderColor: 0x7C3AED, glowColor: 0xA855F7, glowIntensity: 0.5 },
    host_cell:           { shape: 'circle',   radius: 22, color: 0x2DD4BF, borderColor: 0x0D9488, glowColor: 0x2DD4BF, glowIntensity: 0.2 },
    bacterium_normal:    { shape: 'spike',    radius: 8,  color: 0xF97316, borderColor: 0xC2410C, glowColor: 0xF97316, glowIntensity: 0.3 },
    bacterium_resistant: { shape: 'spike',    radius: 9,  color: 0xDC2626, borderColor: 0x991B1B, glowColor: 0xDC2626, glowIntensity: 0.4 },
    antibiotic_molecule: { shape: 'diamond',  radius: 5,  color: 0xE2E8F0, borderColor: 0x94A3B8 },
    immune_cell:         { shape: 'hexagon',  radius: 14, color: 0x3B82F6, borderColor: 0x1D4ED8, glowColor: 0x3B82F6, glowIntensity: 0.3 },
    person_unaware:      { shape: 'circle',   radius: 10, color: 0x475569, borderColor: 0x334155 },
    person_heard:        { shape: 'circle',   radius: 10, color: 0xF59E0B, borderColor: 0xD97706, glowColor: 0xF59E0B, glowIntensity: 0.4 },
    person_spreading:    { shape: 'star',     radius: 11, color: 0xEF4444, borderColor: 0xDC2626, glowColor: 0xEF4444, glowIntensity: 0.5 },
    person_dismissed:    { shape: 'circle',   radius: 10, color: 0x22C55E, borderColor: 0x16A34A },
    person_immune:       { shape: 'hexagon',  radius: 10, color: 0x6366F1, borderColor: 0x4F46E5 },
  };
  return fallbacks[entityType] || { shape: 'circle', radius: 8, color: 0x64748B, borderColor: 0x475569 };
}

const STATE_ALPHA: Record<string, number> = {
  alive: 1.0, active: 1.0, spreading: 1.0, unaware: 0.75,
  heard: 1.0, dismissed: 1.0, infected: 1.0, dying: 0.4, dead: 0.0,
};

export function usePixiRenderer(containerRef: React.RefObject<HTMLDivElement>) {
  const appRef = useRef<PIXI.Application | null>(null);
  const entitySprites = useRef<Map<string, PIXI.Graphics>>(new Map());
  const entityLayer = useRef<PIXI.Container | null>(null);
  const zoom = useSimulationStore(s => s.ui.zoom);

  useEffect(() => {
    if (!containerRef.current || appRef.current) return;
    const app = new PIXI.Application({
      width: containerRef.current.clientWidth || 1100,
      height: containerRef.current.clientHeight || 600,
      backgroundColor: 0x080E1A,
      antialias: true,
      resolution: window.devicePixelRatio || 1,
      autoDensity: true,
    });
    containerRef.current.appendChild(app.view as HTMLCanvasElement);
    appRef.current = app;

    const bg = new PIXI.Container();
    const entities = new PIXI.Container();
    app.stage.addChild(bg, entities);
    entityLayer.current = entities;

    const grid = new PIXI.Graphics();
    grid.lineStyle(0.5, 0x1A2744, 0.4);
    for (let x = 0; x < 1200; x += 40) { grid.moveTo(x, 0); grid.lineTo(x, 700); }
    for (let y = 0; y < 700; y += 40) { grid.moveTo(0, y); grid.lineTo(1200, y); }
    bg.addChild(grid);

    return () => {
      app.destroy(true);
      appRef.current = null;
      entitySprites.current.clear();
    };
  }, []);

  useEffect(() => {
    if (!entityLayer.current) return;
    entityLayer.current.scale.set(zoom);
  }, [zoom]);

  const renderFrame = useCallback(() => {
    const layer = entityLayer.current;
    if (!layer) return;

    const entities = runtime?.pool?.entities;
    const graph = runtime?.graph;
    const visualConfig = graph?.visualConfig || null;

    if (!entities) return;

    const activeIds = new Set<string>();

    for (const [id, entity] of entities) {
      if (!entity || entity.state === 'dead') continue;
      activeIds.add(id);

      const cfg = getVisualConfig(entity.type, visualConfig);
      const alpha = STATE_ALPHA[entity.state] ?? 1.0;

      let g = entitySprites.current.get(id);
      if (!g) {
        g = new PIXI.Graphics();
        layer.addChild(g);
        entitySprites.current.set(id, g);
      }

      drawEntityShape(g, cfg.shape, cfg.radius, cfg.color, cfg.borderColor, alpha, cfg.glowColor, cfg.glowIntensity);
      g.x = entity.position.x;
      g.y = entity.position.y;
      g.alpha = alpha;

      if (entity.state === 'spreading' || entity.state === 'infected') {
        const pulse = 1 + Math.sin(Date.now() * 0.005 + entity.position.x) * 0.08;
        g.scale.set(pulse);
      } else {
        g.scale.set(1);
      }
    }

    for (const [id, g] of entitySprites.current) {
      if (!activeIds.has(id)) {
        layer.removeChild(g);
        g.destroy();
        entitySprites.current.delete(id);
      }
    }
  }, []);

  return { renderFrame };
}
