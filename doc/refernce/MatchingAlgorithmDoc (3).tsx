import { useState } from "react";

// ── Colour palette ──────────────────────────────────────────────────────────
const C = {
  teal: "#61BCA6",
  blue: "#2F76BB",
  dark: "#1A1A2E",
  mid: "#3D3D5C",
  muted: "#888",
  light: "#F5F9FF",
  border: "#E8EDF5",
  orange: "#F5A623",
  red: "#E24E59",
  green: "#22C55E",
  purple: "#8B5CF6",
};

// ── Shared primitives ────────────────────────────────────────────────────────
function Tag({ children, color = C.teal }: { children: React.ReactNode; color?: string }) {
  return (
    <span
      style={{
        display: "inline-block",
        background: color + "18",
        color,
        border: `1px solid ${color}44`,
        borderRadius: 6,
        fontSize: 11,
        fontWeight: 700,
        padding: "2px 8px",
        letterSpacing: 0.3,
      }}
    >
      {children}
    </span>
  );
}

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} style={{ marginBottom: 56 }}>
      <h2
        style={{
          fontSize: 22,
          fontWeight: 800,
          color: C.dark,
          borderLeft: `4px solid ${C.teal}`,
          paddingLeft: 14,
          marginBottom: 24,
        }}
      >
        {title}
      </h2>
      {children}
    </section>
  );
}

function SubSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 28 }}>
      <h3 style={{ fontSize: 15, fontWeight: 700, color: C.mid, marginBottom: 12 }}>{title}</h3>
      {children}
    </div>
  );
}

function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div
      style={{
        background: "white",
        border: `1px solid ${C.border}`,
        borderRadius: 12,
        padding: "20px 24px",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

function Code({ children }: { children: React.ReactNode }) {
  return (
    <code
      style={{
        fontFamily: "'Fira Code', 'Courier New', monospace",
        fontSize: 12,
        background: "#F0F4FF",
        color: C.blue,
        padding: "2px 6px",
        borderRadius: 4,
      }}
    >
      {children}
    </code>
  );
}

function CodeBlock({ children, label }: { children: string; label?: string }) {
  return (
    <div style={{ marginBottom: 16 }}>
      {label && (
        <div
          style={{
            fontSize: 11,
            fontWeight: 700,
            color: C.muted,
            marginBottom: 4,
            letterSpacing: 0.5,
            textTransform: "uppercase",
          }}
        >
          {label}
        </div>
      )}
      <pre
        style={{
          background: "#0F1624",
          color: "#A8D8B9",
          borderRadius: 10,
          padding: "16px 20px",
          fontSize: 12,
          lineHeight: 1.75,
          overflowX: "auto",
          fontFamily: "'Fira Code', 'Courier New', monospace",
          margin: 0,
        }}
      >
        {children}
      </pre>
    </div>
  );
}

function Pill({
  label,
  value,
  color = C.teal,
}: {
  label: string;
  value: string | number;
  color?: string;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "10px 14px",
        background: color + "10",
        border: `1px solid ${color}30`,
        borderRadius: 8,
      }}
    >
      <span style={{ fontSize: 12, color: C.muted, flex: 1 }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: 700, color }}>{value}</span>
    </div>
  );
}

// ── Dimension bar ────────────────────────────────────────────────────────────
function DimensionBar({
  label,
  weight,
  color,
  description,
}: {
  label: string;
  weight: number;
  color: string;
  description: string;
}) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
        <div>
          <span style={{ fontSize: 13, fontWeight: 700, color: C.dark }}>{label}</span>
          <span style={{ fontSize: 12, color: C.muted, marginLeft: 8 }}>{description}</span>
        </div>
        <span style={{ fontSize: 13, fontWeight: 800, color }}>{weight}%</span>
      </div>
      <div style={{ height: 8, background: "#F0F4FF", borderRadius: 4, overflow: "hidden" }}>
        <div
          style={{
            height: "100%",
            width: `${(weight / 28) * 100}%`,
            background: `linear-gradient(90deg, ${color}BB, ${color})`,
            borderRadius: 4,
            maxWidth: "100%",
          }}
        />
      </div>
    </div>
  );
}

// ── API endpoint row ─────────────────────────────────────────────────────────
function ApiRow({
  method,
  path,
  description,
  auth = true,
}: {
  method: "GET" | "POST" | "PUT" | "DELETE";
  path: string;
  description: string;
  auth?: boolean;
}) {
  const methodColor: Record<string, string> = {
    GET: C.green,
    POST: C.blue,
    PUT: C.orange,
    DELETE: C.red,
  };
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "12px 16px",
        borderBottom: `1px solid ${C.border}`,
        flexWrap: "wrap",
      }}
    >
      <span
        style={{
          fontSize: 11,
          fontWeight: 800,
          color: methodColor[method],
          background: methodColor[method] + "18",
          padding: "3px 8px",
          borderRadius: 5,
          minWidth: 42,
          textAlign: "center",
        }}
      >
        {method}
      </span>
      <span
        style={{
          fontFamily: "'Fira Code', monospace",
          fontSize: 12,
          color: C.dark,
          flex: 1,
          minWidth: 200,
        }}
      >
        {path}
      </span>
      <span style={{ fontSize: 12, color: C.muted, flex: 2 }}>{description}</span>
      {auth && (
        <Tag color={C.orange}>JWT</Tag>
      )}
    </div>
  );
}

// ── Table of contents ────────────────────────────────────────────────────────
const SECTIONS = [
  { id: "overview", label: "Vue d'ensemble" },
  { id: "engine", label: "Moteur IA (AIMatchingEngine)" },
  { id: "dimensions", label: "Dimensions de scoring" },
  { id: "behavioral", label: "Apprentissage comportemental" },
  { id: "search", label: "Recherche & filtres" },
  { id: "state-flow", label: "Flux d'état" },
  { id: "api", label: "API REST" },
  { id: "types", label: "Types & structures" },
  { id: "limits", label: "Limites & plan" },
];

// ═══════════════════════════════════════════════════════════════════════════
export function MatchingAlgorithmDoc() {
  const [activeSection, setActiveSection] = useState("overview");

  const scrollTo = (id: string) => {
    setActiveSection(id);
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div style={{ minHeight: "100vh", background: C.light, fontFamily: "'Inter', 'Segoe UI', sans-serif" }}>
      {/* ── Header ── */}
      <div
        style={{
          background: `linear-gradient(135deg, ${C.dark} 0%, ${C.mid} 100%)`,
          padding: "40px 40px 32px",
          color: "white",
        }}
      >
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 10,
                background: `linear-gradient(135deg, ${C.teal}, ${C.blue})`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 20,
              }}
            >
              🧠
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: C.teal, letterSpacing: 1.5, textTransform: "uppercase" }}>
                Matchy+ · Documentation Technique
              </div>
              <div style={{ fontSize: 11, color: "#AAA" }}>Version 1.0 — Juillet 2025</div>
            </div>
          </div>
          <h1 style={{ fontSize: 34, fontWeight: 900, margin: 0, lineHeight: 1.2 }}>
            Algorithme de Matching IA
          </h1>
          <p style={{ fontSize: 14, color: "#BDD", marginTop: 10, maxWidth: 600, lineHeight: 1.7 }}>
            Moteur de mise en relation multi-dimensionnel avec apprentissage comportemental en temps réel.
            Couvre le scoring IA, la recherche, le pipeline de filtres et les endpoints API.
          </p>
          <div style={{ display: "flex", gap: 10, marginTop: 20, flexWrap: "wrap" }}>
            <Tag color={C.teal}>AIMatchingEngine.ts</Tag>
            <Tag color={C.blue}>REST API</Tag>
            <Tag color={C.purple}>Behavioral Learning</Tag>
            <Tag color={C.orange}>localStorage</Tag>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "32px 24px", display: "flex", gap: 32 }}>
        {/* ── Sidebar TOC ── */}
        <aside
          style={{
            width: 200,
            flexShrink: 0,
            position: "sticky",
            top: 24,
            alignSelf: "flex-start",
          }}
          className="hidden md:block"
        >
          <div
            style={{
              background: "white",
              border: `1px solid ${C.border}`,
              borderRadius: 12,
              padding: "16px 0",
              fontSize: 12,
            }}
          >
            <div style={{ fontSize: 10, fontWeight: 700, color: C.muted, letterSpacing: 1.2, textTransform: "uppercase", padding: "0 16px 12px" }}>
              Table des matières
            </div>
            {SECTIONS.map((s) => (
              <button
                key={s.id}
                onClick={() => scrollTo(s.id)}
                style={{
                  display: "block",
                  width: "100%",
                  textAlign: "left",
                  padding: "8px 16px",
                  fontSize: 12,
                  fontWeight: activeSection === s.id ? 700 : 400,
                  color: activeSection === s.id ? C.teal : C.mid,
                  background: activeSection === s.id ? C.teal + "12" : "transparent",
                  border: "none",
                  borderLeft: activeSection === s.id ? `3px solid ${C.teal}` : "3px solid transparent",
                  cursor: "pointer",
                  lineHeight: 1.4,
                }}
              >
                {s.label}
              </button>
            ))}
          </div>
        </aside>

        {/* ── Main content ── */}
        <main style={{ flex: 1, minWidth: 0 }}>

          {/* ═══ 1. VUE D'ENSEMBLE ═══════════════════════════════════════════ */}
          <Section id="overview" title="1. Vue d'ensemble de l'architecture">
            <Card style={{ marginBottom: 20 }}>
              <p style={{ fontSize: 13, color: C.mid, lineHeight: 1.8, margin: 0 }}>
                Matchy+ utilise un moteur de matching local (<Code>AIMatchingEngine.ts</Code>) qui s'exécute
                entièrement côté client (navigateur / app). Aucun appel réseau n'est requis pour calculer
                un score — le calcul est synchrone et instantané. Les données de préférences sont persistées
                dans <Code>localStorage</Code> et évoluent à chaque swipe.
              </p>
            </Card>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12, marginBottom: 20 }}>
              {[
                { icon: "⚡", label: "Calcul côté client", desc: "100% local, zéro latence réseau" },
                { icon: "🔁", label: "Apprentissage continu", desc: "Poids mis à jour à chaque swipe" },
                { icon: "📐", label: "6 dimensions", desc: "Score composite pondéré" },
                { icon: "🔒", label: "Persistance locale", desc: "localStorage matchy_ai_prefs" },
              ].map((item) => (
                <Card key={item.label} style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 28, marginBottom: 8 }}>{item.icon}</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: C.dark, marginBottom: 4 }}>{item.label}</div>
                  <div style={{ fontSize: 11, color: C.muted }}>{item.desc}</div>
                </Card>
              ))}
            </div>

            <SubSection title="Flux général">
              <Card style={{ background: "#0F1624", border: "none" }}>
                <pre style={{ color: "#A8D8B9", fontSize: 12, lineHeight: 2, margin: 0, fontFamily: "'Fira Code', monospace", overflowX: "auto" }}>
{`Profils en base
      │
      ▼
rankProfiles(userPrefs, profiles)       ← AIMatchingEngine
      │
      ├── computeScore(prefs, profile)  ← 6 dimensions × poids
      │         │
      │         ├── skillsScore()       28%
      │         ├── proximityScore()    22%
      │         ├── goalScore()         18%
      │         ├── availabilityScore() 12%
      │         ├── languageScore()     10%
      │         └── qualityScore()      10%
      │
      ├── apply behavioralMultiplier    ← categoryWeights[profile.category]
      ├── add deterministic jitter      ← ±3 pts (stable entre renders)
      └── clamp → [40, 99]

Résultat : RankedProfile[] trié par score DESC`}
                </pre>
              </Card>
            </SubSection>
          </Section>

          {/* ═══ 2. MOTEUR IA ════════════════════════════════════════════════ */}
          <Section id="engine" title="2. Moteur IA — AIMatchingEngine.ts">
            <Card style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 12, color: C.muted, marginBottom: 12, fontWeight: 600 }}>
                📁 src/app/engine/AIMatchingEngine.ts
              </div>
              <p style={{ fontSize: 13, color: C.mid, lineHeight: 1.8, margin: 0 }}>
                Le moteur expose deux fonctions publiques principales :{" "}
                <Code>rankProfiles()</Code> pour trier les profils et{" "}
                <Code>recordSwipe()</Code> pour mettre à jour le vecteur de préférences.
                Le reste est interne au module.
              </p>
            </Card>

            <SubSection title="Interfaces principales">
              <CodeBlock label="Types">{`interface UserPrefs {
  interests: string[];          // ["marketing", "design", ...]
  location?: { lat: number; lng: number };
  searchRadius?: number;        // km, défaut 10
  goals?: string[];             // ["trouver_clients", "recruter", ...]
  languages?: string[];         // ["français", "arabe", ...]
  categoryWeights: Record<string, number>;  // [0.3, 2.0]
  tagWeights: Record<string, number>;       // [0.3, 2.0]
  swipeHistory: Array<{ profileId: string; direction: "left"|"right"; timestamp: number }>;
}

interface ScoredProfile {
  profile: Profile;
  totalScore: number;           // [40, 99]
  confidence: "high"|"medium"|"low";
  dimensions: DimensionResult[];
  highlights: string[];
  rank: number;
}`}</CodeBlock>
            </SubSection>

            <SubSection title="Fonction rankProfiles()">
              <CodeBlock label="Algorithme de tri">{`function rankProfiles(prefs: UserPrefs, profiles: Profile[]): RankedProfile[] {
  return profiles
    .map(profile => computeScore(prefs, profile))
    .sort((a, b) => b.totalScore - a.totalScore)
    .map((result, index) => ({ ...result, rank: index + 1 }));
}

function computeScore(prefs: UserPrefs, profile: Profile): ScoredProfile {
  const dimensions = [
    { name: "Compétences",  weight: 0.28, score: skillsScore(prefs, profile)       },
    { name: "Proximité",    weight: 0.22, score: proximityScore(prefs, profile)     },
    { name: "Objectifs",    weight: 0.18, score: goalScore(prefs, profile)          },
    { name: "Disponibilité",weight: 0.12, score: availabilityScore(prefs, profile)  },
    { name: "Langues",      weight: 0.10, score: languageScore(prefs, profile)      },
    { name: "Qualité",      weight: 0.10, score: qualityScore(prefs, profile)       },
  ];

  const rawTotal = dimensions.reduce((acc, d) => acc + d.score * d.weight, 0);

  // Multiplicateur comportemental
  const catWeight = prefs.categoryWeights[profile.category] ?? 1.0;
  const behavioral = Math.min(1.4, Math.max(0.6, catWeight));

  // Jitter déterministe (stable entre re-renders)
  const seed = profile.id.charCodeAt(0) + profile.tags.length;
  const jitter = ((seed % 7) - 3);

  const total = Math.min(99, Math.max(40, Math.round(rawTotal * behavioral + jitter)));

  const confidence = total >= 75 ? "high" : total >= 55 ? "medium" : "low";

  return { profile, totalScore: total, confidence, dimensions, ... };
}`}</CodeBlock>
            </SubSection>
          </Section>

          {/* ═══ 3. DIMENSIONS DE SCORING ════════════════════════════════════ */}
          <Section id="dimensions" title="3. Dimensions de scoring (6 axes)">
            <Card style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: C.dark, marginBottom: 16 }}>
                Répartition des poids
              </div>
              <DimensionBar label="Compétences & Intérêts" weight={28} color={C.teal} description="Jaccard similarity + tag boost" />
              <DimensionBar label="Proximité géographique" weight={22} color={C.blue} description="Décroissance exponentielle" />
              <DimensionBar label="Alignement des objectifs" weight={18} color={C.purple} description="Matrice goal×category" />
              <DimensionBar label="Disponibilité partagée" weight={12} color={C.orange} description="Overlap jours + heures" />
              <DimensionBar label="Langues communes" weight={10} color={C.green} description="Jaccard langues normalisées" />
              <DimensionBar label="Qualité & Réputation" weight={10} color={C.red} description="Note + nb avis + disponibilité" />
            </Card>

            {/* Skills */}
            <SubSection title="3.1 — Compétences & Intérêts (28%)">
              <Card style={{ marginBottom: 12 }}>
                <p style={{ fontSize: 13, color: C.mid, lineHeight: 1.7, marginBottom: 12 }}>
                  Calcule la similarité entre les intérêts de l'utilisateur et les tags/rôle/catégorie du profil.
                  Utilise la <strong>similarité de Jaccard</strong> pour les correspondances exactes, plus un
                  matching souple sur les sous-chaînes. Le score est ensuite boosté par les poids de tags
                  appris via les swipes.
                </p>
                <CodeBlock label="Formule">{`// Jaccard similarity
const intersection = userTags.filter(t => profileTags.includes(t)).length;
const union = new Set([...userTags, ...profileTags]).size;
const jaccard = union > 0 ? intersection / union : 0;

// Soft match (sous-chaîne)
const softMatches = userTags.filter(ut =>
  profileTags.some(pt => pt.includes(ut) || ut.includes(pt))
).length;

// Boost comportemental par tag
const tagBoost = profileTags.reduce((acc, tag) => {
  return acc + (prefs.tagWeights[tag] ?? 1.0);
}, 0) / Math.max(1, profileTags.length);

const score = Math.min(100, (jaccard * 60 + softMatches * 8 + 15) * tagBoost);`}</CodeBlock>
              </Card>
            </SubSection>

            {/* Proximity */}
            <SubSection title="3.2 — Proximité géographique (22%)">
              <Card style={{ marginBottom: 12 }}>
                <p style={{ fontSize: 13, color: C.mid, lineHeight: 1.7, marginBottom: 12 }}>
                  Décroissance exponentielle basée sur la distance euclidienne approximative (sans Haversine
                  pour éviter la dépendance réseau). Le rayon de recherche préféré de l'utilisateur
                  sert de référence.
                </p>
                <CodeBlock label="Formule">{`const dist = Math.sqrt(
  (profile.lat - user.lat) ** 2 +
  (profile.lng - user.lng) ** 2
) * 111; // conversion degrés → km (approximation)

const radius = prefs.searchRadius ?? 10; // km
const distRatio = dist / radius;

// Décroissance exponentielle (puissance 1.6 = courbe douce)
const score = Math.max(0, Math.min(100,
  (1 - distRatio) ** 1.6 * 100
));`}</CodeBlock>
              </Card>
            </SubSection>

            {/* Goals */}
            <SubSection title="3.3 — Alignement des objectifs (18%)">
              <Card style={{ marginBottom: 12 }}>
                <p style={{ fontSize: 13, color: C.mid, lineHeight: 1.7, marginBottom: 12 }}>
                  Utilise une <strong>matrice pré-calculée</strong> de compatibilité entre les objectifs utilisateur
                  (ex. "trouver_clients") et les catégories de profils (ex. "Marketing"). Les scores
                  de compatibilité varient de 0.8 à 1.0.
                </p>
                <CodeBlock label="Matrice GOAL_CATEGORY_MATRIX (extrait)">{`const GOAL_CATEGORY_MATRIX: Record<string, Record<string, number>> = {
  trouver_clients:   { Marketing: 1.0, Commercial: 0.95, Communication: 0.88 },
  recruter:          { RH: 1.0, Management: 0.92, Coaching: 0.85 },
  apprendre:         { Coaching: 1.0, Formation: 0.97, Consulting: 0.88 },
  investir:          { Finance: 1.0, Immobilier: 0.95, Startup: 0.90 },
  collaborer:        { Design: 0.92, Tech: 0.90, Marketing: 0.88 },
  vendre:            { Commercial: 1.0, Marketing: 0.93, Finance: 0.85 },
};

// Calcul du score
const matches = prefs.goals.flatMap(goal =>
  GOAL_CATEGORY_MATRIX[goal]?.[profile.category]
    ? [GOAL_CATEGORY_MATRIX[goal][profile.category]]
    : []
);
const score = matches.length > 0
  ? (matches.reduce((a, b) => a + b, 0) / matches.length) * 100
  : 50; // score neutre si pas de données`}</CodeBlock>
              </Card>
            </SubSection>

            {/* Availability */}
            <SubSection title="3.4 — Disponibilité partagée (12%)">
              <Card style={{ marginBottom: 12 }}>
                <CodeBlock label="Parsing du planning">{`// Détection des jours depuis la chaîne de disponibilité
const parseSchedule = (schedule: string) => {
  const days: string[] = [];
  if (/24h/.test(schedule))          days.push(...ALL_DAYS);
  if (/lun.*sam/i.test(schedule))    days.push("lun","mar","mer","jeu","ven","sam");
  if (/week[- ]?end/i.test(schedule))days.push("sam","dim");
  // ... autres patterns

  const hasFlexHours = /flexible|24h|disponible/i.test(schedule);
  return { days, hasFlexHours };
};

// Score = overlap jours (60%) + flexibilité horaire (40%)
const dayOverlap = userDays.filter(d => profileDays.includes(d)).length;
const dayScore = Math.min(100, (dayOverlap / Math.max(userDays.length, 1)) * 100);
const hourScore = hasFlexHours ? 100 : 50;
const score = dayScore * 0.6 + hourScore * 0.4;`}</CodeBlock>
              </Card>
            </SubSection>

            {/* Languages */}
            <SubSection title="3.5 — Langues communes (10%)">
              <Card style={{ marginBottom: 12 }}>
                <CodeBlock label="Normalisation + Jaccard">{`const LANG_MAP: Record<string, string> = {
  "arabe": "ar", "arabic": "ar", "عربية": "ar",
  "français": "fr", "french": "fr", "francais": "fr",
  "anglais": "en", "english": "en",
  "allemand": "de", "german": "de",
};

const normalize = (langs: string[]) =>
  langs.map(l => LANG_MAP[l.toLowerCase()] ?? l.toLowerCase());

const userNorm    = normalize(prefs.languages ?? []);
const profileNorm = normalize(profile.languages ?? []);

const shared = userNorm.filter(l => profileNorm.includes(l));
const union  = new Set([...userNorm, ...profileNorm]).size;

// Jaccard + bonus si au moins 1 langue partagée
const jaccard = union > 0 ? shared.length / union : 0;
const bonus   = shared.length > 0 ? 15 : 0;
const score   = Math.min(100, jaccard * 85 + bonus);`}</CodeBlock>
              </Card>
            </SubSection>

            {/* Quality */}
            <SubSection title="3.6 — Qualité & Réputation (10%)">
              <Card style={{ marginBottom: 12 }}>
                <CodeBlock label="Formule">{`// rating ∈ [0, 5], reviews ∈ [0, ∞]
const ratingScore  = (profile.rating / 5) * 100;
const reviewBonus  = Math.min(100, Math.log10(profile.reviewCount + 1) * 50);
const availBonus   = profile.available ? 10 : 0;

const score = ratingScore * 0.7 + reviewBonus * 0.3 + availBonus;
// clamp: max(0, min(100, score))`}</CodeBlock>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginTop: 12 }}>
                  <Pill label="Note × 0.7" value="70%" color={C.green} />
                  <Pill label="Avis (log) × 0.3" value="30%" color={C.blue} />
                  <Pill label="Disponible" value="+10 pts" color={C.orange} />
                </div>
              </Card>
            </SubSection>

            {/* Score final */}
            <SubSection title="3.7 — Score final & seuils de confiance">
              <Card>
                <CodeBlock label="Post-traitement">{`// Score brut pondéré
const raw = dimensions.reduce((sum, d) => sum + d.score * d.weight, 0);

// Multiplicateur comportemental : ×[0.6, 1.4]
const behavioral = clamp(prefs.categoryWeights[profile.category] ?? 1.0, 0.6, 1.4);

// Jitter déterministe : ±3 pts  (évite les égalités visuelles)
const jitter = ((profile.id.charCodeAt(0) + profile.tags.length) % 7) - 3;

// Clamp final : [40, 99]  (jamais 0 ni 100 pour le réalisme)
const total = clamp(Math.round(raw * behavioral + jitter), 40, 99);`}</CodeBlock>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginTop: 12 }}>
                  <Pill label="≥ 75 — Haute" value="#61BCA6" color={C.teal} />
                  <Pill label="55–74 — Moyenne" value="#2F76BB" color={C.blue} />
                  <Pill label="< 55 — Faible" value="#F5A623" color={C.orange} />
                </div>
              </Card>
            </SubSection>
          </Section>

          {/* ═══ 4. APPRENTISSAGE COMPORTEMENTAL ════════════════════════════ */}
          <Section id="behavioral" title="4. Apprentissage comportemental">
            <Card style={{ marginBottom: 20 }}>
              <p style={{ fontSize: 13, color: C.mid, lineHeight: 1.8, margin: 0 }}>
                À chaque swipe, la fonction <Code>recordSwipe()</Code> met à jour deux vecteurs de poids :
                <Code>categoryWeights</Code> (par catégorie de profil) et <Code>tagWeights</Code> (par tag).
                Ces poids évoluent dans l'intervalle <Code>[0.3, 2.0]</Code> et sont persistés dans le{" "}
                <Code>localStorage</Code> sous la clé <Code>matchy_ai_prefs</Code>.
              </p>
            </Card>

            <SubSection title="Mise à jour des poids">
              <CodeBlock label="recordSwipe() — extrait">{`function recordSwipe(
  prefs: UserPrefs,
  profile: Profile,
  direction: "left" | "right"
): UserPrefs {
  const updated = structuredClone(prefs);

  if (direction === "right") {
    // Swipe droit → renforcement positif
    updated.categoryWeights[profile.category] =
      clamp((prefs.categoryWeights[profile.category] ?? 1) + 0.12, 0.3, 2.0);

    profile.tags.forEach(tag => {
      updated.tagWeights[tag] =
        clamp((prefs.tagWeights[tag] ?? 1) + 0.05, 0.3, 2.0);
    });
  } else {
    // Swipe gauche → renforcement négatif (atténué)
    updated.categoryWeights[profile.category] =
      clamp((prefs.categoryWeights[profile.category] ?? 1) - 0.06, 0.3, 2.0);

    profile.tags.forEach(tag => {
      updated.tagWeights[tag] =
        clamp((prefs.tagWeights[tag] ?? 1) - 0.02, 0.3, 2.0);
    });
  }

  // Historique limité à 50 swipes (FIFO)
  updated.swipeHistory = [
    { profileId: profile.id, direction, timestamp: Date.now() },
    ...prefs.swipeHistory,
  ].slice(0, 50);

  // Persistance
  localStorage.setItem("matchy_ai_prefs", JSON.stringify(updated));

  return updated;
}`}</CodeBlock>
            </SubSection>

            <SubSection title="Delta de poids par événement">
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <Card style={{ borderLeft: `4px solid ${C.teal}` }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: C.teal, marginBottom: 12 }}>
                    Swipe DROIT (like) 👍
                  </div>
                  <Pill label="categoryWeights[cat]" value="+0.12" color={C.teal} />
                  <div style={{ height: 8 }} />
                  <Pill label="tagWeights[tag]" value="+0.05" color={C.teal} />
                </Card>
                <Card style={{ borderLeft: `4px solid ${C.red}` }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: C.red, marginBottom: 12 }}>
                    Swipe GAUCHE (pass) 👎
                  </div>
                  <Pill label="categoryWeights[cat]" value="-0.06" color={C.red} />
                  <div style={{ height: 8 }} />
                  <Pill label="tagWeights[tag]" value="-0.02" color={C.red} />
                </Card>
              </div>
              <div style={{ marginTop: 12, fontSize: 12, color: C.muted, textAlign: "center" }}>
                Tous les poids sont clampés dans l'intervalle [0.3, 2.0] — la décroissance est volontairement plus lente que la croissance.
              </div>
            </SubSection>

            <SubSection title="Cycle de mise à jour des rankings">
              <Card style={{ background: "#0F1624", border: "none" }}>
                <pre style={{ color: "#A8D8B9", fontSize: 12, lineHeight: 2, margin: 0, fontFamily: "'Fira Code', monospace", overflowX: "auto" }}>
{`Utilisateur swipe → likeProfile() / passProfile()
        │
        ├── recordSwipe(prefs, profile, direction)   // met à jour les poids
        │         └── setPrefs(updatedPrefs)         // state React
        │
        └── setTimeout(() => computeRankings(updatedPrefs), 400ms)
                    │
                    └── rankProfiles(updatedPrefs, allProfiles)
                                │
                                └── setRankedProfiles(sorted)
                                    setCurrentResultMap(scoresMap)
                                    // → UI re-render avec nouveaux scores`}
                </pre>
              </Card>
              <p style={{ fontSize: 12, color: C.muted, marginTop: 8 }}>
                Le délai de 400 ms est volontaire : il crée l'illusion que l'IA "réfléchit" après chaque swipe,
                renforçant la perception d'apprentissage en temps réel.
              </p>
            </SubSection>
          </Section>

          {/* ═══ 5. RECHERCHE & FILTRES ══════════════════════════════════════ */}
          <Section id="search" title="5. Recherche & pipeline de filtres">
            <Card style={{ marginBottom: 20 }}>
              <p style={{ fontSize: 13, color: C.mid, lineHeight: 1.8, margin: 0 }}>
                La recherche s'exécute entièrement en mémoire sur le tableau de profils locaux.
                Le pipeline applique successivement plusieurs prédicats, puis trie selon le critère choisi.
              </p>
            </Card>

            <SubSection title="Pipeline de filtres (ordre d'application)">
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {[
                  { step: "1", label: "Catégorie", desc: "Si catégorie ≠ 'Tout', filtre profile.category === selectedCategory" },
                  { step: "2", label: "Disponibilité", desc: "Si availableOnly → filtre profile.available === true" },
                  { step: "3", label: "Distance max", desc: "Si maxDistance → filtre profile.distance <= maxDistance (km)" },
                  { step: "4", label: "Note minimale", desc: "Si minRating → filtre profile.rating >= minRating" },
                  { step: "5", label: "Prix maximum", desc: "Si maxPrice → filtre profile.price <= maxPrice (DT/h)" },
                  { step: "6", label: "Recherche textuelle", desc: "query match sur name, role, ou tags (toLowerCase, includes)" },
                  { step: "7", label: "Tri", desc: "Selon sortBy : AI score (défaut), distance, rating, price_asc, price_desc" },
                ].map((item) => (
                  <div
                    key={item.step}
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: 12,
                      padding: "10px 16px",
                      background: "white",
                      border: `1px solid ${C.border}`,
                      borderRadius: 8,
                    }}
                  >
                    <div
                      style={{
                        width: 24,
                        height: 24,
                        borderRadius: "50%",
                        background: `linear-gradient(135deg, ${C.teal}, ${C.blue})`,
                        color: "white",
                        fontSize: 11,
                        fontWeight: 800,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      {item.step}
                    </div>
                    <div>
                      <span style={{ fontSize: 13, fontWeight: 700, color: C.dark }}>{item.label}</span>
                      <span style={{ fontSize: 12, color: C.muted, marginLeft: 8 }}>{item.desc}</span>
                    </div>
                  </div>
                ))}
              </div>
            </SubSection>

            <SubSection title="Implémentation du pipeline">
              <CodeBlock label="MatchHome.tsx — filteredAndSorted()">{`const filteredAndSorted = useMemo(() => {
  let result = [...profiles];

  // Étape 1 — Catégorie
  if (selectedCategory !== "Tout") {
    result = result.filter(p => p.category === selectedCategory);
  }

  // Étape 2 — Disponibilité
  if (filters.availableOnly) {
    result = result.filter(p => p.available);
  }

  // Étape 3 — Distance
  if (filters.maxDistance) {
    result = result.filter(p => p.distance <= filters.maxDistance);
  }

  // Étape 4 — Note
  if (filters.minRating) {
    result = result.filter(p => p.rating >= filters.minRating);
  }

  // Étape 5 — Prix
  if (filters.maxPrice) {
    result = result.filter(p => p.price <= filters.maxPrice);
  }

  // Étape 6 — Texte
  if (searchQuery.trim()) {
    const q = searchQuery.toLowerCase();
    result = result.filter(p =>
      p.name.toLowerCase().includes(q) ||
      p.role.toLowerCase().includes(q) ||
      p.tags.some(t => t.toLowerCase().includes(q))
    );
  }

  // Étape 7 — Tri
  switch (filters.sortBy) {
    case "distance":   return result.sort((a, b) => a.distance - b.distance);
    case "rating":     return result.sort((a, b) => b.rating - a.rating);
    case "price_asc":  return result.sort((a, b) => a.price - b.price);
    case "price_desc": return result.sort((a, b) => b.price - a.price);
    default:           // Score IA (défaut)
      return result.sort((a, b) =>
        (scoreMap[b.id] ?? 0) - (scoreMap[a.id] ?? 0)
      );
  }
}, [profiles, selectedCategory, filters, searchQuery, scoreMap]);`}</CodeBlock>
            </SubSection>

            <SubSection title="Options de tri & valeurs par défaut">
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                {[
                  { key: "ai_score", label: "Score IA", desc: "DESC — défaut recommandé" },
                  { key: "distance", label: "Distance", desc: "ASC — plus proche en premier" },
                  { key: "rating", label: "Note", desc: "DESC — mieux noté en premier" },
                  { key: "price_asc", label: "Prix croissant", desc: "ASC — moins cher en premier" },
                  { key: "price_desc", label: "Prix décroissant", desc: "DESC — plus cher en premier" },
                ].map((item) => (
                  <Card key={item.key} style={{ padding: "12px 14px" }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: C.dark }}>{item.label}</div>
                    <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>{item.desc}</div>
                    <Code>{item.key}</Code>
                  </Card>
                ))}
              </div>
            </SubSection>
          </Section>

          {/* ═══ 6. FLUX D'ÉTAT ══════════════════════════════════════════════ */}
          <Section id="state-flow" title="6. Flux d'état & MatchContext">
            <SubSection title="État géré par MatchContext">
              <Card style={{ marginBottom: 16 }}>
                <CodeBlock label="État React">{`interface MatchState {
  likedByMe:     string[];                        // IDs aimés par l'utilisateur
  matchedIds:    string[];                        // IDs avec match mutuel (peuvent chatter)
  conversations: Record<string, Message[]>;       // historique des messages par profil
}

// Actions
likeProfile(profileId: string, onMatch?: () => void): Promise<void>
addMessage(profileId: string, message: Message): Promise<void>
markAsRead(profileId: string): void
toggleMessageLike(profileId: string, messageId: string): void
unreadCount(profileId: string): number
lastMessage(profileId: string): Message | undefined`}</CodeBlock>
              </Card>
            </SubSection>

            <SubSection title="likeProfile() — détail">
              <CodeBlock label="MatchContext.tsx">{`async function likeProfile(profileId: string, onMatch?: () => void) {
  // 1. Mise à jour optimiste de l'état local
  setLikedByMe(prev => [...prev, profileId]);

  // 2. Appel API (avec fallback demo)
  const res = await likeProfileApi(profileId);

  let isMatch = false;

  if (res.success) {
    isMatch = res.data?.isMatch ?? false;
  } else {
    // Fallback simulation : 65% de chance de match
    await new Promise(resolve =>
      setTimeout(resolve, 900 + Math.random() * 2200)
    );
    isMatch = Math.random() < 0.65;
  }

  if (isMatch) {
    setMatchedIds(prev => [...prev, profileId]);
    onMatch?.();   // callback → affiche la notification de match
  }
}`}</CodeBlock>
            </SubSection>

            <SubSection title="Initialisation au montage">
              <CodeBlock label="useEffect — chargement initial">{`useEffect(() => {
  async function init() {
    // Charger les profils aimés
    const liked = await getLikedProfiles();
    if (liked.success && liked.data?.profileIds) {
      setLikedByMe(liked.data.profileIds);
    }

    // Charger les matches mutuels
    const matches = await getMatches();
    if (matches.success && matches.data) {
      setMatchedIds(matches.data.map(m => m.profileId));
    }
  }
  init();
}, []);`}</CodeBlock>
            </SubSection>
          </Section>

          {/* ═══ 7. API REST ═════════════════════════════════════════════════ */}
          <Section id="api" title="7. API REST">
            <Card style={{ marginBottom: 20 }}>
              <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
                <div>
                  <div style={{ fontSize: 11, color: C.muted, fontWeight: 600 }}>BASE URL</div>
                  <Code>http://197.13.18.7:3001</Code>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: C.muted, fontWeight: 600 }}>AUTH</div>
                  <Code>Authorization: Bearer &lt;JWT&gt;</Code>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: C.muted, fontWeight: 600 }}>CONTENT TYPE</div>
                  <Code>application/json</Code>
                </div>
              </div>
            </Card>

            <SubSection title="Authentification — /api/auth">
              <Card style={{ padding: 0, overflow: "hidden" }}>
                <ApiRow method="POST" path="/api/auth/send-otp" description="Envoie un OTP par SMS" auth={false} />
                <ApiRow method="POST" path="/api/auth/verify-otp" description="Vérifie l'OTP → retourne JWT + refreshToken" auth={false} />
                <ApiRow method="POST" path="/api/auth/social" description="Connexion Google / LinkedIn (token OAuth)" auth={false} />
                <ApiRow method="POST" path="/api/auth/register" description="Inscription complète (5 étapes)" auth={false} />
                <ApiRow method="POST" path="/api/auth/refresh" description="Rafraîchit le JWT via refreshToken" auth={false} />
                <ApiRow method="POST" path="/api/auth/logout" description="Invalide la session côté serveur" />
              </Card>
            </SubSection>

            <SubSection title="Matching — /api/matches">
              <Card style={{ padding: 0, overflow: "hidden" }}>
                <ApiRow method="GET"  path="/api/matches" description="Récupère la liste des matches mutuels → [{profileId, matchedAt}]" />
                <ApiRow method="GET"  path="/api/matches/liked" description="Récupère les profils aimés → {profileIds: string[]}" />
                <ApiRow method="POST" path="/api/matches/like/:profileId" description="Like un profil → {isMatch: boolean}" />
                <ApiRow method="POST" path="/api/matches/pass/:profileId" description="Passe un profil (sans match)" />
                <ApiRow method="GET"  path="/api/matches/status/:profileId" description="Statut du match avec un profil" />
              </Card>
            </SubSection>

            <SubSection title="Messagerie — /api/messages">
              <Card style={{ padding: 0, overflow: "hidden" }}>
                <ApiRow method="GET"  path="/api/messages" description="Liste toutes les conversations (preview + unread)" />
                <ApiRow method="GET"  path="/api/messages/:profileId" description="Récupère les messages d'une conversation" />
                <ApiRow method="POST" path="/api/messages/:profileId" description="Envoie un message {text: string}" />
                <ApiRow method="PUT"  path="/api/messages/:profileId/read" description="Marque la conversation comme lue" />
                <ApiRow method="PUT"  path="/api/messages/:profileId/:messageId/like" description="Like / unlike un message" />
              </Card>
            </SubSection>

            <SubSection title="Utilisateur — /api/user">
              <Card style={{ padding: 0, overflow: "hidden" }}>
                <ApiRow method="GET"  path="/api/user/me" description="Profil courant → AuthUser complet" />
                <ApiRow method="PUT"  path="/api/user/me" description="Mise à jour du profil utilisateur" />
                <ApiRow method="GET"  path="/api/user/wallet" description="Solde crédits + historique transactions" />
                <ApiRow method="POST" path="/api/user/free-action" description="Enregistre une action gratuite (10/jour max)" />
              </Card>
            </SubSection>

            <SubSection title="Admin — /api/admin (rôle admin requis)">
              <Card style={{ padding: 0, overflow: "hidden" }}>
                <ApiRow method="POST" path="/api/admin/auth/login" description="Login admin → JWT admin" auth={false} />
                <ApiRow method="GET"  path="/api/admin/stats" description="Statistiques globales (users, matches, revenue)" />
                <ApiRow method="GET"  path="/api/admin/users" description="Liste paginée des utilisateurs" />
                <ApiRow method="GET"  path="/api/admin/plans" description="Plans & abonnements actifs" />
              </Card>
            </SubSection>

            <SubSection title="Format de réponse générique">
              <CodeBlock label="ApiResponse<T>">{`// Succès
{ "success": true, "data": T, "message": "..." }

// Erreur
{ "success": false, "error": "Message d'erreur" }

// Réseau inaccessible (catch apiFetch)
{ "success": false, "error": "Impossible de joindre le serveur : Failed to fetch" }`}</CodeBlock>
            </SubSection>
          </Section>

          {/* ═══ 8. TYPES & STRUCTURES ══════════════════════════════════════ */}
          <Section id="types" title="8. Types & structures de données">
            <SubSection title="Profile">
              <CodeBlock>{`interface Profile {
  id:           string;
  name:         string;
  role:         string;         // ex. "Consultant Marketing"
  category:     string;        // ex. "Marketing"
  tags:         string[];      // ex. ["SEO", "Branding", "Meta Ads"]
  rating:       number;        // [0, 5]
  reviewCount:  number;
  price:        number;        // DT/heure
  distance:     number;        // km depuis l'utilisateur
  lat:          number;
  lng:          number;
  available:    boolean;
  schedule:     string;        // ex. "Lun-Sam, 9h-18h"
  languages:    string[];      // ex. ["français", "arabe"]
  bio:          string;
  image:        string;        // URL avatar
}`}</CodeBlock>
            </SubSection>

            <SubSection title="AuthUser & AuthTokens">
              <CodeBlock>{`interface AuthUser {
  id:           string;
  phone?:       string;
  email?:       string;
  prenom?:      string;
  nom?:         string;
  plan:         "free" | "premium" | "premium_plus";
  credits:      number;
  bonusPoints:  number;
  profileImage: string | null;
}

interface AuthTokens {
  token:        string;      // JWT — stocké dans localStorage matchy_token
  refreshToken?: string;    // stocké dans localStorage matchy_refresh_token
  expiresIn?:   number;     // secondes
}`}</CodeBlock>
            </SubSection>

            <SubSection title="Message">
              <CodeBlock>{`interface Message {
  id:        string;
  text:      string;
  from:      "me" | "them";
  timestamp: number;         // Unix ms
  read:      boolean;
  liked:     boolean;
}`}</CodeBlock>
            </SubSection>
          </Section>

          {/* ═══ 9. LIMITES & PLAN ═══════════════════════════════════════════ */}
          <Section id="limits" title="9. Limites selon le plan utilisateur">
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16 }}>
              {[
                {
                  plan: "Free",
                  color: C.muted,
                  features: [
                    "10 actions/jour (likes + passes)",
                    "Voir seulement 3 profils en Search",
                    "Pas d'accès au score IA détaillé",
                    "Messagerie limitée aux matches",
                  ],
                },
                {
                  plan: "Premium",
                  color: C.blue,
                  features: [
                    "Actions illimitées",
                    "Tous les profils en Search",
                    "Score IA visible + dimensions",
                    "Boost de visibilité ×2",
                  ],
                },
                {
                  plan: "Premium+",
                  color: C.purple,
                  features: [
                    "Tout Premium +",
                    "Top picks IA exclusifs",
                    "Stats avancées (qui m'a vu)",
                    "Filtre qui a aimé mon profil",
                    "Boost de visibilité ×5",
                  ],
                },
              ].map((item) => (
                <Card key={item.plan} style={{ borderTop: `4px solid ${item.color}` }}>
                  <div style={{ fontSize: 16, fontWeight: 800, color: item.color, marginBottom: 14 }}>
                    {item.plan}
                  </div>
                  <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
                    {item.features.map((f) => (
                      <li key={f} style={{ fontSize: 12, color: C.mid, marginBottom: 8, display: "flex", gap: 8 }}>
                        <span style={{ color: item.color }}>✓</span>
                        {f}
                      </li>
                    ))}
                  </ul>
                </Card>
              ))}
            </div>

            <SubSection title="Compteur d'actions libres">
              <CodeBlock label="userApi.ts + MatchHome.tsx">{`// Endpoint : POST /api/user/free-action
// Retourne : { remaining: number, resetAt: string (ISO) }

// Côté client (MatchHome)
const FREE_ACTIONS_PER_DAY = 10;

const handleSwipe = async (direction: "left" | "right") => {
  if (user?.plan === "free") {
    if (freeActionsLeft <= 0) {
      showUpgradeModal();
      return;
    }
    setFreeActionsLeft(prev => prev - 1);
    await recordFreeActionApi();  // sync avec le serveur
  }
  // ... reste du traitement
};`}</CodeBlock>
            </SubSection>
          </Section>

          {/* ── Footer ── */}
          <div
            style={{
              marginTop: 48,
              padding: "24px",
              background: C.dark,
              borderRadius: 12,
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: 13, color: "#AAA", lineHeight: 1.8 }}>
              <strong style={{ color: "white" }}>Matchy+</strong> — Documentation Technique v1.0
              <br />
              Moteur : <Code>AIMatchingEngine.ts</Code> · Context : <Code>MatchContext.tsx</Code> · API Base :{" "}
              <Code>http://197.13.18.7:3001</Code>
              <br />
              <span style={{ fontSize: 11, color: "#666", marginTop: 8, display: "block" }}>
                Généré le 2 juillet 2025 · Matchy+ SaaS Platform
              </span>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
