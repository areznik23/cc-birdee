import { NextRequest, NextResponse } from "next/server";
import { spawn } from "child_process";
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
    console.log(`\n[${jobId}] Starting (stdin): "${prompt}"`);

    // Try running claude with no arguments and pipe prompt to stdin
    console.log(`[${jobId}] Spawning: claude (with stdin)`);
    
    const child = spawn("claude", [], {
      cwd: process.cwd(),
      env: { ...process.env },
      shell: true
    });

    if (child.pid) {
      job.processInfo.pid = child.pid;
      console.log(`[${jobId}] Process started with PID: ${child.pid}`);
    }

    // Write prompt to stdin
    child.stdin.write(prompt + "\n");
    child.stdin.end();

    let outputBuffer = "";
    let errorBuffer = "";

    child.stdout.on("data", (data) => {
      const text = data.toString();
      outputBuffer += text;
      console.log(`[${jobId}] OUTPUT:`, text);
    });

    child.stderr.on("data", (data) => {
      const text = data.toString();
      errorBuffer += text;
      console.error(`[${jobId}] ERROR:`, text);
    });

    child.on("close", (code) => {
      job.output = outputBuffer;
      if (errorBuffer) {
        job.error = errorBuffer;
      }
      job.status = code === 0 ? "completed" : "failed";
      job.endTime = new Date();
      job.processInfo.exitCode = code;
      console.log(`[${jobId}] FINISHED with code ${code}`);
      console.log(`[${jobId}] Total output: ${outputBuffer.length} chars`);
    });

    child.on("error", (err) => {
      console.error(`[${jobId}] Process error:`, err);
      job.error = err.message;
      job.status = "failed";
      job.endTime = new Date();
    });

    // Check for log file with retries
    const projectPath = join(
      homedir(),
      ".claude",
      "projects",
      "-Users-alexanderreznik-Desktop-cc-birdee"
    );
    
    let retries = 0;
    const maxRetries = 15;
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
    console.error("Execute stdin endpoint error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}