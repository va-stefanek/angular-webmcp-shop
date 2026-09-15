import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideExperimentalWebMcpForms } from '@angular/forms/signals';
import { provideRouter, withComponentInputBinding, withExperimentalAutoCleanupInjectors } from '@angular/router';
import { routes } from './app.routes';
import { CATALOG_TOOL_PROVIDERS } from './core/catalog.tools';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    // withExperimentalAutoCleanupInjectors() is required for route-level provideExperimentalWebMcpTools()
    // (used on the product detail route) to actually unregister its tool on navigation away.
    provideRouter(routes, withComponentInputBinding(), withExperimentalAutoCleanupInjectors()),
    // Lets any `form(...)` created with an `experimentalWebMcpTool` option (see the checkout page)
    // register itself as a WebMCP tool. Must be provided once, app-wide.
    provideExperimentalWebMcpForms(),
    // App-level tools: available on every route for the lifetime of the app.
    ...CATALOG_TOOL_PROVIDERS,
  ],
};
