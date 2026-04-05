import { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { AppState, GraphNode, GraphLink } from '../types';
import { Minimize2, ZoomIn, ZoomOut, RefreshCw } from 'lucide-react';

export default function GraphView({ state }: { state: AppState }) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [selectedNode, setSelectedNode] = useState<any>(null);

  useEffect(() => {
    if (!svgRef.current) return;

    const updateDimensions = () => {
      if (!svgRef.current) return;
      const width = svgRef.current.clientWidth;
      const height = svgRef.current.clientHeight;
      renderGraph(width, height);
    };

    const resizeObserver = new ResizeObserver(updateDimensions);
    resizeObserver.observe(svgRef.current);
    updateDimensions();
    return () => resizeObserver.disconnect();
  }, [state]);

  const renderGraph = (width: number, height: number) => {
    if (!svgRef.current) return;

    const nodes: GraphNode[] = [
      ...state.concepts.map(c => ({ id: c.id, label: c.title, type: 'concept' as const })),
      ...state.claims.map(c => ({ id: c.id, label: c.text.substring(0, 30) + '...', type: 'claim' as const })),
    ];

    const links = state.links.map(l => ({ ...l }));

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();
    const g = svg.append("g");

    const zoom = d3.zoom()
      .scaleExtent([0.1, 4])
      .on("zoom", (event) => { g.attr("transform", event.transform); });
    svg.call(zoom as any);

    const simulation = d3.forceSimulation(nodes as any)
      .force("link", d3.forceLink(links).id((d: any) => d.id).distance(100))
      .force("charge", d3.forceManyBody().strength(-300))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collision", d3.forceCollide().radius(50));

    const link = g.append("g").selectAll("line").data(links).join("line")
      .attr("stroke-width", 1.5)
      .attr("stroke", (d: any) => {
        if (d.type === 'contradicts') return '#d33';
        if (d.type === 'extends') return '#3366cc';
        return '#a2a9b1';
      })
      .attr("stroke-opacity", 0.6);

    const node = g.append("g").selectAll("g").data(nodes).join("g")
      .call(d3.drag()
        .on("start", dragstarted)
        .on("drag", dragged)
        .on("end", dragended) as any)
      .on("click", (event, d) => { setSelectedNode(d); });

    node.append("circle")
      .attr("r", (d: any) => d.type === 'concept' ? 12 : 6)
      .attr("fill", (d: any) => d.type === 'concept' ? "#3366cc" : "#eaecf0")
      .attr("stroke", "#a2a9b1")
      .attr("stroke-width", 1);

    node.append("text")
      .text((d: any) => d.label)
      .attr("x", 15).attr("y", 4)
      .attr("fill", "#202122").attr("font-size", "11px").attr("font-family", "sans-serif")
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

  return (
    <div className="h-full relative bg-[#f8f9fa]">
      <svg ref={svgRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

      <div className="absolute top-6 left-6 flex flex-col gap-2">
        <button className="p-2 bg-white border border-[#a2a9b1] rounded shadow-sm hover:bg-[#f6f6f6]"><ZoomIn className="w-4 h-4 text-[#54595d]" /></button>
        <button className="p-2 bg-white border border-[#a2a9b1] rounded shadow-sm hover:bg-[#f6f6f6]"><ZoomOut className="w-4 h-4 text-[#54595d]" /></button>
        <button className="p-2 bg-white border border-[#a2a9b1] rounded shadow-sm hover:bg-[#f6f6f6] mt-2"><RefreshCw className="w-4 h-4 text-[#54595d]" /></button>
      </div>

      {selectedNode && (
        <div className="absolute top-6 right-6 w-80 bg-white border border-[#a2a9b1] rounded shadow-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <span className="text-[10px] font-bold text-[#3366cc] uppercase tracking-widest">{selectedNode.type}</span>
            <button onClick={() => setSelectedNode(null)} className="text-[#54595d] hover:text-[#202122]"><Minimize2 className="w-4 h-4" /></button>
          </div>
          <h3 className="text-lg font-serif font-bold text-[#202122] mb-2 leading-tight">{selectedNode.label}</h3>
          <p className="text-[13px] text-[#54595d] leading-relaxed mb-6">
            {selectedNode.type === 'concept'
              ? state.concepts.find(c => c.id === selectedNode.id)?.summary
              : state.claims.find(c => c.id === selectedNode.id)?.text}
          </p>
        </div>
      )}

      <div className="absolute bottom-6 left-6 flex items-center gap-6 px-4 py-2 bg-white/80 border border-[#a2a9b1] rounded shadow-sm">
        <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-[#3366cc]" /><span className="text-[10px] font-bold text-[#54595d] uppercase tracking-wider">Concept</span></div>
        <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-[#eaecf0] border border-[#a2a9b1]" /><span className="text-[10px] font-bold text-[#54595d] uppercase tracking-wider">Claim</span></div>
        <div className="flex items-center gap-2"><div className="w-4 h-0.5 bg-[#a2a9b1]" /><span className="text-[10px] font-bold text-[#54595d] uppercase tracking-wider">Supports</span></div>
        <div className="flex items-center gap-2"><div className="w-4 h-0.5 bg-[#d33]" /><span className="text-[10px] font-bold text-[#54595d] uppercase tracking-wider">Contradicts</span></div>
      </div>
    </div>
  );
}
