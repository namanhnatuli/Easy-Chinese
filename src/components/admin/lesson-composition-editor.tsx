"use client";

import { 
  useSelectionGrid, 
  SelectionSummaryCard, 
  SelectionMainGridCard, 
  SelectionHiddenInputs, 
  SelectionOption
} from "@/components/admin/client-selection-grid";
import { Button } from "@/components/ui/button";

interface LessonCompositionEditorProps {
  allWords: SelectionOption[];
  initialWordSelectedMap: Record<string, number>;
  allGrammar: SelectionOption[];
  initialGrammarSelectedMap: Record<string, number>;
  onSearchAction: (prefix: "word" | "grammar", query: string, hsk: string, tag: string) => Promise<SelectionOption[]>;
  labels: {
    summaryTitle: string;
    orderedWords: string;
    orderedGrammar: string;
    searchOptions: string;
    previousPage: string;
    nextPage: string;
    selectedCount: string;
    clearAll: string;
  };
}

export function LessonCompositionEditor({
  allWords,
  initialWordSelectedMap,
  allGrammar,
  initialGrammarSelectedMap,
  onSearchAction,
  labels,
}: LessonCompositionEditorProps) {
  const wordState = useSelectionGrid({
    options: allWords,
    initialSelectedMap: initialWordSelectedMap,
    onSearch: (query, hsk, tag) => onSearchAction("word", query, hsk, tag),
  });

  const grammarState = useSelectionGrid({
    options: allGrammar,
    initialSelectedMap: initialGrammarSelectedMap,
    onSearch: (query, hsk, tag) => onSearchAction("grammar", query, hsk, tag),
  });

  return (
    <>
      {/* Summaries at the top */}
      <SelectionSummaryCard
        state={wordState}
        title={`${labels.summaryTitle} (Vocabulary)`}
        previousLabel={labels.previousPage}
        nextLabel={labels.nextPage}
      />

      <SelectionSummaryCard
        state={grammarState}
        title={`${labels.summaryTitle} (Grammar)`}
        previousLabel={labels.previousPage}
        nextLabel={labels.nextPage}
      />

      {/* Main selection grids below */}
      <SelectionMainGridCard
        state={wordState}
        title={labels.orderedWords}
        searchPlaceholder={labels.searchOptions}
        previousLabel={labels.previousPage}
        nextLabel={labels.nextPage}
      />

      <SelectionMainGridCard
        state={grammarState}
        title={labels.orderedGrammar}
        searchPlaceholder={labels.searchOptions}
        previousLabel={labels.previousPage}
        nextLabel={labels.nextPage}
      />

      {/* Form helpers */}
      <SelectionHiddenInputs state={wordState} prefix="word" />
      <SelectionHiddenInputs state={grammarState} prefix="grammar" />

      {/* Spacer to prevent content from being covered by the sticky bar */}
      {(wordState.selectedCount > 0 || grammarState.selectedCount > 0) && (
        <div className="h-24" />
      )}

      {/* Unified Selection Sticky Bar with separate rows */}
      {(wordState.selectedCount > 0 || grammarState.selectedCount > 0) && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex flex-col gap-2 animate-in fade-in slide-in-from-bottom-4 rounded-3xl border border-primary/20 bg-background/90 p-4 shadow-2xl backdrop-blur-md max-w-[calc(100vw-2rem)] w-full sm:w-[600px] lg:w-[850px]">
          {/* Words Row */}
          {wordState.selectedCount > 0 && (
            <div className="flex items-center justify-between gap-4 border-b border-border/50 pb-2 last:border-0 last:pb-0">
              <div className="flex items-center gap-3 overflow-hidden">
                <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground shadow-lg shadow-primary/20">
                  {wordState.selectedCount}
                </div>
                <div className="flex flex-col overflow-hidden">
                  <span className="text-[9px] font-bold uppercase tracking-widest text-primary/70">Vocabulary</span>
                  <p className="truncate text-xs font-medium text-foreground/90">
                    {wordState.selectedEntries
                      .map(
                        ([id]) =>
                          wordState.combinedOptionsPool.find((o) => o.id === id)
                            ?.label.split(" - ")[0],
                      )
                      .filter(Boolean)
                      .join(", ")}
                  </p>
                </div>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 px-3 text-[10px] font-semibold text-destructive hover:bg-destructive/10 hover:text-destructive rounded-full"
                onClick={() => wordState.setSelectedMap({})}
              >
                {labels.clearAll}
              </Button>
            </div>
          )}

          {/* Grammar Row */}
          {grammarState.selectedCount > 0 && (
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 overflow-hidden">
                <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-amber-500 text-[10px] font-bold text-white shadow-lg shadow-amber-500/20">
                  {grammarState.selectedCount}
                </div>
                <div className="flex flex-col overflow-hidden">
                  <span className="text-[9px] font-bold uppercase tracking-widest text-amber-600/70">Grammar</span>
                  <p className="truncate text-xs font-medium text-foreground/90">
                    {grammarState.selectedEntries
                      .map(
                        ([id]) =>
                          grammarState.combinedOptionsPool.find((o) => o.id === id)
                            ?.label,
                      )
                      .filter(Boolean)
                      .join(", ")}
                  </p>
                </div>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 px-3 text-[10px] font-semibold text-destructive hover:bg-destructive/10 hover:text-destructive rounded-full"
                onClick={() => grammarState.setSelectedMap({})}
              >
                {labels.clearAll}
              </Button>
            </div>
          )}
        </div>
      )}
    </>
  );
}
