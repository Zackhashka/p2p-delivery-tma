/**
 * Calculate price for delivery
 */
export function calculateDeliveryPrice(weight_kg, price_per_kg) {
  return parseFloat((weight_kg * price_per_kg).toFixed(2));
}

/**
 * Check if dates overlap
 */
export function checkDateOverlap(start1, end1, start2, end2) {
  return start1 <= end2 && start2 <= end1;
}
