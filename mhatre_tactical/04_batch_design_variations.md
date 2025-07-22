# Batch Design Variation Generator

Your customers want to see options. Create a batch variation generator:

## Core Functionality

1. Add "Generate Variations" button that takes one optical design and creates:
   - Budget option (lowest cost components meeting specifications)
   - Performance option (highest quality optical components)
   - Availability option (all in-stock components from Thorlabs/Edmund)
   - Compact option (minimum physical footprint)

2. For each variation, automatically:
   - Run physics validation (beam propagation, aberrations)
   - Calculate total cost from component database
   - Generate comparison metrics
   - Create preview visualization

3. Display as comparison interface:
   - Side-by-side or table view
   - Key differences highlighted
   - Cost and performance metrics
   - One-click to select any variation
   - Export comparison as report

4. Test with standard optical systems:
   - Beam expanders (generate variations for different budgets)
   - Interferometers (optimize for different performance metrics)
   - Fiber couplers (variations for different wavelengths)

This allows showing customers multiple validated options in one session instead of iterating one design at a time.

## Technical Context
- Leverage your S3 component database (Thorlabs/Edmund parts)
- Use existing physics calculations for validation
- Build on the optical system generator tool's JSON format
- Consider caching component queries for performance