"use client";

import { useState } from "react";

import { deleteWordAction } from "@/features/admin/words";
import { useI18n } from "@/i18n/client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface WordDeleteDialogButtonProps {
  wordId: string;
  hanzi: string;
  slug: string;
}

export function WordDeleteDialogButton({
  wordId,
  hanzi,
  slug,
}: WordDeleteDialogButtonProps) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="ghost" size="sm" className="text-rose-600 hover:text-rose-600">
          {t("common.delete")}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("admin.words.deleteConfirm.title")}</DialogTitle>
          <DialogDescription>
            {t("admin.words.deleteConfirm.description", {
              word: hanzi,
              slug,
            })}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setOpen(false)}>
            {t("common.cancel")}
          </Button>
          <form action={deleteWordAction}>
            <input type="hidden" name="id" value={wordId} />
            <Button type="submit" variant="destructive">
              {t("admin.words.deleteConfirm.confirm")}
            </Button>
          </form>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
