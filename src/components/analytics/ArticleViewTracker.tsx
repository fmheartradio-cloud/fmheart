"use client";

import { useEffect } from "react";
import { incrementArticleViews } from "@/services/articles";

export function ArticleViewTracker({ articleId }: { articleId: string }) {
  useEffect(() => {
    void incrementArticleViews(articleId);
  }, [articleId]);

  return null;
}
