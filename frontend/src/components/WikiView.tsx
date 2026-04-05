import { AppState, Concept } from '../types';
import { BookOpen } from 'lucide-react';

export default function WikiView({ state }: { state: AppState }) {
  const featuredConcept = state.concepts[0] || null;
  const secondaryConcepts = state.concepts.slice(1, 5);
  const latestSources = state.sources.slice(0, 5);
  const latestIdeas = state.ideas.slice(0, 4);
  const featuredClaims = featuredConcept
    ? featuredConcept.claims
        .map((claimId) => state.claims.find((claim) => claim.id === claimId))
        .filter(Boolean)
        .slice(0, 4)
    : state.claims.slice(0, 4);

  return (
    <div className="h-full bg-white overflow-y-auto">
      {featuredConcept ? (
        <div className="max-w-[1400px] px-8 py-6">
          <div className="flex items-end justify-between border-b border-[#a2a9b1] pb-3">
            <div>
              <h1 className="text-[2rem] font-serif leading-none">Main Page</h1>
              <p className="mt-2 text-[13px] text-[#54595d]">The front page of Jyothipedia’s compiled research encyclopedia.</p>
            </div>
            <div className="text-[13px] text-[#54595d]">
              Read-only overview
            </div>
          </div>

          <section className="border border-[#c8ccd1] bg-white mt-6 px-8 py-10 text-center">
            <h1 className="font-serif text-[3rem] leading-none mb-4">
              Welcome to <span className="text-[#3366cc]">Jyothipedia,</span>
            </h1>
            <p className="text-[1.15rem] text-[#202122]">
              the <span className="text-[#3366cc]">LLM research encyclopedia</span> that compiles ideas,
              connects claims, and maps emerging knowledge.
            </p>
            <p className="mt-3 text-[1rem] text-[#54595d]">
              {state.sources.length.toLocaleString()} sources · {state.claims.length.toLocaleString()} claims · {state.concepts.length.toLocaleString()} research areas · {state.ideas.length.toLocaleString()} ideas
            </p>
          </section>

          <div className="grid grid-cols-1 xl:grid-cols-[1.1fr_0.9fr] gap-3 mt-3">
            <MainSection
              title="From today's featured article"
              tone="green"
              content={
                <div className="space-y-5 text-[1.02rem] leading-9">
                  <p>
                    <span className="font-bold italic">{featuredConcept.title}</span> {featuredConcept.summary}
                  </p>
                  <p>
                    This featured article currently aggregates <span className="wiki-link">{featuredConcept.claims.length} extracted claims</span> from
                    {' '}<span className="wiki-link">{state.sources.length} research sources</span>, with cross-links into the knowledge graph and connected research themes.
                  </p>
                  {featuredClaims.length > 0 && (
                    <div>
                      <h3 className="text-[1.05rem] font-bold mb-2">Featured findings</h3>
                      <ul className="list-disc pl-6 space-y-2">
                        {featuredClaims.map((claim, idx) => (
                          <li key={claim!.id}>
                            {claim!.text}
                            <sup className="text-[#0645ad] ml-1">[{idx + 1}]</sup>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              }
            />

            <MainSection
              title="In the research graph"
              tone="blue"
              content={
                <div className="space-y-5 text-[1rem] leading-8">
                  <ul className="list-disc pl-6 space-y-2">
                    {secondaryConcepts.map((concept) => (
                      <li key={concept.id}>
                        <span className="wiki-link font-semibold">{concept.title}</span> {concept.summary}
                      </li>
                    ))}
                  </ul>
                  <div className="border-t border-[#c8ccd1] pt-3 text-[0.98rem]">
                    <span className="font-bold">Ongoing:</span>{' '}
                    {state.links.length.toLocaleString()} relationships across claims, {state.ideas.length.toLocaleString()} product ideas, and live compile support from the dashboard.
                  </div>
                </div>
              }
            />
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-3 mt-3">
            <MainSection
              title="Did you know ..."
              tone="purple"
              content={
                <ul className="list-disc pl-6 space-y-3 text-[1rem] leading-8">
                  {state.claims.slice(0, 5).map((claim) => (
                    <li key={claim.id}>
                      {claim.text}
                    </li>
                  ))}
                </ul>
              }
            />

            <MainSection
              title="Latest research ideas"
              tone="amber"
              content={
                latestIdeas.length > 0 ? (
                  <ul className="list-disc pl-6 space-y-3 text-[1rem] leading-8">
                    {latestIdeas.map((idea) => (
                      <li key={idea.id}>
                        <span className="wiki-link font-semibold">{idea.title}</span> for {idea.audience}. {idea.problem}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-[1rem] leading-8">
                    Product ideas will appear here after graph enrichment and synthesis complete.
                  </p>
                )
              }
            />
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-[1.1fr_0.9fr] gap-3 mt-3">
            <MainSection
              title="Featured source archive"
              tone="rose"
              content={
                <div className="space-y-3 text-[1rem] leading-8">
                  {latestSources.map((source) => {
                    const claimCount = source.claimCount || state.claims.filter((c) => c.sourceId === source.id).length;
                    return (
                      <p key={source.id}>
                        {source.source_url ? (
                          <a href={source.source_url} target="_blank" rel="noopener noreferrer" className="wiki-link font-semibold">{source.title}</a>
                        ) : (
                          <span className="font-semibold">{source.title}</span>
                        )}{' '}
                        <span className="text-[#54595d]">({source.type})</span> contributes{' '}
                        <span className="font-semibold">{claimCount}</span> claims to the knowledge base.
                      </p>
                    );
                  })}
                </div>
              }
            />

            <MainSection
              title="Jyothipedia overview"
              tone="gray"
              content={
                <table className="w-full text-[0.98rem] border-collapse">
                  <tbody>
                    <InfoboxRow label="Sources" value={`${state.sources.length}`} />
                    <InfoboxRow label="Claims" value={`${state.claims.length}`} />
                    <InfoboxRow label="Research areas" value={`${state.concepts.length}`} />
                    <InfoboxRow label="Connections" value={`${state.links.length}`} />
                    <InfoboxRow label="Ideas" value={`${state.ideas.length}`} />
                    <InfoboxRow label="Mode" value={state.mode === 'demo' ? 'Demo' : 'Full'} />
                  </tbody>
                </table>
              }
            />
          </div>
        </div>
      ) : (
        <div className="h-full flex flex-col items-center justify-center text-[#54595d]">
          <BookOpen className="w-12 h-12 mb-4 opacity-20" />
          <p className="font-medium">No research compiled yet.</p>
          <p className="text-sm opacity-60 mt-1">Upload sources and run compile to build your wiki.</p>
        </div>
      )}
    </div>
  );
}

function MainSection({
  title,
  tone,
  content,
}: {
  title: string;
  tone: 'green' | 'blue' | 'purple' | 'amber' | 'rose' | 'gray';
  content: React.ReactNode;
}) {
  const tones = {
    green: {
      wrap: 'bg-[#f5fffa] border-[#a3d3bf]',
      head: 'bg-[#cef2e0] border-[#a3d3bf]',
    },
    blue: {
      wrap: 'bg-[#f5faff] border-[#a3c2db]',
      head: 'bg-[#cedff2] border-[#a3c2db]',
    },
    purple: {
      wrap: 'bg-[#faf5ff] border-[#c9b3de]',
      head: 'bg-[#e6d7f6] border-[#c9b3de]',
    },
    amber: {
      wrap: 'bg-[#fffaf2] border-[#d6c08e]',
      head: 'bg-[#f2e3c6] border-[#d6c08e]',
    },
    rose: {
      wrap: 'bg-[#fff6f7] border-[#dcb7be]',
      head: 'bg-[#f7d9de] border-[#dcb7be]',
    },
    gray: {
      wrap: 'bg-[#f8f9fa] border-[#c8ccd1]',
      head: 'bg-[#eaecf0] border-[#c8ccd1]',
    },
  }[tone];

  return (
    <section className={`border p-3 ${tones.wrap}`}>
      <div className={`border px-3 py-2 mb-4 text-[1.05rem] font-bold ${tones.head}`}>{title}</div>
      {content}
    </section>
  );
}

function InfoboxRow({ label, value }: { label: string, value: string }) {
  return (
    <tr className="border-b border-[#eaecf0] last:border-0">
      <th className="p-1.5 text-left font-normal text-[#54595d] w-1/2">{label}</th>
      <td className="p-1.5 text-left">{value}</td>
    </tr>
  );
}
