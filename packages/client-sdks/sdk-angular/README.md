# @shipeasy/sdk-angular

Angular integration for ShipEasy feature flags and experimentation.

## Install

```bash
pnpm add @shipeasy/sdk-angular @shipeasy/sdk
```

## Usage

```ts
// app.config.ts
import { ApplicationConfig } from "@angular/core";
import { provideFlaglab } from "@shipeasy/sdk-angular";

export const appConfig: ApplicationConfig = {
  providers: [provideFlaglab({ sdkKey: "se_pub_..." })],
};
```

```ts
// my.component.ts
import { Component, OnInit } from "@angular/core";
import { AsyncPipe } from "@angular/common";
import { FlaglabService } from "@shipeasy/sdk-angular";
import { Observable } from "rxjs";

@Component({
  selector: "app-my",
  standalone: true,
  imports: [AsyncPipe],
  template: `
    <div *ngIf="newDashboard$ | async">New dashboard</div>
    <button>{{ (hero$ | async)?.params?.buttonText }}</button>
  `,
})
export class MyComponent implements OnInit {
  newDashboard$!: Observable<boolean>;
  hero$!: Observable<{ inExperiment: boolean; group: string; params: { buttonText: string } }>;

  constructor(private flaglab: FlaglabService) {}

  async ngOnInit() {
    await this.flaglab.identify({ user_id: "u_123", plan: "pro" });
    this.newDashboard$ = this.flaglab.getFlag("new_dashboard");
    this.hero$ = this.flaglab.getExperiment("hero_cta", { buttonText: "Get started" });
  }
}
```
