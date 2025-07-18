import { NextRequest, NextResponse } from 'next/server';
import { O3Processor } from '@/lib/services/o3-processor';
import { AnalyticsStorage } from '@/lib/services/analytics-storage';
import { AnalyticsAggregator } from '@/lib/services/analytics-aggregator';
import { JSONLParser } from '@/lib/parsers/jsonl-parser';
import { SessionProcessor } from '@/lib/processors/session-processor';
import { FileService } from '@/lib/services/file-service';

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  console.log('[Analytics Process] Starting session processing...');
  
  try {
    const { sessionPath, userId = 'default-user', analysisDepth = 'standard' } = await request.json();
    console.log(`[Analytics Process] Processing request for:`, {
      sessionPath,
      userId,
      analysisDepth
    });
    
    if (!sessionPath) {
      console.error('[Analytics Process] Missing sessionPath');
      return NextResponse.json(
        { error: 'sessionPath is required' },
        { status: 400 }
      );
    }
    
    // Initialize services
    const fileService = new FileService();
    const parser = new JSONLParser({ strict: false });
    const processor = new SessionProcessor();
    const o3Processor = new O3Processor();
    const storage = new AnalyticsStorage();
    const aggregator = new AnalyticsAggregator(storage);
    
    await storage.initialize();
    
    // Read and parse session file
    console.log('[Analytics Process] Reading session file...');
    const content = await fileService.readSessionFile(sessionPath);
    console.log(`[Analytics Process] File size: ${(content.length / 1024).toFixed(1)}KB`);
    
    console.log('[Analytics Process] Parsing JSONL content...');
    const sessionMap = parser.parseAndGroupBySessions(content);
    console.log(`[Analytics Process] Found ${Object.keys(sessionMap).length} unique sessions`);
    
    console.log('[Analytics Process] Processing sessions...');
    const sessions = processor.processSessions(sessionMap);
    console.log(`[Analytics Process] Processed ${sessions.length} valid sessions`);
    
    if (!sessions.length) {
      console.warn('[Analytics Process] No valid sessions found in file');
      return NextResponse.json(
        { error: 'No valid sessions found in file' },
        { status: 400 }
      );
    }
    
    // Process each session through o3
    console.log(`[Analytics Process] Analyzing ${sessions.length} sessions with ${analysisDepth} depth...`);
    const analyticsResults = await Promise.all(
      sessions.map(async (session, index) => {
        console.log(`[Analytics Process] Processing session ${index + 1}/${sessions.length}: ${session.id}`);
        const sessionStartTime = Date.now();
        const result = await o3Processor.processSession({
          sessionData: session,
          analysisDepth: analysisDepth as 'quick' | 'standard' | 'deep'
        });
        
        // Create analytics session
        const analyticsSession = {
          session,
          insights: {
            ...result.insights,
            sessionId: session.id
          },
          processedAt: new Date(),
          processingVersion: '1.0.0'
        };
        
        // Save the processed session
        await storage.saveAnalyticsSession(analyticsSession);
        await storage.saveSessionInsight(session.id, analyticsSession.insights);
        
        console.log(`[Analytics Process] Session ${index + 1} completed in ${Date.now() - sessionStartTime}ms`);
        return analyticsSession;
      })
    );
    
    console.log('[Analytics Process] All sessions analyzed, aggregating user profile...');
    
    // Update user profile with new insights
    const updatedProfile = await aggregator.aggregateUserProfile(userId, analyticsResults);
    console.log(`[Analytics Process] User profile updated for ${userId}`);
    
    const totalTime = Date.now() - startTime;
    console.log(`[Analytics Process] ✅ Processing complete in ${totalTime}ms`);
    console.log(`[Analytics Process] Summary:`, {
      sessionsProcessed: analyticsResults.length,
      totalProcessingTime: `${totalTime}ms`,
      averageTimePerSession: `${Math.round(totalTime / analyticsResults.length)}ms`
    });
    
    return NextResponse.json({
      success: true,
      sessionsProcessed: analyticsResults.length,
      profile: updatedProfile,
      sessions: analyticsResults
    });
    
  } catch (error) {
    console.error('[Analytics Process] ❌ Error processing analytics:', error);
    return NextResponse.json(
      { error: 'Failed to process analytics', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}