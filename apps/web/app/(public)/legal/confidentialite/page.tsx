import Link from 'next/link';

export default function PrivacyPage() {
  return (
    <article className="mx-auto max-w-[var(--wariba-size-content-editorial-max)] px-4 py-16 sm:px-6 lg:py-24">
      <p className="text-[length:var(--wariba-font-size-label-sm)] font-semibold uppercase tracking-[var(--wariba-letter-spacing-wide)] text-[color:var(--wariba-color-copper-300)]">
        Brouillon bêta · validation juridique locale requise
      </p>
      <h1 className="mt-4 text-[length:var(--wariba-font-size-display-md)] font-semibold leading-[var(--wariba-line-height-display-md)] text-[color:var(--wariba-color-bone-50)]">
        Confidentialité
      </h1>
      <p className="mt-5 text-[color:var(--wariba-color-ink-200)]">
        Ce résumé opérationnel doit être complété par les durées de conservation, bases légales,
        sous-traitants et mécanismes d’exercice des droits validés pour chaque juridiction de
        lancement.
      </p>
      <div className="mt-10 grid gap-9 text-[color:var(--wariba-color-ink-200)]">
        <section>
          <h2 className="text-[length:var(--wariba-font-size-heading-md)] font-semibold text-[color:var(--wariba-color-bone-50)]">
            Données collectées
          </h2>
          <p className="mt-3">
            Identité de compte, consentements, commandes, données d’exécution, preuves de risque,
            événements de sécurité et demandes de support nécessaires au service.
          </p>
        </section>
        <section>
          <h2 className="text-[length:var(--wariba-font-size-heading-md)] font-semibold text-[color:var(--wariba-color-bone-50)]">
            Pourquoi elles sont utilisées
          </h2>
          <p className="mt-3">
            Fournir le compte, appliquer la policy, prévenir la fraude, répondre aux disputes,
            sécuriser la plateforme et respecter les obligations applicables. WARIBA ne doit pas
            inventer un usage commercial absent de ce cadre.
          </p>
        </section>
        <section>
          <h2 className="text-[length:var(--wariba-font-size-heading-md)] font-semibold text-[color:var(--wariba-color-bone-50)]">
            Sécurité et accès
          </h2>
          <p className="mt-3">
            L’accès est refusé par défaut. Les tables privées sont protégées par RLS, les écritures
            financières restent server-authoritative et les actions sensibles sont auditées.
          </p>
        </section>
        <section>
          <h2 className="text-[length:var(--wariba-font-size-heading-md)] font-semibold text-[color:var(--wariba-color-bone-50)]">
            Vos demandes
          </h2>
          <p className="mt-3">
            Une procédure authentifiée doit permettre l’accès, la rectification ou les autres droits
            applicables sans supprimer les preuves que WARIBA doit légalement ou contractuellement
            conserver.
          </p>
        </section>
      </div>
      <Link
        href="/support"
        className="mt-12 inline-block font-semibold text-[color:var(--wariba-color-cobalt-300)]"
      >
        Demander de l’aide
      </Link>
    </article>
  );
}
