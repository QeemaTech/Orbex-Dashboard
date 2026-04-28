const QEEMA_SITE = 'https://www.qeematech.net/';

export function DashboardFooter() {
  return (
    <footer
      className="sticky bottom-0 z-40 shrink-0 border-t border-gray-200/80 bg-white/80 backdrop-blur-sm text-gray-500 dark:border-gray-700/80 dark:bg-gray-800/80 dark:text-gray-400 transition-colors"
      role="contentinfo"
    >
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-2 px-4 py-3 sm:flex-row sm:px-6 lg:px-8">
        {/* Left: Copyright */}
        <p className="order-2 text-center text-xs font-medium tracking-wide text-gray-500 sm:order-1 sm:text-left dark:text-gray-400">
          Copyright © {new Date().getFullYear()} · All Rights Reserved
        </p>

        {/* Center: Brand pill */}
        <a
          href={QEEMA_SITE}
          target="_blank"
          rel="noopener noreferrer"
          className="order-1 flex items-center gap-2 rounded-full border border-gray-200 bg-gray-50/80 px-4 py-2 shadow-sm transition-all hover:border-orange-200 hover:bg-orange-50/50 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 dark:border-gray-600 dark:bg-gray-700/50 dark:hover:border-orange-900/50 dark:hover:bg-orange-950/20 dark:focus:ring-offset-gray-800 sm:order-2"
          aria-label="Qeema Tech - قيمة تك"
        >
          <img
            src="/qeema letters.svg"
            alt=""
            className="h-7 w-auto object-contain dark:opacity-90"
          />
          <span className="text-sm font-semibold tracking-tight text-gray-700 dark:text-gray-200">
            Qeema Tech
          </span>
        </a>

        {/* Right: Tagline */}
        <p className="order-3 hidden text-right text-xs font-medium tracking-wide text-gray-500 sm:block dark:text-gray-400">
          Powered by <span className="text-gray-700 dark:text-gray-300">قيمة تك</span>
        </p>
      </div>
    </footer>
  );
}
