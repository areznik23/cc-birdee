import { NextRequest, NextResponse } from "next/server";
import { exec } from "child_process";
import { v4 as uuidv4 } from "uuid";
import { jobs } from "@/lib/claude-job-store";

export async function POST(request: NextRequest) {
  try {
    const { prompt } = await request.json();

    if (!prompt) {
      return NextResponse.json({ error: "Prompt required" }, { status: 400 });
    }

    const jobId = uuidv4();
    const job = {
      id: jobId,
      status: "running" as const,
      prompt,
      output: "",
      error: undefined,
      startTime: new Date(),
      endTime: undefined,
      processInfo: {
        pid: undefined as number | undefined,
        exitCode: undefined as number | undefined,
      },
      logFile: undefined as string | undefined,
    };

    jobs.set(jobId, job);
    console.log(`\n[${jobId}] Starting simple test: "${prompt}"`);

    // Try different command variations
    const commands = [
      `claude "${prompt}"`,
      `claude -p "${prompt}"`,
      `echo "${prompt}" | claude`,
      `claude --prompt "${prompt}"`
    ];
    
    let commandIndex = 0;
    let success = false;
    
    const tryNextCommand = () => {
      if (commandIndex >= commands.length) {
        job.status = "failed";
        job.error = "All command variations failed";
        job.endTime = new Date();
        return;
      }
      
      const command = commands[commandIndex];
      console.log(`[${jobId}] Trying: ${command}`);
      commandIndex++;
      
      exec(command, {
        cwd: process.cwd(),
        maxBuffer: 1024 * 1024 * 10,
        timeout: 30000, // 30 second timeout
        env: { ...process.env }
      }, (error, stdout, stderr) => {
        if (!success && (stdout && stdout.trim().length > 0 && !error)) {
          // This command worked!
          success = true;
          job.output = `[Command: ${command}]\n${stdout}`;
          job.status = "completed";
          job.processInfo.exitCode = 0;
          job.endTime = new Date();
          console.log(`[${jobId}] Success with: ${command}`);
        } else if (!success) {
          // Try next command
          console.log(`[${jobId}] Failed: ${command} - ${error?.message || stderr}`);
          if (commandIndex < commands.length) {
            tryNextCommand();
          } else {
            // All failed
            job.status = "failed";
            job.error = "All command variations failed";
            job.output = commands.map((cmd, i) => `Attempt ${i+1}: ${cmd} - Failed`).join('\n');
            job.endTime = new Date();
          }
        }
      });
    };
    
    // Start trying commands
    tryNextCommand();

    return NextResponse.json({ jobId, status: "started" });
  } catch (error) {
    console.error("Execute simple endpoint error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}