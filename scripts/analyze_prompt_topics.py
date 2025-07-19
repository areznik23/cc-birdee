#!/usr/bin/env python3
"""
Analyze Claude session logs to identify common prompt patterns using BERTopic.
This script extracts user prompts from logs, clusters them into topics,
and generates a report showing the top prompt categories with examples.
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


def classify_topic_with_o3(
    prompts: List[str], 
    topic_words: List[str],
    openai_key: Optional[str] = None,
    existing_categories: List[str] = None
) -> str:
    """
    Use OpenAI's o3 model to classify the semantic meaning of a topic cluster.
    """
    if not openai_key:
        openai_key = os.getenv('OPENAI_API_KEY')
    
    if not openai_key:
        return "Classification unavailable (no OpenAI API key)"
    
    try:
        client = OpenAI(api_key=openai_key)
        
        # Simple prompt with sample prompts
        sample_prompts = prompts[:5]
        existing_str = ""
        if existing_categories:
            existing_str = f"\nAlready used categories (pick something different): {', '.join(existing_categories)}\n"
        
        prompt = f"""Analyze these Claude session prompts to identify patterns that reveal automation opportunities or areas for improvement.
Focus on identifying repetitive behaviors, inefficiencies, or common workflows that teams could optimize.
{existing_str}
Look for patterns like:
- "Repetitive debugging cycles" (same type of errors fixed repeatedly - could use automated linting)
- "Manual file navigation" (constantly asking to find/read files - could use better project setup)
- "Incremental feature building" (building features step-by-step - could use scaffolding templates)
- "Context rebuilding" (repeatedly explaining project context - could use better documentation)
- "Trial-and-error iterations" (multiple attempts at same task - could use clearer initial specs)
- "Boilerplate code requests" (asking for standard implementations - could use code generators)
- "Knowledge gap patterns" (asking for explanations of same concepts - team training opportunity)

Prompts to analyze:
{chr(10).join(f"- {p[:150]}" for p in sample_prompts)}

Return JSON with a 'category' field containing a 3-6 word pattern that suggests an automation opportunity or improvement area."""
        
        response = client.chat.completions.create(
            model="o3",
            messages=[
                {"role": "system", "content": "You identify automation opportunities and improvement areas in developer workflows. Return JSON."},
                {"role": "user", "content": prompt}
            ],
            max_completion_tokens=4000,
            response_format={"type": "json_object"}
        )
        
        print(f"\n[O3] Response: {response}")
        
        content = response.choices[0].message.content
        print(f"[O3] Content: {content}")
        
        try:
            parsed = json.loads(content)
            classification = parsed.get("category", parsed.get("classification", "Unknown"))
        except:
            classification = content[:50] if content else "Unknown"
        
        return classification
    
    except Exception as e:
        print(f"O3 failed: {e}")
        return f"{topic_words[0].title()} Tasks"


def generate_report(
    topic_model: BERTopic, 
    prompts: List[str], 
    topics: List[int],
    metadata: List[Dict],
    output_file: str = "prompt_analysis_report.md",
    openai_key: Optional[str] = None
):
    """
    Generate a markdown report with top prompt categories and examples.
    """
    report_lines = []
    report_lines.append("# Claude Prompt Analysis Report")
    report_lines.append(f"\nGenerated on: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    report_lines.append(f"\nTotal prompts analyzed: {len(prompts)}")
    
    # Get topic info
    topic_info = topic_model.get_topic_info()
    
    # Filter out outlier topic (-1)
    topic_info = topic_info[topic_info.Topic != -1]
    
    report_lines.append(f"\nNumber of topics identified: {len(topic_info)}")
    report_lines.append("\n---\n")
    
    # Get top 5 topics for O3 classification
    top_topics = topic_info.head(5)
    o3_classifications = {}
    
    # Always try O3 classification (will use hardcoded key if no key provided)
    report_lines.append("\n*Using O3 for semantic classification of top 5 categories...*\n")
    
    # Analyze each topic
    for idx, row in topic_info.iterrows():
        topic_id = row['Topic']
        topic_size = row['Count']
        
        # Get O3 classification for top 5 topics
        topic_name = row['Name']
        if idx < 5:
            # Get prompts for this topic
            topic_prompt_texts = [p for p, t in zip(prompts, topics) if t == topic_id]
            # Get top words
            words = topic_model.get_topic(topic_id)
            top_words = [word for word, _ in words[:10]] if words else []
            
            # Classify with O3
            existing = list(o3_classifications.values())
            o3_classification = classify_topic_with_o3(topic_prompt_texts, top_words, openai_key, existing)
            o3_classifications[topic_id] = o3_classification
            topic_name = f"{o3_classification} (BERTopic: {row['Name']})"
        
        report_lines.append(f"## Topic {idx + 1}: {topic_name}")
        report_lines.append(f"\n**Number of prompts:** {topic_size}")
        report_lines.append(f"\n**Percentage of total:** {(topic_size / len(prompts) * 100):.1f}%")
        
        # Get top words for this topic
        words = topic_model.get_topic(topic_id)
        if words:
            top_words = [word for word, _ in words[:10]]
            report_lines.append(f"\n**Key terms:** {', '.join(top_words)}")
        
        # Get example prompts for this topic
        topic_prompts = [(p, m) for p, m, t in zip(prompts, metadata, topics) if t == topic_id]
        
        report_lines.append("\n**Example prompts:**")
        # Show up to 3 examples
        for i, (prompt, meta) in enumerate(topic_prompts[:3]):
            # Truncate long prompts for display
            display_prompt = prompt if len(prompt) <= 200 else prompt[:200] + "..."
            report_lines.append(f"\n{i + 1}. \"{display_prompt}\"")
            if meta.get('timestamp'):
                report_lines.append(f"   - *Timestamp: {meta['timestamp']}*")
        
        report_lines.append("\n---\n")
    
    # Add outliers section if any
    outlier_count = sum(1 for t in topics if t == -1)
    if outlier_count > 0:
        report_lines.append(f"## Uncategorized Prompts")
        report_lines.append(f"\n**Count:** {outlier_count} ({(outlier_count / len(prompts) * 100):.1f}%)")
        report_lines.append("\nThese prompts didn't fit well into any major category.")
        report_lines.append("\n---\n")
    
    # Add O3 classifications summary if available
    if o3_classifications:
        report_lines.append("## O3 Semantic Classifications Summary")
        report_lines.append("\n**Top 5 Categories:**")
        for idx, (topic_id, classification) in enumerate(o3_classifications.items()):
            topic_size = topic_info[topic_info.Topic == topic_id]['Count'].iloc[0]
            percentage = (topic_size / len(prompts) * 100)
            report_lines.append(f"{idx + 1}. **{classification}** - {topic_size} prompts ({percentage:.1f}%)")
        report_lines.append("\n---\n")
    
    # Add summary statistics
    report_lines.append("## Summary Statistics")
    
    # Calculate prompt length distribution
    prompt_lengths = [len(p.split()) for p in prompts]
    report_lines.append(f"\n- **Average prompt length:** {sum(prompt_lengths) / len(prompt_lengths):.1f} words")
    report_lines.append(f"- **Shortest prompt:** {min(prompt_lengths)} words")
    report_lines.append(f"- **Longest prompt:** {max(prompt_lengths)} words")
    
    # Session distribution
    sessions = defaultdict(int)
    for meta in metadata:
        if meta.get('session_id'):
            sessions[meta['session_id']] += 1
    
    report_lines.append(f"\n- **Number of sessions:** {len(sessions)}")
    report_lines.append(f"- **Average prompts per session:** {len(prompts) / len(sessions):.1f}")
    
    # Save report
    with open(output_file, 'w') as f:
        f.write('\n'.join(report_lines))
    
    print(f"\nReport saved to: {output_file}")
    
    # Save O3 classifications to separate file if available
    if o3_classifications:
        o3_file = output_file.replace('.md', '_o3_classifications.json')
        o3_data = {
            'timestamp': datetime.now().isoformat(),
            'classifications': []
        }
        
        for topic_id, classification in o3_classifications.items():
            topic_data = topic_info[topic_info.Topic == topic_id].iloc[0]
            o3_data['classifications'].append({
                'topic_id': int(topic_id),
                'o3_classification': classification,
                'bertopic_name': topic_data['Name'],
                'prompt_count': int(topic_data['Count']),
                'percentage': float(topic_data['Count'] / len(prompts) * 100)
            })
        
        with open(o3_file, 'w') as f:
            json.dump(o3_data, f, indent=2)
        
        print(f"O3 classifications saved to: {o3_file}")
    
    # Also save a CSV with all prompts and their topics
    df = pd.DataFrame({
        'prompt': prompts,
        'topic': topics,
        'topic_name': [topic_info[topic_info.Topic == t]['Name'].iloc[0] if t != -1 else 'Uncategorized' 
                       for t in topics],
        'session_id': [m.get('session_id', '') for m in metadata],
        'timestamp': [m.get('timestamp', '') for m in metadata]
    })
    
    csv_file = output_file.replace('.md', '_detailed.csv')
    df.to_csv(csv_file, index=False)
    print(f"Detailed results saved to: {csv_file}")


def main():
    parser = argparse.ArgumentParser(description='Analyze Claude session logs for prompt patterns')
    parser.add_argument('log_path', help='Path to log files or directory containing logs')
    parser.add_argument('--output', default='prompt_analysis_report.md', help='Output report filename')
    parser.add_argument('--topics', type=int, default=10, help='Number of topics to identify')
    parser.add_argument('--openai-key', help='OpenAI API key for O3 classification (optional)')
    
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
    print("\nExtracting user prompts...")
    prompt_data = extract_user_prompts(log_files)
    
    if not prompt_data:
        print("No user prompts found in logs")
        return
    
    prompts = [p[0] for p in prompt_data]
    metadata = [p[1] for p in prompt_data]
    
    print(f"Extracted {len(prompts)} user prompts")
    
    # Clean prompts
    print("\nCleaning prompts...")
    cleaned_prompts = clean_prompts(prompts)
    
    # Run BERTopic analysis
    print(f"\nClustering prompts into {args.topics} topics...")
    topic_model, topics, probs = analyze_prompts_with_bertopic(cleaned_prompts, n_topics=args.topics)
    
    # Generate report
    print("\nGenerating report...")
    generate_report(topic_model, cleaned_prompts, topics, metadata, args.output, args.openai_key)
    
    print("\nAnalysis complete!")


if __name__ == "__main__":
    main()