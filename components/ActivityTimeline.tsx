'use client';

import { useState, useCallback, useMemo, useEffect } from 'react';
import ReactFlow, {
  Node,
  Edge,
  Position,
  MarkerType,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  Handle,
  NodeProps,
  Panel,
} from 'reactflow';
import 'reactflow/dist/style.css';
import dagre from '@dagrejs/dagre';
import { ProcessedMessage, ActivityType } from '@/lib/types';
import { ACTIVITY_COLORS } from '@/lib/constants';

interface ActivityTimelineProps {
  messages: ProcessedMessage[];
  startTime: Date;
  endTime: Date;
}

interface TimelineSegment {
  sequenceNumber: number;
  timestamp: Date;
  minutesFromStart: number;
  activity: ActivityType;
  color: string;
  label: string;
  content: string;
}

interface GroupedActivity {
  id: string;
  activity: ActivityType;
  color: string;
  label: string;
  segments: TimelineSegment[];
  startTime: number;
  endTime: number;
}

// Custom node component for grouped activities
const GroupedActivityNode = ({ data, targetPosition = Position.Top, sourcePosition = Position.Bottom }: NodeProps<GroupedActivity>) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const hasMultiple = data.segments.length > 1;
  
  return (
    <div className="relative">
      <Handle type="target" position={targetPosition} style={{ background: data.color }} />
      <div
        className="px-5 py-4 rounded-xl shadow-lg border-2 cursor-pointer transition-all hover:shadow-xl bg-white dark:bg-gray-800"
        style={{
          borderColor: data.color,
          minWidth: '300px',
          maxWidth: isExpanded ? '500px' : '350px'
        }}
        onDoubleClick={() => hasMultiple && setIsExpanded(!isExpanded)}
      >
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <div 
              className="w-3 h-3 rounded-full" 
              style={{ backgroundColor: data.color }}
            />
            <span className="text-sm font-bold uppercase tracking-wide" style={{ color: data.color }}>
              {data.label}
            </span>
            {hasMultiple && (
              <span className="text-xs bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded-full text-gray-600 dark:text-gray-400">
                {data.segments.length} messages
              </span>
            )}
          </div>
          {hasMultiple && (
            <svg 
              className={`w-4 h-4 text-gray-400 transform transition-transform ${isExpanded ? 'rotate-180' : ''}`}
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          )}
        </div>
        
        {!isExpanded ? (
          // Collapsed view - show summary
          <>
            <div className="text-sm text-gray-700 dark:text-gray-200 mb-3">
              {hasMultiple ? (
                <div className="space-y-1">
                  <div className="line-clamp-2">{data.segments[0].content}</div>
                  {data.segments.length > 1 && (
                    <div className="text-xs text-gray-500 dark:text-gray-400 italic">
                      ...and {data.segments.length - 1} more message{data.segments.length > 2 ? 's' : ''}
                    </div>
                  )}
                </div>
              ) : (
                <div className="line-clamp-3">{data.segments[0].content}</div>
              )}
            </div>
            <div className="flex items-center justify-between text-xs text-gray-500">
              <div className="flex items-center gap-1">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {formatTimestamp(data.startTime)}
                {hasMultiple && ` - ${formatTimestamp(data.endTime)}`}
              </div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-gray-400">
                  #{data.segments[0].sequenceNumber}
                  {hasMultiple && `-${data.segments[data.segments.length - 1].sequenceNumber}`}
                </span>
              </div>
            </div>
          </>
        ) : (
          // Expanded view - show all messages
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {data.segments.map((segment, idx) => (
              <div key={segment.sequenceNumber} className="pb-3 border-b border-gray-200 dark:border-gray-700 last:border-0">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-mono text-gray-500">
                    Message #{segment.sequenceNumber}
                  </span>
                  <span className="text-xs text-gray-500">
                    {formatTimestamp(segment.minutesFromStart)}
                  </span>
                </div>
                <div className="text-sm text-gray-700 dark:text-gray-200">
                  {segment.content.slice(0, 200)}
                  {segment.content.length > 200 && '...'}
                </div>
              </div>
            ))}
          </div>
        )}
        
        {hasMultiple && !isExpanded && (
          <div className="text-xs text-blue-600 dark:text-blue-400 font-medium mt-2 text-center">
            Double-click to expand all messages
          </div>
        )}
      </div>
      <Handle type="source" position={sourcePosition} style={{ background: data.color }} />
    </div>
  );
};

const nodeTypes = {
  groupedActivity: GroupedActivityNode,
};

// Node dimensions
const nodeWidth = 320;
const nodeHeight = 140;

// Layout function using dagre - handles multiple disconnected trees
const getLayoutedElements = (nodes: Node[], edges: Edge[], direction = 'TB') => {
  const dagreGraph = new dagre.graphlib.Graph({ compound: true });
  dagreGraph.setDefaultEdgeLabel(() => ({}));
  
  const isHorizontal = direction === 'LR';
  dagreGraph.setGraph({ 
    rankdir: direction, 
    nodesep: 100, 
    edgesep: 50, 
    ranksep: 150,
    marginx: 50,
    marginy: 50
  });

  // Find disconnected components (trees separated by conceptual pivots)
  const nodeMap = new Map(nodes.map(n => [n.id, n]));
  const connectedComponents: Set<Set<string>> = new Set();
  const visited = new Set<string>();
  
  // Helper to find connected component starting from a node
  const findComponent = (nodeId: string, component: Set<string>) => {
    if (visited.has(nodeId)) return;
    visited.add(nodeId);
    component.add(nodeId);
    
    // Find all edges connected to this node
    edges.forEach(edge => {
      if (edge.source === nodeId && !visited.has(edge.target)) {
        findComponent(edge.target, component);
      }
      if (edge.target === nodeId && !visited.has(edge.source)) {
        findComponent(edge.source, component);
      }
    });
  };
  
  // Find all connected components
  nodes.forEach(node => {
    if (!visited.has(node.id)) {
      const component = new Set<string>();
      findComponent(node.id, component);
      connectedComponents.add(component);
    }
  });

  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, { width: nodeWidth, height: nodeHeight });
  });

  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  dagre.layout(dagreGraph);

  // Add spacing between disconnected components
  let componentOffset = 0;
  const componentSpacing = isHorizontal ? 200 : 300;
  
  const layoutedNodes = nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    
    // Find which component this node belongs to
    let nodeComponent: Set<string> | undefined;
    let componentIndex = 0;
    for (const component of connectedComponents) {
      if (component.has(node.id)) {
        nodeComponent = component;
        break;
      }
      componentIndex++;
    }
    
    // Apply component offset
    const additionalOffset = componentIndex * componentSpacing;
    
    const newNode = {
      ...node,
      targetPosition: isHorizontal ? 'left' : 'top',
      sourcePosition: isHorizontal ? 'right' : 'bottom',
      position: {
        x: nodeWithPosition.x - nodeWidth / 2 + (isHorizontal ? additionalOffset : 0),
        y: nodeWithPosition.y - nodeHeight / 2 + (isHorizontal ? 0 : additionalOffset),
      },
    } as Node;

    return newNode;
  });

  return { nodes: layoutedNodes, edges };
};

export function ActivityTimeline({ messages, startTime, endTime }: ActivityTimelineProps) {
  const sessionStartTime = startTime instanceof Date ? startTime : new Date(startTime);
  const layoutDirection = 'LR'; // Fixed to horizontal layout
  
  // Create timeline segments from user messages only
  const segments = createTimelineSegments(messages, sessionStartTime);
  
  // Create base nodes and edges (without layout)
  const { baseNodes, baseEdges } = useMemo(() => {
    const nodes: Node[] = [];
    const edges: Edge[] = [];
    
    // Group consecutive segments of the same activity type
    const groupedActivities: GroupedActivity[] = [];
    let currentGroup: GroupedActivity | null = null;
    let groupId = 0;
    
    segments.forEach((segment, index) => {
      if (!currentGroup || currentGroup.activity !== segment.activity) {
        // Start a new group
        if (currentGroup) {
          groupedActivities.push(currentGroup);
        }
        currentGroup = {
          id: `group-${groupId++}`,
          activity: segment.activity,
          color: segment.color,
          label: segment.label,
          segments: [segment],
          startTime: segment.minutesFromStart,
          endTime: segment.minutesFromStart
        };
      } else {
        // Add to current group
        currentGroup.segments.push(segment);
        currentGroup.endTime = segment.minutesFromStart;
      }
    });
    
    // Don't forget the last group
    if (currentGroup) {
      groupedActivities.push(currentGroup);
    }
    
    // Create nodes for each group (positions will be set by dagre)
    groupedActivities.forEach((group, index) => {
      nodes.push({
        id: group.id,
        type: 'groupedActivity',
        position: { x: 0, y: 0 }, // Dagre will calculate actual positions
        data: group
      });
      
      // Create edge from previous node (but not if current group is a conceptual pivot)
      if (index > 0 && group.activity !== 'conceptual_pivot') {
        edges.push({
          id: `edge-${index}`,
          source: groupedActivities[index - 1].id,
          target: group.id,
          type: 'smoothstep',
          animated: true,
          style: { 
            stroke: '#64748b', 
            strokeWidth: 2,
          },
          markerEnd: {
            type: MarkerType.ArrowClosed,
            color: '#64748b',
          },
        });
      }
      
      // If previous group was NOT a conceptual pivot but we skipped it, connect to it
      if (index > 0 && group.activity === 'conceptual_pivot' && index > 1) {
        // Don't connect conceptual pivots to previous nodes - they start new trees
      }
    });
    
    // Add branching for activities of different types that happen in parallel
    // (This creates a more tree-like structure)
    const activityTypeMap = new Map<ActivityType, string[]>();
    groupedActivities.forEach(group => {
      if (!activityTypeMap.has(group.activity)) {
        activityTypeMap.set(group.activity, []);
      }
      activityTypeMap.get(group.activity)!.push(group.id);
    });
    
    return { baseNodes: nodes, baseEdges: edges };
  }, [segments]);
  
  // Apply layout to nodes and edges
  const { nodes: initialNodes, edges: initialEdges } = useMemo(() => {
    return getLayoutedElements(baseNodes, baseEdges, layoutDirection);
  }, [baseNodes, baseEdges]);
  
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  
  // Calculate stats
  const totalMessages = segments.length;
  const uniqueActivities = new Set(segments.map(s => s.activity)).size;
  const sessionDuration = segments[segments.length - 1]?.minutesFromStart || 0;
  const groupedNodesCount = initialNodes.filter(n => n.type === 'groupedActivity').length;
  
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          Activity Timeline Flow
        </h3>
        <div className="flex gap-4 text-sm text-gray-600 dark:text-gray-400">
          <span>Messages: <strong className="text-gray-900 dark:text-white">{totalMessages}</strong></span>
          <span>Grouped into: <strong className="text-gray-900 dark:text-white">{groupedNodesCount} nodes</strong></span>
          <span>Activities: <strong className="text-gray-900 dark:text-white">{uniqueActivities} types</strong></span>
          <span>Duration: <strong className="text-gray-900 dark:text-white">{formatTimestamp(sessionDuration)}</strong></span>
        </div>
      </div>
      
      <div style={{ height: '600px' }} className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden relative">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={{
            padding: 0.2,
            includeHiddenNodes: false,
            minZoom: 0.2,
            maxZoom: 1.5,
          }}
          attributionPosition="bottom-left"
        >
          <Background color="#e5e7eb" gap={20} />
          <Controls />
          <MiniMap 
            nodeColor={(node) => node.data.color}
            pannable
            zoomable
            nodeStrokeWidth={3}
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.8)',
              border: '1px solid #e5e7eb'
            }}
          />
        </ReactFlow>
      </div>
      
      <div className="mt-4 grid grid-cols-4 gap-4">
        <div className="text-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            {totalMessages}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Total Messages
          </div>
        </div>
        <div className="text-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            {groupedNodesCount}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Activity Groups
          </div>
        </div>
        <div className="text-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            {uniqueActivities}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Unique Activities
          </div>
        </div>
        <div className="text-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            {formatTimestamp(sessionDuration)}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Session Time
          </div>
        </div>
      </div>
    </div>
  );
}

function createTimelineSegments(
  messages: ProcessedMessage[], 
  sessionStartTime: Date
): TimelineSegment[] {
  // Filter to only user messages
  const userMessages = messages.filter(msg => msg.role === 'user');

  return userMessages
    .filter(msg => msg.activity) // Only messages with activities
    .filter(msg => {
      const content = msg.content.trim();
      
      // Filter out messages that contain "[Request interrupted by user]"
      if (content.includes('[Request interrupted by user]')) return false;
      
      // Filter out messages that contain "[Request interrupted by user for tool use]"
      if (content.includes('[Request interrupted by user for tool use]')) return false;
      
      // Filter out initial_question since it's displayed above the timeline
      if (msg.activity === 'initial_question') return false;
      
      // Filter out implementation blocks that are just short follow-ups or acknowledgments
      if (msg.activity === 'implementation') {
        // Remove if it's a very short message (likely just "ok", "continue", etc.)
        if (content.length < 20) return false;
        // Remove if it matches common follow-up patterns
        const followUpPatterns = [
          /^(yes|no|ok|okay|sure|thanks|thank you|got it|i see|ah|oh)\.?$/i,
          /^(continue|proceed|go ahead|next)\.?$/i,
          /^(done|finished|completed)\.?$/i
        ];
        if (followUpPatterns.some(pattern => pattern.test(content))) return false;
      }
      return true;
    })
    .map((message, index) => {
      const messageTime = new Date(message.timestamp);
      const minutesFromStart = (messageTime.getTime() - sessionStartTime.getTime()) / 1000 / 60;

      return {
        sequenceNumber: index + 1,
        timestamp: messageTime,
        minutesFromStart,
        activity: message.activity!,
        color: ACTIVITY_COLORS[message.activity!] || ACTIVITY_COLORS.completion,
        label: message.activity!.replace(/_/g, ' '),
        content: message.content
      };
    });
}

function formatTimestamp(minutes: number): string {
  if (minutes < 1) return '0m';
  if (minutes < 60) return `${Math.round(minutes)}m`;
  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}