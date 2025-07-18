# How to Use CC-Birdee Analytics

## Getting Started

1. **Start the application**
   ```bash
   yarn dev
   ```

2. **Navigate to the Analytics tab**
   - Open http://localhost:3000
   - Click on the "Analytics" tab

3. **Process your Claude Code sessions**
   - You'll see a message: "No Analytics Data Available"
   - Click the "Process Sessions" button
   - A modal will appear showing available session files
   - Select the sessions you want to analyze (or click "Select All")
   - Click "Process X Sessions"

4. **View your analytics**
   - Once processing completes, your analytics dashboard will load automatically
   - Explore different tabs:
     - **Overview**: Skills radar chart, growth trends, coding tendencies
     - **Strengths**: Technical strengths heatmap and detailed breakdowns
     - **Growth**: Areas for improvement and growth opportunities
     - **Recommendations**: Prioritized learning recommendations

## Features

### Skills Visualization
- **Radar Chart**: Visual representation of your skill levels across different areas
- **Growth Trend Chart**: Track your progress over time
- **Strengths Heatmap**: See your technical strengths at a glance

### Insights
- **Technical Patterns**: Identifies patterns in your coding style
- **Coding Tendencies**: Shows your programming habits (defensive programming, test-driven, etc.)
- **Problem-Solving Approaches**: Analyzes how you tackle problems

### Recommendations
- **Immediate Actions**: High-priority items to work on this week
- **Short-term Goals**: Monthly improvement targets
- **Long-term Strategy**: Strategic skill development plans

## Notes

- The analytics feature uses mock data for o3 integration (no OpenAI API key required)
- Session data is stored locally in `~/.cc-birdee-analytics`
- You can re-process sessions anytime using the "Process Sessions" button
- Analytics improve with more sessions processed

## Troubleshooting

### "No session files found"
- Make sure you have Claude Code session files in the expected directory
- Check that the file service is pointing to the correct location

### Processing fails
- Check the browser console for error messages
- Ensure session files are valid JSONL format
- Try processing fewer sessions at once

### Analytics not updating
- Refresh the page after processing completes
- Check that sessions were processed successfully
- Clear browser cache if needed