import { NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

export async function GET() {
  try {
    // Get full help output
    const helpResult = await execAsync("claude --help").catch(err => ({
      stdout: err.stdout || "",
      stderr: err.stderr || err.message
    }));
    
    const helpText = helpResult.stdout || "";
    
    // Parse help text to find command patterns
    const patterns = {
      hasPromptFlag: helpText.includes("-p") || helpText.includes("--prompt"),
      hasMessageFlag: helpText.includes("-m") || helpText.includes("--message"),
      hasStdinMention: helpText.includes("stdin") || helpText.includes("STDIN"),
      hasInteractiveMention: helpText.includes("interactive"),
      hasFileOption: helpText.includes("--file") || helpText.includes("-f"),
    };
    
    // Extract usage examples if present
    const usageMatch = helpText.match(/Usage:(.+?)(\n\n|$)/s);
    const examplesMatch = helpText.match(/Examples?:(.+?)(\n\n|$)/s);
    
    // Look for specific flags
    const flagMatches = helpText.match(/\s+-\w+,?\s+--\w+[^\n]+/g) || [];
    const flags = flagMatches.map(f => f.trim());
    
    return NextResponse.json({
      helpOutput: helpText,
      patterns,
      usage: usageMatch ? usageMatch[1].trim() : null,
      examples: examplesMatch ? examplesMatch[1].trim() : null,
      flags,
      suggestions: [
        patterns.hasPromptFlag ? "Try: claude -p 'your prompt'" : null,
        patterns.hasMessageFlag ? "Try: claude -m 'your message'" : null,
        patterns.hasStdinMention ? "Try: echo 'prompt' | claude" : null,
        patterns.hasFileOption ? "Try: claude -f prompt.txt" : null,
        !patterns.hasPromptFlag && !patterns.hasMessageFlag ? "Try: claude 'your prompt'" : null,
      ].filter(Boolean)
    });
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
}