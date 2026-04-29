"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";

import { inputClassName } from "@/components/admin/form-primitives";
import { AdminFormCard } from "@/components/admin/form-primitives";
import { Button } from "@/components/ui/button";

export interface SelectionOption {
  id: string;
  label: string;
  hskLevel?: number;
  tags?: { slug: string; label: string }[];
}

export function ClientSelectionGrid({
  title,
  prefix,
  options,
  initialSelectedMap,
  searchPlaceholder,
  previousLabel,
  nextLabel,
  selectedCountTemplate,
  clearAllLabel,
}: {
  title: string;
  prefix: "word" | "grammar";
  options: SelectionOption[];
  initialSelectedMap: Record<string, number>;
  searchPlaceholder: string;
  previousLabel: string;
  nextLabel: string;
  selectedCountTemplate: string;
  clearAllLabel: string;
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const [selectedMap, setSelectedMap] = useState<Record<string, number>>(initialSelectedMap);
  const [filterHsk, setFilterHsk] = useState<string>("all");
  const [filterTag, setFilterTag] = useState<string>("all");

  const availableHskLevels = useMemo(() => {
    const levels = new Set<number>();
    for (const option of options) {
      if (option.hskLevel) levels.add(option.hskLevel);
    }
    return Array.from(levels).sort();
  }, [options]);

  const availableTags = useMemo(() => {
    const tagMap = new Map<string, string>();
    for (const option of options) {
      if (option.tags) {
        for (const tag of option.tags) {
          tagMap.set(tag.slug, tag.label);
        }
      }
    }
    return Array.from(tagMap.entries()).map(([slug, label]) => ({ slug, label })).sort((a, b) => a.label.localeCompare(b.label));
  }, [options]);

  const filteredOptions = useMemo(() => {
    let result = options;

    if (filterHsk !== "all") {
      const hsk = parseInt(filterHsk, 10);
      result = result.filter((option) => option.hskLevel === hsk);
    }

    if (filterTag !== "all") {
      result = result.filter((option) => option.tags?.some((t) => t.slug === filterTag));
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter((option) => option.label.toLowerCase().includes(query));
    }

    return result;
  }, [options, searchQuery, filterHsk, filterTag]);

  const totalPages = Math.ceil(filteredOptions.length / itemsPerPage) || 1;
  const currentPage = Math.min(page, totalPages);
  
  const paginatedOptions = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredOptions.slice(start, start + itemsPerPage);
  }, [filteredOptions, currentPage, itemsPerPage]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    setPage(1);
  };

  const toggleSelection = (id: string, checked: boolean) => {
    setSelectedMap((prev) => {
      const next = { ...prev };
      if (checked) {
        // Assign next available order if checking
        const currentMax = Object.values(next).reduce((max, val) => Math.max(max, val), 0);
        next[id] = currentMax + 1;
      } else {
        delete next[id];
      }
      return next;
    });
  };

  const updateOrder = (id: string, order: number) => {
    setSelectedMap((prev) => {
      if (!(id in prev)) return prev;
      return { ...prev, [id]: order };
    });
  };

  const selectedEntries = Object.entries(selectedMap);
  const selectedCount = selectedEntries.length;

  return (
    <>
      <AdminFormCard title={title}>
        <div className="space-y-4">
          <div className="grid gap-3 md:grid-cols-[1fr_auto_auto]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <input
                type="text"
                value={searchQuery}
                onChange={handleSearchChange}
                placeholder={searchPlaceholder}
                className={inputClassName("pl-9")}
              />
            </div>
            
            {availableHskLevels.length > 0 && (
              <select
                value={filterHsk}
                onChange={(e) => {
                  setFilterHsk(e.target.value);
                  setPage(1);
                }}
                className={inputClassName("w-full md:w-[120px]")}
              >
                <option value="all">HSK (All)</option>
                {availableHskLevels.map((level) => (
                  <option key={level} value={level}>
                    HSK {level}
                  </option>
                ))}
              </select>
            )}

            {availableTags.length > 0 && (
              <select
                value={filterTag}
                onChange={(e) => {
                  setFilterTag(e.target.value);
                  setPage(1);
                }}
                className={inputClassName("w-full md:w-[150px]")}
              >
                <option value="all">Tags (All)</option>
                {availableTags.map((tag) => (
                  <option key={tag.slug} value={tag.slug}>
                    {tag.label}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="space-y-3">
            {paginatedOptions.map((option) => {
              const selectedOrder = selectedMap[option.id];
              const isSelected = typeof selectedOrder === "number";
              return (
                <div
                  key={option.id}
                  className="grid gap-3 rounded-2xl border border-border bg-muted/20 p-4 md:grid-cols-[1fr_120px]"
                >
                  <label className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={(e) => toggleSelection(option.id, e.target.checked)}
                    />
                    <span className="text-sm text-slate-800">{option.label}</span>
                  </label>
                  {isSelected ? (
                    <input
                      type="number"
                      min={1}
                      value={selectedOrder}
                      onChange={(e) => updateOrder(option.id, parseInt(e.target.value, 10) || 1)}
                      className={inputClassName()}
                    />
                  ) : (
                    <div className="text-xs text-muted-foreground self-center opacity-50">N/A</div>
                  )}
                </div>
              );
            })}

            {paginatedOptions.length === 0 && (
              <div className="text-center py-8 text-sm text-muted-foreground">
                No items found.
              </div>
            )}
          </div>

          <div className="flex items-center justify-between border-t border-border pt-4">
            <div className="flex items-center gap-2">
              <select
                value={itemsPerPage}
                onChange={(e) => {
                  setItemsPerPage(parseInt(e.target.value, 10));
                  setPage(1);
                }}
                className="h-8 rounded-md border border-input bg-transparent px-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="20">20 / page</option>
                <option value="50">50 / page</option>
                <option value="100">100 / page</option>
              </select>
            </div>
            
            {totalPages > 1 && (
              <div className="flex items-center gap-4">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  {previousLabel}
                </Button>
                <span className="text-sm text-muted-foreground">
                  {currentPage} / {totalPages}
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  {nextLabel}
                </Button>
              </div>
            )}
          </div>
        </div>
      </AdminFormCard>

      {/* Hidden inputs to preserve all selections for the parent form action */}
      {selectedEntries.map(([id, order]) => (
        <div key={`${prefix}_hidden_${id}`}>
          <input type="hidden" name={`${prefix}_select_${id}`} value="on" />
          <input type="hidden" name={`${prefix}_order_${id}`} value={order} />
        </div>
      ))}

      {/* Sticky Bottom Control Bar */}
      {selectedCount > 0 && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 flex animate-in fade-in slide-in-from-bottom-4 items-center justify-between rounded-2xl border border-primary/20 bg-background/90 p-4 shadow-2xl backdrop-blur-md max-w-[calc(100vw-2rem)] w-full sm:w-auto gap-8">
          <div className="flex items-center gap-3 whitespace-nowrap">
            <div className="flex size-8 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
              {selectedCount}
            </div>
            <p className="hidden sm:block text-sm font-medium text-foreground flex items-center">
              {selectedCountTemplate.replace("{count}", "")}
              <span className="ml-2 font-normal text-muted-foreground max-w-[200px] lg:max-w-[600px] truncate inline-block align-bottom" title={selectedEntries.map(([id]) => options.find((o) => o.id === id)?.label.split(" - ")[0]).filter(Boolean).join(", ")}>
                {selectedEntries
                  .map(([id]) => options.find((o) => o.id === id)?.label.split(" - ")[0])
                  .filter(Boolean)
                  .join(", ")}
              </span>
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setSelectedMap({})}
            >
              {clearAllLabel}
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
