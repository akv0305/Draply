/**
 * Customer route group layout.
 * Public browsing (catalog, product pages) is allowed without auth.
 * Account/order actions are protected by individual pages or sub-layouts.
 * No role gate here — the middleware handles redirect for truly private pages.
 */
export default function CustomerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
