"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useState, useTransition } from "react";
import { Search, Loader2 } from "lucide-react";

import { FilterBar } from "@/components/shared/filter-bar";
import { inputClassName } from "@/components/admin/form-primitives";

export function AdminWordsFilterBar({
  availableTags,
  searchPlaceholder,
  hskPlaceholder,
  tagsPlaceholder,
}: {
  availableTags: { slug: string; label: string }[];
  searchPlaceholder: string;
  hskPlaceholder: string;
  tagsPlaceholder: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const [q, setQ] = useState(searchParams.get("q") ?? "");
  const [hsk, setHsk] = useState(searchParams.get("hsk") ?? "all");
  const [tag, setTag] = useState(searchParams.get("tag") ?? "all");

  const createQueryString = useCallback(
    (params: Record<string, string | null>) => {
      const current = new URLSearchParams(Array.from(searchParams.entries()));
      for (const [key, value] of Object.entries(params)) {
        if (!value) {
          current.delete(key);
        } else {
          current.set(key, value);
        }
      }
      return current.toString();
    },
    [searchParams]
  );

  const applyFilters = (newFilters: { q?: string; hsk?: string; tag?: string }) => {
    const updatedQ = newFilters.q !== undefined ? newFilters.q : q;
    const updatedHsk = newFilters.hsk !== undefined ? newFilters.hsk : hsk;
    const updatedTag = newFilters.tag !== undefined ? newFilters.tag : tag;

    const query = createQueryString({
      q: updatedQ.trim() || null,
      hsk: updatedHsk !== "all" ? updatedHsk : null,
      tag: updatedTag !== "all" ? updatedTag : null,
      page: "1", // reset page to 1 on filter change
    });

    startTransition(() => {
      router.push(`${pathname}?${query}`);
    });
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    applyFilters({});
  };

  return (
    <FilterBar>
      <form onSubmit={handleSearchSubmit} className="flex flex-col gap-3 md:flex-row md:items-center w-full">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <input
            type="text"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={searchPlaceholder}
            className={inputClassName("pl-9 h-10 w-full")}
          />
          {isPending && (
            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 size-4 animate-spin text-muted-foreground" />
          )}
        </div>
        
        <select
          value={hsk}
          onChange={(e) => {
            const val = e.target.value;
            setHsk(val);
            applyFilters({ hsk: val });
          }}
          className={inputClassName("h-10 md:w-[150px]")}
        >
          <option value="all">{hskPlaceholder}</option>
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((level) => (
            <option key={level} value={level}>
              HSK {level}
            </option>
          ))}
        </select>

        <select
          value={tag}
          onChange={(e) => {
            const val = e.target.value;
            setTag(val);
            applyFilters({ tag: val });
          }}
          className={inputClassName("h-10 md:w-[200px]")}
        >
          <option value="all">{tagsPlaceholder}</option>
          {availableTags.map((t) => (
            <option key={t.slug} value={t.slug}>
              {t.label}
            </option>
          ))}
        </select>

        <button type="submit" className="hidden">
          Submit
        </button>
      </form>
    </FilterBar>
  );
}
