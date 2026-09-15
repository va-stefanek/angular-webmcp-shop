import { initializeWebMCPPolyfill } from '@mcp-b/webmcp-polyfill';

/**
 * Angular's `provideExperimentalWebMcpTools` / `declareExperimentalWebMcpTool` only ever
 * call into `document.modelContext` (falling back to the deprecated `navigator.modelContext`) —
 * they never create that object themselves. As of today only Chrome/Edge Canary behind the
 * `chrome://flags/#enable-webmcp-testing` flag implement it natively, so without a runtime here
 * every `registerTool()` call in this app would silently no-op.
 *
 * This installs the community polyfill so the demo's tools work in any modern browser. Once
 * `document.modelContext` ships natively, `initializeWebMCPPolyfill` detects it and returns
 * immediately, so this stays safe to keep even after native support lands.
 *
 * Must run before `bootstrapApplication` — tool registration happens in constructors and
 * `provideEnvironmentInitializer` callbacks during bootstrap, so the runtime has to already exist.
 */
export function initWebMcpRuntime(): void {
  if (typeof window === 'undefined') {
    return; // SSR / prerender: no DOM, nothing to polyfill.
  }
  initializeWebMCPPolyfill();
}
