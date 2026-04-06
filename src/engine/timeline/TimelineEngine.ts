// ============================================
// TIMELINE ENGINE
// Tick clock + snapshot system for scrubbing
// ============================================

import { Snapshot, WorldState } from '../../types/index';
import { EntityPool } from '../ecs/EntityPool';

const SNAPSHOT_INTERVAL = 60; // snapshot every 60 ticks (1 second at 60fps)
const MAX_SNAPSHOTS = 300;    // 5 minutes of history max

export class TimelineEngine {
  private snapshots: Snapshot[] = [];
  private currentTick = 0;
  private maxTicks = 1800; // 30 seconds default
  private ticksPerSecond = 60;

  // Animation frame tracking
  private lastFrameTime = 0;
  private accumulator = 0;
  private tickCallback: ((tick: number) => void) | null = null;
  private rafId: number | null = null;
  private isRunning = false;
  private speed = 1;

  configure(maxTicks: number, ticksPerSecond: number): void {
    this.maxTicks = maxTicks;
    this.ticksPerSecond = ticksPerSecond;
  }

  onTick(callback: (tick: number) => void): void {
    this.tickCallback = callback;
  }

  start(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    this.lastFrameTime = performance.now();
    this.loop();
  }

  pause(): void {
    this.isRunning = false;
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  resume(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    this.lastFrameTime = performance.now();
    this.loop();
  }

  setSpeed(speed: 1 | 2 | 4 | 8): void {
    this.speed = speed;
  }

  getCurrentTick(): number {
    return this.currentTick;
  }

  getProgress(): number {
    return this.currentTick / this.maxTicks;
  }

  isComplete(): boolean {
    return this.currentTick >= this.maxTicks;
  }

  // Scrub to a specific tick using nearest snapshot
  scrubTo(targetTick: number, pool: EntityPool): number {
    const snap = this.getNearestSnapshot(targetTick);
    if (!snap) return this.currentTick;

    pool.restore(snap.entities);
    this.currentTick = snap.tick;
    return snap.tick;
  }

  saveSnapshot(pool: EntityPool): void {
    if (this.currentTick % SNAPSHOT_INTERVAL !== 0) return;

    const snapshot: Snapshot = {
      tick: this.currentTick,
      entities: pool.snapshot(),
      timestamp: Date.now(),
    };

    this.snapshots.push(snapshot);

    // Evict oldest if over limit
    if (this.snapshots.length > MAX_SNAPSHOTS) {
      this.snapshots.shift();
    }
  }

  reset(): void {
    this.pause();
    this.currentTick = 0;
    this.accumulator = 0;
    this.snapshots = [];
  }

  private getNearestSnapshot(tick: number): Snapshot | null {
    if (this.snapshots.length === 0) return null;
    let nearest = this.snapshots[0];
    let minDiff = Math.abs(nearest.tick - tick);

    for (const snap of this.snapshots) {
      if (snap.tick <= tick) {
        const diff = tick - snap.tick;
        if (diff < minDiff) {
          minDiff = diff;
          nearest = snap;
        }
      }
    }
    return nearest;
  }

  private loop(): void {
    if (!this.isRunning || this.currentTick >= this.maxTicks) {
      this.isRunning = false;
      return;
    }

    this.rafId = requestAnimationFrame((now) => {
      const delta = now - this.lastFrameTime;
      this.lastFrameTime = now;
      this.accumulator += delta * this.speed;

      const msPerTick = 1000 / this.ticksPerSecond;

      while (this.accumulator >= msPerTick && this.currentTick < this.maxTicks) {
        this.currentTick++;
        this.accumulator -= msPerTick;
        this.tickCallback?.(this.currentTick);
      }

      this.loop();
    });
  }
}
