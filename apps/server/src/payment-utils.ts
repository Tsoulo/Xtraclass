/**
 * Payment utilities for subscription management
 */

/**
 * Add buffer to next payment date
 * Testing: 30 minutes buffer (for Paystack webhook delays)
 * Production: 5 days buffer (standard grace period)
 * 
 * Set PAYMENT_BUFFER_MINUTES environment variable:
 * - 30 (default for testing) = 30 minutes
 * - 7200 (for production) = 5 days
 */
export function addPaymentBuffer(paystackDate: Date | string): Date {
  const baseDate = new Date(paystackDate);
  
  // Get buffer minutes from env (default 30 for testing, 7200 for production = 5 days)
  const bufferMinutes = parseInt(process.env.PAYMENT_BUFFER_MINUTES || '30');
  const bufferMs = bufferMinutes * 60 * 1000;
  
  return new Date(baseDate.getTime() + bufferMs);
}
