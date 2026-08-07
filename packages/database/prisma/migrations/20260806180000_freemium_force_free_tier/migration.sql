-- Freemium interim: align FREE daily limits with Matchy business model (10 swipes/24h)
-- and force every user onto FREE until paid plans / payments ship.
-- Paid plan rows stay in the catalog but are deactivated.

UPDATE "Plan"
SET
    "name" = 'Gratuit',
    "price" = 0,
    "is_active" = true,
    "description" = 'Accès gratuit avec limites journalières',
    "features" = ARRAY[
        '3 profils visibles en recherche personnalisée',
        'Swipe limité (10/24h)',
        'Chat basique'
    ],
    "swipes_per_day" = 10,
    "profiles_per_category" = 3,
    "messages_per_day" = 5,
    "actions_per_day" = 10,
    "boosts_per_month" = 0,
    "super_connects_per_month" = 0
WHERE "id" = 'FREE';

UPDATE "Plan"
SET "is_active" = false
WHERE "id" IN ('PREMIUM', 'PREMIUM_PLUS');

UPDATE "User"
SET "plan" = 'FREE'
WHERE "plan" <> 'FREE';
