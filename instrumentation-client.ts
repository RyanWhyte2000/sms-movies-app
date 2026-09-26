import { logger } from "@/lib/logger";
import { captureClick } from "@/lib/click-tracking";

try {
  window.addEventListener("click", captureClick, { capture: true });

  window.addEventListener("error", (event) => {
    logger.error("browser.uncaught_error", {
      errorName: event.error instanceof Error ? event.error.name : "Error",
      message: event.message || "An uncaught browser error occurred.",
    });
  });

  window.addEventListener("unhandledrejection", (event) => {
    const reason = event.reason;
    logger.error("browser.unhandled_rejection", {
      errorName: reason instanceof Error ? reason.name : typeof reason,
      message: reason instanceof Error ? reason.message : "An unhandled promise rejection occurred.",
    });
  });
} catch {
  // Instrumentation must never prevent the application from hydrating.
}
