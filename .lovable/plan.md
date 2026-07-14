# Travaux restants d'après le CDC FIAD-Monde

Le backend Node/Express/MongoDB et les pages actuelles couvrent une bonne partie du chapitre I (Membres), II (Formations), III (Événements), VII (Finances) et une base de VIII/IX. Voici ce qui manque au regard des 9 chapitres du cahier des charges.

## 1. Bascule frontend Supabase → API locale (pré-requis)
Rien de ce qui suit ne sera testable tant que le front parle encore à Supabase.
- `src/lib/api.ts` (wrapper fetch + JWT `lapadi_token`).
- Réécrire `useAuth`, `login`, `register` sur `/api/auth/*`.
- Migrer les ~10 pages CRUD (`supabase.from(...)` → `api(...)`).
- Ajouter `VITE_API_URL` dans `.env`, brancher `POST /api/uploads` pour la photo de profil et les ressources événement.
- Retirer `@supabase/*`, `src/integrations/supabase/*`, `supabase/`, `attachSupabaseAuth`, les `*.functions.ts` devenus inutiles.

## 2. Chapitre I — Membres (compléments)
- **Adhésion en cours / brouillon** : sauvegarder un formulaire d'inscription incomplet et permettre de reprendre (champ `status: draft` + reprise via lien email).
- **Statut de compte** : ajouter `suspendu` / `résilié` à `Profile.status` + actions admin correspondantes.
- **Reçu de paiement** envoyé par email après adhésion (PDF simple).
- **reCAPTCHA** sur l'inscription (protection anti-fraude demandée par le CDC).
- **i18n FR/EN** (le CDC exige au minimum ces deux langues).

## 3. Chapitre II — Cours & Formations
- **Cours hebdomadaires en direct** : modèle `LiveSession` (date, lien visio, animateur = Président Mondial), inscription, rappel automatique, enregistrement + notes téléchargeables après coup.
- **Catalogue de formations** + progression par module (`FormationModule`, `FormationProgress`).
- **Certificats** générés en PDF à l'achèvement, stockés et re-téléchargeables.

## 4. Chapitre III — Événements (compléments)
- **Ciblage** : afficher un événement uniquement aux membres dont catégorie/ville/pays match (les champs existent, il reste à filtrer côté API et UI).
- **Mode de participation** en ligne / présentiel + modification après inscription.
- **QR code / feuille de présence** pour émargement.

## 5. Chapitre IV — Communication
- **Accès direct au Président Mondial** : file de demandes (`PresidentRequest`) avec statut, réponse, historique.
- **Messagerie interne** : 1-à-1 et groupes, pièces jointes, notifications (Socket.IO ou polling).
- **Réseaux de proximité** : groupes auto-assignés par ville/pays, fil de discussion local, organisation d'activités.

## 6. Chapitre V — Support & assistance
- **Chargés de mission** : rôle dédié + affectation membre ↔ chargé, tickets de suivi.
- **FAQ / base de connaissances** admin-éditable, recherche, multilingue.

## 7. Chapitre VI — Suivi des engagements
- **Crédo des Ambassadeurs** : check-list d'engagements, auto-évaluation périodique.
- **Rapports de progression** individuels et agrégés (participation, formations, engagements).

## 8. Chapitre VII — Finances (compléments)
- **Passerelle de paiement réelle** (Stripe / Paddle / provider local africain type CinetPay) — actuellement seulement le modèle Transaction existe.
- **Renouvellement automatique** de cotisation (rappel + relance).
- **Remboursements** (action admin + traçabilité).
- **Export comptable** CSV/PDF, tableau de bord finances plus détaillé.

## 9. Chapitre VIII — Évaluation & amélioration
- **Sondages / feedback** après cours et événements (modèle `Survey`, `SurveyResponse`).
- **Analytics** : tableau agrégé (participation, satisfaction, impact formations).

## 10. Chapitre IX — Sécurité & confidentialité
- **Journal d'audit** (`AuditLog`) : accès admin, modifications sensibles.
- **2FA** pour les admins.
- **RGPD** : export de mes données + demande de suppression de compte côté membre.
- **Rate-limit renforcé** sur `/auth/*`, verrouillage après N échecs.
- **Chiffrement au repos** des champs sensibles (téléphone, adresse) — optionnel selon niveau visé.

## Ordre d'exécution recommandé
1. Bascule frontend → API (section 1) — débloque tout le reste.
2. Compléments membres + finances (2, 8) — cœur de l'adhésion.
3. Cours en direct + certificats (3).
4. Événements ciblés + émargement (4).
5. Communication & support (5, 6).
6. Engagements, sondages, analytics (7, 9).
7. Sécurité avancée & RGPD (10).

## Détails techniques
- Nouveaux modèles Mongo à créer : `LiveSession`, `FormationModule`, `FormationProgress`, `Certificate`, `PresidentRequest`, `Message`, `Conversation`, `ProximityGroup`, `SupportTicket`, `FaqEntry`, `EngagementCheck`, `Survey`, `SurveyResponse`, `AuditLog`.
- Ajouter rôles `president`, `chargé_mission` à l'enum `User.roles`.
- PDF : `pdfkit` (compatible Node standard).
- Temps réel : `socket.io` côté backend, client `socket.io-client`.
- Emails : `nodemailer` + SMTP (à configurer via `.env`).
- Paiement : brancher un provider une fois le choix confirmé (Stripe international vs CinetPay Afrique de l'Ouest).

## Question ouverte
Le CDC demande un support multilingue FR/EN — à faire dès la bascule ou plus tard ? À confirmer avant de démarrer.
