import { NextRequest, NextResponse } from 'next/server';
import { OpenAI } from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const { task, context } = await request.json();

    if (!task) {
      return NextResponse.json({ error: 'Task is required' }, { status: 400 });
    }

    const contextInfo = context ? `
Current context from the user's environment:
${context.claudeAnalysis ? `Claude's Analysis: ${context.claudeAnalysis}` : ''}
${context.gitBranch ? `- Git branch: ${context.gitBranch}` : ''}
${context.gitStatus ? `- Git status: ${context.gitStatus || 'no changes'}` : ''}
${context.currentDirectory ? `- Current directory: ${context.currentDirectory}` : ''}
${context.files ? `- Files in directory: ${context.files.split('\n').slice(0, 5).join(', ') + '...'}` : ''}
` : '';

    const systemPrompt = `You are a context-gathering assistant for developers using Claude Code. 
Your job is to analyze a task description and identify what context Claude would need to complete it without asking follow-up questions.

${contextInfo}

Based on common patterns like:
- Manual file context retrieval (33% of prompts)
- Git branch management (11% of prompts)  
- UI component changes (9% of prompts)
- Logging/debugging tasks (9% of prompts)

Generate 2-3 specific questions that would gather ALL necessary context. Use the environment context above to make questions more specific.
Then create a prompt template with placeholders {0}, {1}, {2} for the answers.

Return a JSON object with:
{
  "questions": ["question1", "question2", "question3"],
  "template": "Enhanced prompt with {0}, {1}, {2} placeholders"
}

Make questions specific and actionable. The template should include the original task plus all context needed.`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Task: ${task}` }
      ],
      temperature: 0.3,
      response_format: { type: 'json_object' }
    });

    const response = completion.choices[0]?.message?.content;
    if (!response) {
      throw new Error('No response from OpenAI');
    }

    const data = JSON.parse(response);
    
    return NextResponse.json({
      questions: data.questions || [],
      template: data.template || ''
    });

  } catch (error) {
    console.error('Error enhancing prompt:', error);
    return NextResponse.json(
      { error: 'Failed to enhance prompt' },
      { status: 500 }
    );
  }
}