import Link from 'next/link';

export default function TermsPage() {
  return (
    <article className="mx-auto max-w-[var(--wariba-size-content-editorial-max)] px-4 py-16 sm:px-6 lg:py-24">
      <p className="text-[length:var(--wariba-font-size-label-sm)] font-semibold uppercase tracking-[var(--wariba-letter-spacing-wide)] text-[color:var(--wariba-color-copper-300)]">
        Brouillon bêta · validation juridique locale requise
      </p>
      <h1 className="mt-4 text-[length:var(--wariba-font-size-display-md)] font-semibold leading-[var(--wariba-line-height-display-md)] text-[color:var(--wariba-color-bone-50)]">
        Conditions d’utilisation WARIBA
      </h1>
      <p className="mt-5 text-[color:var(--wariba-color-ink-200)]">
        Ce texte décrit le cadre opérationnel de la bêta privée. Il ne doit pas être présenté comme
        un document juridique définitif avant revue par un conseil compétent dans les pays visés.
      </p>
      <div className="mt-10 grid gap-9 text-[color:var(--wariba-color-ink-200)]">
        <section>
          <h2 className="text-[length:var(--wariba-font-size-heading-md)] font-semibold text-[color:var(--wariba-color-bone-50)]">
            1. Nature du service
          </h2>
          <p className="mt-3">
            WARIBA fournit un environnement de trading simulé et un parcours d’évaluation. Il ne
            fournit pas de compte de courtage, ne reçoit pas de dépôt de trading et ne garantit
            aucun capital réel.
          </p>
        </section>
        <section>
          <h2 className="text-[length:var(--wariba-font-size-heading-md)] font-semibold text-[color:var(--wariba-color-bone-50)]">
            2. Policy attachée
          </h2>
          <p className="mt-3">
            Avant checkout, l’utilisateur accepte une version identifiable des règles et du
            disclosure simulé. Cette version reste attachée au compte et n’est pas remplacée
            rétroactivement.
          </p>
        </section>
        <section>
          <h2 className="text-[length:var(--wariba-font-size-heading-md)] font-semibold text-[color:var(--wariba-color-bone-50)]">
            3. Prix et règlement
          </h2>
          <p className="mt-3">
            Le prix contractuel et le montant final sont exprimés en FCFA/XOF. Un équivalent USD
            éventuel est informatif. Les prix candidats peuvent changer avant le lancement public,
            mais jamais après confirmation d’une commande.
          </p>
        </section>
        <section>
          <h2 className="text-[length:var(--wariba-font-size-heading-md)] font-semibold text-[color:var(--wariba-color-bone-50)]">
            4. Usage loyal
          </h2>
          <p className="mt-3">
            La fraude, l’accès non autorisé, la manipulation du sandbox, le partage de compte et la
            tentative de contourner les limites peuvent entraîner un gel, une revue ou une fermeture
            selon la policy et les preuves auditées.
          </p>
        </section>
        <section>
          <h2 className="text-[length:var(--wariba-font-size-heading-md)] font-semibold text-[color:var(--wariba-color-bone-50)]">
            5. Réclamations
          </h2>
          <p className="mt-3">
            Une réclamation liée à un ordre, un fill ou une règle doit être rattachée au compte
            concerné. WARIBA conserve les séquences, snapshots et événements nécessaires à l’examen
            du dossier.
          </p>
        </section>
      </div>
      <Link
        href="/support"
        className="mt-12 inline-block font-semibold text-[color:var(--wariba-color-cobalt-300)]"
      >
        Accéder au support
      </Link>
    </article>
  );
}
