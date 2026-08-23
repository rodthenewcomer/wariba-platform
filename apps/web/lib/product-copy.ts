/**
 * WARIBA Product OS — the product's own words, in one place.
 *
 * V1 speaks French. That is a product decision, not a formatting one: a trader
 * reading "Invalid credentials" or "Something went wrong" is being addressed by
 * an engineer, not by a platform, and the difference is the whole distance
 * between software that feels finished and software that feels assembled.
 *
 * Strings live here rather than inside components for three reasons that have
 * already cost this repository work. A wording decision becomes one edit
 * instead of a search across pages — the pending-order labels lived in five
 * files and had already drifted. Security-sensitive phrasing can be reviewed as
 * a set, which is how you notice that one error message leaks whether an
 * account exists while its neighbours do not. And when a second locale is
 * genuinely needed, the extraction is already done.
 *
 * Deliberately not a translation platform. Keys are flat and readable, values
 * are plain strings, and there is no runtime machinery — Phase 1 needs the
 * strings centralised, not an i18n framework nobody asked for.
 */

export const productCopy = {
  auth: {
    brand: {
      name: 'WARIBA',
      tagline: 'Plateforme de trading simulé',
      /** Shown beside the form on desktop. States what the platform is, without selling. */
      promise: 'Un capital simulé, des règles claires, une exécution mesurée.',
      /**
       * Three facts about how the platform works, under the statement.
       *
       * Every one of them is verifiable from the product itself: the accounts
       * are simulated, the rulebook is published and versioned, the risk
       * engine is authoritative. Deliberately not statistics, payout totals or
       * testimonials — the three things this category puts here and the three
       * things WARIBA cannot substantiate on a login screen.
       */
      truths: ['Trading simulé', 'Règles publiées', 'Risque contrôlé'] as const,
    },

    login: {
      title: 'Bon retour',
      subtitle: 'Connectez-vous pour accéder à votre espace trader.',
      email: 'Adresse e-mail',
      password: 'Mot de passe',
      submit: 'Se connecter',
      submitting: 'Connexion…',
      forgot: 'Mot de passe oublié ?',
      noAccount: 'Pas encore de compte ?',
      createAccount: 'Créer un compte',
      /**
       * One message for a wrong address and a wrong password alike.
       *
       * Distinguishing them tells anyone with a list of e-mails which ones are
       * registered here, which is an account-enumeration leak dressed up as
       * helpfulness. The Security standard requires this; it is repeated in the
       * string itself so nobody "improves" it later.
       */
      invalidCredentials: 'Adresse e-mail ou mot de passe incorrect.',
      errorTitle: 'Connexion impossible',
      rateLimited: 'Trop de tentatives. Réessayez dans quelques instants.',
      serverError: 'Connexion impossible pour le moment. Réessayez dans quelques instants.',
    },

    signup: {
      title: 'Créer votre espace WARIBA',
      subtitle: 'Quelques informations suffisent pour commencer.',
      firstName: 'Prénom',
      lastName: 'Nom',
      email: 'Adresse e-mail',
      password: 'Mot de passe',
      submit: 'Créer mon compte',
      submitting: 'Création…',
      haveAccount: 'Vous avez déjà un compte ?',
      signIn: 'Se connecter',
      passwordHint: 'Au moins 12 caractères, dont une majuscule, un chiffre et un symbole.',
      country: 'Pays de résidence',
      countryPlaceholder: 'Sélectionnez votre pays',
      countryMissing: 'Sélectionnez votre pays de résidence.',
      /** Shown when only one country is offered, so the value is stated rather than hidden. */
      countrySingleNote: 'WARIBA est actuellement disponible dans ce pays.',
      errorTitle: 'Création impossible',
    },

    forgotPassword: {
      title: 'Mot de passe oublié ?',
      subtitle:
        'Entrez votre adresse e-mail. Si un compte correspond, nous vous enverrons les instructions de récupération.',
      email: 'Adresse e-mail',
      submit: 'Envoyer les instructions',
      submitting: 'Envoi…',
      /** Identical whether or not the address is registered. Same reason as the login error. */
      sentTitle: 'Vérifiez votre boîte mail',
      sentBody:
        'Si un compte correspond à cette adresse, les instructions de récupération viennent d’être envoyées.',
      backToLogin: 'Retour à la connexion',
      errorTitle: 'Envoi impossible',
    },

    resetPassword: {
      title: 'Choisir un nouveau mot de passe',
      subtitle: 'Ce lien n’est utilisable qu’une seule fois.',
      newPassword: 'Nouveau mot de passe',
      confirmPassword: 'Confirmer le mot de passe',
      submit: 'Enregistrer le nouveau mot de passe',
      submitting: 'Enregistrement…',
      mismatch: 'Les deux mots de passe ne correspondent pas.',
      successTitle: 'Mot de passe mis à jour',
      successBody: 'Vous pouvez maintenant vous connecter avec votre nouveau mot de passe.',
      signIn: 'Se connecter',
      invalidTitle: 'Ce lien n’est plus valide',
      invalidBody:
        'Le lien de récupération a expiré ou a déjà été utilisé. Demandez-en un nouveau.',
      requestNew: 'Demander un nouveau lien',
      errorTitle: 'Enregistrement impossible',
    },

    emailVerification: {
      title: 'Vérifiez votre adresse e-mail',
      /** Takes a masked address — never the full one. */
      sentBody: (maskedEmail: string) => `Nous avons envoyé un lien à ${maskedEmail}.`,
      waitingBody: 'Ouvrez le lien depuis cet appareil pour activer votre espace.',
      verifiedTitle: 'Adresse vérifiée',
      verifiedBody: 'Votre espace trader est prêt.',
      continue: 'Continuer',
      expiredTitle: 'Ce lien a expiré',
      expiredBody: 'Demandez un nouvel e-mail de vérification.',
      resend: 'Renvoyer l’e-mail',
      resending: 'Envoi…',
      /** Takes remaining seconds. Explicit, so nobody wonders whether the button is broken. */
      resendCooldown: (seconds: number) => `Nouvel envoi possible dans ${seconds} s`,
      resentBody: 'Un nouvel e-mail vient d’être envoyé.',
      signOut: 'Se déconnecter',
    },

    sessionExpired: {
      title: 'Votre session a expiré',
      /*
       * Says why before it says what to do. An expiry with no reason reads as
       * a fault; naming the protection turns the same event into the platform
       * doing its job.
       *
       * The requested wording opened with "Votre session a expiré", which is
       * already the title directly above it — so the clause is carried by the
       * pronoun instead of stuttered twice on one screen.
       */
      body: 'Elle a été fermée pour protéger votre compte. Reconnectez-vous pour continuer.',
      submit: 'Se reconnecter',
    },
  },

  system: {
    notFound: {
      title: 'Page introuvable',
      body: 'Cette page n’existe pas ou n’est plus disponible.',
      home: 'Retour au tableau de bord',
      back: 'Page précédente',
    },
    forbidden: {
      title: 'Accès non autorisé',
      /** Says nothing about what the resource is — that would be its own leak. */
      body: 'Vous n’avez pas accès à cette ressource.',
      home: 'Retour au tableau de bord',
      support: 'Contacter le support',
    },
    serverError: {
      title: 'Un problème est survenu',
      body: 'Nous n’avons pas pu charger cette page.',
      retry: 'Réessayer',
      home: 'Retour au tableau de bord',
      /** Takes a support reference when one exists. Never a stack trace. */
      reference: (id: string) => `Référence : ${id}`,
    },
    offline: {
      title: 'Connexion interrompue',
      body: 'Certaines fonctions sont temporairement indisponibles.',
      retrying: 'Reconnexion…',
      retry: 'Réessayer',
    },
    maintenance: {
      title: 'Maintenance en cours',
      /** No estimated completion time: inventing one is a promise nobody made. */
      body: 'La plateforme est momentanément indisponible.',
    },
  },

  hub: {
    title: 'Votre espace trader',

    /**
     * The Hub dashboard's own words.
     *
     * Only the strings this phase introduced live here. The pre-existing hub
     * prose stays where it is rather than being dragged through a rename that
     * would touch every read model — centralisation is worth doing when a
     * wording decision is at stake, not as a filing exercise.
     */
    dashboard: {
      /** The contextual action. WariX is a product you open, not a page you visit. */
      openWarix: 'Ouvrir WariX',
      objective: 'Objectif',
      /** Concise, and still the legally required statement (Rulebook §43.3). */
      simulated: 'Compte simulé',
      today: 'Aujourd’hui',
      maxLossRemaining: 'Perte maximale restante',
      pnlToday: 'P&L du jour',
      balance: 'Solde',
      evolution: 'Évolution du compte',
      /*
       * What an account with no finalised session says instead of a chart.
       *
       * A flat line between 9 999,95 and 10 000,05 is not a small chart, it is
       * a false one: it renders noise at a scale that makes an untouched
       * account look like it has a performance history. Absence stated plainly
       * is the truthful rendering.
       */
      noSessions: 'Aucune session terminée pour le moment.',
      /* One closed session is a point, not a line. Saying "aucune session"
         there would be false; saying nothing would leave the panel blank. */
      notEnoughHistory: 'Pas encore assez d’historique pour tracer une évolution.',
      noSessionsHint: 'La courbe apparaîtra dès qu’une première journée de trading sera clôturée.',
      details: 'Détails du compte',
      reference: 'Référence',
      activatedOn: 'Activé le',
      rules: 'Règles',
    },

    nav: {
      dashboard: 'Tableau de bord',
      /*
       * The phone tab bar gets one word.
       *
       * "Tableau de bord" is fifteen characters in a 64px-wide tab at 320px;
       * it truncates to "Tablea…", which is not a label, it is damage. "Hub"
       * is what the product already calls this place everywhere else.
       */
      dashboardShort: 'Hub',
      accounts: 'Comptes',
      trade: 'WariX',
      payouts: 'Payouts',
      more: 'Plus',
      collapse: 'Réduire la navigation',
      expand: 'Déployer la navigation',

      // Phase 2 — the complete information architecture.
      addAccount: 'Ajouter un compte',
      performance: 'Performance',
      journal: 'Journal',
      billing: 'Facturation',
      support: 'Support',
      settings: 'Paramètres',
      identityVerification: 'Vérification d’identité',

      /*
       * Group headings.
       *
       * Named for what a trader came to do, not for the systems behind them:
       * "Analyse" rather than "Analytics", "Finances" rather than "Billing &
       * Payouts". A heading that describes an internal boundary makes the
       * person read the org chart instead of the product.
       */
      groupInsights: 'Analyse',
      groupMoney: 'Finances',
      groupAccount: 'Compte',
    },
    user: {
      menu: 'Menu du compte',
      /** Fallback name when the profile carries neither a first nor a last name. */
      unnamed: 'Votre compte',
      profile: 'Profil',
      settings: 'Paramètres',
      signOut: 'Se déconnecter',
    },
  },
} as const;

/**
 * Masks an address for display: `rodrigue@example.com` → `ro***@example.com`.
 *
 * Enough for the recipient to recognise their own address, not enough for a
 * shoulder-surfer or a screenshot to carry it. Returns a neutral placeholder
 * rather than guessing when the input is not an address.
 */
export function maskEmail(email: string): string {
  const at = email.indexOf('@');
  if (at < 1) return 'votre adresse';
  const local = email.slice(0, at);
  const domain = email.slice(at);
  const visible = local.slice(0, Math.min(2, local.length));
  return `${visible}***${domain}`;
}
