import * as React from "react"

import { cn } from "@/lib/utils"
import {
  extractPlainTitle,
  shouldAutoFitChildren,
  TableCellAutoFit,
} from "@/components/ui/table-cell-auto-fit"

export type TableCellFit = "auto" | "text" | "off"

function Table({ className, ...props }: React.ComponentProps<"table">) {
  return (
    <div className="relative w-full overflow-auto">
      <table
        data-slot="table"
        className={cn("w-full table-fixed caption-bottom text-sm", className)}
        {...props}
      />
    </div>
  )
}

function TableHeader({ className, ...props }: React.ComponentProps<"thead">) {
  return (
    <thead
      data-slot="table-header"
      className={cn("bg-muted/45 [&_tr]:border-b", className)}
      {...props}
    />
  )
}

function TableBody({ className, ...props }: React.ComponentProps<"tbody">) {
  return (
    <tbody
      data-slot="table-body"
      className={cn("[&_tr:last-child]:border-0", className)}
      {...props}
    />
  )
}

function TableFooter({ className, ...props }: React.ComponentProps<"tfoot">) {
  return (
    <tfoot
      data-slot="table-footer"
      className={cn(
        "bg-muted/50 border-t font-medium [&>tr]:last:border-b-0",
        className,
      )}
      {...props}
    />
  )
}

function TableRow({ className, ...props }: React.ComponentProps<"tr">) {
  return (
    <tr
      data-slot="table-row"
      className={cn(
        "data-[state=selected]:bg-muted border-b border-border/65 transition-all duration-200 hover:-translate-y-px hover:bg-primary/5",
        className,
      )}
      {...props}
    />
  )
}

type TableHeadProps = React.ComponentProps<"th"> & {
  cellFit?: TableCellFit
}

function TableHead({
  className,
  cellFit = "auto",
  children,
  ...props
}: TableHeadProps) {
  const useAutoFit =
    cellFit === "text" || (cellFit === "auto" && shouldAutoFitChildren(children))

  const inner = useAutoFit ? (
    <TableCellAutoFit title={extractPlainTitle(children)}>
      {children}
    </TableCellAutoFit>
  ) : (
    <div className="min-w-0 w-full max-w-full">{children}</div>
  )

  return (
    <th
      data-slot="table-head"
      className={cn(
        "text-muted-foreground overflow-hidden min-h-12 px-4 py-3 text-start align-middle text-xs font-semibold tracking-wide uppercase [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]",
        className,
      )}
      {...props}
    >
      {inner}
    </th>
  )
}

type TableCellProps = React.ComponentProps<"td"> & {
  cellFit?: TableCellFit
}

function TableCell({
  className,
  cellFit = "auto",
  children,
  ...props
}: TableCellProps) {
  const useAutoFit =
    cellFit === "text" || (cellFit === "auto" && shouldAutoFitChildren(children))

  const inner = useAutoFit ? (
    <TableCellAutoFit title={extractPlainTitle(children)}>
      {children}
    </TableCellAutoFit>
  ) : (
    <div className="min-w-0 w-full max-w-full">{children}</div>
  )

  return (
    <td
      data-slot="table-cell"
      className={cn(
        "overflow-hidden px-4 py-3 text-start align-middle [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]",
        className,
      )}
      {...props}
    >
      {inner}
    </td>
  )
}

function TableCaption({
  className,
  ...props
}: React.ComponentProps<"caption">) {
  return (
    <caption
      data-slot="table-caption"
      className={cn("text-muted-foreground mt-4 text-sm", className)}
      {...props}
    />
  )
}

export {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
}
