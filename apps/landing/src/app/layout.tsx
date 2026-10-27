// `<html>` is rendered by `[lang]/layout.tsx` so it carries the page language. This pass-through
// root keeps `[lang]` a regular segment, which is what lets its localized not-found page render.
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return children;
}
