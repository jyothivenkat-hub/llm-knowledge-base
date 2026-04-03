/* Knowledge Graph D3.js Visualization */

let graphData = null;
let insightsData = null;
let simulation = null;
let svg, g, linkGroup, nodeGroup, hullGroup;
let currentColorBy = 'cluster';
let activeCluster = null;
let selectedNode = null;

const EDGE_STYLES = {
    'supports': { dash: '', color: '#4ade80', label: 'Supports' },
    'contradicts': { dash: '6,4', color: '#f87171', label: 'Contradicts' },
    'extends': { dash: '', color: '#38bdf8', label: 'Extends' },
    'causes': { dash: '', color: '#fbbf24', label: 'Causes' },
    'is-part-of': { dash: '3,3', color: '#c084fc', label: 'Part of' },
    'related-to': { dash: '2,4', color: '#6a6a82', label: 'Related' },
    'provides-mechanism-for': { dash: '', color: '#fb923c', label: 'Mechanism' },
    'uses-method': { dash: '4,2', color: '#34d399', label: 'Uses method' },
};

const TYPE_SHAPES = { finding: 'circle', claim: 'circle', method: 'diamond', concept: 'square', hypothesis: 'triangle' };
const PAPER_COLORS = ['#7c83ff', '#4ade80', '#fbbf24', '#f87171', '#38bdf8', '#c084fc', '#fb923c', '#34d399', '#f472b6', '#a78bfa'];

async function initGraph() {
    const [graphResp, insightsResp] = await Promise.all([
        fetch('/api/graph').then(r => r.json()),
        fetch('/api/graph/insights').then(r => r.json()).catch(() => ({}))
    ]);
    graphData = graphResp;
    insightsData = insightsResp;

    document.getElementById('stat-nodes').textContent = graphData.metadata.total_nodes;
    document.getElementById('stat-edges').textContent = graphData.metadata.total_edges;
    document.getElementById('stat-clusters').textContent = graphData.metadata.total_clusters;
    document.getElementById('stat-papers').textContent = graphData.metadata.papers_processed;

    buildClusterList();
    buildEdgeFilters();
    buildInsightsPanel();
    renderGraph();
    setupSearch();
    document.getElementById('color-by').addEventListener('change', e => { currentColorBy = e.target.value; updateColors(); });
}

function buildClusterList() {
    const el = document.getElementById('cluster-list');
    el.innerHTML = graphData.clusters.map(c => `
        <div class="cluster-item" onclick="toggleCluster('${c.id}')">
            <span class="cluster-dot" style="background:${c.color}"></span>
            <span>${c.label}</span>
            <span class="cluster-count">${c.node_ids.length}</span>
        </div>
    `).join('');
}

function buildEdgeFilters() {
    const types = [...new Set(graphData.edges.map(e => e.relationship))];
    const el = document.getElementById('edge-type-filters');
    el.innerHTML = types.map(t => {
        const style = EDGE_STYLES[t] || EDGE_STYLES['related-to'];
        return `<label class="cluster-item"><input type="checkbox" checked onchange="filterEdges()" data-type="${t}">
            <span style="color:${style.color}">${style.label}</span>
            <span class="cluster-count">${graphData.edges.filter(e=>e.relationship===t).length}</span>
        </label>`;
    }).join('');
}

function buildInsightsPanel() {
    const el = document.getElementById('insights-content');
    if (!insightsData) { el.innerHTML = '<p style="color:var(--text-muted)">No insights available.</p>'; return; }
    let html = '';
    if (insightsData.contradictions?.length) {
        html += '<div style="margin-top:8px;font-weight:600;color:#f87171;">Contradictions</div>';
        insightsData.contradictions.forEach(c => { html += `<div class="insight-item">${c.description}</div>`; });
    }
    if (insightsData.gaps?.length) {
        html += '<div style="margin-top:8px;font-weight:600;color:#fbbf24;">Gaps</div>';
        insightsData.gaps.forEach(g => { html += `<div class="insight-item">${g.description}</div>`; });
    }
    if (insightsData.synthesis?.length) {
        html += '<div style="margin-top:8px;font-weight:600;color:#4ade80;">Synthesis Opportunities</div>';
        insightsData.synthesis.forEach(s => { html += `<div class="insight-item">${s.insight}</div>`; });
    }
    if (insightsData.key_questions?.length) {
        html += '<div style="margin-top:8px;font-weight:600;color:#38bdf8;">Key Questions</div>';
        insightsData.key_questions.forEach(q => { html += `<div class="insight-item">[${q.priority}] ${q.question}</div>`; });
    }
    el.innerHTML = html || '<p style="color:var(--text-muted)">No insights found.</p>';
}

function renderGraph() {
    const container = document.getElementById('graph-container');
    const width = container.clientWidth;
    const height = container.clientHeight;

    svg = d3.select('#graph-container').append('svg').attr('width', width).attr('height', height);

    // Zoom
    const zoom = d3.zoom().scaleExtent([0.1, 5]).on('zoom', e => g.attr('transform', e.transform));
    svg.call(zoom);

    g = svg.append('g');
    hullGroup = g.append('g').attr('class', 'hulls');
    linkGroup = g.append('g').attr('class', 'links');
    nodeGroup = g.append('g').attr('class', 'nodes');

    // Degree for sizing
    const degree = {};
    graphData.edges.forEach(e => {
        degree[e.source_id] = (degree[e.source_id] || 0) + 1;
        degree[e.target_id] = (degree[e.target_id] || 0) + 1;
    });

    const nodes = graphData.nodes.map(n => ({ ...n, degree: degree[n.id] || 0 }));
    const links = graphData.edges.map(e => ({ ...e, source: e.source_id, target: e.target_id }));

    simulation = d3.forceSimulation(nodes)
        .force('link', d3.forceLink(links).id(d => d.id).distance(80))
        .force('charge', d3.forceManyBody().strength(-120))
        .force('center', d3.forceCenter(width / 2, height / 2))
        .force('collide', d3.forceCollide().radius(d => nodeRadius(d) + 4));

    // Links
    const link = linkGroup.selectAll('line').data(links).enter().append('line')
        .attr('class', 'graph-link')
        .attr('stroke', d => (EDGE_STYLES[d.relationship] || EDGE_STYLES['related-to']).color)
        .attr('stroke-opacity', d => Math.max(0.2, d.strength * 0.6))
        .attr('stroke-width', d => Math.max(1, d.strength * 2.5))
        .attr('stroke-dasharray', d => (EDGE_STYLES[d.relationship] || EDGE_STYLES['related-to']).dash);

    // Nodes
    const node = nodeGroup.selectAll('circle').data(nodes).enter().append('circle')
        .attr('class', 'graph-node')
        .attr('r', d => nodeRadius(d))
        .attr('fill', d => getColor(d))
        .attr('stroke', '#1a1a2e')
        .attr('stroke-width', 1.5)
        .attr('cursor', 'pointer')
        .on('click', (e, d) => showDetail(d))
        .on('mouseover', (e, d) => highlightNeighbors(d, true))
        .on('mouseout', (e, d) => highlightNeighbors(d, false))
        .call(d3.drag().on('start', dragStart).on('drag', dragging).on('end', dragEnd));

    // Labels for high-degree nodes
    const labels = nodeGroup.selectAll('text').data(nodes.filter(n => n.degree >= 3)).enter().append('text')
        .attr('class', 'graph-label')
        .attr('text-anchor', 'middle')
        .attr('dy', d => nodeRadius(d) + 12)
        .attr('fill', '#a0a0b8')
        .attr('font-size', '10px')
        .text(d => d.text.slice(0, 30) + (d.text.length > 30 ? '...' : ''));

    simulation.on('tick', () => {
        link.attr('x1', d => d.source.x).attr('y1', d => d.source.y)
            .attr('x2', d => d.target.x).attr('y2', d => d.target.y);
        node.attr('cx', d => d.x).attr('cy', d => d.y);
        labels.attr('x', d => d.x).attr('y', d => d.y);
        drawHulls();
    });

    // Store refs
    svg._link = link; svg._node = node; svg._labels = labels; svg._links = links; svg._nodes = nodes;
}

function nodeRadius(d) { return Math.max(5, Math.min(18, 5 + (d.degree || 0) * 1.5)); }

function getColor(d) {
    if (currentColorBy === 'cluster') {
        const cluster = graphData.clusters.find(c => c.id === d.cluster);
        return cluster ? cluster.color : '#6a6a82';
    }
    if (currentColorBy === 'paper') {
        const papers = [...new Set(graphData.nodes.map(n => n.source_paper))];
        return PAPER_COLORS[papers.indexOf(d.source_paper) % PAPER_COLORS.length];
    }
    if (currentColorBy === 'type') {
        const map = { finding: '#4ade80', claim: '#7c83ff', method: '#fbbf24', concept: '#38bdf8', hypothesis: '#c084fc' };
        return map[d.type] || '#6a6a82';
    }
    return '#7c83ff';
}

function updateColors() {
    svg._node.attr('fill', d => getColor(d));
}

function drawHulls() {
    hullGroup.selectAll('path').remove();
    graphData.clusters.forEach(cluster => {
        const pts = svg._nodes.filter(n => n.cluster === cluster.id).map(n => [n.x, n.y]);
        if (pts.length < 3) return;
        const hull = d3.polygonHull(pts);
        if (!hull) return;
        hullGroup.append('path')
            .datum(hull)
            .attr('d', d => 'M' + d.map(p => p.join(',')).join('L') + 'Z')
            .attr('fill', cluster.color)
            .attr('fill-opacity', 0.06)
            .attr('stroke', cluster.color)
            .attr('stroke-opacity', 0.15)
            .attr('stroke-width', 1);
    });
}

function highlightNeighbors(d, on) {
    const neighborIds = new Set();
    graphData.edges.forEach(e => {
        if (e.source_id === d.id) neighborIds.add(e.target_id);
        if (e.target_id === d.id) neighborIds.add(e.source_id);
    });
    neighborIds.add(d.id);

    svg._node.attr('opacity', n => on ? (neighborIds.has(n.id) ? 1 : 0.12) : 1);
    svg._link.attr('opacity', e => on ? (e.source.id === d.id || e.target.id === d.id ? 1 : 0.05) : 0.6);
}

function showDetail(d) {
    selectedNode = d;
    const panel = document.getElementById('node-detail');
    const edges = graphData.edges.filter(e => e.source_id === d.id || e.target_id === d.id);

    let html = `
        <span class="badge badge-info" style="margin-bottom:8px;">${d.type}</span>
        <h3>${d.text}</h3>
        <div class="meta">Source: ${d.source_paper}</div>
        <div class="meta">Cluster: ${d.cluster}</div>
        <div class="meta">Tags: ${(d.tags||[]).join(', ')}</div>
        ${d.evidence ? `<div class="claim-text">${d.evidence}</div>` : ''}
        <h4 style="margin-top:16px;font-size:13px;color:var(--text-muted);">Connections (${edges.length})</h4>
    `;

    edges.forEach(e => {
        const otherId = e.source_id === d.id ? e.target_id : e.source_id;
        const other = graphData.nodes.find(n => n.id === otherId);
        const style = EDGE_STYLES[e.relationship] || EDGE_STYLES['related-to'];
        if (other) {
            html += `<div class="edge-item">
                <span style="color:${style.color};font-weight:600;">${style.label}</span>
                <span style="color:var(--text-muted);font-size:11px;">(${(e.strength*100).toFixed(0)}%)</span><br>
                <span style="font-size:12px;">${other.text.slice(0,80)}...</span><br>
                <span style="font-size:11px;color:var(--text-muted);">${e.explanation}</span>
            </div>`;
        }
    });

    document.getElementById('detail-content').innerHTML = html;
    panel.classList.add('open');
}

function closeDetail() {
    document.getElementById('node-detail').classList.remove('open');
    selectedNode = null;
}

function toggleCluster(id) {
    activeCluster = activeCluster === id ? null : id;
    if (activeCluster) {
        const cluster = graphData.clusters.find(c => c.id === id);
        const ids = new Set(cluster.node_ids);
        svg._node.attr('opacity', n => ids.has(n.id) ? 1 : 0.08);
        svg._link.attr('opacity', e => ids.has(e.source.id) && ids.has(e.target.id) ? 0.8 : 0.03);
    } else {
        svg._node.attr('opacity', 1);
        svg._link.attr('opacity', 0.6);
    }
}

function filterEdges() {
    const checked = new Set();
    document.querySelectorAll('#edge-type-filters input:checked').forEach(el => checked.add(el.dataset.type));
    svg._link.attr('display', e => checked.has(e.relationship) ? null : 'none');
}

function setupSearch() {
    let timer;
    document.getElementById('graph-search').addEventListener('input', e => {
        clearTimeout(timer);
        timer = setTimeout(() => {
            const q = e.target.value.toLowerCase().trim();
            if (!q) { svg._node.attr('opacity', 1); svg._link.attr('opacity', 0.6); return; }
            svg._node.attr('opacity', n => n.text.toLowerCase().includes(q) || (n.tags||[]).some(t => t.includes(q)) ? 1 : 0.08);
            svg._link.attr('opacity', 0.1);
        }, 200);
    });
}

function dragStart(e, d) { if (!e.active) simulation.alphaTarget(0.3).restart(); d.fx = d.x; d.fy = d.y; }
function dragging(e, d) { d.fx = e.x; d.fy = e.y; }
function dragEnd(e, d) { if (!e.active) simulation.alphaTarget(0); d.fx = null; d.fy = null; }

document.addEventListener('DOMContentLoaded', initGraph);
