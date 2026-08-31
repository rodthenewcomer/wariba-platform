/**
 * The merchant / PSP boundary — one canonical wording, reused across the
 * Legal Center rather than paraphrased per page (§18 of the payment
 * architecture brief: "Do not repeat identical paragraphs everywhere. Use
 * one canonical legal content source where appropriate.").
 *
 * The distinction this file exists to preserve, everywhere it appears:
 * Lagoon Technologies is the merchant operating WARIBA. It is not a
 * payment institution, an e-money issuer, or a wallet provider. Payment and
 * payout execution belongs to third-party PSPs. A user's paid price and
 * their account's simulated nominal size have no patrimonial link — paying
 * 25 000 FCFA for a 100K nominal account does not mean Lagoon received or
 * holds 100 000 USD.
 */

export const MERCHANT_BOUNDARY_STATEMENT =
  'Lagoon Technologies exploite WARIBA, un service numérique de simulation et d’évaluation de trading. Lagoon Technologies n’exploite pas de compte de paiement ni de portefeuille électronique pour ses utilisateurs. Les opérations d’encaissement et de payout sont exécutées par des prestataires de services de paiement tiers appropriés.';

export const PAYIN_CLAUSE =
  'Lorsqu’un utilisateur achète un service WARIBA, le paiement est traité par un prestataire de services de paiement tiers. Après traitement, les fonds correspondants sont crédités au compte marchand de Lagoon Technologies et deviennent des fonds de l’entreprise, sous réserve des frais, remboursements, contestations et obligations applicables. Les sommes versées ne constituent pas un dépôt bancaire, un investissement ou un capital confié à WARIBA pour être placé sur les marchés.';

export const PAYOUT_FUNDING_CLAUSE =
  'Lorsqu’une demande de payout satisfait aux conditions applicables et aux vérifications requises, Lagoon Technologies autorise le paiement correspondant et le finance à partir de ses propres ressources d’entreprise. Le versement est ensuite exécuté par un prestataire de paiement tiers vers le bénéficiaire vérifié. Un payout WARIBA ne constitue pas le retrait d’un capital réel détenu dans un compte de trading client.';

export const NOMINAL_SIZE_SEPARATION_STATEMENT =
  'Le prix payé pour un programme WARIBA et la taille nominale simulée affichée sur le compte n’ont aucun lien patrimonial. Payer un prix donné pour un compte affichant une taille nominale de 100 000 USD ne signifie pas que Lagoon Technologies a reçu ou détient 100 000 USD.';
