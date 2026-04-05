import { useState, useEffect } from 'react';
import { AppState } from '../types';
import { BookOpen, ExternalLink } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

type WikiPageData = {
  papers: { title: string; raw_path: string; wiki_slug: string; claim_count: number; source_type: string; source_url: string; date_added: string }[];
  claims_summary: { total: number; findings: number; methods: number; concepts: number; hypotheses: number; claims: number };
  cluster_sections: {
    id: string; label: string; description: string; total_claims: number;
    key_findings: { text: string; source_title: string; type: string }[];
    methods: { text: string; evidence: string; type: string }[];
    concepts: { text: string; source_title: string; type: string }[];
    connections: { relationship: string; source_text: string; target_text: string; explanation: string }[];
  }[];
  product_ideas: any[];
  insights: any;
  source_articles: { slug: string; content: string }[];
  total_edges: number;
  built_at: string;
};

export default function WikiView({ state }: { state: AppState }) {
  const [data, setData] = useState<WikiPageData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/wiki-page')
      .then(r => r.json())
      .then(d => { if (!d.empty) setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return <div className="p-8 text-[#54595d]">Loading wiki...</div>;
  if (!data) return (
    <div className="h-full flex flex-col items-center justify-center text-[#54595d]">
      <BookOpen className="w-12 h-12 mb-4 opacity-20" />
      <p className="font-medium">No research compiled yet.</p>
      <p className="text-sm opacity-60 mt-1">Upload sources and run compile to build Jyothipedia.</p>
    </div>
  );

  const featuredCluster = data.cluster_sections.find(c => c.id !== 'other') || data.cluster_sections[0];
  const otherClusters = data.cluster_sections.filter(c => c !== featuredCluster && c.id !== 'other');
  const featuredArticle = data.source_articles[0];

  return (
    <div className="h-full bg-white overflow-y-auto">
      <div className="max-w-[1200px] px-8 py-6">

        {/* Header */}
        <div className="border-b border-[#a2a9b1] pb-3 mb-2">
          <h1 className="text-[2rem] font-serif">Main Page</h1>
          <p className="text-[13px] text-[#54595d]">Jyothipedia — compiled from {data.papers.length} research sources</p>
        </div>

        {/* Welcome */}
        <div className="border border-[#c8ccd1] bg-white mt-4 px-8 py-8 text-center">
          <h1 className="font-serif text-[2.5rem] leading-none mb-3">
            Welcome to <span className="text-[#3366cc]">Jyothipedia</span>
          </h1>
          <p className="text-[15px] text-[#54595d]">
            {data.claims_summary.total} claims compiled from {data.papers.length} papers across {data.cluster_sections.length} research areas
          </p>
        </div>

        {/* Main grid — Featured + Research Areas */}
        <div className="grid grid-cols-1 xl:grid-cols-[1.1fr_0.9fr] gap-3 mt-3">

          {/* Featured Research */}
          <Section title="Featured research" tone="green">
            {featuredCluster && (
              <div className="space-y-4">
                <p className="text-[14px] leading-7">
                  <b>{featuredCluster.label}</b> — {featuredCluster.description}
                </p>
                {featuredCluster.key_findings.length > 0 && (
                  <>
                    <h4 className="text-[12px] font-bold text-[#54595d] uppercase tracking-wider">Key findings</h4>
                    <ul className="list-disc pl-5 space-y-2 text-[14px] leading-7">
                      {featuredCluster.key_findings.slice(0, 4).map((f, i) => (
                        <li key={i}>
                          {f.text}
                          {f.source_title && <sup className="text-[#0645ad] ml-1">[{f.source_title.substring(0, 20)}]</sup>}
                        </li>
                      ))}
                    </ul>
                  </>
                )}
                {featuredCluster.methods.length > 0 && (
                  <>
                    <h4 className="text-[12px] font-bold text-[#54595d] uppercase tracking-wider mt-4">Methods</h4>
                    <ul className="list-disc pl-5 space-y-1 text-[14px] leading-7">
                      {featuredCluster.methods.slice(0, 3).map((m, i) => (
                        <li key={i}><b>{m.text.substring(0, 80)}</b>{m.evidence && <> — <i className="text-[#54595d]">{m.evidence}</i></>}</li>
                      ))}
                    </ul>
                  </>
                )}
              </div>
            )}
          </Section>

          {/* Research Areas */}
          <Section title="Research areas" tone="blue">
            <ul className="space-y-3 text-[14px] leading-7">
              {data.cluster_sections.filter(c => c.id !== 'other').map(c => (
                <li key={c.id}>
                  <a href={`#${c.id}`} className="text-[#0645ad] font-semibold hover:underline">{c.label}</a>
                  <span className="text-[#54595d]"> ({c.total_claims} claims)</span>
                  <br />
                  <span className="text-[13px] text-[#54595d]">{c.description.substring(0, 100)}</span>
                </li>
              ))}
            </ul>
          </Section>
        </div>

        {/* Second row — Sources + Did you know */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-3 mt-3">

          {/* Sources */}
          <Section title="Sources" tone="gray">
            <ul className="space-y-2 text-[14px]">
              {data.papers.map(p => (
                <li key={p.raw_path} className="flex items-start gap-2">
                  <span className="text-[#54595d] shrink-0">&#8226;</span>
                  <span>
                    {p.wiki_slug ? (
                      <a href={`/wiki/sources/${p.wiki_slug}.md`} className="text-[#0645ad] hover:underline">{p.title}</a>
                    ) : (
                      <span>{p.title}</span>
                    )}
                    {p.source_url && (
                      <a href={p.source_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center ml-1 text-[11px] text-[#54595d] hover:text-[#0645ad]">
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                    <span className="text-[#72777d] text-[12px]"> ({p.claim_count} claims, {p.source_type})</span>
                  </span>
                </li>
              ))}
            </ul>
          </Section>

          {/* Did you know */}
          <Section title="Did you know..." tone="purple">
            <ul className="list-disc pl-5 space-y-3 text-[14px] leading-7">
              {data.cluster_sections.slice(0, 5).map(c => {
                const finding = c.key_findings[0];
                if (!finding) return null;
                return (
                  <li key={c.id}>
                    ...that {finding.text.charAt(0).toLowerCase() + finding.text.slice(1)}
                    <sup className="text-[#0645ad] ml-1">[<a href={`#${c.id}`}>{c.label.substring(0, 15)}</a>]</sup>
                  </li>
                );
              })}
            </ul>
          </Section>
        </div>

        {/* Product Ideas */}
        {data.product_ideas.length > 0 && (
          <div className="mt-3">
            <Section title="Product ideas from research" tone="amber">
              <ul className="space-y-2 text-[14px] leading-7" style={{ columns: data.product_ideas.length > 4 ? 2 : 1, columnGap: '24px' }}>
                {data.product_ideas.map((idea: any) => (
                  <li key={idea.id}>
                    <b>{idea.name || idea.title}</b> — {idea.tagline || idea.problem?.substring(0, 80)}
                  </li>
                ))}
              </ul>
            </Section>
          </div>
        )}

        {/* Research Area Details */}
        {data.cluster_sections.map(section => (
          <div key={section.id} className="mt-8">
            <h2 id={section.id} className="text-[1.4em] font-serif border-b border-[#a2a9b1] pb-1 mb-3">{section.label}</h2>
            <p className="text-[14px] leading-7 mb-4">{section.description}</p>

            {section.key_findings.length > 0 && (
              <>
                <h3 className="text-[1.1em] font-bold mb-2">Key findings</h3>
                <ul className="list-disc pl-5 space-y-2 text-[14px] leading-7 mb-4">
                  {section.key_findings.map((f, i) => (
                    <li key={i}>
                      {f.text}
                      {f.source_title && <sup className="text-[#0645ad] ml-1">[{f.source_title.substring(0, 25)}]</sup>}
                    </li>
                  ))}
                </ul>
              </>
            )}

            {section.methods.length > 0 && (
              <>
                <h3 className="text-[1.1em] font-bold mb-2">Methods and approaches</h3>
                <ul className="list-disc pl-5 space-y-2 text-[14px] leading-7 mb-4">
                  {section.methods.map((m, i) => (
                    <li key={i}>
                      <b>{m.text.substring(0, 80)}</b>
                      {m.evidence && <> — <i className="text-[#54595d]">{m.evidence}</i></>}
                    </li>
                  ))}
                </ul>
              </>
            )}

            {section.connections.length > 0 && (
              <>
                <h3 className="text-[1.1em] font-bold mb-2">Connections to other areas</h3>
                <ul className="list-disc pl-5 space-y-2 text-[14px] leading-7 mb-4">
                  {section.connections.map((c, i) => (
                    <li key={i}>
                      <i className="text-[#54595d]">{c.relationship}</i>: {c.source_text.substring(0, 60)} → {c.target_text.substring(0, 60)}
                      {c.explanation && <div className="text-[12px] text-[#54595d] mt-1">{c.explanation}</div>}
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        ))}

        {/* Footer */}
        <div className="mt-8 pt-4 border-t border-[#a2a9b1] text-[12px] text-[#54595d]">
          Compiled {data.built_at || 'recently'} from {data.papers.length} sources, {data.claims_summary.total} claims, {data.total_edges} connections.
        </div>
      </div>
    </div>
  );
}

function Section({ title, tone, children }: { title: string; tone: 'green' | 'blue' | 'purple' | 'amber' | 'gray'; children: React.ReactNode }) {
  const styles = {
    green:  { wrap: 'bg-[#f5fffa] border-[#a3d3bf]', head: 'bg-[#cef2e0] border-[#a3d3bf]' },
    blue:   { wrap: 'bg-[#f5faff] border-[#a3c2db]', head: 'bg-[#cedff2] border-[#a3c2db]' },
    purple: { wrap: 'bg-[#faf5ff] border-[#c9b3de]', head: 'bg-[#e6d7f6] border-[#c9b3de]' },
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
