import html2canvas from "html2canvas"
import { jsPDF } from "jspdf"

import type { DeliveryManifestDetail } from "@/api/delivery-manifests-api"

function escapeHtml(input: string): string {
  return input
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;")
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "-"
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleString()
}

function manifestHtml(manifest: DeliveryManifestDetail): string {
  const courier = manifest.courier.fullName?.trim() || manifest.courier.id
  const zone =
    manifest.deliveryZone.name?.trim() || manifest.deliveryZone.id || manifest.targetZoneLabel

  const rows = manifest.shipments
    .map((s, idx) => {
      return `<tr>
        <td>${idx + 1}</td>
        <td>${escapeHtml(s.trackingNumber ?? s.id)}</td>
        <td>${escapeHtml(String(s.paymentMethod ?? "-"))}</td>
        <td>${escapeHtml(String(s.shipmentValue ?? "-"))}</td>
        <td>${escapeHtml(String(s.shippingFee ?? "-"))}</td>
        <td>${escapeHtml(String(s.status ?? "-"))}</td>
      </tr>`
    })
    .join("")

  return `<!doctype html>
  <html>
    <head>
      <meta charset="utf-8" />
      <title>Delivery Manifest ${escapeHtml(manifest.id)}</title>
      <style>
        * { box-sizing: border-box; }
        body { margin: 0; font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif; color: #111827; }
        .page { width: 794px; padding: 24px; }
        .header { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; }
        .h1 { font-size: 18px; font-weight: 700; margin: 0; }
        .meta { margin-top: 8px; font-size: 12px; color: #374151; line-height: 1.45; }
        .pill { display: inline-block; padding: 2px 8px; border-radius: 999px; background: #EEF2FF; color: #3730A3; font-size: 12px; font-weight: 600; }
        table { width: 100%; border-collapse: collapse; margin-top: 16px; font-size: 12px; }
        th, td { border: 1px solid #E5E7EB; padding: 8px; text-align: left; vertical-align: top; }
        th { background: #F9FAFB; font-weight: 600; }
        .summary { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 16px; margin-top: 12px; font-size: 12px; color: #111827; }
        .kv { display: flex; gap: 8px; }
        .k { min-width: 120px; color: #6B7280; }
        .footer { margin-top: 16px; font-size: 11px; color: #6B7280; display: flex; justify-content: space-between; }
      </style>
    </head>
    <body>
      <div class="page">
        <div class="header">
          <div>
            <p class="h1">Delivery Manifest</p>
            <div class="meta">Manifest ID: ${escapeHtml(manifest.id)}</div>
          </div>
          <div class="pill">${escapeHtml(manifest.status)}</div>
        </div>

        <div class="summary">
          <div class="kv"><div class="k">Courier</div><div>${escapeHtml(courier)}</div></div>
          <div class="kv"><div class="k">Warehouse</div><div>${escapeHtml(manifest.warehouse.name)}</div></div>
          <div class="kv"><div class="k">Zone</div><div>${escapeHtml(zone)}</div></div>
          <div class="kv"><div class="k">Manifest date</div><div>${escapeHtml(formatDate(manifest.manifestDate))}</div></div>
          <div class="kv"><div class="k">Shipments</div><div>${manifest.shipmentCount}</div></div>
          <div class="kv"><div class="k">Total COD</div><div>${escapeHtml(manifest.totalCod)} EGP</div></div>
          <div class="kv"><div class="k">Locked at</div><div>${escapeHtml(formatDate(manifest.lockedAt))}</div></div>
          <div class="kv"><div class="k">Dispatched at</div><div>${escapeHtml(formatDate(manifest.dispatchedAt))}</div></div>
        </div>

        <table>
          <thead>
            <tr>
              <th style="width: 40px;">#</th>
              <th>Tracking</th>
              <th style="width: 110px;">Payment</th>
              <th style="width: 90px;">Value</th>
              <th style="width: 90px;">Fee</th>
              <th style="width: 120px;">Status</th>
            </tr>
          </thead>
          <tbody>
            ${rows || `<tr><td colspan="6">No shipments</td></tr>`}
          </tbody>
        </table>

        <div class="footer">
          <div>Generated: ${escapeHtml(new Date().toLocaleString())}</div>
          <div>Orbex</div>
        </div>
      </div>
    </body>
  </html>`
}

export async function openDeliveryManifestPdf(
  manifest: DeliveryManifestDetail,
): Promise<void> {
  const wrapper = document.createElement("div")
  wrapper.style.position = "fixed"
  wrapper.style.left = "-10000px"
  wrapper.style.top = "0"
  wrapper.style.width = "794px"
  wrapper.style.background = "white"
  wrapper.innerHTML = manifestHtml(manifest)
  document.body.appendChild(wrapper)

  try {
    const page = wrapper.querySelector(".page") as HTMLElement | null
    if (!page) throw new Error("Print template failed to render")

    const canvas = await html2canvas(page, {
      backgroundColor: "#ffffff",
      scale: Math.max(2, window.devicePixelRatio || 1),
      useCORS: true,
    })
    const imgData = canvas.toDataURL("image/png")

    const pdf = new jsPDF({ orientation: "p", unit: "pt", format: "a4" })
    const pageWidth = pdf.internal.pageSize.getWidth()
    const pageHeight = pdf.internal.pageSize.getHeight()

    const imgWidth = pageWidth
    const imgHeight = (canvas.height * imgWidth) / canvas.width

    let heightLeft = imgHeight
    let position = 0

    pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight)
    heightLeft -= pageHeight

    while (heightLeft > 0) {
      position -= pageHeight
      pdf.addPage()
      pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight)
      heightLeft -= pageHeight
    }

    const blob = pdf.output("blob")
    const url = URL.createObjectURL(blob)
    window.open(url, "_blank", "noopener,noreferrer")
    window.setTimeout(() => URL.revokeObjectURL(url), 30_000)
  } finally {
    wrapper.remove()
  }
}

