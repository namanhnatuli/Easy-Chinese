"use client";

import { useEffect, useMemo, useState } from "react";
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

export interface SelectionOption {
  id: string;
  label: string;
  hskLevel?: number;
  tags?: { slug: string; label: string }[];
}

export function useSelectionGrid({
  options,
  initialSelectedMap,
  onSearch,
}: {
  options: SelectionOption[];
  initialSelectedMap: Record<string, number>;
  onSearch?: (
    query: string,
    hsk: string,
    tag: string,
  ) => Promise<SelectionOption[]>;
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(50);
  const [selectedMap, setSelectedMap] = useState<Record<string, number>>(
    initialSelectedMap,
  );
  const [filterHsk, setFilterHsk] = useState<string>("all");
  const [filterTag, setFilterTag] = useState<string>("all");
  const [summaryPage, setSummaryPage] = useState(1);
  const [currentOptions, setCurrentOptions] =
    useState<SelectionOption[]>(options);
  const [isSearching, setIsSearching] = useState(false);
  const summaryItemsPerPage = 100;

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
    return Array.from(tagMap.entries())
      .map(([slug, label]) => ({ slug, label }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [options]);

  useEffect(() => {
    if (!onSearch) return;

    if (!searchQuery.trim() && filterHsk === "all" && filterTag === "all") {
      setCurrentOptions(options);
      setIsSearching(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const results = await onSearch(searchQuery, filterHsk, filterTag);
        setCurrentOptions(results);
      } catch (error) {
        console.error("Search error:", error);
      } finally {
        setIsSearching(false);
      }
    }, 500);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery, filterHsk, filterTag]);

  const combinedOptionsPool = useMemo(() => {
    const poolMap = new Map<string, SelectionOption>();
    options.forEach((opt) => {
      if (opt.id in selectedMap) poolMap.set(opt.id, opt);
    });
    currentOptions.forEach((opt) => {
      poolMap.set(opt.id, opt);
    });
    return Array.from(poolMap.values());
  }, [options, currentOptions, selectedMap]);

  const filteredOptions = useMemo(() => {
    if (onSearch) return currentOptions;
    let result = options;
    if (filterHsk !== "all") {
      const hsk = parseInt(filterHsk, 10);
      result = result.filter((option) => option.hskLevel === hsk);
    }
    if (filterTag !== "all") {
      result = result.filter((option) =>
        option.tags?.some((t) => t.slug === filterTag),
      );
    }
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter((option) =>
        option.label.toLowerCase().includes(query),
      );
    }
    return result;
  }, [options, currentOptions, searchQuery, filterHsk, filterTag, onSearch]);

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
        const currentMax = Object.values(next).reduce(
          (max, val) => Math.max(max, val),
          0,
        );
        next[id] = currentMax + 1;
      } else {
        delete next[id];
      }
      return next;
    });
    setSummaryPage(1);
  };

  const updateOrder = (id: string, order: number) => {
    setSelectedMap((prev) => {
      if (!(id in prev)) return prev;
      return { ...prev, [id]: order };
    });
  };

  const selectedEntries = Object.entries(selectedMap);
  const selectedCount = selectedEntries.length;

  const sortedSelectedItems = useMemo(() => {
    return combinedOptionsPool
      .filter((option) => option.id in selectedMap)
      .map((option) => ({
        ...option,
        order: selectedMap[option.id],
      }))
      .sort((a, b) => a.order - b.order);
  }, [combinedOptionsPool, selectedMap]);

  const totalSummaryPages =
    Math.ceil(sortedSelectedItems.length / summaryItemsPerPage) || 1;
  const currentSummaryPage = Math.min(summaryPage, totalSummaryPages);

  const paginatedSummaryItems = useMemo(() => {
    const start = (currentSummaryPage - 1) * summaryItemsPerPage;
    return sortedSelectedItems.slice(start, start + summaryItemsPerPage);
  }, [sortedSelectedItems, currentSummaryPage, summaryItemsPerPage]);

  return {
    searchQuery,
    setSearchQuery,
    page,
    setPage,
    itemsPerPage,
    setItemsPerPage,
    selectedMap,
    setSelectedMap,
    filterHsk,
    setFilterHsk,
    filterTag,
    setFilterTag,
    summaryPage,
    setSummaryPage,
    currentOptions,
    isSearching,
    availableHskLevels,
    availableTags,
    combinedOptionsPool,
    filteredOptions,
    totalPages,
    currentPage,
    paginatedOptions,
    handleSearchChange,
    toggleSelection,
    updateOrder,
    selectedEntries,
    selectedCount,
    sortedSelectedItems,
    totalSummaryPages,
    currentSummaryPage,
    paginatedSummaryItems,
    summaryItemsPerPage,
  };
}

export function SelectionSummaryCard({
  state,
  title,
  previousLabel,
  nextLabel,
}: {
  state: ReturnType<typeof useSelectionGrid>;
  title: string;
  previousLabel: string;
  nextLabel: string;
}) {
  const {
    selectedCount,
    paginatedSummaryItems,
    toggleSelection,
    updateOrder,
    totalSummaryPages,
    summaryPage,
    setSummaryPage,
    currentSummaryPage,
  } = state;

  if (selectedCount === 0) return null;

  return (
    <AdminFormCard title={`${title} (${selectedCount})`}>
      <div className="space-y-4">
        <div className="space-y-3">
          {paginatedSummaryItems.map((item) => (
            <div
              key={`summary-${item.id}`}
              className="grid gap-3 rounded-2xl border border-border bg-muted/20 p-4 md:grid-cols-[1fr_120px]"
            >
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={true}
                  onChange={(e) => toggleSelection(item.id, e.target.checked)}
                />
                <span className="text-sm text-slate-800">{item.label}</span>
              </label>
              <input
                type="number"
                min={1}
                value={item.order}
                onChange={(e) =>
                  updateOrder(item.id, parseInt(e.target.value, 10) || 1)
                }
                className={inputClassName()}
              />
            </div>
          ))}
        </div>

        {totalSummaryPages > 1 && (
          <div className="flex items-center justify-end gap-4 border-t border-border pt-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setSummaryPage((p) => Math.max(1, p - 1))}
              disabled={currentSummaryPage === 1}
            >
              {previousLabel}
            </Button>
            <span className="text-xs text-muted-foreground">
              {currentSummaryPage} / {totalSummaryPages}
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                setSummaryPage((p) => Math.min(totalSummaryPages, p + 1))
              }
              disabled={currentSummaryPage === totalSummaryPages}
            >
              {nextLabel}
            </Button>
          </div>
        )}
      </div>
    </AdminFormCard>
  );
}

export function SelectionMainGridCard({
  state,
  title,
  searchPlaceholder,
  previousLabel,
  nextLabel,
}: {
  state: ReturnType<typeof useSelectionGrid>;
  title: string;
  searchPlaceholder: string;
  previousLabel: string;
  nextLabel: string;
}) {
  const {
    searchQuery,
    handleSearchChange,
    availableHskLevels,
    filterHsk,
    setFilterHsk,
    setPage,
    availableTags,
    filterTag,
    setFilterTag,
    isSearching,
    paginatedOptions,
    selectedMap,
    toggleSelection,
    itemsPerPage,
    setItemsPerPage,
    totalPages,
    currentPage,
  } = state;

  return (
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

        <div
          className={`grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 transition-opacity ${isSearching ? "opacity-50" : "opacity-100"}`}
        >
          {paginatedOptions.map((option) => {
            const selectedOrder = selectedMap[option.id];
            const isSelected = typeof selectedOrder === "number";
            return (
              <div
                key={option.id}
                className={`flex items-center gap-2 rounded-xl border p-2 text-xs transition-colors ${
                  isSelected
                    ? "border-primary bg-primary/5"
                    : "border-border bg-muted/20"
                }`}
              >
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={(e) => toggleSelection(option.id, e.target.checked)}
                  className="size-3"
                />
                <span className="truncate font-medium flex-1 text-slate-700">
                  {option.label.split(" - ")[0]}
                </span>
              </div>
            );
          })}

          {paginatedOptions.length === 0 && (
            <div className="col-span-full text-center py-8 text-sm text-muted-foreground">
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
              <option value="200">200 / page</option>
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
  );
}

export function SelectionHiddenInputs({
  state,
  prefix,
}: {
  state: ReturnType<typeof useSelectionGrid>;
  prefix: string;
}) {
  return (
    <>
      {state.selectedEntries.map(([id, order]) => (
        <div key={`${prefix}_hidden_${id}`}>
          <input type="hidden" name={`${prefix}_select_${id}`} value="on" />
          <input type="hidden" name={`${prefix}_order_${id}`} value={order} />
        </div>
      ))}
    </>
  );
}

export function SelectionStickyBar({
  state,
  selectedCountTemplate,
  clearAllLabel,
}: {
  state: ReturnType<typeof useSelectionGrid>;
  selectedCountTemplate: string;
  clearAllLabel: string;
}) {
  const {
    selectedCount,
    selectedEntries,
    combinedOptionsPool,
    setSelectedMap,
  } = state;

  if (selectedCount === 0) return null;

  return (
    <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 flex animate-in fade-in slide-in-from-bottom-4 items-center justify-between rounded-2xl border border-primary/20 bg-background/90 p-4 shadow-2xl backdrop-blur-md max-w-[calc(100vw-2rem)] w-full sm:w-auto gap-8">
      <div className="flex items-center gap-3 whitespace-nowrap">
        <div className="flex size-8 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
          {selectedCount}
        </div>
        <p className="hidden sm:block text-sm font-medium text-foreground flex items-center">
          {selectedCountTemplate.replace("{count}", "")}
          <span
            className="ml-2 font-normal text-muted-foreground max-w-[200px] lg:max-w-[600px] truncate inline-block align-bottom"
            title={selectedEntries
              .map(
                ([id]) =>
                  combinedOptionsPool.find((o) => o.id === id)?.label.split(" - ")[0],
              )
              .filter(Boolean)
              .join(", ")}
          >
            {selectedEntries
              .map(
                ([id]) =>
                  combinedOptionsPool.find((o) => o.id === id)?.label.split(" - ")[0],
              )
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
  );
}

export function ClientSelectionGrid(props: {
  title: string;
  prefix: "word" | "grammar";
  options: SelectionOption[];
  initialSelectedMap: Record<string, number>;
  searchPlaceholder: string;
  previousLabel: string;
  nextLabel: string;
  selectedCountTemplate: string;
  clearAllLabel: string;
  showSummaryGrid?: boolean;
  summaryTitle?: string;
  onSearch?: (
    query: string,
    hsk: string,
    tag: string,
  ) => Promise<SelectionOption[]>;
}) {
  const state = useSelectionGrid({
    options: props.options,
    initialSelectedMap: props.initialSelectedMap,
    onSearch: props.onSearch,
  });

  return (
    <>
      {props.showSummaryGrid && (
        <SelectionSummaryCard
          state={state}
          title={props.summaryTitle || "Selected Order"}
          previousLabel={props.previousLabel}
          nextLabel={props.nextLabel}
        />
      )}
      <SelectionMainGridCard
        state={state}
        title={props.title}
        searchPlaceholder={props.searchPlaceholder}
        previousLabel={props.previousLabel}
        nextLabel={props.nextLabel}
      />
      <SelectionHiddenInputs state={state} prefix={props.prefix} />
      <SelectionStickyBar
        state={state}
        selectedCountTemplate={props.selectedCountTemplate}
        clearAllLabel={props.clearAllLabel}
      />
    </>
  );
}

