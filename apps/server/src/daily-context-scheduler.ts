import { globalContextService } from './global-context-service';

/**
 * Daily scheduler for generating global context
 * This should be called once per day to collect and analyze all student activities
 */
export class DailyContextScheduler {
  private isRunning = false;
  private lastRunDate: string | null = null;

  /**
   * Check if we need to run daily context generation
   */
  shouldRunDaily(): boolean {
    const today = new Date().toISOString().split('T')[0];
    return this.lastRunDate !== today && !this.isRunning;
  }

  /**
   * Run daily context generation for all students
   */
  async runDailyGeneration(): Promise<void> {
    if (this.isRunning) {
      console.log('📅 Daily context generation already running, skipping...');
      return;
    }

    const today = new Date().toISOString().split('T')[0];
    
    if (this.lastRunDate === today) {
      console.log('📅 Daily context already generated for today, skipping...');
      return;
    }

    this.isRunning = true;
    
    try {
      console.log(`🌅 Starting daily global context generation for ${today}`);
      
      await globalContextService.generateDailyGlobalContextForAllStudents(today);
      
      this.lastRunDate = today;
      console.log(`✅ Daily global context generation completed for ${today}`);
      
    } catch (error) {
      console.error('❌ Error in daily context generation:', error);
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Start the daily scheduler
   * Checks every hour if daily generation needs to run
   */
  start(): void {
    console.log('📅 Starting daily context scheduler...');
    
    // Run immediately if needed
    if (this.shouldRunDaily()) {
      this.runDailyGeneration();
    }
    
    // Check every hour
    setInterval(() => {
      if (this.shouldRunDaily()) {
        this.runDailyGeneration();
      }
    }, 60 * 60 * 1000); // 1 hour
    
    console.log('✅ Daily context scheduler started');
  }

  /**
   * Force run daily generation (useful for testing or manual triggers)
   */
  async forceRun(contextDate?: string): Promise<void> {
    const date = contextDate || new Date().toISOString().split('T')[0];
    
    console.log(`🔄 Force running daily global context generation for ${date}`);
    
    try {
      await globalContextService.generateDailyGlobalContextForAllStudents(date);
      console.log(`✅ Force run completed for ${date}`);
    } catch (error) {
      console.error(`❌ Force run failed for ${date}:`, error);
      throw error;
    }
  }
}

export const dailyContextScheduler = new DailyContextScheduler();