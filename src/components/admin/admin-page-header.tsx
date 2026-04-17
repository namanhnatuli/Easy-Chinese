import type { ReactNode } from "react";

import { PageHeader } from "@/components/shared/page-header";

export function AdminPageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow: string;
  title: string;
  description: string;
  actions?: ReactNode;
}) {
  return (
    <PageHeader
      eyebrow={eyebrow}
      badge="Admin"
      title={title}
      description={description}
      actions={actions}
    />
  );
}
