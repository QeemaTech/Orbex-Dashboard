interface ShipmentLabelData {
  trackingNumber: string;
  merchantName: string;
  customerName: string;
  phone: string;
  address: string;
  governorate: string;
  notes: string;
  codAmount: number | null;
  itemsCount: number;
  createdAt: string;
  warehouseName: string;
  sbpl?: string;
}

declare global {
  interface Window {
    __orbexPrinterService?: PrinterService;
  }
}

type QzConnectionState = "notInstalled" | "disconnected" | "connecting" | "connected";

export type QzConnectionStatus =
  | { state: "connected"; details?: { host?: string; port?: number; socket?: string } }
  | { state: "connecting" }
  | { state: "disconnected"; reason?: string }
  | { state: "notInstalled"; reason?: string };

type QzApi = {
  websocket: {
    connect: (options?: unknown) => Promise<null | Error>;
    disconnect: () => Promise<null | Error>;
    isActive: () => boolean;
    getConnectionInfo: () => { socket: string; host: string; port: number };
    setErrorCallbacks: (calls: unknown) => void;
    setClosedCallbacks: (calls: unknown) => void;
  };
  printers: {
    find: (query?: string) => Promise<string[] | string>;
    details?: () => Promise<unknown>;
    startListening?: (printers: string[] | string | null, options?: unknown) => Promise<unknown>;
    stopListening?: () => Promise<unknown>;
    setPrinterCallbacks?: (calls: unknown) => void;
  };
  configs: {
    create: (printerName: string, options?: unknown) => unknown;
  };
  print: (config: unknown, data: unknown[]) => Promise<unknown>;
  security: {
    setCertificatePromise: (fn: (resolve: (cert: string) => void, reject: (err: unknown) => void) => void) => void;
    setSignatureAlgorithm: (alg: string) => void;
    setSignaturePromise: (fn: (toSign: string) => (resolve: (sig?: string) => void, reject: (err: unknown) => void) => void) => void;
  };
};

const DEFAULT_PRINTER_QUERY = "SATO WS408";
const SATO_VENDOR_HINTS = ["SATO", "WS408", "WS 408"];
const CERT_PATH_CANDIDATES = ["/qz/digital-certificate.txt", "/digital-certificate.txt"];

class PrinterService {
  private state: QzConnectionState = "disconnected";
  private lastError: unknown = null;
  private printerName: string = DEFAULT_PRINTER_QUERY;
  private qzPromise: Promise<QzApi> | null = null;
  private securityConfigured = false;
  private lastConnectionInfo: { socket: string; host: string; port: number } | null = null;

  private getQz(): Promise<QzApi> {
    if (!this.qzPromise) {
      this.qzPromise = import("qz-tray").then((mod: unknown) => {
        const m = mod as { default?: unknown };
        // `qz-tray` is CJS; in ESM bundlers it often comes through `default`.
        return ((m.default ?? mod) as QzApi);
      });
    }
    return this.qzPromise;
  }

  private formatError(err: unknown): string {
    if (err instanceof Error) return err.message || String(err);
    if (typeof err === "string") return err;
    try {
      return JSON.stringify(err);
    } catch {
      return String(err);
    }
  }

  private looksLikeConnectionRefused(message: string): boolean {
    const m = message.toLowerCase();
    return (
      m.includes("connection refused") ||
      m.includes("err_connection_refused") ||
      m.includes("websocket") && m.includes("closed") ||
      m.includes("could not connect") ||
      m.includes("failed to connect") ||
      m.includes("networkerror") ||
      m.includes("net::")
    );
  }

  private async configureSecurity(qz: QzApi): Promise<void> {
    if (this.securityConfigured) return;
    this.securityConfigured = true;

    // Best-effort security setup:
    // - If a certificate is hosted by the app, load it to reduce trust prompts.
    // - If not, still allow connecting/printing (QZ Tray will show warnings/prompts).
    qz.security.setCertificatePromise((resolve, reject) => {
      (async () => {
        for (const path of CERT_PATH_CANDIDATES) {
          try {
            const resp = await fetch(path, { cache: "no-store", headers: { "Content-Type": "text/plain" } });
            if (!resp.ok) continue;
            const cert = await resp.text();
            if (cert && cert.trim().length > 0) {
              console.info("[QZ] Loaded certificate from", path);
              resolve(cert);
              return;
            }
          } catch (err) {
            console.warn("[QZ] Failed to fetch certificate from", path, err);
          }
        }
        console.warn("[QZ] No certificate found. QZ Tray may show trust prompts.");
        resolve("");
      })().catch(reject);
    });

    // NOTE: Without a real signature implementation, QZ Tray will likely show warning dialogs.
    // Printing should still work if the user allows it.
    qz.security.setSignatureAlgorithm("SHA512");
    qz.security.setSignaturePromise(() => (resolve) => resolve());
  }

  private async ensureConnected(): Promise<void> {
    const qz = await this.getQz();
    if (qz.websocket.isActive()) {
      this.state = "connected";
      return;
    }
    await this.connect();
  }

  private normalizePrinterName(name: string): string {
    return name.replace(/\s+/g, " ").trim().toLowerCase();
  }

  private pickBestPrinterMatch(printers: string[]): string | null {
    if (printers.length === 0) return null;
    const normalized = printers.map((p) => ({ p, n: this.normalizePrinterName(p) }));
    const desired = this.normalizePrinterName(this.printerName);

    // 1) Exact-ish match to the configured name
    const exact = normalized.find((x) => x.n === desired);
    if (exact) return exact.p;

    // 2) Prefer SATO WS408 variants
    const hints = SATO_VENDOR_HINTS.map((h) => this.normalizePrinterName(h));
    const best = normalized.find((x) => hints.every((h) => x.n.includes(h)));
    if (best) return best.p;

    // 3) Any SATO
    const anySato = normalized.find((x) => x.n.includes("sato"));
    if (anySato) return anySato.p;

    return printers[0] ?? null;
  }

  private decodeSbpl(raw: string): string {
    // Backend sometimes sends human-readable tokens like "<STX>" instead of raw control chars.
    // Convert the common ones to their ASCII equivalents.
    const tokens: Array<[RegExp, string]> = [
      [/&lt;/g, "<"],
      [/&gt;/g, ">"],
      [/<STX>/gi, "\x02"],
      [/<ETX>/gi, "\x03"],
      [/<ESC>/gi, "\x1b"],
      [/<CR>/gi, "\r"],
      [/<LF>/gi, "\n"],
      [/<TAB>/gi, "\t"],
      [/<NUL>/gi, "\x00"],
      [/<SOH>/gi, "\x01"],
      [/<EOT>/gi, "\x04"],
      [/<ENQ>/gi, "\x05"],
      [/<ACK>/gi, "\x06"],
      [/<BEL>/gi, "\x07"],
      [/<BS>/gi, "\b"],
      [/<VT>/gi, "\v"],
      [/<FF>/gi, "\f"],
      [/<SO>/gi, "\x0e"],
      [/<SI>/gi, "\x0f"],
      [/<DLE>/gi, "\x10"],
      [/<DC1>/gi, "\x11"],
      [/<DC2>/gi, "\x12"],
      [/<DC3>/gi, "\x13"],
      [/<DC4>/gi, "\x14"],
      [/<NAK>/gi, "\x15"],
      [/<SYN>/gi, "\x16"],
      [/<ETB>/gi, "\x17"],
      [/<CAN>/gi, "\x18"],
      [/<EM>/gi, "\x19"],
      [/<SUB>/gi, "\x1a"],
      [/<FS>/gi, "\x1c"],
      [/<GS>/gi, "\x1d"],
      [/<RS>/gi, "\x1e"],
      [/<US>/gi, "\x1f"],
    ];

    let s = raw;
    for (const [re, ch] of tokens) s = s.replace(re, ch);

    // SATO SBPL documentation-style tokens:
    // Many commands are written as `<T=...>` / `<BK>...` / `<BT>...` / `<BC>...`
    // where the angle-bracket form is shorthand for "ESC + command".
    //
    // Convert any remaining `<XX...>` into ESC + `XX...` (dropping the brackets).
    // Examples:
    //   `<T=10,10,430,...>` -> `ESC + 'T=10,10,430,...'`
    //   `<BK>`             -> `ESC + 'BK'`  (generator appends `G,50,30` immediately after)
    //
    // IMPORTANT: Keep this after explicit `<STX>/<ESC>` handling above.
    s = s.replace(/<([A-Za-z]{1,3}[^>]*)>/g, (_m, inner: string) => `\x1b${inner}`);

    // Also handle closing tags such as `</BT>` produced by our generator (`:</BT>`).
    // Treat them as "ESC + <tag>" markers rather than leaving literal `<...>` in the output.
    s = s.replace(/<\/([A-Za-z]{1,3})>/g, (_m, tag: string) => `\x1b${tag}`);

    return s;
  }

  private sbplPreview(sbpl: string): { length: number; startsWith: string; hasAngleTokens: boolean } {
    const trimmed = sbpl.trimStart();
    return {
      length: sbpl.length,
      startsWith: trimmed.slice(0, 80),
      hasAngleTokens: /<\s*(STX|ESC|ETX|CR|LF)\s*>/i.test(sbpl),
    };
  }

  private bytesPreview(
    s: string,
    maxBytes = 48,
  ): { len: number; firstCodes: number[]; firstHex: string; asciiSafe: string } {
    const codes: number[] = [];
    const hex: string[] = [];
    const ascii: string[] = [];
    const n = Math.min(maxBytes, s.length);
    for (let i = 0; i < n; i++) {
      const code = s.charCodeAt(i);
      codes.push(code);
      hex.push(code.toString(16).padStart(2, "0"));
      ascii.push(code >= 32 && code <= 126 ? String.fromCharCode(code) : ".");
    }
    return {
      len: s.length,
      firstCodes: codes,
      firstHex: hex.join(" "),
      asciiSafe: ascii.join(""),
    };
  }

  private async logQzPrinterDiagnostics(qz: QzApi, printerName: string): Promise<void> {
    try {
      const printers = await qz.printers.find();
      console.info("[QZ] Printers.find()", printers);
    } catch (err) {
      console.warn("[QZ] Printers.find() failed", err);
    }

    try {
      const detailsFn = qz.printers.details;
      if (typeof detailsFn === "function") {
        const details = await detailsFn();
        console.info("[QZ] Printers.details()", details);
      }
    } catch (err) {
      console.warn("[QZ] Printers.details() failed", err);
    }

    // Optional: live status listening for the selected printer
    try {
      if (
        typeof qz.printers.setPrinterCallbacks === "function" &&
        typeof qz.printers.startListening === "function"
      ) {
        qz.printers.setPrinterCallbacks((evt: unknown) => {
          console.info("[QZ] Printer status event", evt);
        });
        await qz.printers.startListening([printerName], { jobData: false });
        console.info("[QZ] Printer status listening started", { printerName });
      }
    } catch (err) {
      console.warn("[QZ] Unable to start printer status listening", err);
    }
  }

  async connect(): Promise<void> {
    const qz = await this.getQz();
    if (qz.websocket.isActive()) {
      this.state = "connected";
      return;
    }

    if (this.state === "connecting") return;
    this.state = "connecting";
    this.lastError = null;

    await this.configureSecurity(qz);

    // Keep error/close callbacks for better diagnosis and state updates.
    qz.websocket.setErrorCallbacks((evt: unknown) => {
      console.error("[QZ] websocket error", evt);
      this.lastError = evt;
      if (!qz.websocket.isActive()) this.state = "disconnected";
    });
    qz.websocket.setClosedCallbacks((evt: unknown) => {
      console.warn("[QZ] websocket closed", evt);
      this.lastError = evt;
      this.state = "disconnected";
    });

    try {
      console.info("[QZ] Connecting to QZ Tray...");
      await qz.websocket.connect({
        host: ["localhost", "127.0.0.1"],
        usingSecure: true,
        port: {
          secure: [8181, 8282, 8383, 8484],
          insecure: [8182, 8283, 8384, 8485],
        },
        // Allow a couple of retries to handle race conditions while Tray is starting.
        retries: 2,
        delay: 1,
        keepAlive: 60,
      });

      if (!qz.websocket.isActive()) {
        throw new Error("QZ Tray connection did not become active.");
      }

      this.state = "connected";
      this.lastConnectionInfo = qz.websocket.getConnectionInfo();
      console.info("[QZ] Connected", this.lastConnectionInfo);

      // Auto-detect best printer on connect (non-fatal if it fails).
      try {
        const printers = await qz.printers.find();
        const list = Array.isArray(printers) ? printers : [];
        const picked = this.pickBestPrinterMatch(list);
        if (picked) {
          this.printerName = picked;
          console.info("[QZ] Selected printer:", picked);
        } else {
          console.warn("[QZ] No printers detected by QZ Tray");
        }
      } catch (err) {
        console.warn("[QZ] Printer discovery failed after connect", err);
      }

      // Best-effort diagnostics to aid print debugging.
      void this.logQzPrinterDiagnostics(qz, this.printerName);
    } catch (err) {
      this.lastError = err;
      const msg = this.formatError(err);
      this.state = this.looksLikeConnectionRefused(msg) ? "notInstalled" : "disconnected";
      console.error("[QZ] Failed to connect", err);

      if (this.state === "notInstalled") {
        throw new Error(
          "QZ Tray is not running or not reachable on this machine. Please install and start QZ Tray, then try again.",
        );
      }
      throw new Error(`QZ Tray is installed but disconnected. Connection failed: ${msg}`);
    }
  }

  async disconnect(): Promise<void> {
    const qz = await this.getQz();
    if (!qz.websocket.isActive()) {
      this.state = "disconnected";
      return;
    }
    try {
      await qz.websocket.disconnect();
    } finally {
      this.state = "disconnected";
    }
  }

  async getPrinters(): Promise<string[]> {
    const qz = await this.getQz();
    await this.ensureConnected();
    const printers = await qz.printers.find();
    return Array.isArray(printers) ? printers : [];
  }

  async findPrinter(name: string): Promise<string> {
    const qz = await this.getQz();
    await this.ensureConnected();
    const found = await qz.printers.find(name);
    if (typeof found === "string" && found.trim().length > 0) return found;
    if (Array.isArray(found) && found.length > 0) return found[0]!;
    throw new Error(`Printer not found: ${name}`);
  }

  async printShipmentLabel(labelData: ShipmentLabelData): Promise<void> {
    const sbpl = labelData.sbpl;
    if (!sbpl) {
      throw new Error("SBPL data not provided");
    }
    const qz = await this.getQz();
    await this.ensureConnected();

    console.debug("[QZ] SBPL preview (raw)", this.sbplPreview(sbpl));

    // Ensure a real printer name is selected (helps when the OS name differs slightly).
    try {
      const printers = await qz.printers.find();
      const list = Array.isArray(printers) ? printers : [];
      const picked = this.pickBestPrinterMatch(list);
      if (picked) this.printerName = picked;
    } catch (err) {
      console.warn("[QZ] Unable to refresh printer list before print", err);
    }

    const config = qz.configs.create(this.printerName, {
      // Raw printing options can be tuned here if needed (encoding, jobName, etc.)
      // If the Windows driver doesn't support raw mode, bypass it.
      // (QZ Tray 2.2+; prior versions used `altPrinting`.)
      forceRaw: true,
    });

    const decoded = this.decodeSbpl(sbpl);
    if (decoded !== sbpl) {
      console.info("[QZ] Decoded SBPL control tokens (e.g. <STX>, <ESC>)");
    }
    console.debug("[QZ] SBPL preview (decoded)", this.sbplPreview(decoded));
    console.debug("[QZ] SBPL bytes (decoded)", this.bytesPreview(decoded));
    if (/[<][^>]+[>]/.test(decoded)) {
      console.warn("[QZ] SBPL still contains <...> tokens after decoding; printer may ignore the job");
    }

    console.info("[QZ] Printing SBPL to", this.printerName, {
      trackingNumber: labelData.trackingNumber,
    });
    await qz.print(config, [
      {
        type: "raw",
        format: "command",
        flavor: "plain",
        data: [decoded],
      },
    ]);
  }

  /**
   * Diagnostics: plain text print to verify basic spooling/output.
   * If this prints but SBPL does not, the issue is SBPL/printer language mode.
   */
  async printTestText(text = "ORBEX TEST\n\n\n"): Promise<void> {
    const qz = await this.getQz();
    await this.ensureConnected();

    // Ensure a stable printer selection
    const printers = await this.getPrinters();
    const picked = this.pickBestPrinterMatch(printers);
    if (picked) this.printerName = picked;

    const config = qz.configs.create(this.printerName, { forceRaw: true });
    console.info("[QZ] Test print (text) to", this.printerName, { preview: text.slice(0, 60) });
    console.debug("[QZ] Test bytes (text)", this.bytesPreview(text));

    await qz.print(config, [
      {
        type: "raw",
        format: "command",
        flavor: "plain",
        data: [text],
      },
    ]);
  }

  /**
   * Diagnostics: minimal SBPL sample (known-good style from QZ docs).
   * If this doesn't print, the issue is driver/raw passthrough or printer mode (not SBPL).
   */
  async printTestSbplMinimal(): Promise<void> {
    const qz = await this.getQz();
    await this.ensureConnected();

    const printers = await this.getPrinters();
    const picked = this.pickBestPrinterMatch(printers);
    if (picked) this.printerName = picked;

    const config = qz.configs.create(this.printerName, { forceRaw: true });

    // Minimal SBPL example based on QZ Tray raw wiki (SBPL section).
    const sbpl = [
      "\x1bAA1V0250H0340",
      "\x1bH0020V0015P02RDB@0,026,025,ORBEX_SBPL_TEST",
      "\x1bQ1",
      "\x1bZ",
    ].join("");

    console.info("[QZ] Test print (SBPL minimal) to", this.printerName);
    console.debug("[QZ] Test bytes (SBPL)", this.bytesPreview(sbpl));

    await qz.print(config, [
      {
        type: "raw",
        format: "command",
        flavor: "plain",
        data: [sbpl],
      },
    ]);
  }

  async printMultipleShipmentLabels(
    labels: ShipmentLabelData[],
    onProgress?: (current: number, total: number) => void,
  ): Promise<{ success: number; failed: number }> {
    let success = 0;
    let failed = 0;

    for (let i = 0; i < labels.length; i++) {
      try {
        await this.printShipmentLabel(labels[i]);
        success++;
      } catch {
        failed++;
      }
      if (onProgress) {
        onProgress(i + 1, labels.length);
      }
    }

    return { success, failed };
  }

  setPrinter(name: string): void {
    this.printerName = name;
  }

  isConnected(): boolean {
    return this.state === "connected";
  }

  getConnectionStatus(): QzConnectionStatus {
    if (this.state === "connected") {
      return { state: "connected", details: this.lastConnectionInfo ?? undefined };
    }
    if (this.state === "connecting") return { state: "connecting" };
    if (this.state === "notInstalled") {
      return { state: "notInstalled", reason: this.lastError ? this.formatError(this.lastError) : undefined };
    }
    return { state: "disconnected", reason: this.lastError ? this.formatError(this.lastError) : undefined };
  }
}

export const printerService = new PrinterService();

// Dev-only: allow calling diagnostics from browser console without UI changes.
// Usage (DevTools): `window.__orbexPrinterService?.printTestText()` or `.printTestSbplMinimal()`
if (import.meta.env.DEV) {
  window.__orbexPrinterService = printerService;
}