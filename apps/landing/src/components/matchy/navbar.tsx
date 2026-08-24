'use client';

import { motion } from 'framer-motion';
import { Menu } from 'lucide-react';
import { useEffect, useState } from 'react';

const links = ['Service', 'Explorer', 'Utilisation', 'Télécharger'];

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <motion.header
      initial={{ y: -80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6, ease: 'easeOut' }}
      className={`fixed inset-x-0 top-0 z-50 transition-colors duration-300 ${
        scrolled ? 'bg-brand-blue/90 shadow-md backdrop-blur-md' : 'bg-transparent'
      }`}
    >
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4 text-white">
        <div className="flex items-center gap-1.5 text-xl font-extrabold">
          <span className="grid h-7 w-7 place-items-center rounded-md bg-white/15">M</span>
          Matchy<span className="text-brand-teal">+</span>
        </div>
        <ul className="hidden items-center gap-8 text-sm font-medium md:flex">
          {links.map((l) => (
            <li key={l}>
              <a href="#" className="opacity-90 transition-opacity hover:opacity-100">
                {l}
              </a>
            </li>
          ))}
        </ul>
        <button className="md:hidden" aria-label="Ouvrir le menu">
          <Menu className="h-6 w-6" />
        </button>
      </nav>
    </motion.header>
  );
}
