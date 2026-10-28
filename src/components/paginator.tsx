import { cloneElement } from "react"
import type { ReactElement } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { pageSizes } from "@/lib/records"
import type { PageMeta, PageSize } from "@/lib/records"

const sizeItems = pageSizes.map((size) => ({
  label: String(size),
  value: String(size),
}))

export function Paginator({
  meta,
  link,
  onPerPageChange,
}: {
  meta: PageMeta
  link: (page: number) => ReactElement
  onPerPageChange: (perPage: PageSize) => void
}) {
  const onlyPage = meta.lastPage === 1

  return (
    <div className="flex flex-col items-center gap-3 pt-4">
      {meta.from !== null && meta.to !== null ? (
        <p className="text-sm text-muted-foreground">
          {meta.from}–{meta.to} of {meta.total}
        </p>
      ) : null}
      <div className="flex flex-wrap items-center justify-center gap-3">
        <label className="flex items-center gap-2 text-sm text-muted-foreground">
          Results per page
          <Select
            items={sizeItems}
            value={String(meta.perPage)}
            onValueChange={(value) => {
              const next = pageSizes.find((size) => String(size) === value)
              if (next !== undefined && next !== meta.perPage) {
                onPerPageChange(next)
              }
            }}
          >
            <SelectTrigger size="sm" aria-label="Results per page">
              <SelectValue />
            </SelectTrigger>
            <SelectContent alignItemWithTrigger={false}>
              {sizeItems.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </label>
        <Pagination className="mx-0 w-auto">
          <PaginationContent>
            <PaginationItem>
              {meta.currentPage > 1 ? (
                <PaginationPrevious
                  text="PreviousPage"
                  render={routeLink(link(meta.currentPage - 1))}
                />
              ) : (
                <PageStep label="PreviousPage" direction="previous" />
              )}
            </PaginationItem>
            {pageWindow(meta.currentPage, meta.lastPage).map((item, index) =>
              item === "ellipsis" ? (
                <PaginationItem key={`ellipsis-${index}`}>
                  <PaginationEllipsis />
                </PaginationItem>
              ) : (
                <PaginationItem key={item}>
                  {onlyPage ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      disabled
                      aria-current="page"
                    >
                      {item}
                    </Button>
                  ) : (
                    <PaginationLink
                      isActive={item === meta.currentPage}
                      render={routeLink(link(item))}
                    >
                      {item}
                    </PaginationLink>
                  )}
                </PaginationItem>
              )
            )}
            <PaginationItem>
              {meta.currentPage < meta.lastPage ? (
                <PaginationNext
                  text="NextPage"
                  render={routeLink(link(meta.currentPage + 1))}
                />
              ) : (
                <PageStep label="NextPage" direction="next" />
              )}
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      </div>
    </div>
  )
}

function PageStep({
  label,
  direction,
}: {
  label: string
  direction: "previous" | "next"
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="default"
      disabled
      aria-label={
        direction === "previous" ? "Go to previous page" : "Go to next page"
      }
      className={direction === "previous" ? "pl-1.5" : "pr-1.5"}
    >
      {direction === "previous" ? (
        <ChevronLeft data-icon="inline-start" />
      ) : null}
      <span className="hidden sm:block">{label}</span>
      {direction === "next" ? <ChevronRight data-icon="inline-end" /> : null}
    </Button>
  )
}

function routeLink(element: ReactElement) {
  return cloneElement(
    element as ReactElement<{
      activeOptions?: { exact: boolean; includeSearch: boolean }
    }>,
    { activeOptions: { exact: true, includeSearch: true } }
  )
}

function pageWindow(current: number, last: number) {
  const pages: Array<number | "ellipsis"> = []
  let previous: number | undefined
  for (let page = 1; page <= last; page++) {
    const nearCurrent = page >= current - 1 && page <= current + 1
    if (page !== 1 && page !== last && !nearCurrent) {
      continue
    }
    if (previous !== undefined && page - previous > 2) {
      pages.push("ellipsis")
    } else if (previous !== undefined && page - previous === 2) {
      pages.push(previous + 1)
    }
    pages.push(page)
    previous = page
  }
  return pages
}
