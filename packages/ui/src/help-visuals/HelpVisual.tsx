import type { HelpVisualFactKey, HelpVisualModel } from './types';
import { Flow, StepNode, VisualFrame, VisualPanel } from './visual-primitives';

const UNPUBLISHED = 'non publié';

function fact(model: HelpVisualModel, key: HelpVisualFactKey): string {
  return model.facts[key] ?? UNPUBLISHED;
}

function EducationalIllustration({
  src,
  alt,
  caption,
}: {
  src: string;
  alt: string;
  caption: string;
}) {
  return (
    <figure
      data-help-illustration
      className="mt-5 overflow-hidden rounded-[var(--wariba-radius-lg)] border border-[color:var(--wariba-color-ink-700)] bg-[color:var(--wariba-color-ink-950)]"
    >
      <img src={src} alt={alt} loading="lazy" decoding="async" className="block h-auto w-full" />
      <figcaption className="border-t border-[color:var(--wariba-color-ink-700)] px-3 py-2.5 text-[length:var(--wariba-font-size-label-sm)] leading-relaxed text-[color:var(--wariba-color-ink-300)]">
        {caption}
      </figcaption>
    </figure>
  );
}

function DailyVsMaximum({ model }: { model: HelpVisualModel }) {
  return (
    <>
      <div className="grid gap-3 md:grid-cols-2">
        <VisualPanel
          tone="amber"
          eyebrow="TEMPORAIRE · protège la journée"
          title="Perte quotidienne"
          value={fact(model, 'dailyLossRate')}
        >
          <ol className="grid gap-2" aria-label="Conséquence de la perte quotidienne">
            <li>
              <strong>1.</strong> Limite du jour atteinte
            </li>
            <li>
              <strong>2.</strong> Nouvelles positions suspendues
            </li>
            <li>
              <strong>3.</strong> Prochain reset
            </li>
            <li>
              <strong>✓ Le compte continue</strong> s’il reste valide
            </li>
          </ol>
        </VisualPanel>
        <VisualPanel
          tone="coral"
          eyebrow="DÉFINITIF · protège toute la vie du compte"
          title="Perte maximale"
          value={fact(model, 'maximumLossRate')}
        >
          <ol className="grid gap-2" aria-label="Conséquence de la perte maximale">
            <li>
              <strong>1.</strong> Plancher de protection franchi
            </li>
            <li>
              <strong>2.</strong> Compte terminé
            </li>
            <li>
              <strong>3.</strong> Aucun reset
            </li>
            <li>
              <strong>✕ Le compte ne continue pas</strong>
            </li>
          </ol>
        </VisualPanel>
      </div>
      <p className="mt-4 border-l-2 border-[color:var(--wariba-accent-copper)] pl-3 text-[length:var(--wariba-font-size-body-sm)] font-semibold text-[color:var(--wariba-color-ink-100)]">
        Même journée possible, conséquences opposées : pause temporaire ou fin définitive du compte.
      </p>
      <EducationalIllustration
        src="/help/visuals/HLP-ILL-001-two-risk-guardrails.webp"
        alt="Repère visuel secondaire : une horloge représente la limite temporaire de la journée ; des marches représentent le plancher permanent dont le franchissement termine le compte."
        caption="Repère de mémorisation : l’horloge correspond au temporaire ; les marches et la croix correspondent au définitif. Les conséquences exactes sont écrites au-dessus."
      />
    </>
  );
}

function EodTimeline({ model }: { model: HelpVisualModel }) {
  const steps = [
    ['1', 'La journée se termine', 'La balance de clôture est finalisée.', 'neutral'],
    ['2', 'Clôture plus haute', 'La nouvelle clôture dépasse la meilleure précédente.', 'emerald'],
    [
      '3',
      'Le plancher remonte',
      `Il garde la distance publiée : ${fact(model, 'maximumLossRate')}.`,
      'cobalt',
    ],
    ['4', 'Il ne redescend plus', 'Une journée suivante plus basse ne l’abaisse pas.', 'amber'],
  ] as const;
  return (
    <>
      <Flow>
        {steps.map(([index, label, detail, tone]) => (
          <StepNode key={index} index={index} label={label} detail={detail} tone={tone} />
        ))}
      </Flow>
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <VisualPanel
          tone="amber"
          eyebrow="Le cliquet reste en place"
          title="Journée suivante plus basse"
        >
          <p>
            Le plancher reste au niveau déjà atteint. Il ne suit pas chaque mouvement du compte.
          </p>
        </VisualPanel>
        <VisualPanel
          tone="coral"
          eyebrow="Conséquence définitive"
          title="Valeur du compte sous le plancher"
        >
          <p>Le compte est terminé. Il n’existe aucun reset de cette limite.</p>
        </VisualPanel>
      </div>
      <p className="mt-4 text-[length:var(--wariba-font-size-label-sm)] leading-relaxed text-[color:var(--wariba-color-ink-300)]">
        Le recalcul a lieu une fois la journée terminée, jamais à chaque mouvement. Une fois arrivé
        à sa limite prévue, le plancher ne monte plus.
      </p>
      <EducationalIllustration
        src="/help/visuals/HLP-ILL-002-eod-ratchet.webp"
        alt="Repère visuel secondaire : la balance varie, tandis que le plancher remonte uniquement aux clôtures de journée plus hautes puis reste au même niveau."
        caption="Repère de mémorisation : chaque marche correspond à une fin de journée plus haute ; entre deux clôtures, le plancher reste fixe."
      />
    </>
  );
}

function DailySoftLock({ model }: { model: HelpVisualModel }) {
  const steps = [
    ['Trading normal', 'Vos actions restent soumises aux règles.', 'neutral'],
    ['Limite atteinte', fact(model, 'dailyLossRate'), 'amber'],
    ['Nouvelles positions suspendues', 'Aucune exposition supplémentaire.', 'amber'],
    ['Réduire reste possible', 'Selon les permissions affichées.', 'cobalt'],
    ['Prochain reset', '00:00 UTC', 'cobalt'],
    ['Reprise si le compte reste valide', 'Les permissions sont vérifiées à nouveau.', 'emerald'],
  ] as const;
  return (
    <>
      <Flow>
        {steps.map(([label, detail, tone], index) => (
          <StepNode key={label} index={index + 1} label={label} detail={detail} tone={tone} />
        ))}
      </Flow>
      <VisualPanel
        tone="amber"
        title="Votre compte n’est pas automatiquement terminé pour cette règle seule"
        className="mt-5"
      />
    </>
  );
}

function BestDay({ model }: { model: HelpVisualModel }) {
  const bars = [42, 67, 96, 54, 73];
  return (
    <div className="grid gap-4 md:grid-cols-[1.2fr_.8fr]">
      <VisualPanel
        tone="cobalt"
        eyebrow="Exemple sans montant"
        title="Répartition des journées"
        value={`limite ${fact(model, 'bestDayMaxRatio')}`}
      >
        <div
          className="mt-4 flex h-44 items-end gap-3"
          aria-label="Cinq journées positives, dont une journée la plus forte"
        >
          {bars.map((height, index) => (
            <div key={index} className="flex h-full flex-1 flex-col items-center justify-end gap-2">
              <span className="sr-only">
                Jour {index + 1}
                {index === 2 ? ', meilleure journée' : ''}
              </span>
              <span
                className="help-visual-bar w-full max-w-12 rounded-t-sm"
                style={{
                  height: `${height}%`,
                  background:
                    index === 2 ? 'var(--wariba-accent-indigo)' : 'var(--wariba-accent-emerald)',
                }}
              />
              <span className="wariba-data text-[length:var(--wariba-font-size-label-sm)] text-[color:var(--wariba-color-ink-300)]">
                J{index + 1}
                {index === 2 ? ' · meilleure' : ''}
              </span>
            </div>
          ))}
        </div>
      </VisualPanel>
      <div className="grid gap-3">
        <VisualPanel tone="emerald" title="Encore conforme">
          <p>La meilleure journée reste dans la part publiée.</p>
        </VisualPanel>
        <VisualPanel tone="amber" title="Réussite temporairement retardée">
          <p>Une journée pèse trop dans le total. Le compte continue.</p>
        </VisualPanel>
        <p className="text-[length:var(--wariba-font-size-label-sm)] leading-relaxed text-[color:var(--wariba-color-ink-300)]">
          Les hauteurs illustrent une répartition, pas des montants de compte. Le calcul compare la
          meilleure journée au total des journées positives. Il ne crée jamais, à lui seul, un
          compte terminé.
        </p>
      </div>
    </div>
  );
}

function ShortDuration({ model }: { model: HelpVisualModel }) {
  const threshold = fact(model, 'shortDurationSeconds');
  return (
    <div className="space-y-5">
      <div className="relative px-2 pt-8">
        <div className="help-visual-line h-1 rounded-full bg-[color:var(--wariba-color-ink-700)]" />
        <div className="absolute left-2 top-6 size-5 rounded-full border-4 border-[color:var(--wariba-color-ink-900)] bg-[color:var(--wariba-accent-indigo)]" />
        <div className="absolute left-[64%] top-5 h-7 w-px bg-[color:var(--wariba-accent-copper)]" />
        <div className="absolute right-2 top-6 size-5 rounded-full border-4 border-[color:var(--wariba-color-ink-900)] bg-[color:var(--wariba-accent-emerald)]" />
        <div className="mt-3 grid grid-cols-3 text-[length:var(--wariba-font-size-label-sm)] text-[color:var(--wariba-color-ink-300)]">
          <span>Entrée</span>
          <span className="text-center text-[color:var(--wariba-accent-copper)]">
            Seuil · {threshold}
          </span>
          <span className="text-right">Sortie</span>
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <VisualPanel tone="amber" title="Gain clôturé avant le seuil">
          <p>
            Le résultat existe sur le compte, mais le gain peut ne rien ajouter au résultat du
            programme.
          </p>
        </VisualPanel>
        <VisualPanel tone="emerald" title="Gain clôturé au seuil ou après">
          <p>Le gain peut être compté, sous réserve des autres règles.</p>
        </VisualPanel>
      </div>
      <p className="text-[length:var(--wariba-font-size-body-sm)] font-semibold text-[color:var(--wariba-color-bone-50)]">
        Les pertes comptent toujours. Ce repère n’est pas une invitation à tenir un trade jusqu’à
        une seconde précise.
      </p>
    </div>
  );
}

function GoalReached() {
  const steps = [
    ['Objectif atteint', 'Le résultat réalisé atteint le niveau requis.', 'cobalt'],
    ['Règles toujours actives', 'Le compte reste soumis à ses limites.', 'amber'],
    ['Fin de journée', 'Les données sont finalisées.', 'neutral'],
    ['Conditions vérifiées', 'Positions, ordres et règles sont contrôlés.', 'amber'],
    ['Réussite validée', 'La transition peut être approuvée.', 'emerald'],
    ['Performance créée', 'Un compte distinct est ouvert une seule fois.', 'emerald'],
  ] as const;
  return (
    <Flow>
      {steps.map(([label, detail, tone], index) => (
        <StepNode key={label} index={index + 1} label={label} detail={detail} tone={tone} />
      ))}
    </Flow>
  );
}

function ProgrammeJourney({ model }: { model: HelpVisualModel }) {
  const steps = [
    'Choisir une évaluation',
    'Activer WARIBA ONE',
    'Trader',
    'Remplir les conditions',
    'Validation',
    'WARIBA Performance',
    'Construire le buffer',
    'Journées comptées',
    'Payout',
    'Nouveau cycle',
    'WARIBA Review',
  ];
  return (
    <>
      <p className="mb-4 inline-flex rounded-full border border-[color:var(--wariba-accent-copper-edge)] bg-[color:var(--wariba-accent-copper-wash)] px-3 py-1 text-[length:var(--wariba-font-size-label-sm)] font-semibold text-[color:var(--wariba-accent-copper)]">
        Environnement simulé
      </p>
      <ol className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {steps.map((label, index) => (
          <StepNode
            key={label}
            index={index + 1}
            label={label}
            {...(label === 'Payout'
              ? { detail: `${fact(model, 'maxPayoutCyclesBeforeReview')} avant Review` }
              : {})}
            tone={index === steps.length - 1 ? 'copper' : index >= 5 ? 'emerald' : 'cobalt'}
          />
        ))}
      </ol>
      <p className="mt-4 text-[length:var(--wariba-font-size-label-sm)] text-[color:var(--wariba-color-ink-300)]">
        WARIBA Review ne garantit ni compte Live ni allocation de capital réel.
      </p>
    </>
  );
}

function BufferStack({ model }: { model: HelpVisualModel }) {
  return (
    <>
      <div className="grid items-stretch gap-4 sm:grid-cols-[.9fr_1.1fr]">
        <div className="flex min-h-64 flex-col-reverse overflow-hidden rounded-[var(--wariba-radius-lg)] border border-[color:var(--wariba-color-ink-700)]">
          <div className="flex-[6] bg-[color:var(--wariba-color-ink-800)] p-4">
            <p className="font-semibold text-[color:var(--wariba-color-bone-50)]">
              BASE DU COMPTE SIMULÉ
            </p>
            <p className="mt-1 text-[length:var(--wariba-font-size-label-sm)] text-[color:var(--wariba-color-ink-300)]">
              Base du compte simulé
            </p>
          </div>
          <div className="flex-[2] border-y border-[color:var(--wariba-accent-copper-edge)] bg-[color:var(--wariba-accent-copper-wash)] p-4">
            <p className="font-semibold text-[color:var(--wariba-accent-copper)]">
              BUFFER PERMANENT · {fact(model, 'permanentBufferRate')}
            </p>
            <p className="mt-1 text-[length:var(--wariba-font-size-label-sm)] text-[color:var(--wariba-color-ink-100)]">
              VERROUILLÉ — reste dans le compte
            </p>
          </div>
          <div className="flex-1 bg-[color:var(--wariba-accent-emerald-wash)] p-4">
            <p className="font-semibold text-[color:var(--wariba-accent-emerald)]">
              EXCÉDENT DISPONIBLE
            </p>
            <p className="mt-1 text-[length:var(--wariba-font-size-label-sm)] text-[color:var(--wariba-color-ink-100)]">
              Peut devenir éligible au payout
            </p>
          </div>
        </div>
        <div className="grid gap-3">
          <VisualPanel tone="copper" eyebrow="CE QUI RESTE" title="Le buffer ne se retire pas">
            <p>Construit une seule fois, il reste dans le compte et ne devient pas un payout.</p>
          </VisualPanel>
          <VisualPanel
            tone="emerald"
            eyebrow="CE QUI PEUT ÊTRE DEMANDÉ"
            title="Seul l’excédent est candidat"
          >
            <p>Il peut devenir éligible si toutes les autres conditions sont remplies.</p>
          </VisualPanel>
          <VisualPanel tone="cobalt" eyebrow="ÉTAPE SUIVANTE" title="Demande de payout">
            <p>Une demande ne garantit ni approbation ni paiement.</p>
          </VisualPanel>
        </div>
      </div>
      <EducationalIllustration
        src="/help/visuals/HLP-ILL-003-permanent-buffer.webp"
        alt="Repère visuel secondaire : une bande verrouillée reste dans le réservoir du compte, tandis que seul l’excédent au-dessus peut suivre le parcours de payout."
        caption="Repère de mémorisation : la bande verrouillée reste dans le compte ; seul l’excédent situé au-dessus peut avancer vers une demande."
      />
    </>
  );
}

function PerformanceDays({ model }: { model: HelpVisualModel }) {
  const required = model.performanceDaysRequired;
  if (required === null) {
    return (
      <VisualPanel
        tone="neutral"
        title="Nombre de journées non publié"
        value={`seuil ${fact(model, 'performanceDayThresholdRate')}`}
      >
        <p>WARIBA affichera ici le nombre attaché aux règles Performance publiées.</p>
      </VisualPanel>
    );
  }
  const total = Math.max(required + 3, 8);
  return (
    <>
      <div
        className="grid grid-cols-4 gap-2 sm:grid-cols-8"
        aria-label={`${required} nouvelles journées requises par payout`}
      >
        {Array.from({ length: total }, (_, index) => {
          const qualifies = index < required;
          return (
            <div
              key={index}
              className="help-visual-node rounded-[var(--wariba-radius-lg)] border p-3 text-center"
              style={{
                borderColor: qualifies
                  ? 'var(--wariba-accent-emerald-edge)'
                  : 'var(--wariba-color-ink-700)',
                background: qualifies
                  ? 'var(--wariba-accent-emerald-wash)'
                  : 'var(--wariba-color-ink-950)',
              }}
            >
              <p className="wariba-data text-[length:var(--wariba-font-size-label-sm)] text-[color:var(--wariba-color-ink-300)]">
                J{index + 1}
              </p>
              <p
                className="mt-3 text-lg font-semibold"
                style={{
                  color: qualifies ? 'var(--wariba-accent-emerald)' : 'var(--wariba-color-ink-300)',
                }}
              >
                {qualifies ? '✓' : '—'}
              </p>
              <p className="mt-2 text-[length:var(--wariba-font-size-label-sm)] uppercase tracking-wide text-[color:var(--wariba-color-ink-300)]">
                {qualifies ? 'Comptée' : 'Non comptée'}
              </p>
            </div>
          );
        })}
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <VisualPanel
          tone="emerald"
          title={fact(model, 'performanceDaysRequired')}
          value={`seuil ${fact(model, 'performanceDayThresholdRate')}`}
        >
          <p>Chaque journée est finalisée en UTC et utilise le profit net réalisé.</p>
        </VisualPanel>
        <VisualPanel tone="cobalt" title="Nouveau payout, nouvelles journées">
          <p>Une journée déjà utilisée ne peut pas être réutilisée.</p>
        </VisualPanel>
      </div>
    </>
  );
}

function PayoutEligibility() {
  const items = [
    ['Buffer construit', 'Condition financière'],
    ['Journées comptées obtenues', 'Condition de répétabilité'],
    ['Excédent disponible', 'Montant potentiellement demandable'],
    ['Compte dans un état autorisé', 'Aucun blocage actif'],
    ['Vérifications requises terminées', 'Selon l’état affiché dans votre espace'],
  ];
  return (
    <>
      <ul className="grid gap-2">
        {items.map(([label, detail], index) => (
          <li
            key={label}
            className="help-visual-node flex items-center gap-3 rounded-[var(--wariba-radius-lg)] border border-[color:var(--wariba-color-ink-700)] bg-[color:var(--wariba-color-ink-950)] p-3.5"
          >
            <span
              aria-hidden="true"
              className="wariba-data flex size-7 shrink-0 items-center justify-center rounded-full border border-[color:var(--wariba-accent-amber-edge)] text-[color:var(--wariba-accent-amber)]"
            >
              {index + 1}
            </span>
            <div className="min-w-0">
              <p className="font-semibold text-[color:var(--wariba-color-bone-50)]">{label}</p>
              <p className="text-[length:var(--wariba-font-size-label-sm)] text-[color:var(--wariba-color-ink-300)]">
                {detail}
              </p>
            </div>
            <span className="ml-auto rounded-full border border-[color:var(--wariba-color-ink-600)] px-2 py-1 text-[length:var(--wariba-font-size-label-sm)] text-[color:var(--wariba-color-ink-200)]">
              À vérifier
            </span>
          </li>
        ))}
      </ul>
      <p className="mt-4 text-[length:var(--wariba-font-size-label-sm)] leading-relaxed text-[color:var(--wariba-color-ink-300)]">
        Cette page publique ne prétend pas lire votre compte. Dans votre espace, chaque ligne reçoit
        son état réel : remplie, en attente ou bloquante.
      </p>
    </>
  );
}

function PayoutWaterfall({ model }: { model: HelpVisualModel }) {
  const steps = [
    ['Profits réalisés', 'Point de départ', 'neutral'],
    ['Buffer permanent', fact(model, 'permanentBufferRate'), 'copper'],
    ['Montant candidat', 'Excédent au-dessus du buffer', 'cobalt'],
    ['Plafond applicable', 'Selon la taille et le rang', 'amber'],
    [
      'Répartition',
      `${fact(model, 'traderSplitDefault')} puis ${fact(model, 'traderSplitFinalCycle')} au dernier cycle`,
      'cobalt',
    ],
    ['Montant du trader', 'Calculé ici ; confirmé payé seulement au statut « Payé »', 'emerald'],
  ] as const;
  return (
    <Flow>
      {steps.map(([label, detail, tone], index) => (
        <StepNode key={label} index={index + 1} label={label} detail={detail} tone={tone} />
      ))}
    </Flow>
  );
}

function PayoutCycles({ model }: { model: HelpVisualModel }) {
  const count = model.maxPayoutCyclesBeforeReview;
  if (count === null) {
    return (
      <VisualPanel tone="neutral" title="Nombre de cycles non publié">
        <p>
          Aucun nombre de payouts n’est supposé tant que les règles publiées ne l’indiquent pas.
        </p>
      </VisualPanel>
    );
  }
  return (
    <>
      <ol className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
        {Array.from({ length: count }, (_, index) => {
          const final = index === count - 1;
          return (
            <StepNode
              key={index}
              index={index + 1}
              label={`Payout ${index + 1}`}
              detail={
                final
                  ? `Votre part · ${fact(model, 'traderSplitFinalCycle')}`
                  : `Votre part · ${fact(model, 'traderSplitDefault')}`
              }
              tone={final ? 'copper' : 'cobalt'}
            />
          );
        })}
      </ol>
      <div className="mt-4 flex items-center gap-3 rounded-[var(--wariba-radius-lg)] border border-[color:var(--wariba-accent-copper-edge)] bg-[color:var(--wariba-accent-copper-wash)] p-4">
        <span aria-hidden="true" className="text-xl text-[color:var(--wariba-accent-copper)]">
          →
        </span>
        <div>
          <p className="font-semibold text-[color:var(--wariba-color-bone-50)]">WARIBA Review</p>
          <p className="text-[length:var(--wariba-font-size-label-sm)] text-[color:var(--wariba-color-ink-200)]">
            Aucun cycle automatique supplémentaire. Aucun compte Live garanti.
          </p>
        </div>
      </div>
    </>
  );
}

function PayoutStatus() {
  const steps = [
    ['Demande reçue', 'Votre demande existe.', 'cobalt'],
    ['Vérification', 'Les conditions sont revues.', 'amber'],
    ['Décision', 'Approuvée ou refusée.', 'amber'],
    ['Traitement', 'Approuvé ne veut pas dire payé.', 'copper'],
    ['Payé ou échoué', 'Le statut final reste visible.', 'emerald'],
  ] as const;
  return (
    <>
      <Flow>
        {steps.map(([label, detail, tone], index) => (
          <StepNode key={label} index={index + 1} label={label} detail={detail} tone={tone} />
        ))}
      </Flow>
      <p className="mt-4 font-semibold text-[color:var(--wariba-color-bone-50)]">
        Le statut affiché dans WARIBA est la référence pour votre demande.
      </p>
    </>
  );
}

function OrderRefusal() {
  const branches = [
    ['Marché indisponible ou prix trop ancien', 'Attendez un prix à jour.'],
    ['Compte temporairement bloqué', 'Consultez l’état et le prochain reset.'],
    ['Limite de risque ou d’exposition', 'Réduisez la taille ou l’exposition.'],
    ['Quantité ou marge non autorisée', 'Vérifiez les bornes affichées.'],
    ['Ordre incomplet ou prix invalide', 'Corrigez les champs indiqués.'],
  ];
  return (
    <div className="grid gap-3 md:grid-cols-[.72fr_1.28fr]">
      <VisualPanel tone="coral" eyebrow="Aucune exécution" title="Ordre refusé">
        <p>Une position n’est pas créée. Le message public indique la famille du refus.</p>
      </VisualPanel>
      <ul className="grid gap-2">
        {branches.map(([cause, action]) => (
          <li
            key={cause}
            className="help-visual-node grid gap-1 rounded-[var(--wariba-radius-lg)] border border-[color:var(--wariba-color-ink-700)] p-3 sm:grid-cols-[1fr_auto] sm:items-center"
          >
            <span className="font-semibold text-[color:var(--wariba-color-bone-50)]">{cause}</span>
            <span className="text-[length:var(--wariba-font-size-label-sm)] text-[color:var(--wariba-color-cobalt-300)]">
              {action}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function SupportStatuses() {
  const support = ['Ouverte', 'Votre réponse attendue', 'En cours d’examen', 'Résolue', 'Clôturée'];
  const dispute = [
    'Ouverte',
    'En cours d’examen',
    'Complément demandé',
    'Décision maintenue',
    'Clôturée',
  ];
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <VisualPanel tone="cobalt" eyebrow="Demande" title="Support">
        <ol className="mt-3 grid gap-2">
          {support.map((label, index) => (
            <StepNode
              key={label}
              index={index + 1}
              label={label}
              tone={index === 4 ? 'neutral' : 'cobalt'}
            />
          ))}
        </ol>
      </VisualPanel>
      <VisualPanel tone="copper" eyebrow="Décision enregistrée" title="Contestation">
        <ol className="mt-3 grid gap-2">
          {dispute.map((label, index) => (
            <StepNode
              key={label}
              index={index + 1}
              label={label}
              tone={index === 4 ? 'neutral' : 'copper'}
            />
          ))}
        </ol>
      </VisualPanel>
    </div>
  );
}

function AccountStates() {
  return (
    <div className="grid gap-4">
      <VisualPanel tone="emerald" title="Compte actif">
        <p>Vous pouvez agir selon les permissions affichées.</p>
      </VisualPanel>
      <div className="grid gap-3 md:grid-cols-3">
        <VisualPanel tone="amber" title="Blocage temporaire">
          <p>Nouvelles positions suspendues → prochain reset → actif si le compte reste valide.</p>
        </VisualPanel>
        <VisualPanel tone="cobalt" title="Objectif atteint">
          <p>Réussite en vérification → Performance si la validation aboutit.</p>
        </VisualPanel>
        <VisualPanel tone="coral" title="Perte maximale franchie">
          <p>Compte terminé → plus de nouvelle exposition → preuve et contestation consultables.</p>
        </VisualPanel>
      </div>
    </div>
  );
}

function GoalVsValidated() {
  return (
    <div className="grid items-stretch gap-3 md:grid-cols-[1fr_auto_1fr]">
      <VisualPanel tone="amber" eyebrow="Étape 1" title="Objectif atteint">
        <ul className="list-disc space-y-1 pl-4">
          <li>Les règles restent actives.</li>
          <li>Le compte n’est pas encore Performance.</li>
          <li>Évitez toute prise de risque inutile.</li>
        </ul>
      </VisualPanel>
      <div className="flex items-center justify-center text-[color:var(--wariba-color-cobalt-300)]">
        <span aria-hidden="true" className="hidden text-2xl md:inline">
          →
        </span>
        <span className="rounded-full border border-[color:var(--wariba-color-cobalt-700)] px-3 py-1 text-center text-[length:var(--wariba-font-size-label-sm)]">
          Finalisation + vérification
        </span>
      </div>
      <VisualPanel tone="emerald" eyebrow="Étape 2" title="Évaluation validée">
        <ul className="list-disc space-y-1 pl-4">
          <li>Les conditions finales sont confirmées.</li>
          <li>La transition peut être approuvée.</li>
          <li>Performance reste simulé.</li>
        </ul>
      </VisualPanel>
    </div>
  );
}

function PolicyVersions({ model }: { model: HelpVisualModel }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <VisualPanel
        tone="cobalt"
        eyebrow="Page publique"
        title="Règles actuellement publiées"
        value={fact(model, 'evaluationPolicyVersion')}
      >
        <p>Elles expliquent l’offre disponible aujourd’hui.</p>
      </VisualPanel>
      <VisualPanel
        tone="copper"
        eyebrow="Votre compte"
        title="Règles attachées à ce compte"
        value="Affichées dans votre espace"
      >
        <p>
          Un compte conserve la version acceptée lors de son activation. Cette version prime si la
          page publique a changé.
        </p>
      </VisualPanel>
    </div>
  );
}

export function HelpVisual({ model }: { model: HelpVisualModel }) {
  let content;
  switch (model.id) {
    case 'HLP-VIS-001':
      content = <DailyVsMaximum model={model} />;
      break;
    case 'HLP-VIS-002':
      content = <EodTimeline model={model} />;
      break;
    case 'HLP-VIS-003':
      content = <DailySoftLock model={model} />;
      break;
    case 'HLP-VIS-004':
      content = <BestDay model={model} />;
      break;
    case 'HLP-VIS-005':
      content = <ShortDuration model={model} />;
      break;
    case 'HLP-VIS-006':
      content = <GoalReached />;
      break;
    case 'HLP-VIS-008':
      content = <ProgrammeJourney model={model} />;
      break;
    case 'HLP-VIS-009':
      content = <BufferStack model={model} />;
      break;
    case 'HLP-VIS-010':
      content = <PerformanceDays model={model} />;
      break;
    case 'HLP-VIS-011':
      content = <PayoutEligibility />;
      break;
    case 'HLP-VIS-012':
      content = <PayoutWaterfall model={model} />;
      break;
    case 'HLP-VIS-013':
      content = <PayoutCycles model={model} />;
      break;
    case 'HLP-VIS-014':
      content = <PayoutStatus />;
      break;
    case 'HLP-VIS-015':
      content = <OrderRefusal />;
      break;
    case 'HLP-VIS-016':
      content = <SupportStatuses />;
      break;
    case 'HLP-VIS-017':
      content = <AccountStates />;
      break;
    case 'HLP-VIS-018':
      content = <GoalVsValidated />;
      break;
    case 'HLP-VIS-019':
      content = <PolicyVersions model={model} />;
      break;
  }

  return (
    <VisualFrame
      id={model.id}
      title={model.title}
      summary={model.summary}
      textEquivalent={model.textEquivalent}
    >
      {content}
    </VisualFrame>
  );
}
