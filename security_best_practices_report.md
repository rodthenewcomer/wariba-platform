# Audit des pratiques de sécurité — WARIBA

Date : 2026-08-03  
Périmètre : Next.js 15 / React 19 / TypeScript, routes HTTP, Server Actions,
webhook sandbox, Supabase/PostgreSQL et dépendances de production.

## Résumé exécutif

Aucun finding critique ou élevé ne reste ouvert. Trois écarts élevés/moyens ont été
corrigés pendant l’audit : CSRF sur deux mutations cookie-authenticated, destination
de webhook dérivée du Host, et redirect absolu dérivé du Host. Le scan de secrets,
Supabase Advisor, DB lint, RLS et `pnpm audit --prod` sont verts.

Deux hardenings non bloquants restent à planifier avant une exposition publique :
rate limiting/limites de payload et CSP à nonce couvrant `script-src`.

## Findings corrigés

### SEC-001 — NEXT-SSRF-001 / NEXT-HOST-001

- Severity: High
- Location: `apps/web/app/api/v1/checkout/sandbox-pay/route.ts:99`
- Evidence: l’ancienne destination du webhook était construite avec
  `new URL('/api/v1/webhooks/payments/sandbox', request.url)` après signature du payload.
- Impact: un Host non fiable pouvait diriger la requête serveur et sa signature vers
  une destination contrôlée par un attaquant.
- Fix: destination désormais construite depuis `config.APP_BASE_URL`, validée au
  démarrage, jamais depuis les headers de la requête.
- Mitigation: le provider sandbox reste fail-fast en production et le webhook vérifie
  HMAC, montant, devise, état et idempotence.
- False positive notes: même si l’hébergeur normalise généralement Host, l’application
  ne repose plus sur cette hypothèse d’infrastructure.
- Status: RESOLVED

### SEC-002 — NEXT-CSRF-001 / REACT-CSRF-001

- Severity: High
- Location: `apps/web/app/api/v1/orders/route.ts:32` et
  `apps/web/app/api/v1/checkout/sandbox-pay/route.ts:31`
- Evidence: les deux POST authentifiés par cookies Supabase validaient utilisateur et
  payload, mais pas explicitement l’Origin.
- Impact: un navigateur authentifié pouvait être poussé à tenter une mutation cross-site.
- Fix: `hasTrustedMutationOrigin` compare strictement l’Origin à l’origine canonique
  `APP_BASE_URL`; Origin absent, invalide ou tiers reçoit HTTP 403.
- Mitigation: schémas Zod, prix serveur, idempotence et SameSite Supabase réduisent aussi
  l’impact, mais ne remplacent pas la validation d’origine.
- False positive notes: l’absence d’Origin est volontairement fail-closed sur ces routes
  browser-only ; les webhooks signés ne passent pas par cette règle.
- Status: RESOLVED

### SEC-003 — NEXT-HOST-001 / NEXT-REDIRECT-001

- Severity: Medium
- Location: `apps/web/middleware.ts:54`
- Evidence: le redirect vers login utilisait auparavant `new URL('/login', request.url)`.
- Impact: un Host non fiable pouvait influencer l’origine d’un redirect absolu.
- Fix: l’origine canonique provient désormais de `webConfig.APP_BASE_URL`; le paramètre
  `next` reste un chemin interne et passe ensuite par `safeInternalPath` à la connexion.
- Mitigation: middleware global, authentification serveur et allowlist de chemins protégés.
- False positive notes: un proxy de confiance aurait pu neutraliser le risque, mais la
  correction rend l’application autonome vis-à-vis de cette configuration.
- Status: RESOLVED

## Findings ouverts

### SEC-004 — NEXT-DOS-001 / NEXT-LIMITS-001

- Severity: Medium
- Location: `apps/web/app/(auth)/actions.ts:29`, `:86`, `:113` et
  `apps/web/app/api/v1/webhooks/payments/sandbox/route.ts:32`
- Evidence: signup, login, reset et ingestion webhook ne montrent pas encore de rate
  limiter applicatif ni de limite de payload explicite dans le code.
- Impact: abus d’authentification, email flooding ou consommation inutile de ressources.
- Fix: définir au Prompt 12 une stratégie edge + applicative, des seuils versionnés et
  une lecture streaming bornée des webhooks avant tout provider public.
- Mitigation: bêta privée, sandbox fail-fast en production, schémas stricts et limites
  éventuelles de l’hébergeur/Supabase.
- False positive notes: une protection edge peut exister hors dépôt ; elle doit être
  prouvée sur l’environnement de staging avant de clore ce finding.
- Status: OPEN — release gate public

### SEC-005 — NEXT-CSP-001 / REACT-CSP-001

- Severity: Low
- Location: `apps/web/next.config.mjs:17`
- Evidence: la CSP couvre `base-uri`, `object-src` et `frame-ancestors`, mais ne fixe pas
  encore `script-src` avec nonce/hash.
- Impact: défense en profondeur XSS incomplète si une future fonctionnalité introduit
  un sink ou du contenu utilisateur riche.
- Fix: déployer une CSP à nonce selon le modèle Next.js, d’abord en report-only, puis
  enforcement après validation de toutes les routes.
- Mitigation: aucun `dangerouslySetInnerHTML`, `innerHTML`, `eval`, script tiers, stockage
  de token ou URL dynamique non validée n’a été trouvé dans le périmètre actif.
- False positive notes: une CSP plus forte peut être configurée au CDN ; aucune preuve
  de cette couche n’était disponible dans le dépôt.
- Status: OPEN — hardening Prompt 12

## Contrôles sans finding

- Secrets : `.env.local` ignoré, scan de secrets vert, aucune clé service-role dans le client.
- XSS : aucun sink HTML brut ou exécution dynamique détecté.
- Validation : entrées HTTP et Server Actions validées par Zod.
- Autorité : prix, devise, fill, position, ledger et activation restent serveur-authoritative.
- Webhook : raw body, HMAC constant-time, replay protection, idempotence et vérification montant/devise.
- SQL : Kysely/queries paramétrées ; aucune concaténation SQL issue des requêtes HTTP trouvée.
- Sessions : `supabase.auth.getUser()` est utilisé côté serveur sur les parcours protégés.
- Headers : nosniff, deny framing, referrer policy, permissions policy et HSTS configurés.
- Supply chain : lockfile frozen en CI ; `pnpm audit --prod --audit-level=high` ne trouve
  aucune vulnérabilité connue.

## Verdict

Aucun finding critique/élevé ouvert. Les protections nécessaires à la bêta sandbox sont
en place et prouvées ; SEC-004 et SEC-005 restent des gates explicites avant vente publique.

Statut : **PASS WITH ACTIONS**
