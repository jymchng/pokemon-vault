import { randomInt } from "node:crypto";
import {
  ConflictException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { OpenPackDto, PackOpeningDto } from "./packs.dto";
import { PacksRepository, RANDOMIZATION_VERSION } from "./packs.repository";
import { MetricsService } from "../observability/metrics.service";
import { AbuseProtectionService } from "../common/abuse-protection.service";
import { FeatureFlagService } from "../config/feature-flag.service";

/**
 * §34-37 Pack opening:
 * - The client NEVER sends which cards to receive — only { idempotencyKey }.
 * - The backend draws cards from the pack's set pool using secure
 *   crypto.randomInt, honoring the rarity distribution (rarity = weighted by
 *   card counts per rarity tier; fallback uniform).
 * - The opening is an immutable PackOpening record (opening_id, user_id,
 *   pack_id, generated cards, randomization_version, created_at).
 * - Idempotent: same idempotencyKey returns the SAME opening (no double pack).
 */
@Injectable()
export class PacksService {
  constructor(
    private readonly repo: PacksRepository,
    private readonly metrics: MetricsService,
    private readonly abuse: AbuseProtectionService,
    private readonly flags: FeatureFlagService,
  ) {}

  async list() {
    return this.repo.findAll();
  }

  async getBySlugOrId(slugOrId: string) {
    const pack = await this.repo.findBySlugOrId(slugOrId);
    if (!pack) throw new NotFoundException("Pack not found");
    return pack;
  }

  /**
   * Open a pack. Server-determined result; secure randomness; idempotent.
   */
  async open(packRef: string, userId: string, input: OpenPackDto): Promise<PackOpeningDto> {
    // §107: PACK_OPENING_ENABLED gates paid randomization at runtime.
    this.flags.assertEnabled("packOpeningEnabled");
    // §90: pack-opening abuse — per-user sliding window (extension point).
    const blocked = await this.abuse.checkAndRecord({
      scope: "pack-opening", actorKey: userId, limit: 20, windowSeconds: 300,
    });
    if (blocked) {
      throw new HttpException("Too many pack openings — try again later", HttpStatus.TOO_MANY_REQUESTS);
    }
    // Idempotency: replay returns the original opening.
    const existing = await this.repo.findOpeningByIdempotencyKey(input.idempotencyKey);
    if (existing) return existing;

    const pack = await this.repo.findBySlugOrId(packRef);
    if (!pack) throw new NotFoundException("Pack not found");

    const pool = await this.repo.loadCardPool(pack);
    if (pool.length === 0) {
      throw new ConflictException("Pack has no available cards");
    }

    const cardIds = this.drawCards(pool, pack.cardsPerPack);
    try {
      const opening = await this.repo.createOpening({
        idempotencyKey: input.idempotencyKey,
        userId,
        packId: pack.id,
        cardIds,
      });
      this.metrics.recordPackOpening(); // §67
      return opening;
    } catch (err: any) {
      // Concurrent duplicate idempotency key → return the winner's opening.
      if (err?.code === "P2002") {
        const winner = await this.repo.findOpeningByIdempotencyKey(input.idempotencyKey);
        if (winner) return winner;
      }
      throw err;
    }
  }

  async getOpening(id: string, userId: string) {
    const opening = await this.repo.findOpeningById(id);
    if (!opening) throw new NotFoundException("Opening not found");
    if (opening.userId !== userId) {
      throw new NotFoundException("Opening not found"); // IDOR-safe
    }
    return opening;
  }

  async myOpenings(userId: string) {
    return this.repo.listOpeningsForUser(userId);
  }

  /**
   * Server-side draw: rarity-weighted sampling using crypto.randomInt.
   * Cards are grouped by rarity tier; probability per tier is proportional to
   * the number of cards in that tier (configurable distribution: tiers with
   * more cards are more likely). Order is shuffled via randomInt swaps.
   */
  private drawCards(
    pool: Array<{ id: string; rarity: string | null }>,
    count: number,
  ): string[] {
    // Group by rarity (fallback "COMMON" for null).
    const byRarity = new Map<string, string[]>();
    for (const c of pool) {
      const key = c.rarity ?? "COMMON";
      if (!byRarity.has(key)) byRarity.set(key, []);
      byRarity.get(key)!.push(c.id);
    }
    const tiers = [...byRarity.entries()];

    // Rarity distribution: weight = tier size (rarer tiers have fewer cards →
    // proportionally less frequent). Configurable by editing this weighting.
    const weights = tiers.map(([, ids]) => Math.max(1, ids.length));
    const totalWeight = weights.reduce((s, w) => s + w, 0);

    const drawn: string[] = [];
    for (let i = 0; i < count; i++) {
      // Weighted tier pick via randomInt (secure).
      let roll = randomInt(totalWeight);
      let tierIdx = 0;
      for (let t = 0; t < weights.length; t++) {
        roll -= weights[t];
        if (roll < 0) {
          tierIdx = t;
          break;
        }
      }
      const tierCards = tiers[tierIdx][1];
      const cardId = tierCards[randomInt(tierCards.length)];
      drawn.push(cardId);
    }

    // Fisher-Yates shuffle with secure randomness (pack order).
    for (let i = drawn.length - 1; i > 0; i--) {
      const j = randomInt(i + 1);
      [drawn[i], drawn[j]] = [drawn[j], drawn[i]];
    }
    return drawn;
  }
}

export { RANDOMIZATION_VERSION };
