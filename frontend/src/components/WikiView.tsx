import { useState, useEffect } from 'react';
import { AppState } from '../types';
import { BookOpen, ExternalLink, ArrowLeft, ChevronRight } from 'lucide-react';

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
  product_ideas: any[];
  source_articles: any[];
  total_edges: number;
  built_at: string;
};

export default function WikiView({ state }: { state: AppState }) {
  const [articles, setArticles] = useState<WikiArticle[]>([]);
  const [pageData, setPageData] = useState<WikiPageData | null>(null);
  const [selectedArticle, setSelectedArticle] = useState<WikiArticle | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch('/api/wiki-articles').then(r => r.json()),
      fetch('/api/wiki-page').then(r => r.json()),
    ]).then(([articlesData, pageDataResp]) => {
      setArticles(articlesData.articles || []);
      if (!pageDataResp.empty) setPageData(pageDataResp);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  if (loading) return <div className="p-8 text-[#54595d]">Loading wiki...</div>;

  // Reading a single article
  if (selectedArticle) {
    return (
      <div className="h-full bg-white overflow-y-auto">
        <div className="max-w-[900px] mx-auto px-8 py-6">
          <button onClick={() => setSelectedArticle(null)} className="flex items-center gap-1 text-[13px] text-[#0645ad] hover:underline mb-4">
            <ArrowLeft className="w-3 h-3" /> Back to all articles
          </button>

          <h1 className="text-[1.8em] font-serif border-b border-[#a2a9b1] pb-2 mb-1">{selectedArticle.title}</h1>
          <div className="text-[12px] text-[#54595d] mb-4">
            From Jyothipedia, the personal research compendium
            {selectedArticle.source_url && (
              <> · <a href={selectedArticle.source_url} target="_blank" rel="noopener noreferrer" className="text-[#0645ad] hover:underline">View original source <ExternalLink className="w-3 h-3 inline" /></a></>
            )}
          </div>

          {/* Article content */}
          <div
            className="prose-wiki text-[15px] leading-[1.8]"
            dangerouslySetInnerHTML={{ __html: selectedArticle.content_html }}
            onClick={(e) => {
              // Handle wikilink clicks
              const target = e.target as HTMLElement;
              if (target.tagName === 'A' && target.dataset.wikilink) {
                e.preventDefault();
                const slug = target.dataset.wikilink;
                const linked = articles.find(a =>
                  a.slug.includes(slug) || a.concepts.includes(slug)
                );
                if (linked) setSelectedArticle(linked);
              }
            }}
          />

          {/* Related concepts */}
          {selectedArticle.concepts.length > 0 && (
            <div className="mt-8 pt-4 border-t border-[#a2a9b1]">
              <h3 className="text-[12px] font-bold text-[#54595d] uppercase tracking-wider mb-3">Related concepts</h3>
              <div className="flex flex-wrap gap-2">
                {selectedArticle.concepts.map(c => (
                  <button
                    key={c}
                    onClick={() => {
                      const linked = articles.find(a => a.concepts.includes(c) && a.slug !== selectedArticle.slug);
                      if (linked) setSelectedArticle(linked);
                    }}
                    className="px-3 py-1 bg-[#eaecf0] border border-[#a2a9b1] rounded text-[12px] text-[#0645ad] hover:bg-[#3366cc] hover:text-white hover:border-[#3366cc] transition-all"
                  >
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

  // Main page — article listing + overview
  if (!pageData && articles.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-[#54595d]">
        <BookOpen className="w-12 h-12 mb-4 opacity-20" />
        <p className="font-medium">No research compiled yet.</p>
        <p className="text-sm opacity-60 mt-1">Upload sources and compile to build Jyothipedia.</p>
      </div>
    );
  }

  return (
    <div className="h-full bg-white overflow-y-auto">
      <div className="max-w-[1100px] mx-auto px-8 py-6">

        {/* Header */}
        <div className="border-b border-[#a2a9b1] pb-3 mb-6">
          <h1 className="text-[2rem] font-serif">Welcome to Jyothipedia</h1>
          <p className="text-[14px] text-[#54595d] mt-1">
            {articles.length} compiled articles from {state.sources.length} research sources · {state.claims.length} atomic claims · {state.links.length} connections
          </p>
        </div>

        {/* Featured research area */}
        {pageData && pageData.cluster_sections.length > 0 && (() => {
          // Pick the biggest cluster as featured
          const featured = [...pageData.cluster_sections].filter(c => c.id !== 'other').sort((a, b) => b.total_claims - a.total_claims)[0];
          // Featured article — prefer the brain/LLM paper
          const featuredArticle = articles.find(a => a.title.toLowerCase().includes('brain') || a.title.toLowerCase().includes('fmri')) || articles[0];
          return (
          <Section title={`Featured: ${featured.label}`} tone="green">
            <div className="flex-1 space-y-3">
              <p className="text-[14px] leading-7 text-[#202122] italic">{featured.description}</p>
              <p className="text-[12px] text-[#54595d]">{featured.total_claims} claims across multiple papers</p>

              {featured.key_findings.length > 0 && (
                <div>
                  <h4 className="text-[12px] font-bold text-[#54595d] uppercase tracking-wider mb-2">Key findings</h4>
                  <ul className="list-disc pl-5 space-y-1.5 text-[14px] leading-7">
                    {featured.key_findings.slice(0, 3).map((f: any, i: number) => (
                      <li key={i}>
                        {f.text}
                        {f.source_title && <sup className="text-[#0645ad] ml-1">[{f.source_title.substring(0, 20)}]</sup>}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {featuredArticle && (
                <button onClick={() => setSelectedArticle(featuredArticle)} className="text-[13px] text-[#0645ad] hover:underline mt-2 inline-block">
                  Read related article: {featuredArticle.title} →
                </button>
              )}
            </div>
          </Section>
          );
        })()}

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-3 mt-3">

          {/* All articles */}
          <Section title="Articles" tone="blue">
            <ul className="space-y-3">
              {articles.map(a => (
                <li key={a.slug} className="flex items-start gap-2 text-[14px]">
                  <ChevronRight className="w-3 h-3 mt-1.5 text-[#a2a9b1] shrink-0" />
                  <div>
                    <button onClick={() => setSelectedArticle(a)} className="text-[#0645ad] hover:underline font-medium text-left">
                      {a.title}
                    </button>
                    {a.source_url && (
                      <a href={a.source_url} target="_blank" rel="noopener noreferrer" className="ml-1.5 text-[11px] text-[#54595d] hover:text-[#0645ad]">
                        <ExternalLink className="w-3 h-3 inline" />
                      </a>
                    )}
                    <span className="text-[12px] text-[#72777d] ml-1">({a.concepts.length} concepts)</span>
                  </div>
                </li>
              ))}
            </ul>
          </Section>

          {/* Research areas */}
          {pageData && pageData.cluster_sections.length > 0 && (
            <Section title="Research areas" tone="gray">
              <ul className="space-y-3">
                {pageData.cluster_sections.filter(c => c.id !== 'other').map(c => (
                  <li key={c.id} className="text-[14px]">
                    <span className="font-bold">{c.label}</span>
                    <span className="text-[#72777d]"> ({c.total_claims} claims)</span>
                    <p className="text-[13px] text-[#54595d] mt-0.5">{c.description.substring(0, 120)}</p>
                  </li>
                ))}
              </ul>
            </Section>
          )}
        </div>

        {/* Product ideas */}
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
