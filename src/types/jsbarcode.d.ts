declare module "jsbarcode" {
  const JsBarcode: (
    element: HTMLElement | string,
    data: string,
    options?: Record<string, unknown>,
  ) => void
  export default JsBarcode
}
