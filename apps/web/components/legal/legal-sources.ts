/**
 * The Legal Center's source registry.
 *
 * Every entry here is a citation the owner supplied directly in this
 * conversation, from their own regional/national legal research — nothing
 * below is this codebase inventing a law, a date, or a URL. Where the owner
 * gave a working official link, it is reproduced verbatim. Where they did
 * not, `url` is left undefined rather than guessed — a wrong law citation is
 * bad; a broken or fabricated government link is worse, because it reads as
 * verified when it isn't. Pages render sourceless entries as plain citations
 * (institution / text / date), never as dead links.
 *
 * Two entries carry an explicit `unconfirmed` note: Togo's 2026 AML/CFT law
 * and its current consumer-protection statute. The owner was explicit that
 * the promulgation reference must be confirmed at the Journal officiel
 * before public display — so the LBC/KYC and country-availability pages cite
 * "loi togolaise LBC/FT/FP (2026, référence à confirmer)" rather than a
 * specific number.
 */

export interface LegalSourceRef {
  id: string;
  institution: string;
  text: string;
  country?: string;
  date: string;
  url?: string;
  /** Set when the citation itself is provisional — shown as a visible caveat, never silently dropped. */
  unconfirmed?: boolean;
}

export const REGIONAL_SOURCES: readonly LegalSourceRef[] = [
  {
    id: 'amf-umoa-reglement',
    institution: 'AMF-UMOA',
    text: 'Règlement général du marché financier régional — activités réservées aux intervenants agréés (intermédiation, gestion sous mandat, conseil en investissement)',
    date: 'en vigueur',
    url: 'https://www.amf-umoa.org/accueil/intervenant',
  },
  {
    id: 'bceao-instruction-paiement',
    institution: 'BCEAO',
    text: 'Instruction n°001-01-2024 du 23 janvier 2024 relative aux services de paiement dans l’UMOA',
    date: '23 janvier 2024',
    url: 'https://www.bceao.int/fr/reglementations/instruction-ndeg001-01-2024-du-23-janvier-2024-relative-aux-services-de-paiement',
  },
  {
    id: 'uemoa-relations-financieres',
    institution: 'UEMOA',
    text: 'Règlement n°06/2024/CM/UEMOA relatif aux relations financières extérieures des États membres',
    date: '2024',
  },
  {
    id: 'uemoa-directive-consommateur',
    institution: 'UEMOA',
    text: 'Directive n°01/2023/CM/UEMOA relative à la protection du consommateur au sein de l’UEMOA',
    date: '2023',
    url: 'https://cepici.gouv.ci/public/frontend/assets/document/reglementation/Directive_CM.UEMOA_Protection.pdf',
  },
  {
    id: 'umoa-loi-lbc',
    institution: 'UMOA',
    text: 'Loi uniforme relative à la lutte contre le blanchiment de capitaux, le financement du terrorisme et de la prolifération des armes de destruction massive',
    date: '31 mars 2023',
    url: 'https://www.bceao.int/index.php/fr/reglementations/loi-uniforme-relative-la-lutte-contre-le-blanchiment-de-capitaux-le-financement-du',
  },
  {
    id: 'umoa-decision-seuils',
    institution: 'UMOA',
    text: 'Décision n°021/CM/UMOA fixant les seuils de mise en œuvre de la loi uniforme LBC/FT/FP',
    date: '21 décembre 2023',
  },
  {
    id: 'ohada-societes',
    institution: 'OHADA',
    text: 'Acte uniforme relatif au droit des sociétés commerciales et du groupement d’intérêt économique',
    date: 'en vigueur',
  },
] as const;

export interface CountryLegalSources {
  country: string;
  authority: string;
  digitalTransactions: LegalSourceRef;
  personalData: LegalSourceRef;
  consumer: LegalSourceRef;
  aml: LegalSourceRef;
}

export const COUNTRY_SOURCES: readonly CountryLegalSources[] = [
  {
    country: 'Côte d’Ivoire',
    authority: 'ARTCI',
    digitalTransactions: {
      id: 'ci-transactions',
      institution: 'Côte d’Ivoire',
      text: 'Loi n°2013-546 du 30 juillet 2013 relative aux transactions électroniques',
      date: '30 juillet 2013',
    },
    personalData: {
      id: 'ci-donnees',
      institution: 'ARTCI',
      text: 'Loi n°2013-450 du 19 juin 2013 relative à la protection des données à caractère personnel',
      date: '19 juin 2013',
    },
    consumer: {
      id: 'ci-consommation',
      institution: 'Côte d’Ivoire',
      text: 'Loi n°2016-412 du 15 juin 2016 relative à la consommation',
      date: '15 juin 2016',
    },
    aml: {
      id: 'ci-lbc',
      institution: 'Côte d’Ivoire',
      text: 'Ordonnance n°2023-875 du 23 novembre 2023 relative à la LBC/FT/FP',
      date: '23 novembre 2023',
    },
  },
  {
    country: 'Bénin',
    authority: 'APDP',
    digitalTransactions: {
      id: 'bj-numerique',
      institution: 'Bénin',
      text: 'Loi n°2017-20 du 20 avril 2018 portant Code du numérique, modifiée par la loi n°2020-35 du 6 janvier 2021',
      date: '2018 / 2021',
    },
    personalData: {
      id: 'bj-donnees',
      institution: 'APDP',
      text: 'Code du numérique — protection des données à caractère personnel',
      date: '2018 / 2021',
    },
    consumer: {
      id: 'bj-consommateur',
      institution: 'Bénin',
      text: 'Loi n°2007-21 portant protection du consommateur',
      date: '2007',
    },
    aml: {
      id: 'bj-lbc',
      institution: 'Bénin',
      text: 'Loi n°2024-01 du 20 février 2024 relative à la LBC/FT/FP',
      date: '20 février 2024',
    },
  },
  {
    country: 'Togo',
    authority: 'IPDCP',
    digitalTransactions: {
      id: 'tg-transactions',
      institution: 'Togo',
      text: 'Loi n°2017-007 du 22 juin 2017 relative aux transactions électroniques, précisée par le décret n°2018-062/PR',
      date: '2017 / 2018',
    },
    personalData: {
      id: 'tg-donnees',
      institution: 'IPDCP',
      text: 'Loi n°2019-014 du 29 octobre 2019 relative à la protection des données à caractère personnel',
      date: '29 octobre 2019',
    },
    consumer: {
      id: 'tg-consommateur',
      institution: 'Togo',
      text: 'Cadre historique issu de la loi n°99-011 du 28 décembre 1999 ; un texte concurrence/consommation plus récent est en cours de vérification',
      date: '1999, en cours de mise à jour',
      unconfirmed: true,
    },
    aml: {
      id: 'tg-lbc',
      institution: 'Togo',
      text: 'Loi togolaise LBC/FT/FP adoptée par le Parlement en février 2026 — référence de promulgation à confirmer au Journal officiel',
      date: 'février 2026, référence à confirmer',
      url: 'https://finances.gouv.tg/loi-contre-le-blanchiment-de-capitaux-et-le-financement-du-terrorisme-un-pas-vers-la-stabilite-economique/',
      unconfirmed: true,
    },
  },
  {
    country: 'Mali',
    authority: 'APDP Mali',
    digitalTransactions: {
      id: 'ml-transactions',
      institution: 'Mali',
      text: 'Loi n°2016-012 du 6 mai 2016 relative aux transactions, échanges et services électroniques',
      date: '6 mai 2016',
    },
    personalData: {
      id: 'ml-donnees',
      institution: 'APDP Mali',
      text: 'Loi n°2013-015 du 21 mai 2013 relative à la protection des données à caractère personnel, telle que modifiée',
      date: '21 mai 2013',
    },
    consumer: {
      id: 'ml-consommateur',
      institution: 'Mali',
      text: 'Loi n°2015-036 du 16 juillet 2015 portant protection du consommateur, mise en œuvre par le décret n°2016-0482/P-RM',
      date: '2015 / 2016',
    },
    aml: {
      id: 'ml-lbc',
      institution: 'Mali',
      text: 'Ordonnance n°2024-011/PT-RM du 30 août 2024',
      date: '30 août 2024',
    },
  },
  {
    country: 'Burkina Faso',
    authority: 'CIL',
    digitalTransactions: {
      id: 'bf-transactions',
      institution: 'Burkina Faso',
      text: 'Loi n°045-2009/AN relative aux services et transactions électroniques',
      date: '2009',
    },
    personalData: {
      id: 'bf-donnees',
      institution: 'CIL',
      text: 'Loi n°001-2021/AN du 30 mars 2021 relative à la protection des données à caractère personnel',
      date: '30 mars 2021',
    },
    consumer: {
      id: 'bf-consommateur',
      institution: 'Burkina Faso',
      text: 'Loi n°016-2017/AN portant organisation de la concurrence, avec dispositions relatives à la protection du consommateur',
      date: '2017',
    },
    aml: {
      id: 'bf-lbc',
      institution: 'Burkina Faso',
      text: 'Loi n°046-2024/ALT du 30 décembre 2024',
      date: '30 décembre 2024',
    },
  },
  {
    country: 'Sénégal',
    authority: 'CDP',
    digitalTransactions: {
      id: 'sn-transactions',
      institution: 'Sénégal',
      text: 'Loi n°2008-08 du 25 janvier 2008 sur les transactions électroniques',
      date: '25 janvier 2008',
    },
    personalData: {
      id: 'sn-donnees',
      institution: 'CDP',
      text: 'Loi n°2008-12 du 25 janvier 2008 relative à la protection des données à caractère personnel',
      date: '25 janvier 2008',
    },
    consumer: {
      id: 'sn-consommateur',
      institution: 'Sénégal',
      text: 'Loi n°2021-25 du 12 avril 2021 relative aux prix et à la protection du consommateur',
      date: '12 avril 2021',
    },
    aml: {
      id: 'sn-lbc',
      institution: 'Sénégal',
      text: 'Loi n°2024-08 du 14 février 2024 relative à la LBC/FT/FP',
      date: '14 février 2024',
    },
  },
] as const;

/** Flat list of every national AML/CFT/CPF source, for the LBC/KYC page. */
export const AML_SOURCES: readonly LegalSourceRef[] = COUNTRY_SOURCES.map((c) => c.aml);

/** Flat list of every national privacy source, for the Confidentialité page. */
export const PRIVACY_SOURCES: readonly LegalSourceRef[] = COUNTRY_SOURCES.map(
  (c) => c.personalData,
);
