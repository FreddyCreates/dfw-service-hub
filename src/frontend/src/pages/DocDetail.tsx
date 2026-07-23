// DocDetail — single help article page at /docs/$slug.
// Renders doc content with an auto-generated table of contents sidebar,
// prev/next navigation within the same category, and related-doc suggestions.
// Uses Workshop OKLCH light theme tokens and fade-in-up motion.

import { EmptyState } from "@/components/EmptyState";
import { Skeleton, SkeletonText } from "@/components/Skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useGetDocBySlug, useListDocsByCategory } from "@/hooks/useQueries";
import type { Doc, DocCategory } from "@/types";
import { DOC_CATEGORY_LABELS } from "@/types";
import { Link, useParams } from "@tanstack/react-router";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Clock,
  FileText,
  FileX,
} from "lucide-react";
import { useMemo } from "react";

function formatDate(ts: bigint): string {
  const ms = Number(ts) / 1_000_000;
  return new Date(ms).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

interface TocItem {
  id: string;
  text: string;
  level: number;
}

function buildToc(content: string): TocItem[] {
  const lines = content.split("\n");
  const items: TocItem[] = [];
  let counter = 0;
  for (const line of lines) {
    const match = /^(#{1,2})\s+(.+?)\s*$/.exec(line);
    if (!match) continue;
    const level = match[1].length;
    const text = match[2].trim();
    counter += 1;
    const id = `heading-${counter}`;
    items.push({ id, text, level });
  }
  return items;
}

function renderContent(content: string, toc: TocItem[]) {
  // Split content into blocks by lines, replacing heading lines with anchored
  // heading elements so the TOC can link to them. Plain paragraphs become <p>.
  const lines = content.split("\n");
  const blocks: React.ReactNode[] = [];
  let para: string[] = [];
  let headingIdx = 0;

  const flushPara = (key: number) => {
    if (para.length === 0) return;
    blocks.push(
      <p
        key={`p-${key}`}
        className="text-base text-foreground font-body leading-relaxed mb-4"
      >
        {para.join(" ")}
      </p>,
    );
    para = [];
  };

  lines.forEach((line, i) => {
    const match = /^(#{1,2})\s+(.+?)\s*$/.exec(line);
    if (match) {
      flushPara(i);
      const level = match[1].length;
      const text = match[2].trim();
      const anchor = toc[headingIdx];
      headingIdx += 1;
      const Tag = level === 1 ? "h2" : "h3";
      blocks.push(
        <Tag
          // biome-ignore lint/suspicious/noArrayIndexKey: heading line index is a stable positional key within the parsed document order.
          key={`h-${i}`}
          id={anchor?.id}
          className="font-display font-semibold text-foreground scroll-mt-24 mb-3 mt-8"
        >
          {text}
        </Tag>,
      );
      return;
    }
    if (line.trim() === "") {
      flushPara(i);
      return;
    }
    para.push(line.trim());
  });
  flushPara(lines.length);
  return blocks;
}

function DocDetailSkeleton() {
  return (
    <section className="container mx-auto px-4 lg:px-6 py-12 lg:py-16">
      <Skeleton className="h-4 w-24 mb-4" />
      <Skeleton className="h-12 w-3/4 mb-3" />
      <div className="flex gap-3 mb-8">
        <Skeleton className="h-5 w-20" />
        <Skeleton className="h-5 w-24" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-10">
        <Skeleton className="h-64" />
        <div className="space-y-4">
          <SkeletonText lines={8} />
        </div>
      </div>
    </section>
  );
}

export function DocDetail() {
  const { slug } = useParams({ strict: false });
  const slugStr = typeof slug === "string" ? slug : null;
  const { data: doc, isLoading } = useGetDocBySlug(slugStr);
  const category = doc?.category ?? "";
  const { data: categoryDocs } = useListDocsByCategory(category);

  const toc = useMemo(() => (doc ? buildToc(doc.content) : []), [doc]);

  const { prev, next, related } = useMemo(() => {
    if (!doc || !categoryDocs) {
      return { prev: null, next: null, related: [] as Doc[] };
    }
    const published = categoryDocs.filter(
      (d) => d.status === "published" && d.id !== doc.id,
    );
    const ordered = [...published].sort((a, b) => {
      const ta = Number(a.updatedAt);
      const tb = Number(b.updatedAt);
      return ta - tb;
    });
    const currentIdx = ordered.findIndex((d) => d.id === doc.id);
    // If not found in ordered (e.g. excluded self), treat as standalone.
    const prevDoc = currentIdx > 0 ? ordered[currentIdx - 1] : null;
    const nextDoc =
      currentIdx >= 0 && currentIdx < ordered.length - 1
        ? ordered[currentIdx + 1]
        : null;
    const relatedDocs = ordered.slice(0, 4);
    return { prev: prevDoc, next: nextDoc, related: relatedDocs };
  }, [doc, categoryDocs]);

  if (isLoading) {
    return <DocDetailSkeleton />;
  }

  if (!doc) {
    return (
      <section className="container mx-auto px-4 lg:px-6 py-16">
        <EmptyState
          icon={FileX}
          title="Article not found"
          description="The article you're looking for may have been moved or unpublished."
          action={
            <Button asChild data-ocid="doc_detail.back_to_docs">
              <Link to="/docs">
                <BookOpen className="w-4 h-4" aria-hidden />
                Back to Help Center
              </Link>
            </Button>
          }
          data-ocid="doc_detail.empty_state"
        />
      </section>
    );
  }

  const minutes = Number(doc.readingTime);
  const categoryLabel =
    DOC_CATEGORY_LABELS[doc.category as DocCategory] ?? doc.category;

  return (
    <section className="container mx-auto px-4 lg:px-6 py-12 lg:py-16">
      <div className="mb-6 animate-fade-in-up">
        <Link
          to="/docs"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-smooth font-body focus-ring rounded-sm"
          data-ocid="doc_detail.breadcrumb_back"
        >
          <ArrowLeft className="w-3.5 h-3.5" aria-hidden />
          Help Center
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-10">
        {/* Table of contents sidebar */}
        <aside className="hidden lg:block animate-fade-in-up">
          <div className="sticky top-24">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3 font-body">
              On this page
            </p>
            {toc.length === 0 ? (
              <p className="text-sm text-muted-foreground font-body">
                No sections.
              </p>
            ) : (
              <nav
                className="flex flex-col gap-1.5"
                aria-label="Table of contents"
              >
                {toc.map((item) => (
                  <a
                    key={item.id}
                    href={`#${item.id}`}
                    className="text-sm text-muted-foreground hover:text-primary transition-smooth font-body focus-ring rounded-sm py-0.5"
                    data-ocid={`doc_detail.toc.${item.id}`}
                  >
                    {item.level === 2 ? "— " : ""}
                    {item.text}
                  </a>
                ))}
              </nav>
            )}
          </div>
        </aside>

        {/* Article body */}
        <article className="min-w-0 animate-fade-in-up">
          <div className="flex items-center gap-2 mb-4">
            <Badge variant="secondary" className="font-body text-xs">
              {categoryLabel}
            </Badge>
          </div>
          <h1 className="font-display text-3xl lg:text-4xl font-semibold text-foreground tracking-tight mb-4">
            {doc.title}
          </h1>
          <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground font-body mb-8 pb-6 border-b border-border">
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" aria-hidden />
              {minutes} min read
            </span>
            <span className="flex items-center gap-1">
              <FileText className="w-3.5 h-3.5" aria-hidden />
              Updated {formatDate(doc.updatedAt)}
            </span>
          </div>

          <div className="prose-styles max-w-none">
            {doc.content.trim() === "" ? (
              <p className="text-base text-muted-foreground font-body italic">
                This article has no content yet.
              </p>
            ) : (
              renderContent(doc.content, toc)
            )}
          </div>

          {/* Prev / next navigation */}
          {(prev || next) && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-12 pt-8 border-t border-border">
              {prev ? (
                <Button
                  asChild
                  variant="outline"
                  className="justify-start h-auto py-3 text-left"
                  data-ocid="doc_detail.prev"
                >
                  <Link to="/docs/$slug" params={{ slug: prev.slug }}>
                    <ArrowLeft className="w-4 h-4 shrink-0" aria-hidden />
                    <span className="min-w-0">
                      <span className="block text-xs text-muted-foreground font-body">
                        Previous
                      </span>
                      <span className="block truncate font-body font-medium">
                        {prev.title}
                      </span>
                    </span>
                  </Link>
                </Button>
              ) : (
                <div />
              )}
              {next ? (
                <Button
                  asChild
                  variant="outline"
                  className="justify-end h-auto py-3 text-left sm:col-start-2"
                  data-ocid="doc_detail.next"
                >
                  <Link to="/docs/$slug" params={{ slug: next.slug }}>
                    <span className="min-w-0 text-right">
                      <span className="block text-xs text-muted-foreground font-body">
                        Next
                      </span>
                      <span className="block truncate font-body font-medium">
                        {next.title}
                      </span>
                    </span>
                    <ArrowRight className="w-4 h-4 shrink-0" aria-hidden />
                  </Link>
                </Button>
              ) : (
                <div />
              )}
            </div>
          )}

          {/* Related docs */}
          {related.length > 0 && (
            <div className="mt-12" data-ocid="doc_detail.related">
              <h2 className="font-display text-xl font-semibold text-foreground mb-4">
                Related articles
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {related.map((r, i) => (
                  <Card
                    key={r.id}
                    className="p-4 shadow-subtle hover:shadow-md hover:border-primary/30 animate-card-hover-lift"
                  >
                    <Link
                      to="/docs/$slug"
                      params={{ slug: r.slug }}
                      className="block focus-ring rounded-sm"
                      data-ocid={`doc_detail.related.link.${i + 1}`}
                    >
                      <p className="font-body font-medium text-foreground line-clamp-2 mb-1">
                        {r.title}
                      </p>
                      <p className="text-xs text-muted-foreground font-body flex items-center gap-1">
                        <Clock className="w-3 h-3" aria-hidden />
                        {Number(r.readingTime)} min read
                      </p>
                    </Link>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </article>
      </div>
    </section>
  );
}
