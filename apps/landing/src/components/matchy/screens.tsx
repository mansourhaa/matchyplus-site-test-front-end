import {
  Bell,
  Check,
  ChevronLeft,
  Compass,
  Heart,
  Home,
  MapPin,
  MessageCircle,
  RotateCcw,
  Search,
  Star,
  X,
} from 'lucide-react';
import Image from 'next/image';

function BottomNav({ dark = false }: { dark?: boolean }) {
  return (
    <div
      className={`flex items-center justify-around border-t px-2 py-2.5 ${
        dark ? 'border-white/10' : 'border-brand-navy/10'
      }`}
    >
      <Home className="text-brand-teal h-4 w-4" />
      <Compass className="h-4 w-4 opacity-40" />
      <Star className="h-4 w-4 opacity-40" />
      <Bell className="h-4 w-4 opacity-40" />
      <MessageCircle className="h-4 w-4 opacity-40" />
    </div>
  );
}

function Chip({ children, active }: { children: React.ReactNode; active?: boolean }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-[3px] text-[7px] font-medium ${
        active
          ? 'border-brand-teal bg-brand-teal/10 text-brand-teal'
          : 'border-brand-navy/15 text-brand-navy/70'
      }`}
    >
      {children}
    </span>
  );
}

export function HeroScreen() {
  return (
    <div className="pb-1">
      <div className="flex items-center gap-2 px-3 py-1.5">
        <div className="h-6 w-6 overflow-hidden rounded-full">
          <Image
            src="/matchy/selfie-man.png"
            alt=""
            width={24}
            height={24}
            className="h-full w-full object-cover"
          />
        </div>
        <span className="text-brand-teal text-[11px] font-bold">Matchy</span>
      </div>
      <div className="relative mx-3 overflow-hidden rounded-xl">
        <Image
          src="/matchy/pro-man.png"
          alt="Profil professionnel"
          width={240}
          height={280}
          className="h-[168px] w-full object-cover"
        />
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-2 text-white">
          <p className="text-[10px] leading-tight font-bold">Roman, 41</p>
          <p className="text-[7px] opacity-80">Meilleur aluminium indépendant</p>
          <p className="text-[7px] opacity-70">7.3 km</p>
        </div>
      </div>
      <div className="flex flex-wrap gap-1 px-3 py-1.5">
        <Chip>Menuiserie</Chip>
        <Chip>Arts</Chip>
        <Chip>Aluminium</Chip>
        <Chip active>TECH</Chip>
        <Chip>Indépendant</Chip>
        <Chip>Service</Chip>
      </div>
      <div className="px-3">
        <p className="text-brand-navy/80 text-[8px] font-semibold">Objectifs actuels</p>
        <p className="text-brand-navy/50 mt-0.5 text-[6.5px] leading-snug">
          Développeur, proposer, dessin d&apos;exécution, faire une inspiration.
        </p>
      </div>
      <div className="flex items-center justify-center gap-4 py-2">
        <button className="bg-brand-navy/5 grid h-8 w-8 place-items-center rounded-full text-red-400">
          <X className="h-4 w-4" />
        </button>
        <button className="bg-brand-teal grid h-10 w-10 place-items-center rounded-full text-white shadow-lg">
          <Heart className="h-5 w-5" />
        </button>
        <button className="bg-brand-navy/5 grid h-8 w-8 place-items-center rounded-full text-amber-400">
          <RotateCcw className="h-4 w-4" />
        </button>
      </div>
      <BottomNav />
    </div>
  );
}

export function ObjectivesScreen() {
  return (
    <div className="pb-1">
      <div className="text-brand-navy flex items-center gap-2 px-3 py-2">
        <ChevronLeft className="h-3.5 w-3.5" />
        <span className="text-[11px] font-bold">Vos objectifs</span>
      </div>
      <div className="bg-brand-navy/10 h-px" />
      <div className="px-3 py-2">
        <p className="text-[9px] font-semibold">Vos centres d&apos;intérêts</p>
        <p className="text-brand-navy/50 text-[6.5px]">
          Quels sont vos centres d&apos;intérêt professionnels et personnels
        </p>
        <div className="border-brand-navy/15 mt-1.5 flex items-center justify-between rounded-md border px-2 py-1">
          <span className="text-brand-navy/40 text-[7px]">
            Sélectionnez un centre d&apos;intérêt
          </span>
          <span className="text-brand-teal text-[7px] font-semibold">Ajouter</span>
        </div>
        <div className="mt-1.5 flex flex-wrap gap-1">
          <Chip active>Marketing</Chip>
          <Chip active>Education</Chip>
          <Chip active>Finance</Chip>
          <Chip active>Recruiting</Chip>
          <Chip active>En</Chip>
        </div>
      </div>
      <div className="px-3">
        <p className="text-[9px] font-semibold">Ce que vous cherchez</p>
        <p className="text-brand-navy/50 text-[6.5px]">
          En quoi la communauté peut-elle vous aider ?
        </p>
        <div className="mt-1.5 space-y-1">
          {[
            ['Embaucher', 'Trouver un job'],
            ['Trouver des associés'],
            ['Investir dans des projets'],
            ['Trouver des investisseurs'],
            ['Développer mon business'],
            ['Recruter des freelance'],
            ['Trouver des projet freelance'],
            ['Me faire des amis', "Chercher l'inspiration"],
          ].map((row, i) => (
            <div key={i} className="flex flex-wrap gap-1">
              {row.map((c, j) => (
                <Chip
                  key={j}
                  active={c === 'Trouver des investisseurs' || c === "Chercher l'inspiration"}
                >
                  {c}
                </Chip>
              ))}
            </div>
          ))}
        </div>
      </div>
      <div className="p-3">
        <div className="bg-brand-teal rounded-md py-1.5 text-center text-[8px] font-semibold text-white">
          Enregistrer et continuer
        </div>
      </div>
    </div>
  );
}

export function FaceScanScreen() {
  return (
    <div className="relative flex h-[380px] flex-col bg-neutral-900 pb-2">
      <div className="flex items-center gap-2 px-3 py-2">
        <ChevronLeft className="h-3.5 w-3.5 text-white" />
      </div>
      <div className="relative mx-auto mt-2 h-24 w-24 overflow-hidden rounded-2xl ring-2 ring-white/30">
        <Image
          src="/matchy/selfie-man.png"
          alt=""
          width={96}
          height={96}
          className="h-full w-full object-cover"
        />
      </div>
      <div className="relative mx-auto mt-8 h-24 w-24">
        {[
          'left-0 top-0 border-l-2 border-t-2',
          'right-0 top-0 border-r-2 border-t-2',
          'left-0 bottom-0 border-l-2 border-b-2',
          'right-0 bottom-0 border-r-2 border-b-2',
        ].map((c) => (
          <span key={c} className={`absolute h-5 w-5 rounded-sm border-white/70 ${c}`} />
        ))}
      </div>
      <div className="mt-auto flex items-center justify-center gap-5 pb-4">
        <div className="grid h-6 w-6 place-items-center rounded-full border border-white/40 text-[8px] text-white/60">
          A
        </div>
        <div className="h-9 w-9 rounded-full border-4 border-white bg-white/20" />
        <RotateCcw className="h-5 w-5 text-white/60" />
        <div className="grid h-6 w-6 place-items-center rounded-full border border-white/40 text-[8px] text-white/60">
          :)
        </div>
      </div>
    </div>
  );
}

export function ExploreScreen() {
  return (
    <div className="pb-1">
      <div className="flex items-center justify-between px-3 py-1.5">
        <div className="flex items-center gap-1.5">
          <div className="h-5 w-5 overflow-hidden rounded-full">
            <Image
              src="/matchy/selfie-man.png"
              alt=""
              width={20}
              height={20}
              className="h-full w-full object-cover"
            />
          </div>
          <span className="text-brand-teal text-[11px] font-bold">Matchy</span>
        </div>
        <Search className="text-brand-navy/40 h-3.5 w-3.5" />
      </div>
      <div className="px-3">
        <p className="text-brand-navy text-[8px] font-semibold">Bienvenue Sur Matchy Explore</p>
        <div className="relative mt-1.5 overflow-hidden rounded-lg">
          <Image
            src="/matchy/business-meeting.png"
            alt=""
            width={220}
            height={90}
            className="h-[70px] w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 flex items-center gap-1 p-1.5 text-white">
            <Check className="text-brand-teal h-3 w-3" />
            <span className="text-[7px] font-semibold">Vérifier Mon Compte Sur Matchy</span>
          </div>
        </div>
        <div className="mt-1.5 grid grid-cols-2 gap-1.5">
          <div className="relative overflow-hidden rounded-lg">
            <Image
              src="/matchy/tech.png"
              alt=""
              width={110}
              height={70}
              className="h-[56px] w-full object-cover"
            />
            <span className="bg-brand-blue absolute top-1 left-1 rounded px-1 text-[7px] font-bold text-white">
              B2B
            </span>
          </div>
          <div className="relative overflow-hidden rounded-lg">
            <Image
              src="/matchy/students.png"
              alt=""
              width={110}
              height={70}
              className="h-[56px] w-full object-cover"
            />
          </div>
        </div>
        <p className="text-brand-navy mt-1.5 text-[8px] font-semibold">Pour Toi</p>
        <p className="text-brand-navy/50 text-[6.5px]">Recommandations basées sur ton profil</p>
      </div>
      <div className="mt-1.5">
        <BottomNav />
      </div>
    </div>
  );
}

export function ProfileScreen() {
  return (
    <div className="pb-1">
      <div className="px-3 py-1.5">
        <p className="text-brand-navy/70 text-[8px] font-semibold">Information Technologie</p>
      </div>
      <div className="relative mx-3 overflow-hidden rounded-xl">
        <Image
          src="/matchy/pro-woman.png"
          alt="Profil"
          width={220}
          height={220}
          className="h-[150px] w-full object-cover"
        />
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-2 text-white">
          <p className="text-[10px] font-bold">Nour, 27</p>
          <div className="flex items-center gap-0.5 text-[7px] opacity-80">
            <MapPin className="h-2.5 w-2.5" /> 1.2 km
          </div>
        </div>
      </div>
      <div className="flex flex-wrap gap-1 px-3 py-1.5">
        <Chip>UX Design</Chip>
        <Chip active>Startup</Chip>
        <Chip>SaaS</Chip>
      </div>
      <div className="flex items-center justify-center gap-3 py-2">
        <button className="bg-brand-navy/5 grid h-7 w-7 place-items-center rounded-full text-red-400">
          <X className="h-3.5 w-3.5" />
        </button>
        <button className="bg-brand-teal grid h-9 w-9 place-items-center rounded-full text-white shadow-lg">
          <Heart className="h-4 w-4" />
        </button>
        <button className="bg-brand-navy/5 grid h-7 w-7 place-items-center rounded-full text-amber-400">
          <Star className="h-3.5 w-3.5" />
        </button>
      </div>
      <BottomNav />
    </div>
  );
}

function Toggle({ on }: { on?: boolean }) {
  return (
    <span
      className={`inline-flex h-3.5 w-6 items-center rounded-full px-0.5 ${on ? 'bg-brand-teal justify-end' : 'bg-brand-navy/20 justify-start'}`}
    >
      <span className="h-2.5 w-2.5 rounded-full bg-white" />
    </span>
  );
}

export function ContactsScreen() {
  return (
    <div className="text-brand-navy pb-1">
      <div className="flex items-center gap-2 px-3 py-2">
        <ChevronLeft className="h-3.5 w-3.5" />
        <span className="text-[10px] font-bold">Recherche De Contacts</span>
      </div>
      <div className="flex gap-1 px-3">
        <Chip active>À proximité</Chip>
        <Chip>Autre ville</Chip>
        <Chip>Personne</Chip>
        <Chip>Entreprise</Chip>
      </div>
      <div className="space-y-2 px-3 py-2 text-[7px]">
        <div>
          <p className="font-semibold">Localisation</p>
          <div className="border-brand-navy/15 text-brand-navy/50 mt-1 rounded border px-2 py-1">
            96 rue Farhat Hached · 4000 sousse
          </div>
        </div>
        <div>
          <p className="font-semibold">Distance maximum</p>
          <div className="mt-1.5 flex items-center gap-1">
            <span className="bg-brand-teal h-1 flex-1 rounded-full" />
            <span className="bg-brand-teal h-2.5 w-2.5 rounded-full" />
            <span className="bg-brand-navy/15 h-1 w-6 rounded-full" />
            <span className="text-brand-navy/50">80 km</span>
          </div>
        </div>
        <div>
          <p className="font-semibold">Montrer moi par</p>
          <div className="border-brand-navy/15 text-brand-navy/50 mt-1 rounded border px-2 py-1">
            Entreprise
          </div>
        </div>
        <div>
          <p className="font-semibold">Tranche d&apos;âge</p>
          <div className="mt-1.5 flex items-center gap-1">
            <span className="bg-brand-teal h-2.5 w-2.5 rounded-full" />
            <span className="bg-brand-teal h-1 flex-1 rounded-full" />
            <span className="bg-brand-teal h-2.5 w-2.5 rounded-full" />
            <span className="text-brand-navy/50">18-60</span>
          </div>
        </div>
        <div>
          <p className="font-semibold">Filtrer par catégorie professionnelle</p>
          <div className="mt-1 flex gap-1">
            <Chip active>Marketing</Chip>
            <Chip>Arts</Chip>
            <Chip active>Technology</Chip>
          </div>
        </div>
        <p className="font-semibold">Voir exclusivement les membres du réseau</p>
        <div className="flex items-center justify-between">
          <span className="text-brand-navy/60">Ma Société</span>
          <Toggle on />
        </div>
        <div className="flex items-center justify-between">
          <span className="text-brand-navy/60">Club De Golf</span>
          <Toggle />
        </div>
      </div>
      <BottomNav />
    </div>
  );
}
