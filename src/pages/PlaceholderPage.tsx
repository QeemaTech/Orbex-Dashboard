import { useTranslation } from "react-i18next"

import { Layout } from "@/components/layout/Layout"

export interface PlaceholderPageProps {
  titleKey: string
}

export function PlaceholderPage({ titleKey }: PlaceholderPageProps) {
  const { t } = useTranslation()

  return (
    <Layout title={t(titleKey)}>
      <p className="text-muted-foreground text-sm">
        {t("placeholder.comingSoon")}
      </p>
    </Layout>
  )
}
