export default function StoreShellLayout({ children }: { children: React.ReactNode }) {
  // Per-vendor pages render their own header in /store/[slug]/layout.tsx.
  // The /store directory list adds the order.store header inside its own page.
  return <>{children}</>;
}
