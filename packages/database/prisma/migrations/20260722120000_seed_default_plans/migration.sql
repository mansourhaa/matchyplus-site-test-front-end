-- Plan rows are configuration, not sample data: without them `/admin/plans` is empty and
-- editing a plan fails, since `updatePlan` can only update a row that already exists.
-- The deploy pipeline runs `prisma migrate deploy` and never a seed, so the default rows have
-- to be inserted here to reach staging and production.
--
-- Mirrors DEFAULT_PLANS in `src/seed/plans.ts`. ON CONFLICT DO NOTHING keeps this rejouable and
-- makes it a no-op on any database that already has plans, so prices edited from the admin
-- panel are never reset by a replay.
INSERT INTO "Plan" (
    "id",
    "name",
    "price",
    "color",
    "is_active",
    "badge",
    "trial_days",
    "description",
    "features",
    "swipes_per_day",
    "profiles_per_category",
    "messages_per_day",
    "actions_per_day",
    "boosts_per_month",
    "super_connects_per_month",
    "sort_order"
) VALUES
    (
        'FREE',
        'Gratuit',
        0,
        '#888888',
        true,
        '',
        0,
        'Accès limité aux fonctionnalités de base',
        ARRAY['3 profils visibles par catégorie', 'Swipe limité (20/jour)', 'Chat basique'],
        20,
        3,
        5,
        10,
        0,
        0,
        0
    ),
    (
        'PREMIUM',
        'Premium',
        9.9,
        '#2F76BB',
        true,
        'Populaire',
        7,
        'Accès complet aux profils et connexions',
        ARRAY[
            'Profils illimités',
            'Swipe illimité',
            'Se connecter sans restriction',
            'Voir les modes de contact',
            'Messagerie vidéo',
            'Boost profil × 1/mois'
        ],
        -1,
        -1,
        -1,
        -1,
        1,
        0,
        1
    ),
    (
        'PREMIUM_PLUS',
        'Premium+',
        19.9,
        '#F5A623',
        true,
        'Meilleure valeur',
        14,
        'Accès total + avantages exclusifs',
        ARRAY[
            'Tout Premium inclus',
            'Profil mis en avant',
            'Accès admin lite',
            '5 Super Connexions/mois',
            'Statistiques avancées',
            'Support prioritaire'
        ],
        -1,
        -1,
        -1,
        -1,
        3,
        5,
        2
    )
ON CONFLICT ("id") DO NOTHING;
