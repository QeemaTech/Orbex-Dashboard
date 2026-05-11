import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  Edit,
  MoreVertical,
  Plus,
  Search,
  UserCheck,
  UserX,
} from "lucide-react"
import { useMemo, useState } from "react"
import { useTranslation } from "react-i18next"

import {
  deactivateCourier,
  listCouriers,
  type CourierAdminRow,
} from "@/api/couriers-api"
import { CourierFormDialog } from "@/components/couriers/CourierFormDialog"
import { Layout } from "@/components/layout/Layout"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { useAuth } from "@/lib/auth-context"
import { showToast } from "@/lib/toast"

export default function CouriersPage() {
  const { t } = useTranslation()
  const { token } = useAuth()
  const queryClient = useQueryClient()

  const [search, setSearch] = useState("")
  const [page, setPage] = useState(1)
  const pageSize = 20

  const [formOpen, setFormOpen] = useState(false)
  const [formMode, setFormMode] = useState<"create" | "edit">("create")
  const [selectedCourier, setSelectedCourier] = useState<CourierAdminRow | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ["couriers-admin-list", token, page, search],
    queryFn: () =>
      listCouriers({
        token: token!,
        page,
        pageSize,
        search: search.trim() || undefined,
      }),
    enabled: !!token,
  })

  const deactivateMut = useMutation({
    mutationFn: (userId: string) => deactivateCourier({ token: token!, userId }),
    onSuccess: () => {
      showToast(t("couriers.feedback.deactivated"), "success")
      queryClient.invalidateQueries({ queryKey: ["couriers-admin-list"] })
    },
    onError: (e) => {
      showToast(e instanceof Error ? e.message : t("couriers.feedback.actionFailed"), "error")
    },
  })

  const handleCreate = () => {
    setFormMode("create")
    setSelectedCourier(null)
    setFormOpen(true)
  }

  const handleEdit = (courier: CourierAdminRow) => {
    setFormMode("edit")
    setSelectedCourier(courier)
    setFormOpen(true)
  }

  const couriers = useMemo(() => data?.couriers ?? [], [data])
  const total = data?.total ?? 0
  const totalPages = Math.ceil(total / pageSize)

  return (
    <Layout>
      <div className="space-y-6 p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{t("couriers.pageTitle")}</h1>
            <p className="text-muted-foreground">
              {t("couriers.pageDescription")}
            </p>
          </div>
          <Button onClick={handleCreate} className="w-full md:w-auto">
            <Plus className="mr-2 size-4" />
            {t("couriers.actions.create")}
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{t("couriers.list.title")}</CardTitle>
            <CardDescription>
              {t("couriers.list.description", { count: total })}
            </CardDescription>
            <div className="mt-4 flex items-center gap-2">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
                <Input
                  placeholder={t("couriers.list.searchPlaceholder")}
                  className="pl-8"
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value)
                    setPage(1)
                  }}
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("couriers.list.cols.name")}</TableHead>
                    <TableHead>{t("couriers.list.cols.email")}</TableHead>
                    <TableHead>{t("couriers.list.cols.phone")}</TableHead>
                    <TableHead>{t("couriers.list.cols.regions")}</TableHead>
                    <TableHead>{t("couriers.list.cols.status")}</TableHead>
                    <TableHead className="w-[80px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <TableRow key={i}>
                        <TableCell colSpan={6} className="h-12 animate-pulse bg-muted/50" />
                      </TableRow>
                    ))
                  ) : couriers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-24 text-center">
                        {t("couriers.list.empty")}
                      </TableCell>
                    </TableRow>
                  ) : (
                    couriers.map((courier) => (
                      <TableRow key={courier.courierId}>
                        <TableCell className="font-medium">
                          {courier.fullName}
                        </TableCell>
                        <TableCell>{courier.email}</TableCell>
                        <TableCell>{courier.contactPhone || "-"}</TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {courier.regions.length > 0 ? (
                              courier.regions.map((r) => (
                                <Badge key={r.id} variant="secondary" className="text-[10px] px-1.5 py-0">
                                  {r.name}
                                </Badge>
                              ))
                            ) : (
                              <span className="text-xs text-muted-foreground italic">
                                {t("couriers.list.noRegions")}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {courier.isActive ? (
                            <Badge variant="success" className="gap-1">
                              <UserCheck className="size-3" />
                              {t("common.active")}
                            </Badge>
                          ) : (
                            <Badge variant="destructive" className="gap-1">
                              <UserX className="size-3" />
                              {t("common.inactive")}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreVertical className="size-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleEdit(courier)}>
                                <Edit className="mr-2 size-4" />
                                {t("common.edit")}
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className={courier.isActive ? "text-destructive" : "text-success"}
                                onClick={() => {
                                  if (courier.isActive) {
                                    if (confirm(t("couriers.actions.confirmDeactivate"))) {
                                      deactivateMut.mutate(courier.userId)
                                    }
                                  } else {
                                    // Status toggle can be implemented as an update call too
                                    showToast("Please use Edit to reactivate", "info")
                                  }
                                }}
                              >
                                {courier.isActive ? (
                                  <>
                                    <UserX className="mr-2 size-4" />
                                    {t("common.deactivate")}
                                  </>
                                ) : (
                                  <>
                                    <UserCheck className="mr-2 size-4" />
                                    {t("common.activate")}
                                  </>
                                )}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            {totalPages > 1 && (
              <div className="mt-4 flex items-center justify-end space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  {t("common.previous")}
                </Button>
                <div className="text-xs font-medium">
                  {t("common.pageOf", { current: page, total: totalPages })}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                >
                  {t("common.next")}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <CourierFormDialog
        open={formOpen}
        mode={formMode}
        initial={selectedCourier}
        token={token!}
        onOpenChange={setFormOpen}
        onSuccess={() => queryClient.invalidateQueries({ queryKey: ["couriers-admin-list"] })}
      />
    </Layout>
  )
}
