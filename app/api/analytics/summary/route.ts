import { NextRequest, NextResponse } from 'next/server';
import { AnalyticsStorage } from '@/lib/services/analytics-storage';
import { AnalyticsAggregator } from '@/lib/services/analytics-aggregator';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('userId') || 'default-user';
    
    console.log(`[Analytics Summary] Fetching summary for user: ${userId}`);
    
    const storage = new AnalyticsStorage();
    const aggregator = new AnalyticsAggregator(storage);
    
    await storage.initialize();
    
    // Create comprehensive analytics summary
    const summary = await aggregator.createUserAnalyticsSummary(userId);
    
    if (!summary) {
      console.log('[Analytics Summary] No profile found for user');
      return NextResponse.json(
        { error: 'No analytics data found. Process some sessions first.' },
        { status: 404 }
      );
    }
    
    console.log('[Analytics Summary] Successfully created summary');
    return NextResponse.json(summary);
    
  } catch (error) {
    console.error('[Analytics Summary] Error creating analytics summary:', error);
    console.error('[Analytics Summary] Stack trace:', error instanceof Error ? error.stack : 'No stack trace');
    
    return NextResponse.json(
      { 
        error: 'Failed to create analytics summary',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}