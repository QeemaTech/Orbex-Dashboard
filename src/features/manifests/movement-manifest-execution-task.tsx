import type { TFunction } from "i18next"

import type { MovementManifestUnifiedTask } from "@/api/shipments-api"

export function movementManifestExecutionTaskLabel(
  t: TFunction,
  task: MovementManifestUnifiedTask,
): string {
  if (task.kind === "PICKUP_TASK") {
    return t("warehouse.pickupManifests.executionTaskType.PICKUP")
  }
  if (task.kind === "RETURN_TO_MERCHANT_GROUP") {
    return t("warehouse.pickupManifests.executionTaskType.RETURN_TO_MERCHANT", {
      defaultValue: "Return to merchant",
    })
  }
  return t(`warehouse.pickupManifests.executionTaskType.${task.taskType}`, {
    defaultValue: task.taskType,
  })
}

export function movementManifestExecutionTaskBadgeClass(task: MovementManifestUnifiedTask): string {
  if (task.kind === "PICKUP_TASK") {
    return "border-sky-500/25 bg-sky-500/10 text-sky-800 dark:text-sky-200"
  }
  if (task.kind === "RETURN_TO_MERCHANT_GROUP") {
    return "border-amber-500/30 bg-amber-500/10 text-amber-900 dark:text-amber-200"
  }
  if (task.taskType === "TRANSFER") {
    return "border-violet-500/25 bg-violet-500/10 text-violet-800 dark:text-violet-200"
  }
  if (task.taskType === "RETURN_TO_MERCHANT") {
    return "border-amber-500/30 bg-amber-500/10 text-amber-900 dark:text-amber-200"
  }
  return "bg-muted text-muted-foreground border-border"
}

export function MovementManifestExecutionTaskBadge({
  task,
  t,
}: {
  task: MovementManifestUnifiedTask
  t: TFunction
}) {
  return (
    <span
      className={`inline-flex rounded-md border px-2 py-0.5 text-xs font-medium ${movementManifestExecutionTaskBadgeClass(task)}`}
    >
      {movementManifestExecutionTaskLabel(t, task)}
    </span>
  )
}
