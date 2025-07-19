# Claude Session Analysis Scripts

## Prompt Topic Analysis

The `analyze_prompt_topics.py` script uses BERTopic to analyze Claude session logs and identify common prompt patterns used by your team.

### Installation

```bash
pip install -r requirements-bertopic.txt
```

### Usage

```bash
# Analyze a single log file
python analyze_prompt_topics.py /path/to/session.jsonl

# Analyze all logs in a directory
python analyze_prompt_topics.py /path/to/logs/directory/

# Specify custom output file and number of topics
python analyze_prompt_topics.py /path/to/logs/ --output my_report.md --topics 15

# Use OpenAI's o3 model for semantic classification of top 5 categories
python analyze_prompt_topics.py /path/to/logs/ --openai-key YOUR_API_KEY
# Or set OPENAI_API_KEY environment variable
export OPENAI_API_KEY=YOUR_API_KEY
python analyze_prompt_topics.py /path/to/logs/
```

### Output

The script generates three files:

1. **Markdown Report** (`prompt_analysis_report.md`): A human-readable report showing:
   - Top 10 prompt categories with descriptive names
   - Key terms for each category
   - Example prompts from each category
   - Summary statistics (prompt lengths, session distribution)
   - **O3 Automation Insights**: When an OpenAI API key is provided, the top 5 categories are analyzed by o3 to identify automation opportunities and improvement areas like "Repetitive debugging cycles" or "Manual file navigation"

2. **CSV File** (`prompt_analysis_report_detailed.csv`): Complete data with:
   - All prompts and their assigned topics
   - Topic names
   - Session IDs and timestamps

3. **O3 Classifications File** (`prompt_analysis_report_o3_classifications.json`): Structured data with:
   - O3-identified automation opportunities for each topic
   - Original BERTopic classifications
   - Prompt counts and percentages

### How It Works

1. **Prompt Extraction**: Parses Claude session logs (JSONL format) and extracts all user messages
2. **Text Preprocessing**: Cleans prompts and truncates very long ones for better clustering
3. **Topic Modeling**: Uses BERTopic to identify semantic clusters in the prompts
4. **Report Generation**: Creates a structured report with examples and statistics

### Use Cases

- **Identify Automation Opportunities**: O3 analyzes prompt patterns to reveal where teams could benefit from automation (e.g., "Repetitive debugging cycles" suggests implementing automated linting)
- **Improve Developer Workflows**: Discover inefficiencies like "Manual file navigation" that could be solved with better project setup or tooling
- **Create Scaffolding Templates**: Patterns like "Incremental feature building" indicate opportunities for code generation templates
- **Team Training Insights**: "Knowledge gap patterns" reveal areas where team training or documentation could reduce repetitive questions
- **Optimize Claude Usage**: Understand how your team interacts with Claude to create more efficient workflows and reduce token usage