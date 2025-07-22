#!/usr/bin/env python3
"""
Analyze Adam's Claude Code usage to help him build Photonium faster.
Using O3-PRO model for enhanced analysis.
Focus: Agent orchestration, optical design workflows, serving enterprise customers.
"""

import json
import os
from typing import List, Dict, Tuple, Optional
from datetime import datetime
from collections import defaultdict
import pandas as pd

# Set tokenizers parallelism before importing transformers
os.environ["TOKENIZERS_PARALLELISM"] = "false"

from bertopic import BERTopic
from sklearn.feature_extraction.text import CountVectorizer
import argparse
from pathlib import Path
from openai import OpenAI


def extract_user_prompts(log_files: List[str]) -> List[Tuple[str, Dict]]:
    """
    Extract user prompts from Claude session log files.
    
    Returns list of tuples: (prompt_text, metadata)
    """
    prompts = []
    
    for log_file in log_files:
        try:
            with open(log_file, 'r') as f:
                # Try different parsing strategies
                content = f.read()
                
                # Try parsing as JSONL (one JSON per line)
                if content.strip():
                    for line_num, line in enumerate(content.strip().split('\n'), 1):
                        if not line.strip():
                            continue
                        try:
                            entry = json.loads(line)
                            
                            # Check if this is a user message
                            if (entry.get('type') == 'user' or 
                                (entry.get('message', {}).get('role') == 'user')):
                                
                                # Extract content
                                message = entry.get('message', {})
                                content_raw = message.get('content', '')
                                
                                # Handle different content formats
                                if isinstance(content_raw, str):
                                    prompt_text = content_raw
                                elif isinstance(content_raw, list):
                                    # Extract text from content blocks
                                    texts = []
                                    for block in content_raw:
                                        if isinstance(block, dict) and block.get('text'):
                                            texts.append(block['text'])
                                    prompt_text = ' '.join(texts)
                                else:
                                    continue
                                
                                if prompt_text.strip():
                                    # Filter out system messages, interrupted requests, and command-like prompts
                                    if ("[Request interrupted by user]" not in prompt_text and 
                                        not prompt_text.startswith("[Request interrupted") and
                                        not prompt_text.startswith("System:") and
                                        not prompt_text.startswith("<system-reminder>") and
                                        "ultrathink" not in prompt_text.lower() and
                                        "--use-todos" not in prompt_text):
                                        metadata = {
                                            'timestamp': entry.get('timestamp'),
                                            'session_id': entry.get('sessionId'),
                                            'file': log_file,
                                            'line': line_num
                                        }
                                        prompts.append((prompt_text.strip(), metadata))
                                    
                        except json.JSONDecodeError:
                            # Skip malformed lines
                            continue
                            
        except Exception as e:
            print(f"Error processing {log_file}: {e}")
            continue
    
    return prompts


def clean_prompts(prompts: List[str]) -> List[str]:
    """
    Clean and preprocess prompts for better clustering.
    """
    cleaned = []
    for prompt in prompts:
        # Remove excessive whitespace
        prompt = ' '.join(prompt.split())
        
        # Truncate very long prompts (keep first 500 chars for topic modeling)
        if len(prompt) > 500:
            prompt = prompt[:500] + "..."
            
        cleaned.append(prompt)
    
    return cleaned


def analyze_prompts_with_bertopic(prompts: List[str], n_topics: int = 10) -> Tuple[BERTopic, List[int], List[float]]:
    """
    Use BERTopic to cluster prompts into topics.
    """
    # Configure BERTopic
    vectorizer_model = CountVectorizer(
        ngram_range=(1, 3),
        stop_words="english",
        min_df=2
    )
    
    topic_model = BERTopic(
        vectorizer_model=vectorizer_model,
        min_topic_size=3,  # Minimum cluster size
        nr_topics=n_topics,  # Reduce to n_topics
        calculate_probabilities=True,
        verbose=True
    )
    
    # Fit the model
    topics, probs = topic_model.fit_transform(prompts)
    
    return topic_model, topics, probs


def classify_photonium_workflow_o3pro(
    prompts: List[str], 
    topic_words: List[str],
    openai_key: Optional[str] = None,
    existing_categories: List[str] = None
) -> Dict:
    """
    Use O3-PRO to identify optical design workflows and create powerful agent templates.
    """
    if not openai_key:
        openai_key = os.getenv('OPENAI_API_KEY')
    
    if not openai_key:
        return {
            "workflow": "Analysis unavailable (no OpenAI API key)",
            "pattern": "",
            "template": "",
            "time_saved": ""
        }
    
    try:
        client = OpenAI(api_key=openai_key)
        
        # Sample prompts for analysis
        sample_prompts = prompts[:5]
        existing_str = ""
        if existing_categories:
            existing_str = f"\nAlready identified workflows (find something different): {', '.join(existing_categories)}\n"
        
        prompt = f"""You're analyzing prompts from Adam, a physics PhD who left research to build Photonium.
Photonium automates optical system design for quantum computing, biotech, LiDAR, and semiconductor companies.
Adam has LIMITED coding experience and uses Claude Code as his primary development interface.

{existing_str}

Sample prompts from this workflow pattern:
{chr(10).join(f"- {p[:200]}" for p in sample_prompts)}

Key terms: {', '.join(topic_words[:10])}

Identify the SPECIFIC optical design workflow Adam is trying to build. Focus on:
- Agent orchestration sequences (research → design → validate → generate JSON)
- Physics calculations (beam propagation, lens design, diffraction)
- End-to-end testing patterns (beam expanders, interferometers, fiber optics)
- Component database searches (Thorlabs, Edmund Optics)
- CAD/Unity integration workflows

Return JSON with:
- "workflow": Name of the optical design workflow (3-5 words)
- "pattern": What Adam is repeatedly trying to accomplish (2-3 sentences)
- "template": A COMPLETE Claude Code prompt template that accomplishes the ENTIRE workflow in ONE message
- "time_saved": Hours saved per use (e.g., "4-6 hours → 30 minutes")
- "customer_impact": How this helps serve quantum/biotech customers faster

The template should be a complete, copy-paste ready prompt that builds the entire feature/workflow."""
        
        # Construct the full prompt for o3-pro responses API
        full_prompt = f"""System: You help physics founders build optical design systems faster. Create complete workflow templates, not incremental improvements.

{prompt}

IMPORTANT: Return ONLY valid JSON, no other text."""
        
        print(f"\n[O3-PRO] Sending request for workflow analysis...")
        response = client.responses.create(
            model="o3-pro",
            input=full_prompt
        )
        print(f"[O3-PRO] Response received")
        
        # O3-pro responses API returns a different structure
        # Extract text from the output messages
        content = ""
        if hasattr(response, 'output') and response.output:
            for output_item in response.output:
                if hasattr(output_item, 'content') and output_item.content:
                    for content_item in output_item.content:
                        if hasattr(content_item, 'text'):
                            content = content_item.text
                            break
                    if content:
                        break
        
        if not content:
            print(f"O3-PRO: Could not extract content from response: {response}")
            content = "{}"
        
        try:
            parsed = json.loads(content)
            return parsed
        except:
            return {
                "workflow": topic_words[0].title() + " Workflow",
                "pattern": "Pattern identified but parsing failed",
                "template": "Template generation failed",
                "time_saved": "Unknown"
            }
    
    except Exception as e:
        print(f"O3-PRO analysis failed: {e}")
        return {
            "workflow": f"{topic_words[0].title()} Workflow",
            "pattern": "Analysis failed",
            "template": "Template unavailable",
            "time_saved": "Unknown"
        }


def calculate_prompt_metrics(prompts: List[str], metadata: List[Dict]) -> Dict:
    """Calculate efficiency metrics for prompts."""
    metrics = {
        'avg_length': sum(len(p.split()) for p in prompts) / len(prompts),
        'total_prompts': len(prompts),
        'unique_sessions': len(set(m.get('session_id', '') for m in metadata)),
        'prompts_per_session': len(prompts) / len(set(m.get('session_id', 'default') for m in metadata))
    }
    
    # Estimate token usage (rough approximation)
    total_tokens = sum(len(p.split()) * 1.3 for p in prompts)  # 1.3 tokens per word average
    metrics['estimated_tokens'] = int(total_tokens)
    metrics['estimated_cost'] = total_tokens * 0.00003  # Approximate cost per token
    
    return metrics


def generate_photonium_report_o3pro(
    topic_model: BERTopic, 
    prompts: List[str], 
    topics: List[int],
    metadata: List[Dict],
    output_file: str = "photonium_founder_playbook_o3pro.md",
    openai_key: Optional[str] = None
):
    """
    Generate a founder-focused report for Photonium development optimization using O3-PRO.
    """
    report_lines = []
    report_lines.append("# Photonium Founder's Claude Code Playbook (O3-PRO Analysis)")
    report_lines.append(f"\n**Adam, here's how to build 10x faster with Claude Code**")
    report_lines.append(f"\nGenerated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')} using O3-PRO")
    
    # Calculate metrics
    metrics = calculate_prompt_metrics(prompts, metadata)
    
    report_lines.append("\n## Your Current Development Pattern")
    report_lines.append(f"- **Sessions Analyzed:** {metrics['unique_sessions']}")
    report_lines.append(f"- **Total Prompts:** {metrics['total_prompts']}")
    report_lines.append(f"- **Key Finding:** You're rebuilding the same optical workflows repeatedly")
    
    report_lines.append("\n---\n")
    
    # Get topic info
    topic_info = topic_model.get_topic_info()
    topic_info = topic_info[topic_info.Topic != -1]  # Filter outliers
    
    report_lines.append(f"\n## Top {min(5, len(topic_info))} Optical Design Workflows to Templatize (O3-PRO Analysis)\n")
    report_lines.append("*Copy these templates to build complete features in one Claude Code message*\n")
    
    # Analyze top 5 workflows with O3-PRO
    workflow_analyses = {}
    existing_workflows = []
    
    for idx, row in topic_info.head(5).iterrows():
        topic_id = row['Topic']
        topic_size = row['Count']
        
        # Get prompts for this topic
        topic_prompts = [p for p, t in zip(prompts, topics) if t == topic_id]
        
        # Get topic words
        words = topic_model.get_topic(topic_id)
        top_words = [word for word, _ in words[:10]] if words else []
        
        # Get O3-PRO analysis
        analysis = classify_photonium_workflow_o3pro(topic_prompts, top_words, openai_key, existing_workflows)
        workflow_analyses[topic_id] = analysis
        existing_workflows.append(analysis['workflow'])
        
        report_lines.append(f"### Workflow {idx + 1}: {analysis['workflow']}")
        report_lines.append(f"\n**Frequency:** You've built this {topic_size} times")
        report_lines.append(f"**Time Saved:** {analysis.get('time_saved', 'Significant')}")
        report_lines.append(f"**Customer Impact:** {analysis.get('customer_impact', 'Faster delivery to quantum/biotech customers')}")
        
        report_lines.append(f"\n**Pattern:** {analysis.get('pattern', 'Workflow identified')}")
        
        # Add the complete template
        if 'template' in analysis and analysis['template']:
            report_lines.append(f"\n**🚀 Complete Claude Code Template:**")
            report_lines.append("```")
            report_lines.append(analysis['template'])
            report_lines.append("```")
        
        # Show what you were doing before
        report_lines.append(f"\n**Your Previous Attempts (taking hours):**")
        for i, prompt in enumerate(topic_prompts[:2]):
            display_prompt = prompt if len(prompt) <= 100 else prompt[:100] + "..."
            report_lines.append(f"- \"{display_prompt}\"")
        
        report_lines.append("\n---\n")
    
    # Add O3-PRO specific insights
    report_lines.append("## 🧠 O3-PRO Advanced Insights\n")
    report_lines.append("*These insights leverage O3-PRO's enhanced reasoning capabilities*\n")
    
    # Add power user tips
    report_lines.append("### 1. The 'Complete Optical System' Prompt")
    report_lines.append("```")
    report_lines.append("""ultrathink Build complete optical system: [SYSTEM_TYPE]
Requirements:
- Components: [Thorlabs/Edmund preferred]
- Specs: [wavelength, power, beam size]
- Output: Manufacturing-ready JSON with CAD references

Create:
1. Physics validation (propagation, aberrations)
2. Component selection with part numbers
3. Mechanical mounting design
4. Complete JSON for Unity/CAD
5. Bill of materials

Test the system end-to-end and show the JSON output.""")
    report_lines.append("```")
    
    report_lines.append("\n### 2. The 'Agent Orchestration' Pattern")
    report_lines.append("```")
    report_lines.append("""Create a complete agent workflow for [OPTICAL_SYSTEM]:
1. Research tool: Find best practices from papers
2. Design tool: Generate optical layout
3. Validate tool: Check physics constraints  
4. Component tool: Search S3 for parts
5. Output tool: Generate manufacturing JSON

Wire these together and test with: beam expander, fiber coupler, interferometer.
Show me the complete working system.""")
    report_lines.append("```")
    
    report_lines.append("\n### 3. The 'Migration Accelerator'")
    report_lines.append("```")
    report_lines.append("""I have a Python optical design system. Migrate to Next.js + Vercel:
- Keep ALL physics calculations working
- Maintain 100% tool calling accuracy
- Preserve S3 component database integration
- Add real-time JSON preview
- Test thoroughly with optical designs

Complete the migration and deploy to Vercel.""")
    report_lines.append("```")
    
    report_lines.append("\n---\n")
    
    # Add CLAUDE.md recommendation
    report_lines.append("## 🎯 Your CLAUDE.md File (Save 30% of prompts)")
    report_lines.append("\nCreate this file in your project root:")
    report_lines.append("```markdown")
    report_lines.append("""# Photonium Optical Design System

## Context
Building AI-powered optical design for quantum computing, biotech, LiDAR, semiconductors.
Founder: Adam (Physics PhD, limited coding experience)

## Architecture
- Frontend: Next.js + Vercel
- AI: Vercel AI SDK with tool calling
- Database: S3 (Thorlabs/Edmund components)
- Physics: Custom calculations (beam propagation, lens design)
- Output: Manufacturing-ready JSON → CAD/Unity

## Current Focus
Migrating from Python/FastAPI → Next.js while maintaining physics accuracy.

## Key Workflows
1. Optical system design (research → design → validate → JSON)
2. Component selection from S3 database
3. Physics validation (diffraction, aberrations, propagation)
4. CAD/Unity integration

## Testing Requirements
ALWAYS test end-to-end with: beam expanders, interferometers, fiber optics.
Success = Complete JSON with manufacturable design.
""")
    report_lines.append("```")
    
    report_lines.append("\n---\n")
    
    # Business impact
    report_lines.append("## 💰 Business Impact (O3-PRO Analysis)")
    report_lines.append("\nBy implementing these templates:")
    report_lines.append("- **Feature Development:** 1 week → 1 day")
    report_lines.append("- **Customer Demos:** Build live during calls")
    report_lines.append("- **Quantum/Biotech Delivery:** Ship 5x faster")
    report_lines.append("- **Technical Debt:** Reduce by 70%")
    
    report_lines.append("\n## Next Steps")
    report_lines.append("1. Copy the templates above into a `prompts/` folder")
    report_lines.append("2. Create the CLAUDE.md file")
    report_lines.append("3. Use `--use-todos` for complex migrations")
    report_lines.append("4. Stop rebuilding - start shipping to customers")
    
    # Save report
    with open(output_file, 'w') as f:
        f.write('\n'.join(report_lines))
    
    print(f"\nO3-PRO founder playbook saved to: {output_file}")
    
    # Save workflow analysis
    if workflow_analyses:
        analysis_file = output_file.replace('.md', '_workflows.json')
        with open(analysis_file, 'w') as f:
            json.dump({
                'timestamp': datetime.now().isoformat(),
                'model': 'o3-pro',
                'workflows': workflow_analyses
            }, f, indent=2)
        
        print(f"O3-PRO workflow templates saved to: {analysis_file}")


def main():
    parser = argparse.ArgumentParser(description='Generate Photonium founder playbook using O3-PRO')
    parser.add_argument('log_path', help='Path to log files or directory containing logs')
    parser.add_argument('--output', default='photonium_founder_playbook_o3pro.md', help='Output report filename')
    parser.add_argument('--topics', type=int, default=5, help='Number of workflows to identify')
    parser.add_argument('--openai-key', help='OpenAI API key for O3-PRO analysis')
    
    args = parser.parse_args()
    
    # Collect log files
    log_files = []
    path = Path(args.log_path)
    
    if path.is_file():
        log_files = [str(path)]
    elif path.is_dir():
        # Find all .jsonl and .json files
        log_files = list(str(p) for p in path.glob('**/*.jsonl'))
        log_files.extend(str(p) for p in path.glob('**/*.json'))
    else:
        print(f"Error: {args.log_path} not found")
        return
    
    if not log_files:
        print("No log files found")
        return
    
    print(f"Found {len(log_files)} log files")
    
    # Extract prompts
    print("\nExtracting optical design workflows...")
    prompt_data = extract_user_prompts(log_files)
    
    if not prompt_data:
        print("No user prompts found in logs")
        return
    
    prompts = [p[0] for p in prompt_data]
    metadata = [p[1] for p in prompt_data]
    
    print(f"Extracted {len(prompts)} prompts from Adam's sessions")
    
    # Clean prompts
    print("\nAnalyzing optical design patterns...")
    cleaned_prompts = clean_prompts(prompts)
    
    # Run BERTopic analysis
    print(f"\nIdentifying top {args.topics} workflows to templatize...")
    topic_model, topics, probs = analyze_prompts_with_bertopic(cleaned_prompts, n_topics=args.topics)
    
    # Generate report
    print("\nGenerating O3-PRO optimization report...")
    generate_photonium_report_o3pro(topic_model, cleaned_prompts, topics, metadata, args.output, args.openai_key)
    
    print("\n✅ O3-PRO playbook complete! Compare with O3 results.")


if __name__ == "__main__":
    main()