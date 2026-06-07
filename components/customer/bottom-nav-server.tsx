// Server Component wrapper that fetches the live cart count and passes it
// to the Client Component BottomNav for badge rendering.
// This file must remain a Server Component (no "use client").
import { getCartSummary } from "@/lib/cart/get-cart-summary";
import BottomNav from "./bottom-nav";

export default async function BottomNavServer() {
  const { itemCount } = await getCartSummary();
  return <BottomNav cartCount={itemCount} />;
}
