import { JsonPipe } from '@angular/common';
import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import type { ChromeModelContext, RegisteredTool } from '@mcp-b/webmcp-types';

/**
 * A human-operable stand-in for an AI agent. Real agents call `getTools()` / `registerTool()`
 * exactly like this, either natively (Chrome/Edge behind the WebMCP flag or origin trial) or
 * through a browser extension that bridges the page to an MCP client. This panel exists purely
 * so you can see, in this demo, that the tools registered across the app (bootstrap-level,
 * service-level, route-level, and Signal Forms) are real and callable — without needing either
 * of those.
 *
 * `executeTool` itself is a non-standard convenience the polyfill added for exactly this kind of
 * in-page testing; it isn't part of the WebMCP spec, which assumes the *browser*, not the page,
 * drives execution. That's why it's typed via `ChromeModelContext` and feature-detected.
 */
@Component({
  selector: 'app-agent-console',
  imports: [JsonPipe],
  templateUrl: './agent-console.html',
})
export class AgentConsole {
  private readonly modelContext = getModelContext();
  private rawTools = new Map<string, RegisteredTool>();

  readonly supported = !!this.modelContext;
  readonly canExecute = !!this.modelContext?.executeTool;

  readonly open = signal(false);
  readonly tools = signal<RegisteredTool[]>([]);
  readonly selectedToolName = signal<string | null>(null);
  readonly argsJson = signal('{}');
  readonly output = signal<string | null>(null);
  readonly outputIsError = signal(false);
  readonly running = signal(false);

  readonly selectedTool = computed(() => this.tools().find((t) => t.name === this.selectedToolName()));
  readonly selectedSchema = computed(() => parseInputSchema(this.selectedTool()?.inputSchema));

  constructor() {
    void this.refresh();
    // Not every runtime that exposes `modelContext` fully implements EventTarget on it yet
    // (seen with Chrome's early native implementation, inspected via the Application > WebMCP
    // devtools panel) — feature-detect rather than assume `addEventListener` exists.
    if (typeof this.modelContext?.addEventListener === 'function') {
      const handler = () => void this.refresh();
      this.modelContext.addEventListener('toolchange', handler);
      inject(DestroyRef).onDestroy(() => this.modelContext?.removeEventListener?.('toolchange', handler));
    }
  }

  toggle(): void {
    this.open.update((value) => !value);
  }

  select(name: string): void {
    this.selectedToolName.set(name);
    this.output.set(null);
    this.argsJson.set(sampleArgsFor(parseInputSchema(this.tools().find((t) => t.name === name)?.inputSchema)));
  }

  async run(): Promise<void> {
    const tool = this.selectedTool();
    const rawTool = tool ? this.rawTools.get(tool.name) : undefined;
    if (!this.modelContext?.executeTool || !rawTool) return;

    this.running.set(true);
    this.output.set(null);
    try {
      const resultJson = await this.modelContext.executeTool(rawTool, this.argsJson() || '{}');
      const parsed = resultJson ? JSON.parse(resultJson) : null;
      this.outputIsError.set(!!parsed?.isError);
      this.output.set(JSON.stringify(parsed, null, 2));
    } catch (error) {
      this.outputIsError.set(true);
      this.output.set(error instanceof Error ? error.message : String(error));
    } finally {
      this.running.set(false);
    }
  }

  private async refresh(): Promise<void> {
    if (!this.modelContext) return;
    const tools = await this.modelContext.getTools();
    this.rawTools = new Map(tools.map((tool) => [tool.name, tool]));
    this.tools.set(tools);

    const selected = this.selectedToolName();
    if (selected && !this.rawTools.has(selected)) {
      this.selectedToolName.set(null);
    }
  }
}

function getModelContext(): ChromeModelContext | undefined {
  if (typeof document === 'undefined') return undefined;
  return (document.modelContext ?? navigator.modelContext) as ChromeModelContext | undefined;
}

/**
 * `RegisteredTool.inputSchema` is typed as `InputSchema | string` because different WebMCP
 * runtimes disagree on the wire format today: this polyfill version still JSON-stringifies it
 * (matching Chrome's pre-webmcp#241 behavior), while newer/native implementations return a
 * parsed object directly. Always branch on `typeof` rather than assuming either shape.
 */
function parseInputSchema(inputSchema: unknown): Record<string, unknown> | undefined {
  if (typeof inputSchema === 'string') {
    try {
      return JSON.parse(inputSchema);
    } catch {
      return undefined;
    }
  }
  return inputSchema && typeof inputSchema === 'object' ? (inputSchema as Record<string, unknown>) : undefined;
}

function sampleArgsFor(inputSchema: Record<string, unknown> | undefined): string {
  if (!inputSchema || inputSchema['type'] !== 'object') {
    return '{}';
  }
  const properties = (inputSchema['properties'] as Record<string, { type?: string }>) ?? {};
  const sample: Record<string, unknown> = {};
  for (const [key, prop] of Object.entries(properties)) {
    if (prop?.type === 'string') sample[key] = '';
    else if (prop?.type === 'number') sample[key] = 0;
    else if (prop?.type === 'boolean') sample[key] = false;
  }
  return JSON.stringify(sample, null, 2);
}
