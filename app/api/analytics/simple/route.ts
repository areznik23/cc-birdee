import { NextRequest, NextResponse } from 'next/server';
import { SimpleAnalyticsService } from '@/lib/services/simple-analytics';
import { AnalyticsStorage } from '@/lib/services/analytics-storage';

export async function GET(req: NextRequest) {
  try {
    const userId = req.nextUrl.searchParams.get('userId') || 'default-user';
    
    const storage = new AnalyticsStorage();
    const analyticsService = new SimpleAnalyticsService(storage);
    
    const analytics = await analyticsService.analyzeAllSessions(userId);
    
    return NextResponse.json(analytics);
  } catch (error) {
    console.error('Error getting simple analytics:', error);
    return NextResponse.json(
      { error: 'Failed to get analytics' },
      { status: 500 }
    );
  }
}