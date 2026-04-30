import { useTranslation } from "react-i18next"
import { Link } from "react-router-dom"

import { Layout } from "@/components/layout/Layout"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

/**
 * Global courier manifest list was backed by `/api/courier-manifests` (deprecated).
 * Delivery manifests are created per warehouse hub under `/warehouses/:id/manifests`.
 */
export function AllCourierManifestsPage() {
  const { t } = useTranslation()

  return (
    <Layout title={t("manifestsGlobal.pageTitle")}>
      <Card className="max-w-lg">
        <CardHeader>
          <CardTitle>Delivery manifests moved</CardTitle>
          <CardDescription>
            Create and dispatch delivery manifests from each warehouse hub. The legacy global
            manifest API is no longer available.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button type="button" asChild>
            <Link to="/warehouses">{t("warehouse.detail.backToWarehouses")}</Link>
          </Button>
        </CardContent>
      </Card>
    </Layout>
  )
}
