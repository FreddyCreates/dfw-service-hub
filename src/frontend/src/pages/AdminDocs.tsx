// AdminDocs — documentation hub admin editor.
// Lists all docs (published + draft), create new doc button, edit doc form
// (title, slug, category, content, status), publish/unpublish toggle.
// Uses useListDocs, useCreateDoc, useUpdateDoc, usePublishDoc.
// Dark portal theme tokens, skeleton loading, and motion utilities.

import { EmptyState } from "@/components/EmptyState";
import { SkeletonList } from "@/components/Skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  useCreateDoc,
  useListDocs,
  usePublishDoc,
  useUpdateDoc,
} from "@/hooks/useQueries";
import type { Doc, DocCategory, DocStatus } from "@/types";
import { DOC_CATEGORY_LABELS, DOC_STATUS_LABELS } from "@/types";
import {
  BookOpen,
  CheckCircle2,
  Clock,
  FileText,
  Pencil,
  Plus,
  Search,
  Send,
} from "lucide-react";
import { useMemo, useState } from "react";

type StatusFilter = DocStatus | "all";
type CategoryFilter = DocCategory | "all";

const DOC_CATEGORIES = Object.keys(DOC_CATEGORY_LABELS) as DocCategory[];

const statusStyles: Record<DocStatus, string> = {
  draft: "border-warning/40 bg-warning/15 text-warning-foreground",
  published: "border-success/40 bg-success/15 text-success-foreground",
};

function formatDate(ts: bigint): string {
  const ms = Number(ts) / 1_000_000;
  return new Date(ms).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

interface DocFormState {
  title: string;
  slug: string;
  category: DocCategory;
  content: string;
  status: DocStatus;
}

const EMPTY_FORM: DocFormState = {
  title: "",
  slug: "",
  category: "getting-started",
  content: "",
  status: "draft",
};

function DocCard({
  doc,
  index,
  onEdit,
  onTogglePublish,
}: {
  doc: Doc;
  index: number;
  onEdit: (d: Doc) => void;
  onTogglePublish: (d: Doc) => void;
}) {
  return (
    <Card
      className="p-5 shadow-subtle hover:shadow-md hover:border-primary/30 animate-card-hover-lift"
      data-ocid={`admin_docs.row.${index + 1}`}
    >
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex-1 min-w-0">
          <h3 className="font-display font-semibold text-foreground truncate">
            {doc.title}
          </h3>
          <p className="text-xs text-muted-foreground font-mono mt-0.5">
            /docs/{doc.slug}
          </p>
        </div>
        <Badge
          variant="outline"
          className={`font-body gap-1 shrink-0 ${statusStyles[doc.status]}`}
        >
          {doc.status === "published" ? (
            <CheckCircle2 className="w-3 h-3" aria-hidden />
          ) : (
            <Clock className="w-3 h-3" aria-hidden />
          )}
          {DOC_STATUS_LABELS[doc.status]}
        </Badge>
      </div>

      <p className="text-sm text-muted-foreground font-body line-clamp-2 mb-3">
        {doc.content || "No content yet."}
      </p>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground font-body mb-3">
        <Badge variant="secondary" className="font-body text-xs">
          {DOC_CATEGORY_LABELS[doc.category as DocCategory] ?? doc.category}
        </Badge>
        <span className="flex items-center gap-1">
          <Clock className="w-3 h-3" aria-hidden />
          Updated {formatDate(doc.updatedAt)}
        </span>
      </div>

      <div className="flex flex-wrap gap-2 pt-2 border-t border-border">
        <Button
          size="sm"
          variant="outline"
          onClick={() => onEdit(doc)}
          data-ocid={`admin_docs.edit.${index + 1}`}
        >
          <Pencil className="w-3.5 h-3.5" aria-hidden />
          Edit
        </Button>
        <Button
          size="sm"
          variant={doc.status === "published" ? "secondary" : "default"}
          onClick={() => onTogglePublish(doc)}
          disabled={false}
          data-ocid={`admin_docs.toggle_publish.${index + 1}`}
        >
          {doc.status === "published" ? (
            <>
              <Clock className="w-3.5 h-3.5" aria-hidden />
              Unpublish
            </>
          ) : (
            <>
              <Send className="w-3.5 h-3.5" aria-hidden />
              Publish
            </>
          )}
        </Button>
      </div>
    </Card>
  );
}

export function AdminDocs() {
  const { data: docs, isLoading } = useListDocs();
  const createMutation = useCreateDoc();
  const updateMutation = useUpdateDoc();
  const publishMutation = usePublishDoc();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<DocFormState>(EMPTY_FORM);

  const filtered = useMemo(() => {
    if (!docs) return [];
    const q = search.trim().toLowerCase();
    return docs.filter((d) => {
      const matchesStatus = statusFilter === "all" || d.status === statusFilter;
      const matchesCategory =
        categoryFilter === "all" || d.category === categoryFilter;
      const matchesSearch =
        q === "" ||
        d.title.toLowerCase().includes(q) ||
        d.slug.toLowerCase().includes(q) ||
        d.content.toLowerCase().includes(q);
      return matchesStatus && matchesCategory && matchesSearch;
    });
  }, [docs, search, statusFilter, categoryFilter]);

  const counts = useMemo(() => {
    const list = docs ?? [];
    return {
      total: list.length,
      published: list.filter((d) => d.status === "published").length,
      draft: list.filter((d) => d.status === "draft").length,
    };
  }, [docs]);

  function openCreate() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  }

  function openEdit(doc: Doc) {
    setEditingId(doc.id);
    setForm({
      title: doc.title,
      slug: doc.slug,
      category: (DOC_CATEGORIES.find((c) => c === doc.category) ??
        "getting-started") as DocCategory,
      content: doc.content,
      status: doc.status,
    });
    setDialogOpen(true);
  }

  function handleSave() {
    if (!form.title.trim() || !form.slug.trim()) return;
    const input = {
      slug: slugify(form.slug),
      title: form.title.trim(),
      content: form.content,
      category: form.category,
      status: form.status,
    };
    if (editingId) {
      updateMutation.mutate(
        { docId: editingId, input },
        { onSuccess: () => setDialogOpen(false) },
      );
    } else {
      createMutation.mutate(input, { onSuccess: () => setDialogOpen(false) });
    }
  }

  function handleTogglePublish(doc: Doc) {
    const next: DocStatus = doc.status === "published" ? "draft" : "published";
    publishMutation.mutate({ docId: doc.id, status: next });
  }

  const isMutating =
    createMutation.isPending ||
    updateMutation.isPending ||
    publishMutation.isPending;

  return (
    <div className="bg-background" data-ocid="page.admin_docs">
      <section className="container mx-auto px-4 lg:px-6 py-10 lg:py-14">
        <div className="flex flex-col gap-2 mb-8 animate-fade-in-up">
          <div className="flex items-center gap-2 text-primary">
            <BookOpen className="w-5 h-5" aria-hidden />
            <span className="text-sm font-body font-medium">Admin</span>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
            <div>
              <h1 className="font-display text-3xl lg:text-4xl font-semibold text-foreground">
                Documentation hub
              </h1>
              <p className="text-muted-foreground font-body max-w-2xl mt-2">
                Author and manage help-center articles. Create drafts, edit
                content, and publish when ready for customers and providers.
              </p>
            </div>
            <Button
              onClick={openCreate}
              data-ocid="admin_docs.create_button"
              className="self-start sm:self-auto"
            >
              <Plus className="w-4 h-4" aria-hidden />
              New doc
            </Button>
          </div>
        </div>

        {/* Summary chips */}
        <div className="grid grid-cols-3 gap-3 mb-8">
          {[
            {
              label: "Total docs",
              value: counts.total,
              token: "text-foreground",
            },
            {
              label: "Published",
              value: counts.published,
              token: "text-success-foreground",
            },
            {
              label: "Drafts",
              value: counts.draft,
              token: "text-warning-foreground",
            },
          ].map((c, i) => (
            <div
              key={c.label}
              className={`rounded-xl border border-border bg-card p-4 shadow-subtle animate-fade-in-up stagger-${i + 1}`}
              data-ocid={`admin_docs.metric.${c.label.toLowerCase().replace(/\s+/g, "_")}`}
            >
              <p className="text-xs text-muted-foreground font-body uppercase tracking-wide">
                {c.label}
              </p>
              <p
                className={`font-display text-2xl font-semibold mt-1 ${c.token}`}
              >
                {c.value}
              </p>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
          <div className="relative">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground"
              aria-hidden
            />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search docs"
              className="pl-9"
              data-ocid="admin_docs.search_input"
            />
          </div>
          <Select
            value={statusFilter}
            onValueChange={(v) => setStatusFilter(v as StatusFilter)}
          >
            <SelectTrigger data-ocid="admin_docs.status_filter">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="published">Published</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={categoryFilter}
            onValueChange={(v) => setCategoryFilter(v as CategoryFilter)}
          >
            <SelectTrigger data-ocid="admin_docs.category_filter">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              {DOC_CATEGORIES.map((c) => (
                <SelectItem key={c} value={c}>
                  {DOC_CATEGORY_LABELS[c]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <SkeletonList
            count={4}
            withMedia={false}
            className="grid-cols-1 lg:grid-cols-2"
          />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="No docs found"
            description={
              search || statusFilter !== "all" || categoryFilter !== "all"
                ? "Try adjusting your filters."
                : "No documentation has been created yet. Click 'New doc' to start."
            }
            data-ocid="admin_docs.empty_state"
          />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {filtered.map((d, i) => (
              <div key={d.id} className="animate-fade-in-up">
                <DocCard
                  doc={d}
                  index={i}
                  onEdit={openEdit}
                  onTogglePublish={handleTogglePublish}
                />
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Create / edit dialog */}
      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            setDialogOpen(false);
            setEditingId(null);
            setForm(EMPTY_FORM);
          }
        }}
      >
        <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display">
              {editingId ? "Edit doc" : "New doc"}
            </DialogTitle>
          </DialogHeader>

          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="doc-title">Title</Label>
              <Input
                id="doc-title"
                value={form.title}
                onChange={(e) => {
                  const title = e.target.value;
                  setForm((f) => ({
                    ...f,
                    title,
                    slug: editingId ? f.slug : slugify(title),
                  }));
                }}
                placeholder="How to book a box truck"
                data-ocid="admin_docs.title_input"
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="doc-slug">Slug</Label>
              <Input
                id="doc-slug"
                value={form.slug}
                onChange={(e) =>
                  setForm((f) => ({ ...f, slug: slugify(e.target.value) }))
                }
                placeholder="how-to-book-a-box-truck"
                className="font-mono text-sm"
                data-ocid="admin_docs.slug_input"
              />
              <p className="text-xs text-muted-foreground font-body">
                Published at /docs/{form.slug || "…"}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="doc-category">Category</Label>
                <Select
                  value={form.category}
                  onValueChange={(v) =>
                    setForm((f) => ({ ...f, category: v as DocCategory }))
                  }
                >
                  <SelectTrigger data-ocid="admin_docs.category_select">
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    {DOC_CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c}>
                        {DOC_CATEGORY_LABELS[c]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="doc-status">Status</Label>
                <Select
                  value={form.status}
                  onValueChange={(v) =>
                    setForm((f) => ({ ...f, status: v as DocStatus }))
                  }
                >
                  <SelectTrigger data-ocid="admin_docs.status_select">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="published">Published</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="doc-content">Content</Label>
              <Textarea
                id="doc-content"
                value={form.content}
                onChange={(e) =>
                  setForm((f) => ({ ...f, content: e.target.value }))
                }
                placeholder="Write the article content here…"
                rows={10}
                data-ocid="admin_docs.content_input"
              />
            </div>

            <div className="flex flex-wrap gap-2 pt-2 border-t border-border">
              <Button
                onClick={handleSave}
                disabled={isMutating || !form.title.trim() || !form.slug.trim()}
                data-ocid="admin_docs.save_button"
              >
                {isMutating
                  ? "Saving…"
                  : editingId
                    ? "Save changes"
                    : "Create doc"}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setDialogOpen(false);
                  setEditingId(null);
                  setForm(EMPTY_FORM);
                }}
                data-ocid="admin_docs.cancel_button"
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
