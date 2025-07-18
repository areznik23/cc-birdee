import { NextRequest, NextResponse } from 'next/server';
import { AnalyticsStorage } from '@/lib/services/analytics-storage';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');
    
    const storage = new AnalyticsStorage();
    await storage.initialize();
    
    const sessions = await storage.listAnalyticsSessions(limit, offset);
    
    return NextResponse.json({
      sessions,
      pagination: {
        limit,
        offset,
        total: sessions.length
      }
    });
    
  } catch (error) {
    console.error('Error listing analytics sessions:', error);
    return NextResponse.json(
      { error: 'Failed to list analytics sessions' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const daysToKeep = parseInt(searchParams.get('daysToKeep') || '90');
    
    const storage = new AnalyticsStorage();
    await storage.initialize();
    
    const deletedCount = await storage.deleteOldSessions(daysToKeep);
    
    return NextResponse.json({
      success: true,
      deletedSessions: deletedCount,
      message: `Deleted ${deletedCount} sessions older than ${daysToKeep} days`
    });
    
  } catch (error) {
    console.error('Error cleaning up sessions:', error);
    return NextResponse.json(
      { error: 'Failed to clean up old sessions' },
      { status: 500 }
    );
  }
}