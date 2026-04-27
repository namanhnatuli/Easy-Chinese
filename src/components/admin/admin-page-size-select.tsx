"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useI18n } from "@/i18n/client";

interface AdminPageSizeSelectProps {
  value: number;
  options: readonly number[];
}

export function AdminPageSizeSelect({ value, options }: AdminPageSizeSelectProps) {
  const { t } = useI18n();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  function handleValueChange(nextValue: string) {
    const nextPageSize = Number(nextValue);
    const params = new URLSearchParams(searchParams.toString());

    if (nextPageSize === 10) {
      params.delete("pageSize");
    } else {
      params.set("pageSize", String(nextPageSize));
    }

    params.delete("page");

    const query = params.toString();
    const nextHref = query ? `${pathname}?${query}` : pathname;

    startTransition(() => {
      router.push(nextHref);
    });
  }

  return (
    <Select value={String(value)} onValueChange={handleValueChange} disabled={isPending}>
      <SelectTrigger className="w-[7.5rem]">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem key={option} value={String(option)}>
            {option} {t("common.pageSuffix")}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
