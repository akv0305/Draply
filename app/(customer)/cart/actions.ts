"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/prisma";
import { getCurrentUser } from "@/lib/auth/current-user";
import { ok, err, type Result } from "@/lib/utils/result";

// ── Helper: get-or-create the user's single cart row ─────────────────────────
async function getOrCreateCart(userId: string) {
  const existing = await prisma.cart.findUnique({ where: { userId } });
  if (existing) return existing;
  return prisma.cart.create({ data: { userId } });
}

// ════════════════════════════════════════════════════════════════════════════
// 1. ADD to cart
// If variant already in cart, increment qty by the requested amount.
// ════════════════════════════════════════════════════════════════════════════
export async function addToCart(
  variantId: string,
  qty: number = 1
): Promise<Result<{ cartItemId: string }>> {
  if (qty < 1 || qty > 10)
    return err("INVALID_QTY", "Quantity must be 1-10");

  const user = await getCurrentUser();
  if (!user) return err("UNAUTHENTICATED", "Please sign in to add to cart");

  const cart = await getOrCreateCart(user.id);

  // Validate variant exists and product is active
  const variant = await prisma.variant.findUnique({
    where: { id: variantId },
    include: { product: { select: { isActive: true } } },
  });
  if (!variant || !variant.product.isActive)
    return err("VARIANT_NOT_FOUND", "Item is no longer available");

  // Upsert by unique [cartId, variantId]
  const item = await prisma.cartItem.upsert({
    where: { cartId_variantId: { cartId: cart.id, variantId } },
    create: { cartId: cart.id, variantId, qty },
    update: { qty: { increment: qty } },
  });

  revalidatePath("/cart");
  revalidatePath("/", "layout"); // refresh badge in bottom nav
  return ok({ cartItemId: item.id });
}

// ════════════════════════════════════════════════════════════════════════════
// 2. UPDATE qty (absolute); qty=0 deletes the item
// ════════════════════════════════════════════════════════════════════════════
export async function updateCartItemQty(
  cartItemId: string,
  qty: number
): Promise<Result<{ deleted: boolean }>> {
  if (qty < 0 || qty > 10)
    return err("INVALID_QTY", "Quantity must be 0-10");

  const user = await getCurrentUser();
  if (!user) return err("UNAUTHENTICATED", "Please sign in");

  const item = await prisma.cartItem.findUnique({
    where: { id: cartItemId },
    include: { cart: { select: { userId: true } } },
  });
  if (!item || item.cart.userId !== user.id)
    return err("NOT_FOUND", "Item not found");

  if (qty === 0) {
    await prisma.cartItem.delete({ where: { id: cartItemId } });
    revalidatePath("/cart");
    revalidatePath("/", "layout");
    return ok({ deleted: true });
  }

  await prisma.cartItem.update({ where: { id: cartItemId }, data: { qty } });
  revalidatePath("/cart");
  revalidatePath("/", "layout");
  return ok({ deleted: false });
}

// ════════════════════════════════════════════════════════════════════════════
// 3. REMOVE a single cart item
// ════════════════════════════════════════════════════════════════════════════
export async function removeCartItem(
  cartItemId: string
): Promise<Result<true>> {
  const user = await getCurrentUser();
  if (!user) return err("UNAUTHENTICATED", "Please sign in");

  const item = await prisma.cartItem.findUnique({
    where: { id: cartItemId },
    include: { cart: { select: { userId: true } } },
  });
  if (!item || item.cart.userId !== user.id)
    return err("NOT_FOUND", "Item not found");

  await prisma.cartItem.delete({ where: { id: cartItemId } });
  revalidatePath("/cart");
  revalidatePath("/", "layout");
  return ok(true);
}

// ════════════════════════════════════════════════════════════════════════════
// 4. CLEAR entire cart
// ════════════════════════════════════════════════════════════════════════════
export async function clearCart(): Promise<Result<{ deletedCount: number }>> {
  const user = await getCurrentUser();
  if (!user) return err("UNAUTHENTICATED", "Please sign in");

  const cart = await prisma.cart.findUnique({ where: { userId: user.id } });
  if (!cart) return ok({ deletedCount: 0 });

  const res = await prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
  revalidatePath("/cart");
  revalidatePath("/", "layout");
  return ok({ deletedCount: res.count });
}
