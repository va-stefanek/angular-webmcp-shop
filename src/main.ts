import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';
import { initWebMcpRuntime } from './app/core/webmcp-runtime';

initWebMcpRuntime();

bootstrapApplication(App, appConfig)
  .catch((err) => console.error(err));
