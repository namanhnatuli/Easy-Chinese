"use client";

import { useEffect } from "react";

export function ArticleReadTracker({ articleId }: { articleId: string }) {
  useEffect(() => {
    void fetch(`/api/articles/${articleId}/read`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      cache: "no-store",
    });
  }, [articleId]);

  return null;
}
