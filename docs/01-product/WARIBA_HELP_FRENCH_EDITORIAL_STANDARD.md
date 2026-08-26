---
title: 'WARIBA — Standard éditorial français'
version: '1.0'
document_id: 'WARIBA-HELP-FRENCH-EDITORIAL-STANDARD'
status: 'ACTIVE — s’applique à toute copie visible par un client'
language: 'fr-FR'
brand: 'WARIBA'
owner: 'WARIBA Product'
last_updated: '2026-08-24'
---

# WARIBA — Standard éditorial français

> **Écrivez pour le trader, pas pour l’implémentation.**

Ce document s’applique à toute phrase qu’un client peut lire : Centre d’aide,
Support, contestations, Hub, WariX, site public, e-mails, messages d’erreur et
états vides. Il ne s’applique pas aux commentaires de code, aux journaux
techniques ni à la documentation interne — trois endroits où le vocabulaire
d’implémentation est exactement ce qu’il faut.

Il est né d’un constat : le Centre d’aide était techniquement juste et
humainement illisible. Cent trente-sept expressions d’ingénierie s’étaient
glissées dans le corpus public — « policy », « côté serveur », « autoritatif »,
« source de vérité », « instantané », « ajout seul ». Chacune était exacte.
Aucune n’aidait quelqu’un à comprendre pourquoi son compte venait de s’arrêter.

---

## 1. Les cinq questions

Toute phrase publique doit passer ces cinq questions.

1. **Un trader francophone normal la comprend-il à la première lecture ?**
2. **Un francophone dirait-il cela ainsi ?**
3. **Cette phrase aide-t-elle le lecteur à comprendre ou à décider ?**
4. **Expose-t-elle un détail d’implémentation qui devrait rester interne ?**
5. **Peut-on le dire plus simplement sans perdre en précision financière ?**

La cinquième compte autant que les autres. Simplifier n’autorise pas à
approximer une règle financière : une phrase plus courte qui dit une chose
légèrement fausse est pire que la phrase longue qu’elle remplace.

---

## 2. Le ton

| On vise | On évite |
|---|---|
| Clair, direct, calme | Le jargon et la tournure administrative |
| Premium, confiant, précis | Le français littéraire ou l’effet de style |
| Conversationnel sans être puéril | L’argot, les emojis, le tutoiement |
| Lisible sur un téléphone | Les phrases de quatre lignes |
| Compréhensible à Abidjan, Dakar, Douala et Paris | Le français traduit de l’anglais mot à mot |

Le marché initial est l’Afrique francophone (`BRAND-007` `LOCKED`) et la
direction de marque est **Quiet Financial Authority** (`BRAND-009` `LOCKED`).
Une phrase qui crie, qui promet ou qui s’excuse trahit les deux.

---

## 3. Ce qui reste interne

Ces mots décrivent comment WARIBA est construit. Ils ne décrivent pas ce que le
trader vit, et ils n’ont rien à faire dans une phrase publique.

```text
policy · policy publiée · published_account_policy · domain code
serveur · côté serveur · moteur · autoritatif · source de vérité
state machine · machine d'états · reason code · enum · schéma
RLS · RBAC · append-only · ajout seul · idempotence · webhook
instantané · snapshot · projection · ledger · fill · correlation ID
sandbox · frontend · backend · UI · endpoint · commande serveur
workflow · implémenté · catalogue publié · tradable
```

### La traduction, terme par terme

| Interne | Public |
|---|---|
| la policy attachée au compte | les règles attachées à votre compte |
| Policy WARIBA ONE 1.1.1 | Règles WARIBA ONE — version 1.1.1 |
| Source de vérité : domain code · policy publiée | *(retiré — voir §5)* |
| le serveur décide / valide / fournit | WARIBA décide / vérifie / indique |
| côté serveur | chez WARIBA, ou rien du tout |
| le moteur retourne les permissions exactes | WARIBA vous indique si vous pouvez reprendre |
| données autoritatives | l’état réel de votre compte |
| données fraîches | l’état réel de votre compte |
| un instantané autoritatif est récupéré | WariX redemande l’état réel de votre compte |
| le fil est en ajout seul | rien ne peut être effacé du fil |
| un webhook répété | un paiement confirmé deux fois |
| logique d’idempotence | vous ne risquez pas d’être payé deux fois |
| ne modifie pas le ledger | ne change pas votre solde |
| ne crée pas de fill | n’est pas exécuté |
| compte non tradable | compte sur lequel vous ne pouvez pas trader |
| code de raison / code stable | le motif affiché |
| correlation ID | la référence technique affichée avec l’erreur |
| hold d’intégrité | blocage éventuel sur le compte |
| EOD trailing | plancher glissant *(« EOD » expliqué une fois — §6)* |

---

## 4. Le vocabulaire trader qui reste

Ne traduisez pas ce qu’un trader francophone dit déjà en anglais. Traduire
« Stop Loss » en « ordre d’arrêt des pertes » ne rend service à personne.

**Conservés tels quels :** Buy · Sell · Stop Loss · Take Profit · Buy Limit ·
Sell Limit · Buy Stop · Sell Stop · WariX · WARIBA ONE · WARIBA Performance ·
equity · spread · slippage · swap.

**« payout »** reste, parce que WARIBA l’a déjà établi. Mais le sens doit être
évident au premier contact : écrivez *« payout (retrait) »* la première fois
qu’un parcours l’introduit, puis *« payout »* ensuite.

**« equity »** reste, à condition d’être explicité là où il porte une décision :
*« votre equity — solde plus positions ouvertes »*.

**Interdits sans autorisation explicite d’une source WARIBA :** « compte
financé », « capital financé », « funded account ». WARIBA V1 est simulé
(`BRAND-005`, `PROD-003` `LOCKED`).

---

## 5. La provenance ne se montre pas

Ne jamais afficher au client : fichier source, module, table de base de
données, identifiant de code, nom interne d’un code de raison, migration,
chemin d’un moteur.

La traçabilité vit dans le code et dans le journal d’audit. Ce qu’un client
peut légitimement voir, parce que cela l’aide :

```text
la règle qui s’applique · la version des règles · le seuil
la valeur atteinte · l’heure · la décision · le compte concerné
```

C’est pourquoi « Source de vérité : domain code · policy publiée 1.1.1 » est
devenu « Règles en vigueur — version 1.1.1. Les règles attachées à votre compte
font toujours foi. » La première phrase parlait de l’architecture. La seconde
répond à la seule question que le lecteur se posait.

---

## 6. Les acronymes

Un acronyme non expliqué est un mur. Chacun s’explique **une fois**, dans
l’article qui l’introduit, puis s’utilise librement.

| Acronyme | À expliquer ainsi, une fois |
|---|---|
| EOD | « EOD veut dire fin de journée. » |
| KYC | « la vérification de votre identité » |
| DLL / MLL | ne jamais afficher — ce sont des alias de recherche, pas des mots publics |
| P&L | « vos gains et vos pertes » |
| UTC | « la journée WARIBA change à heure fixe, la même pour tous les comptes » |

`DLL` et `MLL` méritent une note : ce sont des mots que les traders **tapent**,
pas des mots qu’ils veulent **lire**. Ils appartiennent aux alias de recherche
(§8), jamais à un titre ou à un paragraphe.

---

## 7. Les règles de risque : trois familles à ne jamais confondre

C’est le point où une maladresse de langue devient une erreur financière.

| Règle | Nature | Formulation publique |
|---|---|---|
| **Perte quotidienne** | Blocage temporaire | « Atteinte, elle suspend vos nouvelles positions jusqu’au lendemain. Votre compte n’est pas perdu. » |
| **Perte maximale** | Fin du compte | « Un plancher qui protège votre compte sur toute sa durée. Le franchir met fin au compte. » |
| **Règle du Meilleur Jour** | Condition de réussite | « Un dépassement ne fait jamais perdre le compte. Vous continuez jusqu’à ce que la répartition passe. » |

Trois interdits absolus :

- ne jamais écrire « perte maximale journalière » — cela n’existe pas ;
- ne jamais présenter la règle du Meilleur Jour comme un échec de compte ;
- ne jamais laisser entendre qu’un compte terminé peut être rouvert.

Sur le dernier point : une contestation ouvre un examen, elle ne réécrit pas
l’historique du compte (`UX-SUPPORT-002` `LOCKED`). Le dire à demi-mot serait
pire que ne rien dire.

---

## 8. Les valeurs chiffrées ne s’écrivent pas

Aucune valeur de règle vivante n’est tapée dans une phrase. Les articles
interpolent `{{fact:…}}` ou portent un bloc `ruleTable` ; les deux lisent les
règles réellement appliquées au compte (`UX-HELP-002` `LOCKED`).

Un exemple pédagogique **peut** porter des chiffres. C’est la seule exception,
et il doit être visiblement présenté comme un exemple.

Un test parcourt le corpus publié et refuse tout `%` hors d’un bloc lié aux
règles. Une réécriture humaine n’est pas une autorisation à figer un taux.

---

## 9. La forme d’un article

Un article d’aide ressemble à ceci, pas à une fiche de base de données :

```text
TITRE            une question qu’un trader poserait vraiment
RÉPONSE DIRECTE  1 à 3 phrases qui répondent tout de suite
EXPLICATION      seulement ce dont le lecteur a besoin
EXEMPLE          quand un chiffre aide à comprendre
À RETENIR        une conclusion, quand elle apporte quelque chose
À LIRE ENSUITE   les questions suivantes naturelles
```

Les cartes ne sont pas interdites. La **soupe de cartes** l’est : six encadrés
« Ce que ça signifie » sur un même écran, c’est un gabarit appliqué
mécaniquement, pas une explication.

Vérifiez aussi que deux titres de section identiques n’apparaissent jamais sur
un même écran.

---

## 10. Les titres

Un titre est une question, pas un intitulé de spécification.

| Non | Oui |
|---|---|
| Données de marché : à jour, obsolètes, hors ligne | Pourquoi WARIBA refuse-t-il d’ouvrir une position « prix trop ancien » ? |
| Instruments, tailles et exposition maximale | Quels instruments puis-je trader, et jusqu’à quelle taille ? |
| Comment lire la preuve d’un breach ? | Comment comprendre pourquoi mon compte a été terminé ? |
| Connexion et session expirée | Que faire si ma session a expiré ? |

Deux exceptions légitimes : un article épinglé peut porter une affirmation
(« Les règles essentielles avant votre premier trade »), et un article de
dépannage peut porter les mots du trader lui-même (« Mon paiement a échoué »).

---

## 11. Les statuts

Un mot de statut dit **où en est** un dossier. Il ne dit pas **à qui de
jouer**. Les deux sont nécessaires, et la seconde phrase s’écrit à la première
personne du pluriel : une demande de support est une conversation entre deux
personnes, pas un état système décrit à la troisième personne.

```text
Ouverte            « Nous avons bien reçu votre demande. »
En attente         « Nous avons besoin d’une précision de votre part. »
En cours d’examen  « L’équipe WARIBA analyse votre demande. »
Résolue            « Une réponse vous a été apportée. »
Clôturée           « Cette demande est terminée. »
```

Les valeurs de base de données ne changent pas. Seuls les libellés changent.

---

## 12. Ce qui ne se promet pas

Aucun texte public ne promet un délai, un montant, un moyen de paiement ou un
compte réel qui n’existe pas encore.

- **Aucun délai** de support, de KYC ou de payout tant qu’il n’est pas mesuré
  (`OPS-012` `OPEN`).
- **Aucun rail de paiement** nommé avant confirmation du prestataire.
- **Aucun compte réel** promis à l’issue du parcours (`BRAND-006` `LOCKED`).
- **Aucune règle** que les règles publiées ne portent pas. Si la policy ne fixe
  pas de délai d’inactivité, l’aide n’en invente pas.

Un article dont la décision est encore ouverte est **rédigé et retenu**, pas
publié avec une approximation (`UX-HELP-003` `LOCKED`).

---

## 13. Le contrôle automatique

`apps/web/tests/help-editorial.test.ts` vérifie ce qui peut l’être sans
jugement : les termes internes du §3, les acronymes non expliqués, les titres
qui ne sont pas des questions, les gabarits répétés.

Ce que le test **ne fait pas**, délibérément : bannir les mots anglais. Buy,
Sell, Stop Loss, Take Profit, WariX et payout sont du vocabulaire trader
légitime, et une expression régulière qui les refuserait ferait plus de mal que
la faute qu’elle cherche.

Le reste — le naturel d’une phrase, la justesse d’un exemple — se relit à
l’œil. Un test n’a jamais su dire si une phrase sonne français.

---

## 14. Le nom d’une règle vieillit mal

Une règle change de définition, son nom reste. C’est la faute la plus coûteuse
du corpus, parce qu’elle ne ressemble pas à une faute : le mot est français, la
phrase est claire, et elle décrit une règle qui n’existe plus.

Deux cas trouvés pendant cette relecture, tous deux hors du centre d’aide :

- **« Consistance »** est le nom v1.0 de la règle que la policy v1.1 appelle
  **Meilleur Jour**. Le dénominateur a changé avec elle — `computeBestDayRatio`
  le note explicitement — mais l’étiquette est restée sur le Hub, sur la carte
  de compte et dans le centre de payout.
- **« Profit total »** légendait, sous le Hub, la somme des **journées
  gagnantes**. Un trader ayant des journées perdantes qui refaisait le calcul
  chez lui trouvait un autre chiffre que celui affiché.

La règle qui en sort : **le centre d’aide fixe le vocabulaire, l’écran le
suit.** Un trader qui lit « Meilleur Jour » dans l’aide doit lire « Meilleur
Jour » sur l’écran que l’article décrit. Quand les deux divergent, c’est
l’écran qui a tort, jamais le lecteur.

Corollaire pour les valeurs : un commentaire de composant qui cite un chiffre
de règle vieillit exactement comme le texte visible. `ConsistencyMeter` portait
« the 40% limit » au-dessus d’un composant qui recevait déjà sa limite en
propriété depuis la policy.

---

## 15. Ce qui a été signalé sans être corrigé

Trois surfaces affichent encore du vocabulaire interne. Aucune n’appartient au
centre d’aide, et chacune est hors du périmètre autorisé de cette phase.

| Surface | Ce qui s’affiche | Pourquoi c’est resté |
| --- | --- | --- |
| `hub/RiskPanel.tsx`, `ui/wariba/RiskRibbon.tsx`, `ui/wariba/Guardian.tsx`, `trade/workstation/dock/AccountPanel.tsx` | « DLL restante », « DLL restant » | `RiskRibbon` et `Guardian` sont rendus par WariX autant que par le Hub. Renommer l’étiquette change WariX. |
| `trade/PartialCloseSheet.tsx` | « votre consistance » | WariX. |
| `trade/error.tsx`, `trade/trade-copy.ts` | « le serveur », « côté serveur » | WariX. |

La même limite dit quatre noms différents selon l’écran — « DLL restante »,
« Risque jour restant », « Perte quotidienne restante », « DLL restant ». Le
centre d’aide en fixe un seul : **perte quotidienne**. Unifier demande de
toucher WariX, et une correction partielle ferait cinq noms au lieu de quatre.
