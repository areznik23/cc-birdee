import { NextRequest, NextResponse } from 'next/server';
import { FileService } from '@/lib/services/file-service';
import { JSONLParser } from '@/lib/parsers/jsonl-parser';

export async function POST(request: NextRequest) {
  try {
    const { filePath } = await request.json();
    
    if (!filePath) {
      return NextResponse.json(
        { error: 'File path is required' },
        { status: 400 }
      );
    }

    const fileService = new FileService();
    const parser = new JSONLParser();

    // Read file content
    const content = await fileService.readFile(filePath);
    
    // Parse JSONL content
    const entries = parser.parse(content);
    
    // Group by sessions
    const sessionMap = parser.parseAndGroupBySessions(content);
    
    // Convert map to array format
    const sessions = Array.from(sessionMap.entries()).map(([sessionId, entries]) => ({
      sessionId,
      entries,
      entryCount: entries.length,
      startTime: entries[0]?.timestamp,
      endTime: entries[entries.length - 1]?.timestamp
    }));

    return NextResponse.json({
      totalEntries: entries.length,
      sessionCount: sessions.length,
      sessions
    });
  } catch (error) {
    console.error('Error parsing session:', error);
    
    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to parse session file' },
      { status: 500 }
    );
  }
}