/**
 * Rounds a major-unit money amount to cents. Single rounding rule for cart,
 * checkout, POS and fiscalization totals so stored amounts match what the
 * gateway charges (Stripe converts with the same Math.round).
 */
export function roundMoney(amount: number): number {
    return Math.round(amount * 100) / 100;
}
