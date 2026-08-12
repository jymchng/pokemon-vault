import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  AddItemDto,
  CartDto,
  UpdateItemDto,
} from "./cart.dto";
import { CartRepository, mapCart } from "./cart.repository";

/** Cap a cart's total quantity per product (sane upper bound). */
const MAX_QTY_PER_PRODUCT = 1000;

@Injectable()
export class CartService {
  constructor(private readonly repo: CartRepository) {}

  private owner(userId?: string | null, sessionId?: string | null) {
    if (userId) return { userId };
    if (sessionId) return { sessionId };
    throw new BadRequestException("Missing cart owner (user or session)");
  }

  private async loadDto(owner: { userId?: string | null; sessionId?: string | null }): Promise<CartDto> {
    const cart = await this.repo.loadCartFor(owner);
    if (!cart) throw new NotFoundException("Cart not found");
    return cart;
  }

  /** GET /cart/items — server-priced cart (never trusts client prices). */
  async getCart(userId?: string | null, sessionId?: string | null): Promise<CartDto> {
    return this.loadDto(this.owner(userId, sessionId));
  }

  /** POST /cart/items — validate product + availability + price from DB. */
  async addItem(userId: string | null, sessionId: string | null, input: AddItemDto): Promise<CartDto> {
    const owner = this.owner(userId, sessionId);
    const cart = await this.repo.getOrCreateCart(owner);
    const product = await this.repo.findProductWithStock(input.productId);
    if (!product) throw new NotFoundException("Product not found or unavailable");

    const existing = await this.repo.findCart(cart.id);
    const currentQty = existing?.items.find((i) => i.productId === input.productId)?.quantity ?? 0;
    const available =
      product.inventoryItems?.[0]
        ? Number(product.inventoryItems[0].quantity) - Number(product.inventoryItems[0].reserved)
        : 0;
    const newQty = currentQty + input.quantity;
    if (newQty > MAX_QTY_PER_PRODUCT) {
      throw new BadRequestException("Quantity exceeds per-product cart limit");
    }
    if (newQty > available) {
      throw new BadRequestException(`Only ${available} available in stock`);
    }

    await this.repo.addItem(cart.id, input.productId, input.quantity);
    return this.loadDto(owner);
  }

  /** PATCH /cart/items/:productId — validate target quantity against stock. */
  async updateItem(userId: string | null, sessionId: string | null, productId: string, input: UpdateItemDto): Promise<CartDto> {
    const owner = this.owner(userId, sessionId);
    const cart = await this.repo.getOrCreateCart(owner);
    const full = await this.repo.findCart(cart.id);
    const existing = full?.items.find((i) => i.productId === productId);
    if (!existing) throw new NotFoundException("Item not in cart");

    const product = await this.repo.findProductWithStock(productId);
    if (!product) throw new NotFoundException("Product not found or unavailable");
    const available =
      product.inventoryItems?.[0]
        ? Number(product.inventoryItems[0].quantity) - Number(product.inventoryItems[0].reserved)
        : 0;
    if (input.quantity > MAX_QTY_PER_PRODUCT) {
      throw new BadRequestException("Quantity exceeds per-product cart limit");
    }
    if (input.quantity > available) {
      throw new BadRequestException(`Only ${available} available in stock`);
    }

    await this.repo.updateItemQuantity(cart.id, productId, input.quantity);
    return this.loadDto(owner);
  }

  /** DELETE /cart/items/:productId — remove a line. */
  async removeItem(userId: string | null, sessionId: string | null, productId: string): Promise<CartDto> {
    const owner = this.owner(userId, sessionId);
    const cart = await this.repo.getOrCreateCart(owner);
    await this.repo.removeItem(cart.id, productId);
    return this.loadDto(owner);
  }

  /** DELETE /cart/items — clear the whole cart. */
  async clear(userId: string | null, sessionId: string | null): Promise<CartDto> {
    const owner = this.owner(userId, sessionId);
    const cart = await this.repo.getOrCreateCart(owner);
    await this.repo.clearCart(cart.id);
    return this.loadDto(owner);
  }

  /** Claim an anonymous session cart for a signed-in user (login merge). */
  async adoptSessionCart(sessionId: string, userId: string): Promise<void> {
    await this.repo.adoptSessionCart(sessionId, userId);
  }
}
