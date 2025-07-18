import { NextRequest, NextResponse } from 'next/server';
import { AnalyticsStorage } from '@/lib/services/analytics-storage';
import { AnalyticsAggregator } from '@/lib/services/analytics-aggregator';
import { generateTextReport } from '@/lib/services/report-generator';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('userId') || 'default-user';
    const format = searchParams.get('format') || 'text';
    
    console.log(`[Analytics Report] Generating report for user: ${userId}`);
    
    const storage = new AnalyticsStorage();
    const aggregator = new AnalyticsAggregator(storage);
    
    await storage.initialize();
    
    // Get user profile
    const profile = await storage.getUserProfile(userId);
    if (!profile) {
      return NextResponse.json(
        { error: 'No analytics data found. Process some sessions first.' },
        { status: 404 }
      );
    }
    
    // Get all processed sessions
    const sessions = await storage.listAnalyticsSessions();
    
    // Generate text-based report
    const report = generateTextReport(profile, sessions);
    
    if (format === 'json') {
      return NextResponse.json({ report, profile });
    }
    
    // Return plain text report
    return new NextResponse(report, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
      },
    });
    
  } catch (error) {
    console.error('[Analytics Report] Error generating report:', error);
    return NextResponse.json(
      { 
        error: 'Failed to generate analytics report',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}