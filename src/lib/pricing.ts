import { PackType } from "@prisma/client";

export interface PricePack {
  id: string;
  name: string;
  type: PackType;
  price: number;
  quantity: number | null;
}

export interface PricingResult {
  packs: SelectedPack[];
  totalPrice: number;
  savings: number;
  unitPriceEquiv: number;
}

export interface SelectedPack {
  packId: string;
  packName: string;
  packType: PackType;
  price: number;
  coversPhotos: number;
}

export interface UpsellSuggestion {
  message: string;
  photosNeeded: number;
  packName: string;
  packPrice: number;
  currentTotal: number;
  savingsIfUpgrade: number;
}

const PACK_QUANTITIES: Record<PackType, number | null> = {
  SINGLE: 1,
  PACK_5: 5,
  PACK_10: 10,
  ALL_INCLUSIVE: null,
};

function getPackQuantity(pack: PricePack): number {
  return pack.quantity ?? PACK_QUANTITIES[pack.type] ?? 1;
}

/**
 * Find the optimal pack combination for a given number of photos.
 * Tries all reasonable combinations and returns the cheapest.
 */
export function calculateOptimalPricing(
  photoCount: number,
  availablePacks: PricePack[]
): PricingResult {
  if (photoCount === 0 || availablePacks.length === 0) {
    return { packs: [], totalPrice: 0, savings: 0, unitPriceEquiv: 0 };
  }

  const activePacks = availablePacks.filter((p) => p.type !== "ALL_INCLUSIVE");
  const allInclusive = availablePacks.find((p) => p.type === "ALL_INCLUSIVE");

  // Get single price for savings calculation
  const singlePack = availablePacks.find((p) => p.type === "SINGLE");
  const singlePrice = singlePack?.price ?? 0;
  const fullSinglePrice = singlePrice * photoCount;

  // Strategy 1: All-inclusive if available
  let bestResult: PricingResult | null = null;

  if (allInclusive) {
    bestResult = {
      packs: [
        {
          packId: allInclusive.id,
          packName: allInclusive.name,
          packType: allInclusive.type,
          price: allInclusive.price,
          coversPhotos: photoCount,
        },
      ],
      totalPrice: allInclusive.price,
      savings: fullSinglePrice > 0 ? fullSinglePrice - allInclusive.price : 0,
      unitPriceEquiv: allInclusive.price / photoCount,
    };
  }

  // Strategy 2: Greedy approach with available packs (sorted by price-per-photo)
  const sortedPacks = [...activePacks]
    .map((p) => ({ ...p, qty: getPackQuantity(p), perPhoto: p.price / getPackQuantity(p) }))
    .sort((a, b) => a.perPhoto - b.perPhoto);

  if (sortedPacks.length > 0) {
    const greedyResult = greedyCombination(photoCount, sortedPacks);
    if (!bestResult || greedyResult.totalPrice < bestResult.totalPrice) {
      bestResult = {
        ...greedyResult,
        savings: fullSinglePrice > 0 ? fullSinglePrice - greedyResult.totalPrice : 0,
      };
    }
  }

  // Strategy 3: Just singles
  if (singlePack && photoCount > 0) {
    const singlesResult: PricingResult = {
      packs: [
        {
          packId: singlePack.id,
          packName: singlePack.name,
          packType: singlePack.type,
          price: singlePrice * photoCount,
          coversPhotos: photoCount,
        },
      ],
      totalPrice: singlePrice * photoCount,
      savings: 0,
      unitPriceEquiv: singlePrice,
    };
    if (!bestResult || singlesResult.totalPrice < bestResult.totalPrice) {
      bestResult = singlesResult;
    }
  }

  return bestResult || { packs: [], totalPrice: 0, savings: 0, unitPriceEquiv: 0 };
}

function greedyCombination(
  remaining: number,
  packs: (PricePack & { qty: number; perPhoto: number })[]
): PricingResult {
  const selected: SelectedPack[] = [];
  let total = 0;
  let covered = 0;

  // Sort by descending quantity to use big packs first when they save money
  const byQtyDesc = [...packs].sort((a, b) => b.qty - a.qty);

  let left = remaining;
  for (const pack of byQtyDesc) {
    if (left <= 0) break;
    const qty = pack.qty;
    const count = Math.floor(left / qty);
    if (count > 0) {
      selected.push({
        packId: pack.id,
        packName: pack.name,
        packType: pack.type,
        price: pack.price * count,
        coversPhotos: qty * count,
      });
      total += pack.price * count;
      covered += qty * count;
      left -= qty * count;
    }
  }

  // Handle remainder with the cheapest per-photo option
  if (left > 0 && packs.length > 0) {
    // Check if it's cheaper to buy a bigger pack for the remainder
    const cheapestForRemainder = packs
      .filter((p) => p.qty >= left)
      .sort((a, b) => a.price - b.price)[0];

    const singlePack = packs.find((p) => p.qty === 1);
    const singleCost = singlePack ? singlePack.price * left : Infinity;

    if (cheapestForRemainder && cheapestForRemainder.price <= singleCost) {
      selected.push({
        packId: cheapestForRemainder.id,
        packName: cheapestForRemainder.name,
        packType: cheapestForRemainder.type,
        price: cheapestForRemainder.price,
        coversPhotos: left,
      });
      total += cheapestForRemainder.price;
      covered += left;
    } else if (singlePack) {
      selected.push({
        packId: singlePack.id,
        packName: singlePack.name,
        packType: singlePack.type,
        price: singlePack.price * left,
        coversPhotos: left,
      });
      total += singlePack.price * left;
      covered += left;
    }
  }

  return {
    packs: selected,
    totalPrice: total,
    savings: 0,
    unitPriceEquiv: covered > 0 ? total / covered : 0,
  };
}

/**
 * Generate upsell suggestions based on current selection and available packs.
 */
export function getUpsellSuggestions(
  photoCount: number,
  availablePacks: PricePack[]
): UpsellSuggestion[] {
  const suggestions: UpsellSuggestion[] = [];
  const currentPricing = calculateOptimalPricing(photoCount, availablePacks);

  // Check each multi-photo pack
  for (const pack of availablePacks) {
    const qty = getPackQuantity(pack);
    if (pack.type === "SINGLE" || qty <= photoCount) continue;

    const photosNeeded = qty - photoCount;
    if (photosNeeded > 0 && photosNeeded <= 5) {
      const packPricing = calculateOptimalPricing(qty, availablePacks);
      const savingsIfUpgrade = currentPricing.totalPrice - packPricing.totalPrice;

      if (packPricing.totalPrice <= currentPricing.totalPrice || photosNeeded <= 3) {
        suggestions.push({
          message: `Ajoutez ${photosNeeded} photo${photosNeeded > 1 ? "s" : ""} pour le ${pack.name} à ${pack.price.toFixed(2)}€`,
          photosNeeded,
          packName: pack.name,
          packPrice: pack.price,
          currentTotal: currentPricing.totalPrice,
          savingsIfUpgrade: Math.max(0, savingsIfUpgrade),
        });
      }
    }
  }

  // Check all-inclusive
  const allInclusive = availablePacks.find((p) => p.type === "ALL_INCLUSIVE");
  if (allInclusive && allInclusive.price < currentPricing.totalPrice) {
    suggestions.push({
      message: `Passez au ${allInclusive.name} pour ${allInclusive.price.toFixed(2)}€ et économisez ${(currentPricing.totalPrice - allInclusive.price).toFixed(2)}€`,
      photosNeeded: 0,
      packName: allInclusive.name,
      packPrice: allInclusive.price,
      currentTotal: currentPricing.totalPrice,
      savingsIfUpgrade: currentPricing.totalPrice - allInclusive.price,
    });
  }

  return suggestions.sort((a, b) => b.savingsIfUpgrade - a.savingsIfUpgrade);
}
