import { NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

export async function GET() {
  try {
    // Test 1: Check if claude exists
    const whichResult = await execAsync("which claude");
    
    // Test 2: Get claude version/help
    const helpResult = await execAsync("claude --help").catch(err => ({
      stdout: "",
      stderr: err.message
    }));
    
    // Test 3: Try different syntaxes
    const tests = [];
    
    // Look for non-interactive flags in help
    const helpText = helpResult.stdout || "";
    const nonInteractiveFlags = [];
    
    if (helpText.includes("--no-interactive")) nonInteractiveFlags.push("--no-interactive");
    if (helpText.includes("--non-interactive")) nonInteractiveFlags.push("--non-interactive");
    if (helpText.includes("--batch")) nonInteractiveFlags.push("--batch");
    if (helpText.includes("--yes")) nonInteractiveFlags.push("--yes");
    if (helpText.includes("-y")) nonInteractiveFlags.push("-y");
    if (helpText.includes("--auto")) nonInteractiveFlags.push("--auto");
    if (helpText.includes("--force")) nonInteractiveFlags.push("--force");
    
    // Test with potential non-interactive flags
    for (const flag of nonInteractiveFlags) {
      const test = await execAsync(`claude ${flag} -p "What is 2+2?"`).catch(err => ({
        stdout: "",
        stderr: err.message || err.toString()
      }));
      tests.push({ syntax: `claude ${flag} -p "What is 2+2?"`, ...test });
    }
    
    // Test with timeout to see if it hangs
    const timeoutTest = await Promise.race([
      execAsync('claude -p "What is 2+2?"'),
      new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout after 5s")), 5000))
    ]).catch(err => ({
      stdout: "",
      stderr: err.message || "Command timed out - likely waiting for input"
    }));
    tests.push({ syntax: 'claude -p "What is 2+2?" (5s timeout)', ...timeoutTest });
    
    // Test echo vs real prompt
    const echoTest = await execAsync('claude -p "echo test123"').catch(err => ({
      stdout: "",
      stderr: err.message || err.toString()
    }));
    tests.push({ syntax: 'claude -p "echo test123"', ...echoTest });
    
    return NextResponse.json({
      claudePath: whichResult.stdout.trim(),
      helpFlags: {
        found: nonInteractiveFlags,
        helpContains: {
          interactive: helpText.includes("interactive"),
          confirm: helpText.includes("confirm"),
          yes: helpText.includes("yes") || helpText.includes("-y"),
        }
      },
      tests,
      suggestion: nonInteractiveFlags.length > 0 
        ? `Try using: claude ${nonInteractiveFlags[0]} -p "your prompt"`
        : "No non-interactive flags found in help"
    });
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
}