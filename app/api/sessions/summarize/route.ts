import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const { messages, initialPrompt } = await request.json();

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: "OpenAI API key not configured" },
        { status: 500 }
      );
    }

    // Prepare the context for the LLM
    const sessionContext = messages
      .filter((msg: any) => msg.role === 'assistant' && msg.content.length > 50)
      .slice(-10) // Last 10 substantial assistant messages
      .map((msg: any, index: number) => `Assistant Message ${index + 1}:\n${msg.content}`)
      .join('\n\n---\n\n');

    const prompt = `You are analyzing a Claude Code session. Given the initial user request and the session logs, provide:
1. A concise summary of what was actually accomplished
2. An alignment score (0-100) indicating how well the final result matches the initial request

Initial Request:
"${initialPrompt}"

Session Context (last few assistant messages):
${sessionContext}

Respond in the following JSON format:
{
  "summary": "A single sentence describing what was actually accomplished, focusing on concrete outcomes like files created/modified, features implemented, or problems solved.",
  "alignmentScore": <number between 0-100>
}

Where alignment score means:
- 0-20: Completely different from request
- 21-40: Minimal alignment, major deviations
- 41-60: Partial alignment, some key aspects missing
- 61-80: Good alignment with minor gaps
- 81-100: Excellent alignment, request fully satisfied`;

    const completion = await openai.chat.completions.create({
      model: "o3",
      messages: [
        {
          role: "system",
          content:
            "You are a technical writer who creates concise summaries of coding sessions. Always respond in valid JSON format.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      max_completion_tokens: 2048,
    });

    console.log(JSON.stringify(completion.choices[0], null, 2));

    const responseContent = completion.choices[0]?.message?.content?.trim();
    let summary = "Completed the requested task.";
    let alignmentScore = 50;

    try {
      if (responseContent) {
        const parsed = JSON.parse(responseContent);
        summary = parsed.summary || summary;
        alignmentScore = typeof parsed.alignmentScore === 'number' 
          ? Math.max(0, Math.min(100, parsed.alignmentScore)) 
          : alignmentScore;
      }
    } catch (parseError) {
      console.error("Error parsing response:", parseError);
      // If parsing fails, try to extract summary from plain text
      if (responseContent) {
        summary = responseContent.substring(0, 200);
      }
    }

    return NextResponse.json({ summary, alignmentScore });
  } catch (error) {
    console.error("Error generating summary:", error);
    return NextResponse.json(
      { error: "Failed to generate summary" },
      { status: 500 }
    );
  }
}
