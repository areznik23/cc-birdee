import { NextRequest, NextResponse } from 'next/server';
import { O3Processor } from '@/lib/services/o3-processor';
import { AnalyticsStorage } from '@/lib/services/analytics-storage';
import { AnalyticsAggregator } from '@/lib/services/analytics-aggregator';
import { JSONLParser } from '@/lib/parsers/jsonl-parser';
import { SessionProcessor } from '@/lib/processors/session-processor';
import { FileService } from '@/lib/services/file-service';

export async function POST(request: NextRequest) {
  const batchStartTime = Date.now();
  console.log('[Analytics Batch] Starting batch processing...');
  
  try {
    const { 
      sessionPaths, 
      userId = 'default-user', 
      analysisDepth = 'standard',
      parallel = true 
    } = await request.json();
    
    console.log(`[Analytics Batch] Processing ${sessionPaths?.length || 0} files for user ${userId}`);
    console.log(`[Analytics Batch] Mode: ${parallel ? 'parallel' : 'sequential'}, Depth: ${analysisDepth}`);
    
    if (!sessionPaths || !Array.isArray(sessionPaths)) {
      console.error('[Analytics Batch] Invalid sessionPaths provided');
      return NextResponse.json(
        { error: 'sessionPaths array is required' },
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
    
    // Process function for a single session file
    const processSessionFile = async (sessionPath: string) => {
      console.log(`[Analytics Batch] Processing file: ${sessionPath}`);
      const fileStartTime = Date.now();
      
      try {
        const content = await fileService.readSessionFile(sessionPath);
        const sessionMap = parser.parseAndGroupBySessions(content);
        const sessions = processor.processSessions(sessionMap);
        
        if (!sessions.length) {
          console.warn(`[Analytics Batch] No valid sessions in file: ${sessionPath}`);
          return { path: sessionPath, error: 'No valid sessions found' };
        }
        
        console.log(`[Analytics Batch] Found ${sessions.length} sessions in file: ${sessionPath}`);
        
        const analyticsResults = await Promise.all(
          sessions.map(async (session) => {
            const result = await o3Processor.processSession({
              sessionData: session,
              analysisDepth: analysisDepth as 'quick' | 'standard' | 'deep'
            });
            
            const analyticsSession = {
              session,
              insights: {
                ...result.insights,
                sessionId: session.id
              },
              processedAt: new Date(),
              processingVersion: '1.0.0'
            };
            
            await storage.saveAnalyticsSession(analyticsSession);
            await storage.saveSessionInsight(session.id, analyticsSession.insights);
            
            return analyticsSession;
          })
        );
        
        console.log(`[Analytics Batch] File completed in ${Date.now() - fileStartTime}ms: ${sessionPath}`);
        return { path: sessionPath, sessions: analyticsResults };
      } catch (error) {
        console.error(`[Analytics Batch] Error processing file ${sessionPath}:`, error);
        return { 
          path: sessionPath, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        };
      }
    };
    
    // Process all session files
    let results;
    if (parallel) {
      results = await Promise.all(sessionPaths.map(processSessionFile));
    } else {
      results = [];
      for (const path of sessionPaths) {
        results.push(await processSessionFile(path));
      }
    }
    
    // Collect all successfully processed sessions
    const allAnalyticsSessions = results
      .filter(r => 'sessions' in r)
      .flatMap(r => r.sessions!);
    
    // Update user profile with all new insights
    let updatedProfile = null;
    if (allAnalyticsSessions.length > 0) {
      updatedProfile = await aggregator.aggregateUserProfile(userId, allAnalyticsSessions);
    }
    
    // Prepare summary
    const successCount = results.filter(r => 'sessions' in r).length;
    const errorCount = results.filter(r => 'error' in r).length;
    
    return NextResponse.json({
      success: true,
      summary: {
        totalFiles: sessionPaths.length,
        successfulFiles: successCount,
        failedFiles: errorCount,
        totalSessionsProcessed: allAnalyticsSessions.length
      },
      results,
      profile: updatedProfile
    });
    
  } catch (error) {
    console.error('Error in batch analytics processing:', error);
    return NextResponse.json(
      { error: 'Failed to process batch analytics', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// Get batch processing status
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('userId') || 'default-user';
    
    const storage = new AnalyticsStorage();
    await storage.initialize();
    
    // Get recent sessions to show processing status
    const recentSessions = await storage.listAnalyticsSessions(10);
    const profile = await storage.getUserProfile(userId);
    
    return NextResponse.json({
      recentlyProcessed: recentSessions.length,
      lastProcessedAt: recentSessions[0]?.processedAt || null,
      totalSessionsInProfile: profile?.totalSessions || 0
    });
    
  } catch (error) {
    console.error('Error fetching batch status:', error);
    return NextResponse.json(
      { error: 'Failed to fetch batch processing status' },
      { status: 500 }
    );
  }
}