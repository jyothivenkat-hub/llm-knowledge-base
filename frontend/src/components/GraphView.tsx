import { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { AppState } from '../types';
import { Minimize2, ZoomIn, ZoomOut, RefreshCw } from 'lucide-react';

const CLUSTER_COLORS: Record<string, string> = {
  'transformer-architecture': '#3366cc',
  'transformer-performance': '#2a9d8f',
  'attention-optimization': '#e9c46a',
  'scaling-laws': '#f4a261',
  'llm-brain-alignment': '#e76f51',
  'brain-language-processing': '#9b59b6',
  'other': '#95a5a6',
};

const EDGE_COLORS: Record<string, string> = {
  'supports': '#a2a9b1',
  'contradicts': '#d33',
  'extends': '#3366cc',
  'causes': '#e9c46a',
  'related-to': '#c8ccd1',
  'provides-mechanism-for': '#2a9d8f',
};

function getClusterColor(cluster: string): string {
  return CLUSTER_COLORS[cluster] || '#' + ((Math.abs(hashCode(cluster)) % 0xFFFFFF).toString(16).padStart(6, '0'));
}

function hashCode(s: string): number {
  let hash = 0;
  for (let i = 0; i < s.length; i++) {
    hash = ((hash << 5) - hash) + s.charCodeAt(i);
    hash |= 0;
  }
  return hash;
}

export default function GraphView({ state }: { state: AppState }) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [selectedNode, setSelectedNode] = useState<any>(null);

  useEffect(() => {
    if (!svgRef.current || state.claims.length === 0) return;

    const updateDimensions = () => {
      if (!svgRef.current) return;
      renderGraph(svgRef.current.clientWidth, svgRef.current.clientHeight);
    };

    const resizeObserver = new ResizeObserver(updateDimensions);
    resizeObserver.observe(svgRef.current);
    updateDimensions();
    return () => resizeObserver.disconnect();
  }, [state]);

  const renderGraph = (width: number, height: number) => {
    if (!svgRef.current) return;

    // Build node degree map for sizing
    const degree: Record<string, number> = {};
    state.links.forEach(l => {
      degree[l.source] = (degree[l.source] || 0) + 1;
      degree[l.target] = (degree[l.target] || 0) + 1;
    });

    // Nodes: concepts (clusters) as big nodes, claims as smaller
    const nodes = [
      ...state.concepts.map(c => ({
        id: c.id,
        label: c.title,
        type: 'concept' as const,
        cluster: c.id,
        degree: degree[c.id] || c.claims.length,
        fullText: c.summary,
      })),
      ...state.claims.map(c => ({
        id: c.id,
        label: c.text.substring(0, 40) + (c.text.length > 40 ? '...' : ''),
        type: 'claim' as const,
        cluster: c.category || 'other',
        degree: degree[c.id] || 0,
        fullText: c.text,
      })),
    ];

    const links = state.links.map(l => ({ ...l }));

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();
    const g = svg.append("g");

    const zoom = d3.zoom().scaleExtent([0.1, 4]).on("zoom", (event) => { g.attr("transform", event.transform); });
    svg.call(zoom as any);

    const simulation = d3.forceSimulation(nodes as any)
      .force("link", d3.forceLink(links).id((d: any) => d.id).distance(80))
      .force("charge", d3.forceManyBody().strength(-150))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collision", d3.forceCollide().radius((d: any) => nodeRadius(d) + 3));

    // Links
    const link = g.append("g").selectAll("line").data(links).join("line")
      .attr("stroke-width", (d: any) => d.type === 'contradicts' ? 2 : 1)
      .attr("stroke", (d: any) => EDGE_COLORS[d.type] || '#c8ccd1')
      .attr("stroke-opacity", 0.4)
      .attr("stroke-dasharray", (d: any) => d.type === 'contradicts' ? '5,3' : '');

    // Nodes
    const node = g.append("g").selectAll("g").data(nodes).join("g")
      .call(d3.drag()
        .on("start", dragstarted)
        .on("drag", dragged)
        .on("end", dragended) as any)
      .on("click", (event: any, d: any) => { setSelectedNode(d); })
      .on("mouseover", function(event: any, d: any) {
        // Highlight neighbors
        const neighborIds = new Set<string>();
        links.forEach((l: any) => {
          if (l.source.id === d.id || l.source === d.id) neighborIds.add(typeof l.target === 'string' ? l.target : l.target.id);
          if (l.target.id === d.id || l.target === d.id) neighborIds.add(typeof l.source === 'string' ? l.source : l.source.id);
        });
        neighborIds.add(d.id);
        node.attr("opacity", (n: any) => neighborIds.has(n.id) ? 1 : 0.15);
        link.attr("opacity", (l: any) => {
          const src = typeof l.source === 'string' ? l.source : l.source.id;
          const tgt = typeof l.target === 'string' ? l.target : l.target.id;
          return src === d.id || tgt === d.id ? 0.8 : 0.05;
        });
      })
      .on("mouseout", function() {
        node.attr("opacity", 1);
        link.attr("opacity", 0.4);
      });

    node.append("circle")
      .attr("r", (d: any) => nodeRadius(d))
      .attr("fill", (d: any) => getClusterColor(d.cluster))
      .attr("stroke", "#fff")
      .attr("stroke-width", 1);

    // Labels for concepts and high-degree claims
    node.filter((d: any) => d.type === 'concept' || d.degree >= 3)
      .append("text")
      .text((d: any) => d.label.substring(0, 25))
      .attr("x", (d: any) => nodeRadius(d) + 4)
      .attr("y", 4)
      .attr("fill", "#202122")
      .attr("font-size", (d: any) => d.type === 'concept' ? '12px' : '10px')
      .attr("font-weight", (d: any) => d.type === 'concept' ? 'bold' : 'normal')
      .style("pointer-events", "none");

    simulation.on("tick", () => {
      link.attr("x1", (d: any) => d.source.x).attr("y1", (d: any) => d.source.y)
        .attr("x2", (d: any) => d.target.x).attr("y2", (d: any) => d.target.y);
      node.attr("transform", (d: any) => `translate(${d.x},${d.y})`);
    });

    function dragstarted(event: any) { if (!event.active) simulation.alphaTarget(0.3).restart(); event.subject.fx = event.subject.x; event.subject.fy = event.subject.y; }
    function dragged(event: any) { event.subject.fx = event.x; event.subject.fy = event.y; }
    function dragended(event: any) { if (!event.active) simulation.alphaTarget(0); event.subject.fx = null; event.subject.fy = null; }
  };

  function nodeRadius(d: any): number {
    if (d.type === 'concept') return 14;
    return Math.max(4, Math.min(10, 4 + (d.degree || 0) * 1.5));
  }

  if (state.claims.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-[#54595d]">
        <p className="font-medium">No graph data yet.</p>
        <p className="text-sm opacity-60 mt-1">Compile your research to build the knowledge graph.</p>
      </div>
    );
  }

  return (
    <div className="h-full relative bg-[#f8f9fa]">
      <svg ref={svgRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

      {/* Legend */}
      <div className="absolute bottom-6 left-6 flex flex-wrap items-center gap-4 px-4 py-2 bg-white/90 border border-[#a2a9b1] rounded shadow-sm text-[10px]">
        {state.concepts.map(c => (
          <div key={c.id} className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: getClusterColor(c.id) }} />
            <span className="font-bold text-[#54595d] uppercase tracking-wider">{c.title.substring(0, 20)}</span>
          </div>
        ))}
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-0.5 bg-[#d33]" style={{ borderTop: '2px dashed #d33' }} />
          <span className="font-bold text-[#54595d] uppercase tracking-wider">Contradicts</span>
        </div>
      </div>

      {/* Node detail panel */}
      {selectedNode && (
        <div className="absolute top-6 right-6 w-80 bg-white border border-[#a2a9b1] rounded shadow-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: getClusterColor(selectedNode.cluster) }}>
              {selectedNode.type} — {selectedNode.cluster}
            </span>
            <button onClick={() => setSelectedNode(null)} className="text-[#54595d] hover:text-[#202122]">
              <Minimize2 className="w-4 h-4" />
            </button>
          </div>
          <h3 className="text-[15px] font-serif font-bold text-[#202122] mb-3 leading-tight">
            {selectedNode.type === 'concept' ? selectedNode.label : selectedNode.fullText}
          </h3>
          {selectedNode.type === 'concept' && (
            <p className="text-[13px] text-[#54595d] leading-relaxed mb-4">
              {state.concepts.find(c => c.id === selectedNode.id)?.summary}
            </p>
          )}
          <p className="text-[11px] text-[#72777d]">
            {selectedNode.degree} connection{selectedNode.degree !== 1 ? 's' : ''}
          </p>
        </div>
      )}
    </div>
  );
}
