export function calculateReaderShare(totalCents: number): number {
  return Math.floor(totalCents * 0.70);
}

export function calculatePlatformShare(totalCents: number): number {
  return totalCents - calculateReaderShare(totalCents);
}

export function calculateSessionCost(durationMinutes: number, pricePerMinute: number): number {
  return Math.ceil(durationMinutes * pricePerMinute);
}

export function getBillingTicks(startedAt: Date, pricePerMinute: number): Array<{ tickNumber: number; dueAt: Date; amount: number }> {
  return [];
}

export function isLowBalance(balanceCents: number, pricePerMinute: number): boolean {
  return balanceCents < pricePerMinute * 2;
}
