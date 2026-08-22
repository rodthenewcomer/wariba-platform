import { WARIX_DESTINATION_ICONS, WARIX_DESTINATION_IDS } from './destinations';
import type { WarixDestinationId, WarixSymbolSize } from './destinations';

const LABELS: Record<WarixDestinationId, string> = {
  markets: 'Marchés',
  trade: 'Trade',
  activity: 'Activité',
  alerts: 'Alertes',
  calendar: 'Calendrier',
  journal: 'Journal',
  help: 'Aide',
};

const STATE_LABEL = {
  idle: 'Repos',
  hover: 'Survol',
  active: 'Actif',
  disabled: 'Désactivé',
} as const;

function SpecimenKey({
  destination,
  disabled = false,
  forcedState,
  label,
  size = 'rail',
}: {
  destination: WarixDestinationId;
  disabled?: boolean;
  forcedState?: 'hover' | 'active' | undefined;
  label?: boolean;
  size?: WarixSymbolSize;
}) {
  const Icon = WARIX_DESTINATION_ICONS[destination];

  return (
    <div className="warix-symbol-specimen__key-wrap">
      <button
        aria-label={LABELS[destination]}
        className="warix-destination-key"
        data-force-state={forcedState}
        data-warix-destination={destination}
        disabled={disabled}
        type="button"
      >
        <Icon size={size} />
      </button>
      {label ? <span>{LABELS[destination]}</span> : null}
    </div>
  );
}

export function WarixSymbolSpecimen() {
  return (
    <section
      aria-labelledby="warix-symbol-specimen-title"
      className="warix-symbol-specimen"
      data-testid="warix-symbol-specimen"
    >
      <header className="warix-symbol-specimen__header">
        <div>
          <p>Système de symboles propriétaire · 2026</p>
          <h2 id="warix-symbol-specimen-title">Symboles de destination WariX</h2>
        </div>
        <span>28 px optiques · graphite + cobalt</span>
      </header>

      <div className="warix-symbol-specimen__section">
        <p className="warix-symbol-specimen__eyebrow">Famille native</p>
        <div className="warix-symbol-specimen__family" data-testid="warix-symbol-family-native">
          {WARIX_DESTINATION_IDS.map((destination) => (
            <SpecimenKey destination={destination} key={destination} label />
          ))}
        </div>
      </div>

      <div className="warix-symbol-specimen__section">
        <p className="warix-symbol-specimen__eyebrow">États fonctionnels</p>
        <div className="warix-symbol-specimen__states">
          {(['idle', 'hover', 'active', 'disabled'] as const).map((state) => (
            <div className="warix-symbol-specimen__state" key={state}>
              <span>{STATE_LABEL[state]}</span>
              <SpecimenKey
                destination="trade"
                disabled={state === 'disabled'}
                forcedState={state === 'hover' || state === 'active' ? state : undefined}
              />
              <SpecimenKey
                destination="alerts"
                disabled={state === 'disabled'}
                forcedState={state === 'hover' || state === 'active' ? state : undefined}
              />
              <SpecimenKey
                destination="journal"
                disabled={state === 'disabled'}
                forcedState={state === 'hover' || state === 'active' ? state : undefined}
              />
            </div>
          ))}
        </div>
      </div>

      <div className="warix-symbol-specimen__section warix-symbol-specimen__section--split">
        <div>
          <p className="warix-symbol-specimen__eyebrow">Échelles optiques</p>
          <div className="warix-symbol-specimen__sizes">
            {([20, 22, 24] as const).map((size) => (
              <div key={size}>
                <SpecimenKey destination="activity" size={size} />
                <span>{size}</span>
              </div>
            ))}
          </div>
        </div>
        <div>
          <p className="warix-symbol-specimen__eyebrow">Rail 56 px</p>
          <div className="warix-symbol-specimen__rail">
            {WARIX_DESTINATION_IDS.map((destination) => (
              <SpecimenKey destination={destination} key={destination} />
            ))}
          </div>
        </div>
      </div>

      <div className="warix-symbol-specimen__section">
        <p className="warix-symbol-specimen__eyebrow">Audit silhouette · 4×</p>
        <div className="warix-symbol-specimen__four-x" data-testid="warix-symbol-family-4x">
          {WARIX_DESTINATION_IDS.map((destination) => (
            <SpecimenKey destination={destination} key={destination} label size={24} />
          ))}
        </div>
      </div>
    </section>
  );
}
