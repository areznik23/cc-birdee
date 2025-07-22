import { NextRequest, NextResponse } from "next/server";
import { exec } from "child_process";
import { v4 as uuidv4 } from "uuid";
import { jobs } from "@/lib/claude-job-store";
import { homedir } from "os";
import { join } from "path";
import { readdir } from "fs/promises";

async function findLatestLogFile(projectPath: string): Promise<string | null> {
  try {
    const files = await readdir(projectPath);
    const logFiles = files
      .filter((f) => f.endsWith(".jsonl"))
      .map((f) => ({
        name: f,
        path: join(projectPath, f),
        match: f.match(
          /claude-code-(\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}\.\d{3}Z)\.jsonl/
        ),
      }))
      .filter((f) => f.match)
      .sort((a, b) => b.name.localeCompare(a.name));

    return logFiles[0]?.path || null;
  } catch {
    return null;
  }
}

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
    console.log(`\n[${jobId}] Starting: "${prompt}"`);

    // Build command with proper escaping
    const command = `claude -p "${prompt.replace(/"/g, '\\"')}"`;
    console.log(`[${jobId}] Executing command: ${command}`);
    
    // Use exec instead of spawn for better shell integration
    const child = exec(command, {
      cwd: process.cwd(),
      maxBuffer: 1024 * 1024 * 10, // 10MB buffer
      env: { ...process.env }
    }, (error, stdout, stderr) => {
      // This callback is called when the process completes
      job.output = stdout || "";
      
      // Include stderr in output for debugging
      if (stderr) {
        job.output += "\n[STDERR]:\n" + stderr;
      }
      
      if (error) {
        console.error(`[${jobId}] Exec error:`, error);
        job.error = error.message;
        if (stderr) {
          job.error += "\n" + stderr;
        }
        job.status = "failed";
        job.processInfo.exitCode = error.code || -1;
      } else {
        job.status = "completed";
        job.processInfo.exitCode = 0;
      }
      
      job.endTime = new Date();
      console.log(`[${jobId}] Process completed with status: ${job.status}`);
      console.log(`[${jobId}] Output length: ${job.output.length} chars`);
    });

    if (child.pid) {
      job.processInfo.pid = child.pid;
      console.log(`[${jobId}] Process started with PID: ${child.pid}`);
    }

    // Check for log file with retries
    const projectPath = join(
      homedir(),
      ".claude",
      "projects",
      "-Users-alexanderreznik-Desktop-cc-birdee"
    );
    
    let retries = 0;
    const maxRetries = 15; // Increased retries
    const checkForLogFile = async () => {
      try {
        const logFile = await findLatestLogFile(projectPath);
        if (logFile) {
          job.logFile = logFile;
          console.log(`[${jobId}] Log file detected: ${logFile}`);
        } else if (retries < maxRetries && job.status === "running") {
          retries++;
          console.log(`[${jobId}] Checking for log file... (attempt ${retries}/${maxRetries})`);
          setTimeout(checkForLogFile, 1000);
        } else {
          console.log(`[${jobId}] No log file found after ${retries} attempts`);
        }
      } catch (error) {
        console.error(`[${jobId}] Error finding log file:`, error);
      }
    };
    
    // Start checking after 2 seconds
    setTimeout(checkForLogFile, 2000);

    return NextResponse.json({ jobId, status: "started" });
  } catch (error) {
    console.error("Execute endpoint error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}