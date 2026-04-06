import { useState } from 'react';
import { useSimulationStore } from '../store/simulationStore';

interface TemplateEntry {
  id: string;
  domain: 'biology' | 'social';
  title: string;
  description: string;
  icon: string;
}

const TEMPLATES: TemplateEntry[] = [
  // Biology
  { id: 'antibiotic_killing_bacteria', domain: 'biology', title: 'Antibiotics vs Bacteria', description: 'How antibiotics destroy bacterial cells', icon: '💊' },
  { id: 'antibiotic_resistance', domain: 'biology', title: 'Antibiotic Resistance', description: 'Evolution of drug resistance', icon: '🦠' },
  { id: 'virus_infecting_cell', domain: 'biology', title: 'Virus Infecting a Cell', description: 'Viral hijacking of host cells', icon: '🔬' },
  { id: 'cell_mitosis', domain: 'biology', title: 'Cell Division', description: 'One cell becomes two', icon: '⚬' },
  { id: 'phagocytosis', domain: 'biology', title: 'Phagocytosis', description: 'Immune cells engulf pathogens', icon: '🫧' },
  { id: 'osmosis', domain: 'biology', title: 'Osmosis', description: 'Water crossing membranes', icon: '💧' },
  { id: 'enzyme_substrate', domain: 'biology', title: 'Enzyme-Substrate Binding', description: 'Lock and key catalysis', icon: '🔑' },
  { id: 'blood_glucose', domain: 'biology', title: 'Blood Glucose', description: 'Insulin regulation loop', icon: '🩸' },
  { id: 'immune_response', domain: 'biology', title: 'Immune Response', description: 'Detection, recruit, destroy', icon: '🛡' },
  { id: 'neural_signal', domain: 'biology', title: 'Neural Signal', description: 'Action potential propagation', icon: '⚡' },
  { id: 'muscle_contraction', domain: 'biology', title: 'Muscle Contraction', description: 'Actin-myosin sliding filaments', icon: '💪' },
  { id: 'vaccine_mechanism', domain: 'biology', title: 'How Vaccines Work', description: 'Immune memory formation', icon: '💉' },
  { id: 'cancer_proliferation', domain: 'biology', title: 'Cancer Growth', description: 'Uncontrolled cell division', icon: '⚠' },
  { id: 'natural_selection', domain: 'biology', title: 'Natural Selection', description: 'Survival of the fittest', icon: '🌿' },
  { id: 'epidemic_sir', domain: 'biology', title: 'Epidemic Spread', description: 'SIR model and herd immunity', icon: '📈' },
  { id: 'predator_prey', domain: 'biology', title: 'Predator-Prey Cycles', description: 'Lotka-Volterra oscillations', icon: '🦊' },
  { id: 'bacterial_colony', domain: 'biology', title: 'Bacterial Colony', description: 'Exponential growth to S-curve', icon: '🧫' },
  // Social
  { id: 'rumour_school', domain: 'social', title: 'Rumour in a School', description: 'Social network information spread', icon: '💬' },
  { id: 'viral_misinformation', domain: 'social', title: 'Viral Misinformation', description: 'False news spreads 6× faster', icon: '📢' },
  { id: 'office_secret_leak', domain: 'social', title: 'Office Secret', description: 'Why "tell no one" always fails', icon: '🤫' },
  { id: 'truth_vs_rumour', domain: 'social', title: 'Truth vs Rumour', description: 'Correction vs misinformation speed', icon: '⚖' },
  { id: 'ingroup_outgroup', domain: 'social', title: 'In-Group / Out-Group', description: 'Arbitrary division → real bias', icon: '🔵' },
  { id: 'peer_pressure', domain: 'social', title: 'Peer Pressure', description: 'Asch conformity experiment', icon: '👥' },
  { id: 'bystander_effect', domain: 'social', title: 'Bystander Effect', description: 'Why crowds fail to help', icon: '👁' },
  { id: 'social_norm_tipping', domain: 'social', title: 'Norm Tipping Point', description: 'Minority → majority cascade', icon: '🌊' },
  { id: 'echo_chamber', domain: 'social', title: 'Echo Chambers', description: 'Homophily creates filter bubbles', icon: '🔄' },
  { id: 'influencer_vs_wordofmouth', domain: 'social', title: 'Influencer vs WoM', description: 'Broadcast reach vs trust', icon: '📣' },
  { id: 'collective_panic', domain: 'social', title: 'Collective Panic', description: 'Fear contagion in crowds', icon: '😱' },
  { id: 'social_movement', domain: 'social', title: 'Social Movement', description: '5 activists → mass change', icon: '✊' },
  { id: 'trust_collapse', domain: 'social', title: 'Trust Collapse', description: 'How betrayal ripples outward', icon: '💔' },
];

interface Props {
  onClose: () => void;
}

export function SimulationLibrary({ onClose }: Props) {
  const [filter, setFilter] = useState<'all' | 'biology' | 'social'>('all');
  const [search, setSearch] = useState('');
  const loadSimulation = useSimulationStore(s => s.loadSimulation);

  const filtered = TEMPLATES.filter(t => {
    if (filter !== 'all' && t.domain !== filter) return false;
    if (search && !t.title.toLowerCase().includes(search.toLowerCase()) &&
        !t.description.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  // Deduplicate by id
  const unique = filtered.filter((t, i, arr) => arr.findIndex(x => x.id === t.id) === i);

  const handleSelect = (template: TemplateEntry) => {
    // Pass both query (for narration context) and templateId (to skip classification)
    loadSimulation(template.title, template.id);
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="library-modal" onClick={e => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>✕</button>

        <div className="library-header">
          <h2 className="library-title">Simulation Library</h2>
          <p className="library-sub">{TEMPLATES.length} simulations across Biology and Social Dynamics</p>
        </div>

        <div className="library-toolbar">
          <div className="library-search-wrap">
            <input
              className="library-search"
              type="text"
              placeholder="Search simulations..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              autoFocus
            />
          </div>
          <div className="library-filters">
            {(['all', 'biology', 'social'] as const).map(f => (
              <button
                key={f}
                className={`filter-btn ${filter === f ? 'filter-btn--active' : ''} ${f !== 'all' ? `filter-btn--${f}` : ''}`}
                onClick={() => setFilter(f)}
              >
                {f === 'all' ? 'All' : f === 'biology' ? '🔬 Biology' : '👥 Social'}
              </button>
            ))}
          </div>
        </div>

        <div className="library-grid">
          {unique.map(template => (
            <button
              key={template.id}
              className={`library-card library-card--${template.domain}`}
              onClick={() => handleSelect(template)}
            >
              <span className="library-card__icon">{template.icon}</span>
              <div className="library-card__body">
                <div className="library-card__title">{template.title}</div>
                <div className="library-card__desc">{template.description}</div>
              </div>
              <span className={`library-card__tag library-card__tag--${template.domain}`}>
                {template.domain}
              </span>
            </button>
          ))}
          {unique.length === 0 && (
            <div className="library-empty">No simulations match "{search}"</div>
          )}
        </div>
      </div>
    </div>
  );
}
