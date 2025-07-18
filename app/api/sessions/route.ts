import { NextRequest, NextResponse } from 'next/server';
import { FileService } from '@/lib/services/file-service';
import { JSONLParser } from '@/lib/parsers/jsonl-parser';

export async function GET(request: NextRequest) {
  try {
    const fileService = new FileService();
    
    // Check if directory exists
    const dirExists = await fileService.directoryExists();
    if (!dirExists) {
      return NextResponse.json(
        { error: 'Claude projects directory not found. Please ensure Claude Code is installed and has created session logs.' },
        { status: 404 }
      );
    }

    // List all session files
    const files = await fileService.listSessionFiles();
    
    if (files.length === 0) {
      return NextResponse.json(
        { files: [], message: 'No session files found. Start using Claude Code to generate logs.' },
        { status: 200 }
      );
    }

    return NextResponse.json({ files });
  } catch (error) {
    console.error('Error listing sessions:', error);
    return NextResponse.json(
      { error: 'Failed to list session files' },
      { status: 500 }
    );
  }
}