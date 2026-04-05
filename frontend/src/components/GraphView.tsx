import { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { AppState, Domain } from '../types';
import { Minimize2 } from 'lucide-react';

const EDGE_COLORS: Record<string, string> = {
  'supports': '#a2a9b1',
  'contradicts': '#d33',
  'extends': '#3366cc',
  'causes': '#e9c46a',
  'related-to': '#c8ccd1',
  'provides-mechanism-for': '#2a9d8f',
};

const PALETTE = ['#3366cc', '#2a9d8f', '#e9c46a', '#f4a261', '#e76f51', '#9b59b6', '#4ade80', '#fb923c', '#f472b6', '#38bdf8', '#c084fc', '#34d399'];

function getClusterColor(cluster: string, clusterIndex: Record<string, number>): string {
  const idx = clusterIndex[cluster];
  if (idx !== undefined) return PALETTE[idx % PALETTE.length];
  return '#95a5a6';
}

export default function GraphView({ state }: { state: AppState }) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [selectedNode, setSelectedNode] = useState<any>(null);
  const [domains, setDomains] = useState<Domain[]>([]);
  const [selectedDomain, setSelectedDomain] = useState<string>('all');
  const [selectedCluster, setSelectedCluster] = useState<string | null>(null);

  // Load domains for the filter
  useEffect(() => {
    fetch('/api/wiki-page').then(r => r.json()).then(data => {
      if (data.domains) setDomains(data.domains);
    }).catch(() => {});
  }, []);

  // Build cluster-to-domain mapping
  const clusterToDomain: Record<string, string> = {};
  for (const d of domains) {
    for (const cid of d.cluster_ids || []) {
      clusterToDomain[cid] = d.id;
    }
  }

  // Build stable cluster color index
  const clusterIndex: Record<string, number> = {};
  state.concepts.forEach((c, i) => { clusterIndex[c.id] = i; });

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
  }, [state, selectedDomain, selectedCluster, domains]);

  const renderGraph = (width: number, height: number) => {
    if (!svgRef.current) return;

    const degree: Record<string, number> = {};
    state.links.forEach(l => {
      degree[l.source] = (degree[l.source] || 0) + 1;
      degree[l.target] = (degree[l.target] || 0) + 1;
    });

    // Filter by domain and/or cluster
    const domainClusterIds = selectedDomain === 'all'
      ? null
      : new Set(domains.find(d => d.id === selectedDomain)?.cluster_ids || []);

    const allNodes = [
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

    // Apply domain + cluster filter
    let nodes = domainClusterIds
      ? allNodes.filter(n => domainClusterIds.has(n.cluster))
      : allNodes;

    if (selectedCluster) {
      nodes = nodes.filter(n => n.cluster === selectedCluster);
    }

    const nodeIds = new Set(nodes.map(n => n.id));
    const links = state.links
      .filter(l => nodeIds.has(l.source) && nodeIds.has(l.target))
      .map(l => ({ ...l }));

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    if (nodes.length === 0) {
      svg.append("text").attr("x", width / 2).attr("y", height / 2)
        .attr("text-anchor", "middle").attr("fill", "#54595d").attr("font-size", "14px")
        .text("No nodes in this domain.");
      return;
    }

    const g = svg.append("g");
    const zoom = d3.zoom().scaleExtent([0.1, 4]).on("zoom", (event) => { g.attr("transform", event.transform); });
    svg.call(zoom as any);

    const simulation = d3.forceSimulation(nodes as any)
      .force("link", d3.forceLink(links).id((d: any) => d.id).distance(80))
      .force("charge", d3.forceManyBody().strength(-150))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collision", d3.forceCollide().radius((d: any) => nodeRadius(d) + 3));

    const link = g.append("g").selectAll("line").data(links).join("line")
      .attr("stroke-width", (d: any) => d.type === 'contradicts' ? 2 : 1)
      .attr("stroke", (d: any) => EDGE_COLORS[d.type] || '#c8ccd1')
      .attr("stroke-opacity", 0.4)
      .attr("stroke-dasharray", (d: any) => d.type === 'contradicts' ? '5,3' : '');

    const node = g.append("g").selectAll("g").data(nodes).join("g")
      .call(d3.drag()
        .on("start", dragstarted)
        .on("drag", dragged)
        .on("end", dragended) as any)
      .on("click", (event: any, d: any) => { setSelectedNode(d); })
      .on("mouseover", function(event: any, d: any) {
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
      .attr("fill", (d: any) => getClusterColor(d.cluster, clusterIndex))
      .attr("stroke", "#fff")
      .attr("stroke-width", 1);

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
      {/* Domain filter dropdown */}
      {domains.length > 0 && (
        <div className="absolute top-3 left-3 md:top-6 md:left-6 z-10">
          <select
            value={selectedDomain}
            onChange={e => { setSelectedDomain(e.target.value); setSelectedNode(null); setSelectedCluster(null); }}
            className="bg-white border border-[#a2a9b1] rounded px-3 py-1.5 text-[13px] font-bold text-[#202122] shadow-sm focus:outline-none focus:border-[#3366cc] cursor-pointer"
          >
            <option value="all">All Domains ({state.claims.length} claims)</option>
            {domains.map(d => (
              <option key={d.id} value={d.id}>
                {d.label} ({d.claim_count} claims)
              </option>
            ))}
          </select>
        </div>
      )}

      <svg ref={svgRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

      {/* Clickable theme panel */}
      <div className="absolute top-12 md:top-14 left-3 md:left-6 z-10 flex flex-col gap-1 max-h-[60vh] overflow-y-auto">
        {state.concepts
          .filter(c => selectedDomain === 'all' || (domains.find(d => d.id === selectedDomain)?.cluster_ids || []).includes(c.id))
          .map(c => {
            const isActive = selectedCluster === c.id;
            const claimCount = c.claims?.length || 0;
            return (
              <button
                key={c.id}
                onClick={() => setSelectedCluster(isActive ? null : c.id)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded text-left text-[11px] md:text-[12px] transition-all shadow-sm border ${
                  isActive
                    ? 'bg-white border-[#3366cc] font-bold'
                    : 'bg-white/80 border-[#a2a9b1] hover:bg-white hover:border-[#3366cc]'
                }`}
              >
                <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: getClusterColor(c.id, clusterIndex) }} />
                <span className="truncate max-w-[160px]">{c.title}</span>
                <span className="text-[10px] text-[#72777d] shrink-0">({claimCount})</span>
              </button>
            );
          })}
        {selectedCluster && (
          <button
            onClick={() => setSelectedCluster(null)}
            className="px-3 py-1 rounded text-[11px] text-[#0645ad] hover:underline text-left"
          >
            Show all
          </button>
        )}
      </div>

      {/* Legend */}
      <div className="absolute bottom-2 left-2 md:bottom-6 md:left-6 flex flex-wrap items-center gap-2 md:gap-4 px-2 md:px-4 py-1.5 md:py-2 bg-white/90 border border-[#a2a9b1] rounded shadow-sm text-[9px] md:text-[10px] max-w-[90%] md:max-w-none">
        {state.concepts
          .filter(c => selectedDomain === 'all' || (domains.find(d => d.id === selectedDomain)?.cluster_ids || []).includes(c.id))
          .map(c => (
          <div key={c.id} className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: getClusterColor(c.id, clusterIndex) }} />
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
        <div className="fixed bottom-0 left-0 right-0 md:absolute md:bottom-auto md:left-auto md:top-6 md:right-6 md:w-80 bg-white border border-[#a2a9b1] rounded-t-xl md:rounded shadow-xl p-4 md:p-6 z-20 max-h-[50vh] md:max-h-none overflow-y-auto">
          <div className="flex items-center justify-between mb-4">
            <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: getClusterColor(selectedNode.cluster, clusterIndex) }}>
              {selectedNode.type} — {selectedNode.cluster.replace(/-/g, ' ')}
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
