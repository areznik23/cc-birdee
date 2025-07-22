# Unity WebGL Viewer Implementation

The "Render in Unity" button is showing but not connected. Implement the complete Unity WebGL viewer:

## Core Requirements

1. When user clicks "Render in Unity" on an optical system JSON:
   - Parse the JSON for component positions, types, and optical paths
   - Load a Unity WebGL build in a modal
   - Pass the JSON via appropriate messaging to Unity
   - Unity should render optical components and beam paths
   - Add basic 3D navigation controls

2. Create Unity-side receiver that:
   - Receives JSON from the React frontend
   - Instantiates appropriate 3D models for each optical component
   - Draws beam propagation paths
   - Applies appropriate materials/colors to distinguish component types

3. Test with your standard optical systems:
   - Beam expander (multiple configurations you've been testing)
   - Interferometer setups
   - Fiber optics configurations

The viewer should load quickly and work across devices for demonstrations.

## Technical Context
- You're using Next.js + Vercel for the frontend
- The JSON viewer is already working with the button visible
- Optical system JSON format is already defined from your generator tool