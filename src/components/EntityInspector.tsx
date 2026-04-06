import { Entity } from '../types';

const ENTITY_DESCRIPTIONS: Record<string, string> = {
  bacterium_normal: 'A normal bacterium. No resistance gene. Vulnerable to antibiotics.',
  bacterium_resistant: 'A resistant bacterium. Carries a modified cell wall that blocks antibiotics. Will survive and reproduce.',
  antibiotic_molecule: 'An antibiotic molecule. Binds to bacterial cell walls and disrupts their structure, causing cell death.',
  virus: 'A virus particle. Attaches to host cells and injects genetic material to hijack their replication machinery.',
  host_cell: 'A host cell. Can be infected by viruses. Once infected, it becomes a virus factory.',
  immune_cell: 'A white blood cell. Patrols the body, identifying and destroying pathogens.',
  antibody: 'An antibody. Binds to specific pathogens and marks them for destruction.',
  person_unaware: 'Has not heard the rumour yet. Their social connections will determine if and when they hear it.',
  person_heard: 'Has heard the rumour but not yet decided whether to spread it.',
  person_spreading: 'Actively spreading the rumour to their social connections.',
  person_dismissed: 'Heard the rumour but critically evaluated and dismissed it. Breaking the chain of transmission.',
  person_immune: 'Already knows the truth. Immune to the rumour.',
};

const STATE_LABELS: Record<string, string> = {
  alive: '● Alive',
  active: '● Active',
  infected: '⚠ Infected',
  dying: '↓ Dying',
  dead: '✕ Dead',
  spreading: '⚡ Spreading',
  heard: '👂 Heard',
  unaware: '○ Unaware',
  dismissed: '✓ Dismissed',
};

const STATE_COLORS: Record<string, string> = {
  alive: '#22C55E',
  active: '#22C55E',
  infected: '#F97316',
  dying: '#94A3B8',
  dead: '#475569',
  spreading: '#EF4444',
  heard: '#F59E0B',
  unaware: '#64748B',
  dismissed: '#22C55E',
};

interface Props {
  entity: Entity;
  onClose: () => void;
}

export function EntityInspector({ entity, onClose }: Props) {
  const description = ENTITY_DESCRIPTIONS[entity.type] ?? 'An entity in the simulation.';
  const stateLabel = STATE_LABELS[entity.state] ?? entity.state;
  const stateColor = STATE_COLORS[entity.state] ?? '#888';
  const health = entity.components.health;
  const typeName = entity.type.replace(/_/g, ' ');

  return (
    <div className="entity-inspector" onClick={e => e.stopPropagation()}>
      <div className="inspector-header">
        <div>
          <h3 className="inspector-title">{typeName}</h3>
          <span className="inspector-state" style={{ color: stateColor }}>
            {stateLabel}
          </span>
        </div>
        <button className="inspector-close" onClick={onClose}>✕</button>
      </div>

      <p className="inspector-description">{description}</p>

      {/* Health bar */}
      {health && (
        <div className="inspector-stat">
          <span className="stat-label">Integrity</span>
          <div className="health-bar-track">
            <div
              className="health-bar-fill"
              style={{
                width: `${(health.current / health.max) * 100}%`,
                background: health.current > 60 ? '#22C55E' : health.current > 30 ? '#F59E0B' : '#EF4444',
              }}
            />
          </div>
          <span className="stat-value">{Math.round(health.current)}%</span>
        </div>
      )}

      {/* Tags */}
      {entity.tags.length > 0 && (
        <div className="inspector-tags">
          {entity.tags.map(tag => (
            <span key={tag} className="inspector-tag">{tag}</span>
          ))}
        </div>
      )}

      {/* Ticks alive */}
      <div className="inspector-meta">
        Active for {entity.ticksAlive} ticks · ID: {entity.id.slice(0, 8)}
      </div>
    </div>
  );
}
