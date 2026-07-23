// DocsHub — public help center landing page at /docs.
// Lists published docs grouped by category, with client-side keyword search
// across title + content. Uses Workshop OKLCH light theme tokens, skeleton
// loading, fade-in-up motion, and EmptyState when no docs match.

import { EmptyState } from "@/components/EmptyState";
import { SkeletonList } from "@/components/Skeleton";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useListDocs } from "@/hooks/useQueries";
import type { Doc, DocCategory } from "@/types";
import { DOC_CATEGORY_LABELS } from "@/types";
import { Link } from "@tanstack/react-router";
import { BookOpen, Clock, FileText, Search } from "lucide-react";
import { useMemo, useState } from "react";

const CATEGORY_ORDER = Object.keys(DOC_CATEGORY_LABELS) as DocCategory[];

function formatDate(ts: bigint): string {
  const ms = Number(ts) / 1_000_000;
  return new Date(ms).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function DocCard({ doc, index }: { doc: Doc; index: number }) {
  const minutes = Number(doc.readingTime);
  return (
    <Card
      className="p-5 shadow-subtle hover:shadow-md hover:border-primary/30 animate-card-hover-lift animate-fade-in-up flex flex-col h-full"
      data-ocid={`docs_hub.card.${index + 1}`}
    >
      <div className="flex items-center gap-2 mb-3">
        <Badge variant="secondary" className="font-body text-xs">
          {DOC_CATEGORY_LABELS[doc.category as DocCategory] ?? doc.category}
        </Badge>
      </div>
      <h3 className="font-display text-lg font-semibold text-foreground mb-2 line-clamp-2">
        <Link
          to="/docs/$slug"
          params={{ slug: doc.slug }}
          className="hover:text-primary transition-smooth focus-ring rounded-sm"
          data-ocid={`docs_hub.link.${index + 1}`}
        >
          {doc.title}
        </Link>
      </h3>
      <p className="text-sm text-muted-foreground font-body line-clamp-3 mb-4 flex-1">
        {doc.content || "No preview available."}
      </p>
      <div className="flex items-center gap-3 text-xs text-muted-foreground font-body pt-3 border-t border-border">
        <span className="flex items-center gap-1">
          <Clock className="w-3 h-3" aria-hidden />
          {minutes} min read
        </span>
        <span className="flex items-center gap-1">
          <FileText className="w-3 h-3" aria-hidden />
          Updated {formatDate(doc.updatedAt)}
        </span>
      </div>
    </Card>
  );
}

export function DocsHub() {
  const { data: docs, isLoading } = useListDocs();
  const [search, setSearch] = useState("");

  const published = useMemo(() => {
    if (!docs) return [];
    return docs.filter((d) => d.status === "published");
  }, [docs]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (q === "") return published;
    return published.filter(
      (d) =>
        d.title.toLowerCase().includes(q) ||
        d.content.toLowerCase().includes(q),
    );
  }, [published, search]);

  const grouped = useMemo(() => {
    const map = new Map<DocCategory, Doc[]>();
    for (const doc of filtered) {
      const key = doc.category as DocCategory;
      if (!map.has(key)) map.set(key, []);
      map.get(key)?.push(doc);
    }
    return CATEGORY_ORDER.filter((c) => map.has(c)).map((c) => ({
      category: c,
      items: map.get(c) ?? [],
    }));
  }, [filtered]);

  return (
    <section className="container mx-auto px-4 lg:px-6 py-12 lg:py-16">
      <header className="max-w-3xl mb-10 animate-fade-in-up">
        <div className="flex items-center gap-2 text-sm text-muted-foreground font-body mb-3">
          <BookOpen className="w-4 h-4" aria-hidden />
          <span>Help Center</span>
        </div>
        <h1 className="font-display text-4xl lg:text-5xl font-semibold text-foreground tracking-tight mb-4">
          How can we help?
        </h1>
        <p className="text-base text-muted-foreground font-body leading-relaxed">
          Browse guides, FAQs, and articles across booking, providers, trust &
          safety, rewards, disputes, billing, and your account.
        </p>
      </header>

      <div className="relative max-w-2xl mb-12 animate-fade-in-up">
        <Search
          className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground"
          aria-hidden
        />
        <Input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search articles by title or keyword..."
          className="pl-10 font-body"
          aria-label="Search help articles"
          data-ocid="docs_hub.search_input"
        />
      </div>

      {isLoading ? (
        <SkeletonList
          count={6}
          withMedia={false}
          className="grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Search}
          title={search ? "No matching articles" : "No articles yet"}
          description={
            search
              ? "Try a different keyword, or clear your search to see all articles."
              : "Articles will appear here once they are published."
          }
          data-ocid="docs_hub.empty_state"
        />
      ) : (
        <div className="space-y-12">
          {grouped.map(({ category, items }, gi) => (
            <section
              key={category}
              className="animate-fade-in-up"
              data-ocid={`docs_hub.section.${gi + 1}`}
            >
              <div className="flex items-baseline justify-between mb-5">
                <h2 className="font-display text-2xl font-semibold text-foreground">
                  {DOC_CATEGORY_LABELS[category]}
                </h2>
                <span className="text-sm text-muted-foreground font-body">
                  {items.length} {items.length === 1 ? "article" : "articles"}
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {items.map((doc, i) => (
                  <DocCard key={doc.id} doc={doc} index={i} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </section>
  );
}
