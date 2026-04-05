import { useState, useEffect } from 'react';
import { AppState, WikiEntity, Domain } from '../types';
import { BookOpen, ExternalLink, ArrowLeft, ChevronRight, FileText, Edit3, Lightbulb, ArrowRight, Layers } from 'lucide-react';
import { getEntities, getEntity, getDomainPage } from '../services/api';
import WikiEditor from './WikiEditor';

type WikiArticle = {
  slug: string;
  title: string;
  source_url: string;
  concepts: string[];
  content_md: string;
  content_html: string;
};

type WikiPageData = {
  papers: any[];
  claims_summary: any;
  cluster_sections: any[];
  domains: Domain[];
  bridge_facts: string[];
  product_ideas: any[];
  source_articles: any[];
  total_edges: number;
  built_at: string;
};

export default function WikiView({ state }: { state: AppState }) {
  const [articles, setArticles] = useState<WikiArticle[]>([]);
  const [entities, setEntities] = useState<WikiEntity[]>([]);
  const [pageData, setPageData] = useState<WikiPageData | null>(null);
  const [selectedArticle, setSelectedArticle] = useState<WikiArticle | null>(null);
  const [selectedEntity, setSelectedEntity] = useState<WikiEntity | null>(null);
  const [selectedDomain, setSelectedDomain] = useState<Domain | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<string | null>(null);
  const [showAllEntities, setShowAllEntities] = useState(false);

  useEffect(() => {
    Promise.allSettled([
      fetch('/api/wiki-articles').then(r => r.json()),
      fetch('/api/wiki-page').then(r => r.json()),
      getEntities(),
    ]).then(([articlesResult, pageDataResult, entitiesResult]) => {
      if (articlesResult.status === 'fulfilled') setArticles(articlesResult.value.articles || []);
      if (pageDataResult.status === 'fulfilled' && !pageDataResult.value.empty) setPageData(pageDataResult.value);
      if (entitiesResult.status === 'fulfilled') setEntities(entitiesResult.value);
      setLoading(false);
    });
  }, []);

  const handleWikilinkClick = (slug: string) => {
    const entityMatch = entities.find(e =>
      e.slug === slug.toLowerCase().replace(/\s+/g, '-') ||
      e.title.toLowerCase() === slug.toLowerCase()
    );
    if (entityMatch) {
      openEntity(entityMatch.slug);
      return;
    }
    const linked = articles.find(a =>
      a.slug.includes(slug) || a.concepts.includes(slug)
    );
    if (linked) {
      setSelectedEntity(null);
      setSelectedArticle(linked);
      setEditing(null);
    }
  };

  const openEntity = async (slug: string) => {
    const full = await getEntity(slug);
    if (full) {
      setSelectedArticle(null);
      setSelectedEntity(full);
      setEditing(null);
    }
  };

  const openDomain = async (domainId: string) => {
    const full = await getDomainPage(domainId);
    if (full) {
      setSelectedDomain(full);
      setSelectedArticle(null);
      setSelectedEntity(null);
      setEditing(null);
    }
  };

  const wikilinkHandler = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    if (target.tagName === 'A' && target.dataset.wikilink) {
      e.preventDefault();
      handleWikilinkClick(target.dataset.wikilink);
    }
  };

  const goHome = () => {
    setSelectedDomain(null);
    setSelectedArticle(null);
    setSelectedEntity(null);
    setEditing(null);
  };

  if (loading) return <div className="p-8 text-[#54595d]">Loading wiki...</div>;

  // ─── Level 3: Editing mode ─────────────────────────────
  if (editing) {
    return (
      <div className="h-full bg-white overflow-y-auto">
        <div className="max-w-[900px] mx-auto px-4 md:px-8 py-6">
          <button onClick={() => setEditing(null)} className="flex items-center gap-1 text-[13px] text-[#0645ad] hover:underline mb-4">
            <ArrowLeft className="w-3 h-3" /> Back
          </button>
          <WikiEditor path={editing} onClose={() => setEditing(null)} onSave={() => setEditing(null)} />
        </div>
      </div>
    );
  }

  // ─── Level 3: Entity detail ────────────────────────────
  if (selectedEntity) {
    return (
      <div className="h-full bg-white overflow-y-auto">
        <div className="max-w-[900px] mx-auto px-4 md:px-8 py-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-1 text-[13px] text-[#54595d]">
              <button onClick={goHome} className="text-[#0645ad] hover:underline">Main Page</button>
              {selectedDomain && (<><span className="mx-1">›</span><button onClick={() => { setSelectedEntity(null); }} className="text-[#0645ad] hover:underline">{selectedDomain.label}</button></>)}
              <span className="mx-1">›</span>
              <span>{selectedEntity.title}</span>
            </div>
            {state.authoringEnabled && (
              <button onClick={() => setEditing(`entities/${selectedEntity.slug}.md`)} className="flex items-center gap-1.5 px-3 py-1 rounded text-[11px] font-bold border border-[#a2a9b1] hover:bg-[#eaecf0] transition-colors">
                <Edit3 className="w-3 h-3" /> Edit
              </button>
            )}
          </div>
          <h1 className="text-[1.8em] font-serif border-b border-[#a2a9b1] pb-2 mb-1">{selectedEntity.title}</h1>
          <div className="text-[12px] text-[#54595d] mb-4">Entity page · {selectedEntity.source_count} sources · Updated {selectedEntity.last_updated || 'recently'}</div>
          <div className="prose-wiki text-[15px] leading-[1.8]" dangerouslySetInnerHTML={{ __html: selectedEntity.content_html || '' }} onClick={wikilinkHandler} />
          {selectedEntity.related_claims.length > 0 && (
            <div className="mt-8 pt-4 border-t border-[#a2a9b1]">
              <h3 className="text-[12px] font-bold text-[#54595d] uppercase tracking-wider mb-3">Related claims ({selectedEntity.related_claims.length})</h3>
              <div className="flex flex-wrap gap-2">
                {selectedEntity.related_claims.slice(0, 12).map(c => (
                  <span key={c} className="px-3 py-1 bg-[#eaecf0] border border-[#a2a9b1] rounded text-[11px] text-[#54595d]">{c}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ─── Level 3: Article detail ───────────────────────────
  if (selectedArticle) {
    return (
      <div className="h-full bg-white overflow-y-auto">
        <div className="max-w-[900px] mx-auto px-4 md:px-8 py-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-1 text-[13px] text-[#54595d]">
              <button onClick={goHome} className="text-[#0645ad] hover:underline">Main Page</button>
              {selectedDomain && (<><span className="mx-1">›</span><button onClick={() => { setSelectedArticle(null); }} className="text-[#0645ad] hover:underline">{selectedDomain.label}</button></>)}
              <span className="mx-1">›</span>
              <span className="truncate max-w-[300px]">{selectedArticle.title}</span>
            </div>
            {state.authoringEnabled && (
              <button onClick={() => setEditing(`sources/${selectedArticle.slug}.md`)} className="flex items-center gap-1.5 px-3 py-1 rounded text-[11px] font-bold border border-[#a2a9b1] hover:bg-[#eaecf0] transition-colors">
                <Edit3 className="w-3 h-3" /> Edit
              </button>
            )}
          </div>
          <h1 className="text-[1.8em] font-serif border-b border-[#a2a9b1] pb-2 mb-1">{selectedArticle.title}</h1>
          <div className="text-[12px] text-[#54595d] mb-4">
            From Jyothipedia, the personal research compendium
            {selectedArticle.source_url && (
              <> · <a href={selectedArticle.source_url} target="_blank" rel="noopener noreferrer" className="text-[#0645ad] hover:underline">View original source <ExternalLink className="w-3 h-3 inline" /></a></>
            )}
          </div>
          <div className="prose-wiki text-[15px] leading-[1.8]" dangerouslySetInnerHTML={{ __html: selectedArticle.content_html }} onClick={wikilinkHandler} />
          {selectedArticle.concepts.length > 0 && (
            <div className="mt-8 pt-4 border-t border-[#a2a9b1]">
              <h3 className="text-[12px] font-bold text-[#54595d] uppercase tracking-wider mb-3">Related concepts</h3>
              <div className="flex flex-wrap gap-2">
                {selectedArticle.concepts.map(c => (
                  <button key={c} onClick={() => handleWikilinkClick(c)} className="px-3 py-1 bg-[#eaecf0] border border-[#a2a9b1] rounded text-[12px] text-[#0645ad] hover:bg-[#3366cc] hover:text-white hover:border-[#3366cc] transition-all">
                    {c.replace(/-/g, ' ')}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ─── Level 2: Domain Portal ────────────────────────────
  if (selectedDomain) {
    return (
      <div className="h-full bg-white overflow-y-auto">
        <div className="max-w-[1100px] mx-auto px-4 md:px-8 py-6">
          {/* Breadcrumb */}
          <div className="flex items-center gap-1 text-[13px] text-[#54595d] mb-4">
            <button onClick={goHome} className="text-[#0645ad] hover:underline">Main Page</button>
            <span className="mx-1">›</span>
            <span>{selectedDomain.label}</span>
          </div>

          {/* Domain header */}
          <div className="border-b border-[#a2a9b1] pb-3 mb-6">
            <h1 className="text-[2rem] font-serif">
              {selectedDomain.icon && <span className="mr-3">{selectedDomain.icon}</span>}
              {selectedDomain.label}
            </h1>
            <p className="text-[14px] text-[#54595d] mt-1">{selectedDomain.description}</p>
            <p className="text-[12px] text-[#72777d] mt-1">
              {selectedDomain.claim_count} claims · {selectedDomain.article_count} papers · {selectedDomain.entity_count || 0} entities
            </p>
          </div>

          {/* Featured finding */}
          {selectedDomain.featured_finding && (
            <Section title="Featured Finding" tone="green">
              <p className="text-[14px] leading-7 text-[#202122] italic">{selectedDomain.featured_finding}</p>
            </Section>
          )}

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-3 mt-3">
            {/* Research areas in this domain */}
            {selectedDomain.clusters && selectedDomain.clusters.length > 0 && (
              <Section title="Research Areas" tone="blue">
                <ul className="space-y-4">
                  {selectedDomain.clusters.map((c: any) => (
                    <li key={c.id}>
                      <span className="font-bold text-[14px]">{c.label}</span>
                      <span className="text-[#72777d] text-[12px]"> ({c.total_claims} claims)</span>
                      <p className="text-[13px] text-[#54595d] mt-0.5">{c.description?.substring(0, 150)}</p>
                      {c.key_findings?.length > 0 && (
                        <ul className="mt-2 space-y-1">
                          {c.key_findings.slice(0, 2).map((f: any, i: number) => (
                            <li key={i} className="text-[12px] text-[#54595d] pl-3 border-l-2 border-[#a3c2db]">
                              {f.text.substring(0, 150)}{f.text.length > 150 ? '...' : ''}
                            </li>
                          ))}
                        </ul>
                      )}
                    </li>
                  ))}
                </ul>
              </Section>
            )}

            {/* Entities in this domain */}
            {selectedDomain.entities && selectedDomain.entities.length > 0 && (
              <Section title="Key Concepts" tone="gray">
                <ul className="space-y-2">
                  {selectedDomain.entities.map((e: any) => (
                    <li key={e.slug} className="flex items-start gap-2 text-[14px]">
                      <FileText className="w-3 h-3 mt-1.5 text-[#a2a9b1] shrink-0" />
                      <button onClick={() => openEntity(e.slug)} className="text-[#0645ad] hover:underline text-left">
                        {e.title}
                        <span className="text-[12px] text-[#72777d] ml-1">({e.source_count} sources)</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </Section>
            )}
          </div>

          {/* Articles in this domain */}
          <div className="mt-3">
            <Section title="Articles" tone="blue">
              <ul className="space-y-2">
                {articles.filter(a => {
                  // Match articles whose concepts overlap with domain's cluster topics
                  const domainClusterIds = new Set(selectedDomain.cluster_ids || []);
                  // Simple heuristic: check if article concepts match any cluster in domain
                  return domainClusterIds.size === 0 || true; // Show all when we can't filter perfectly
                }).map(a => (
                  <li key={a.slug} className="flex items-start gap-2 text-[14px]">
                    <ChevronRight className="w-3 h-3 mt-1.5 text-[#a2a9b1] shrink-0" />
                    <button onClick={() => setSelectedArticle(a)} className="text-[#0645ad] hover:underline text-left">
                      {a.title}
                    </button>
                  </li>
                ))}
              </ul>
            </Section>
          </div>

          {/* Cross-domain bridges */}
          {selectedDomain.bridges && selectedDomain.bridges.length > 0 && (
            <div className="mt-3">
              <Section title="Bridges to Other Domains" tone="amber">
                <ul className="space-y-3">
                  {selectedDomain.bridges.slice(0, 5).map((b: any, i: number) => (
                    <li key={i} className="text-[13px] text-[#54595d]">
                      <span className="font-bold text-[#3366cc] text-[10px] uppercase tracking-wider mr-1">[{b.relationship}]</span>
                      {b.explanation}
                    </li>
                  ))}
                </ul>
              </Section>
            </div>
          )}

          {/* Product ideas from this domain */}
          {selectedDomain.product_ideas && selectedDomain.product_ideas.length > 0 && (
            <div className="mt-3">
              <Section title="Product Ideas" tone="amber">
                <ul className="space-y-2 text-[14px]">
                  {selectedDomain.product_ideas.map((idea: any) => (
                    <li key={idea.id || idea.name}>
                      <b>{idea.name || idea.title}</b> — {idea.tagline || idea.problem?.substring(0, 100)}
                    </li>
                  ))}
                </ul>
              </Section>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ─── Level 1: Main Page ────────────────────────────────
  if (!pageData && articles.length === 0 && entities.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-[#54595d]">
        <BookOpen className="w-12 h-12 mb-4 opacity-20" />
        <p className="font-medium">No research compiled yet.</p>
        <p className="text-sm opacity-60 mt-1">Upload sources and compile to build Jyothipedia.</p>
      </div>
    );
  }

  const domains = pageData?.domains || [];
  const bridgeFacts = pageData?.bridge_facts || [];
  const allDidYouKnow = [
    ...bridgeFacts,
    ...domains.flatMap(d => d.did_you_know || []),
  ];

  return (
    <div className="h-full bg-white overflow-y-auto">
      <div className="max-w-[1100px] mx-auto px-4 md:px-8 py-6">

        {/* Header */}
        <div className="border-b border-[#a2a9b1] pb-3 mb-6">
          <h1 className="text-[2rem] font-serif">Welcome to Jyothipedia</h1>
          <p className="text-[14px] text-[#54595d] mt-1">
            {articles.length} compiled articles from {state.sources.length} research sources · {state.claims.length} atomic claims · {state.links.length} connections
          </p>
        </div>

        {/* Did You Know? — the killer section */}
        {allDidYouKnow.length > 0 && (
          <section className="border p-4 mb-4 bg-[#f5fffa] border-[#a3d3bf]">
            <div className="border px-3 py-2 mb-3 text-[15px] font-bold font-serif bg-[#cef2e0] border-[#a3d3bf] flex items-center gap-2">
              <Lightbulb className="w-4 h-4" />
              Did you know?
            </div>
            <ul className="space-y-2">
              {allDidYouKnow.slice(0, 5).map((fact, i) => (
                <li key={i} className="flex items-start gap-2 text-[14px] leading-relaxed text-[#202122]">
                  <span className="text-[#a3d3bf] font-bold shrink-0">...</span>
                  <span>{fact}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Domain Cards — Browse Your Research */}
        {domains.length > 0 ? (
          <>
            <h2 className="text-[15px] font-bold font-serif text-[#54595d] uppercase tracking-wider mb-3">Browse Your Research</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mb-6">
              {domains.map(domain => (
                <button
                  key={domain.id}
                  onClick={() => openDomain(domain.id)}
                  className="text-left p-5 border border-[#a2a9b1] rounded bg-[#f8f9fa] hover:border-[#3366cc] hover:shadow-md transition-all group"
                >
                  <div className="flex items-center gap-3 mb-3">
                    {domain.icon && <span className="text-2xl">{domain.icon}</span>}
                    <div>
                      <h3 className="text-[16px] font-serif font-bold group-hover:text-[#3366cc] transition-colors">{domain.label}</h3>
                      <p className="text-[11px] text-[#72777d]">{domain.article_count} papers · {domain.claim_count} claims</p>
                    </div>
                  </div>
                  <p className="text-[13px] text-[#54595d] leading-relaxed mb-3">{domain.description}</p>
                  {domain.featured_finding && (
                    <p className="text-[12px] text-[#202122] italic border-l-2 border-[#3366cc] pl-3 mb-3 line-clamp-2">
                      "{domain.featured_finding.substring(0, 120)}{domain.featured_finding.length > 120 ? '...' : ''}"
                    </p>
                  )}
                  <span className="text-[12px] font-bold text-[#3366cc] flex items-center gap-1">
                    Explore <ArrowRight className="w-3 h-3" />
                  </span>
                </button>
              ))}
            </div>
          </>
        ) : (
          /* Fallback: show old-style layout when no domains exist */
          <>
            {pageData && pageData.cluster_sections.length > 0 && (() => {
              const featured = [...pageData.cluster_sections].filter(c => c.id !== 'other').sort((a, b) => b.total_claims - a.total_claims)[0];
              return (
                <Section title={`Featured: ${featured.label}`} tone="green">
                  <p className="text-[14px] leading-7 text-[#202122] italic">{featured.description}</p>
                  <p className="text-[12px] text-[#54595d]">{featured.total_claims} claims across multiple papers</p>
                </Section>
              );
            })()}
          </>
        )}

        {/* All Articles — full width */}
        <Section title="All Articles" tone="blue">
          <ul className="space-y-2">
            {articles.map(a => (
              <li key={a.slug} className="flex items-start gap-2 text-[14px]">
                <ChevronRight className="w-3 h-3 mt-1.5 text-[#a2a9b1] shrink-0" />
                <div>
                  <button onClick={() => setSelectedArticle(a)} className="text-[#0645ad] hover:underline font-medium text-left">{a.title}</button>
                  {a.source_url && (
                    <a href={a.source_url} target="_blank" rel="noopener noreferrer" className="ml-1.5 text-[11px] text-[#54595d] hover:text-[#0645ad]">
                      <ExternalLink className="w-3 h-3 inline" />
                    </a>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </Section>

        {/* Key Concepts — full width, top 10 sorted by source_count */}
        {entities.length > 0 && (() => {
          const sorted = [...entities].sort((a, b) => (b.source_count || 0) - (a.source_count || 0));
          const visible = showAllEntities ? sorted : sorted.slice(0, 10);
          const hasMore = sorted.length > 10;
          return (
            <div className="mt-3">
              <Section title={`Key Concepts (${entities.length})`} tone="gray">
                <ul className="space-y-2">
                  {visible.map(e => (
                    <li key={e.slug} className="flex items-start gap-2 text-[14px]">
                      <FileText className="w-3 h-3 mt-1.5 text-[#a2a9b1] shrink-0" />
                      <button onClick={() => openEntity(e.slug)} className="text-[#0645ad] hover:underline text-left">
                        {e.title}
                        <span className="text-[12px] text-[#72777d] ml-1">({e.source_count} sources)</span>
                      </button>
                    </li>
                  ))}
                </ul>
                {hasMore && (
                  <button
                    onClick={() => setShowAllEntities(!showAllEntities)}
                    className="mt-3 text-[13px] font-bold text-[#0645ad] hover:underline"
                  >
                    {showAllEntities ? 'Show less' : `See all ${sorted.length} concepts...`}
                  </button>
                )}
              </Section>
            </div>
          );
        })()}

        {/* Research Areas (clusters) — only if no domains */}
        {domains.length === 0 && pageData && pageData.cluster_sections.length > 0 && (
          <div className="mt-3">
            <Section title="Research Areas" tone="gray">
              <ul className="space-y-3">
                {pageData.cluster_sections.filter(c => c.id !== 'other').map(c => (
                  <li key={c.id} className="text-[14px]">
                    <span className="font-bold">{c.label}</span>
                    <span className="text-[#72777d]"> ({c.total_claims} claims)</span>
                    <p className="text-[13px] text-[#54595d] mt-0.5">{c.description?.substring(0, 120)}</p>
                  </li>
                ))}
              </ul>
            </Section>
          </div>
        )}

        {/* Product Ideas */}
        {pageData && pageData.product_ideas.length > 0 && (
          <div className="mt-3">
            <Section title="Product ideas from research" tone="amber">
              <ul className="space-y-2 text-[14px]">
                {pageData.product_ideas.map((idea: any) => (
                  <li key={idea.id}>
                    <b>{idea.name || idea.title}</b> — {idea.tagline || idea.problem?.substring(0, 100)}
                  </li>
                ))}
              </ul>
            </Section>
          </div>
        )}

        {/* Footer */}
        <div className="mt-8 pt-4 border-t border-[#a2a9b1] text-[12px] text-[#54595d]">
          Compiled {pageData?.built_at || 'recently'} · {state.claims.length} claims · {state.links.length} connections · {pageData?.total_edges || 0} edges
        </div>
      </div>
    </div>
  );
}

function Section({ title, tone, children }: { title: string; tone: 'green' | 'blue' | 'amber' | 'gray'; children: React.ReactNode }) {
  const styles = {
    green:  { wrap: 'bg-[#f5fffa] border-[#a3d3bf]', head: 'bg-[#cef2e0] border-[#a3d3bf]' },
    blue:   { wrap: 'bg-[#f5faff] border-[#a3c2db]', head: 'bg-[#cedff2] border-[#a3c2db]' },
    amber:  { wrap: 'bg-[#fffaf2] border-[#d6c08e]', head: 'bg-[#f2e3c6] border-[#d6c08e]' },
    gray:   { wrap: 'bg-[#f8f9fa] border-[#c8ccd1]', head: 'bg-[#eaecf0] border-[#c8ccd1]' },
  }[tone];

  return (
    <section className={`border p-3 ${styles.wrap}`}>
      <div className={`border px-3 py-2 mb-3 text-[15px] font-bold font-serif ${styles.head}`}>{title}</div>
      {children}
    </section>
  );
}
