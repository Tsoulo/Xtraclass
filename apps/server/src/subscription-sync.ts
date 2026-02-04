import { paystackService } from './paystack-service';
import { db } from './db';
import { subscriptions } from '@shared/schema';
import { eq } from 'drizzle-orm';
import { addPaymentBuffer } from './payment-utils';

/**
 * Subscription Sync Service
 * Periodically checks Paystack for subscription status updates
 * This catches subscriptions cancelled directly on Paystack that don't trigger webhooks
 */

interface SyncResult {
  checked: number;
  updated: number;
  errors: number;
  details: Array<{
    userId: number;
    email: string;
    oldStatus: string;
    newStatus: string;
    paystackCode: string;
  }>;
}

/**
 * Map Paystack subscription status to our database status
 * Paystack statuses: active, non-renewing, attention, completed, cancelled
 * Our statuses: active, cancelled, expired
 */
function mapPaystackStatus(paystackStatus: string): 'active' | 'cancelled' | 'expired' {
  switch (paystackStatus) {
    case 'active':
      return 'active';
    case 'non-renewing':
      return 'cancelled';
    case 'cancelled':
    case 'completed':
      return 'expired';
    case 'attention':
      // Keep as active but flag for attention - payment failed but subscription still valid
      return 'active';
    default:
      console.warn(`Unknown Paystack status: ${paystackStatus}, treating as expired`);
      return 'expired';
  }
}

/**
 * Sync all subscription statuses from Paystack
 */
export async function syncSubscriptionStatuses(): Promise<SyncResult> {
  console.log('\n🔄 Starting subscription status sync from Paystack...');
  
  const result: SyncResult = {
    checked: 0,
    updated: 0,
    errors: 0,
    details: []
  };

  try {
    // Get all subscriptions from our database (active, cancelled, expired)
    const allSubscriptions = await db
      .select({
        id: subscriptions.id,
        userId: subscriptions.userId,
        status: subscriptions.status,
        paystackSubscriptionCode: subscriptions.paystackSubscriptionCode,
        paystackCustomerCode: subscriptions.paystackCustomerCode
      })
      .from(subscriptions);

    console.log(`📊 Found ${allSubscriptions.length} subscriptions in database`);

    // Fetch all subscriptions from Paystack (paginated)
    let page = 1;
    let hasMore = true;
    const paystackSubscriptionMap = new Map<string, any>();

    while (hasMore) {
      try {
        const response = await paystackService.listSubscriptions({
          perPage: 100,
          page
        });

        console.log(`📥 Fetched page ${page}: ${response.data.length} subscriptions from Paystack`);

        // Build a map of subscription codes to their data
        response.data.forEach(sub => {
          if (sub.subscription_code) {
            paystackSubscriptionMap.set(sub.subscription_code, sub);
          }
        });

        // Check if there are more pages
        const meta = (response as any).meta;
        hasMore = meta && page < meta.pageCount;
        page++;
      } catch (error) {
        console.error(`❌ Error fetching Paystack subscriptions page ${page}:`, error);
        result.errors++;
        hasMore = false;
      }
    }

    console.log(`📦 Total Paystack subscriptions fetched: ${paystackSubscriptionMap.size}`);

    // Compare and update our database
    for (const sub of allSubscriptions) {
      result.checked++;

      if (!sub.paystackSubscriptionCode) {
        console.log(`⚠️ Subscription ${sub.id} (user ${sub.userId}) has no Paystack code - skipping`);
        continue;
      }

      const paystackSub = paystackSubscriptionMap.get(sub.paystackSubscriptionCode);

      if (!paystackSub) {
        console.log(`⚠️ Subscription ${sub.paystackSubscriptionCode} not found on Paystack - may be deleted`);
        continue;
      }

      const paystackStatus = paystackSub.status;
      const mappedStatus = mapPaystackStatus(paystackStatus);

      // Check if status changed
      if (sub.status !== mappedStatus) {
        console.log(`🔄 Status change detected for user ${sub.userId}:`);
        console.log(`   Old: ${sub.status} → New: ${mappedStatus} (Paystack: ${paystackStatus})`);
        console.log(`   Subscription: ${sub.paystackSubscriptionCode}`);

        // Update the subscription
        const updateData: any = {
          status: mappedStatus
        };

        // If cancelled, set the cancelled date and next payment date
        if (mappedStatus === 'cancelled') {
          updateData.cancelledAt = new Date();
          
          // Set next payment date from Paystack if available (with buffer)
          if (paystackSub.next_payment_date) {
            updateData.nextPaymentDate = addPaymentBuffer(paystackSub.next_payment_date);
          }
        }

        await db
          .update(subscriptions)
          .set(updateData)
          .where(eq(subscriptions.id, sub.id));

        result.updated++;
        result.details.push({
          userId: sub.userId,
          email: paystackSub.customer?.email || 'unknown',
          oldStatus: sub.status,
          newStatus: mappedStatus,
          paystackCode: sub.paystackSubscriptionCode
        });

        console.log(`   ✅ Updated subscription ${sub.id} to ${mappedStatus}`);
      }
    }

    console.log('\n✅ Subscription sync completed');
    console.log(`   Checked: ${result.checked}`);
    console.log(`   Updated: ${result.updated}`);
    console.log(`   Errors: ${result.errors}`);

    return result;
  } catch (error) {
    console.error('❌ Error during subscription sync:', error);
    result.errors++;
    return result;
  }
}

/**
 * Start periodic subscription sync
 * Runs at midnight every day
 */
export function startSubscriptionSyncScheduler() {
  console.log('🕐 Starting subscription sync scheduler (runs at midnight daily)');

  // Run immediately on startup
  syncSubscriptionStatuses().catch(error => {
    console.error('Error in initial subscription sync:', error);
  });

  // Calculate milliseconds until next midnight
  function getMillisecondsUntilMidnight(): number {
    const now = new Date();
    const midnight = new Date(now);
    midnight.setHours(24, 0, 0, 0); // Next midnight
    return midnight.getTime() - now.getTime();
  }

  // Schedule next run at midnight
  function scheduleNextMidnightRun() {
    const msUntilMidnight = getMillisecondsUntilMidnight();
    
    setTimeout(() => {
      console.log('🌙 Running scheduled midnight subscription sync...');
      syncSubscriptionStatuses().catch(error => {
        console.error('Error in scheduled subscription sync:', error);
      });
      
      // Schedule next run (24 hours from now)
      scheduleNextMidnightRun();
    }, msUntilMidnight);
    
    const nextRun = new Date(Date.now() + msUntilMidnight);
    console.log(`📅 Next subscription sync scheduled for: ${nextRun.toLocaleString()}`);
  }

  scheduleNextMidnightRun();
}
