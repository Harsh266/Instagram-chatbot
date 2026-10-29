import type { LeadCategory, PipelineStage } from "@/lib/types";
import { CATEGORY_LABEL, CATEGORY_TONE, STAGE_LABEL } from "@/lib/utils";
import { Badge } from "../ui/primitives";

export function CategoryBadge({ category }: { category: LeadCategory }) {
  return (
    <Badge tone={CATEGORY_TONE[category]} dot>
      {CATEGORY_LABEL[category]}
    </Badge>
  );
}

export function StageBadge({ stage }: { stage: PipelineStage }) {
  const tone = stage === "won" ? "green" : stage === "lost" ? "slate" : stage === "new" ? "blue" : "navy";
  return <Badge tone={tone}>{STAGE_LABEL[stage]}</Badge>;
}
