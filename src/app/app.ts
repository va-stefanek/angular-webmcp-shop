import { Component, inject } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';
import { AgentConsole } from './shared/agent-console/agent-console';
import { CartService } from './services/cart.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, AgentConsole],
  templateUrl: './app.html',
})
export class App {
  protected readonly cartService = inject(CartService);
}
