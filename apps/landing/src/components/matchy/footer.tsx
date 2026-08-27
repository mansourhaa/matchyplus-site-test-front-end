'use client';

import { useState } from 'react';

const services = ['Services', 'Explorer', 'Utilisation', "Obtenir l'application"];

export function Footer() {
  const [email, setEmail] = useState('');

  return (
    <footer className="bg-brand-blue text-white">
      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-10 px-5 py-14 md:grid-cols-3">
        <div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-matchy-white.svg" alt="Matchy+" className="h-7 w-auto" />
          <p className="mt-3 max-w-xs text-sm leading-relaxed text-white/70">
            Lorem ipsum dolor sit amet, consectetur adipiscing elit. Vivamus eget diam at mi
            sollicitudin.
          </p>
        </div>

        <div>
          <h3 className="mb-4 font-semibold">Nos services</h3>
          <ul className="space-y-2 text-sm text-white/70">
            {services.map((s) => (
              <li key={s}>
                <a href="#" className="transition-colors hover:text-white">
                  {s}
                </a>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="mb-4 font-semibold">S&apos;inscrire à notre newsletter</h3>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setEmail('');
            }}
            className="flex overflow-hidden rounded-lg bg-white/10 p-1"
          >
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="votre email"
              className="w-full bg-transparent px-3 py-2 text-sm text-white placeholder:text-white/50 focus:outline-none"
            />
            <button
              type="submit"
              className="bg-brand-teal hover:bg-brand-teal/90 shrink-0 rounded-md px-4 py-2 text-sm font-semibold text-white transition-colors"
            >
              Subscribe
            </button>
          </form>
        </div>
      </div>
      <div className="border-t border-white/10 py-5 text-center text-xs text-white/60">
        © {new Date().getFullYear()} Matchy+. Tous droits réservés.
      </div>
    </footer>
  );
}
