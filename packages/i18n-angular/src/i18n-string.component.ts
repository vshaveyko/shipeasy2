import {
  Component,
  Input,
  OnChanges,
  SimpleChanges,
  ChangeDetectionStrategy,
  inject,
  OnDestroy,
  OnInit,
} from "@angular/core";
import { AsyncPipe } from "@angular/common";
import { Observable, Subscription } from "rxjs";
import { ShipEasyI18nService } from "./i18n.service";

@Component({
  selector: "i18n-string",
  standalone: true,
  imports: [AsyncPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span
      [attr.data-label]="key"
      [attr.data-variables]="variables ? toJson(variables) : null"
      [attr.data-label-desc]="desc"
      >{{ translated$ | async }}</span
    >
  `,
})
export class ShipEasyI18nStringComponent implements OnInit, OnChanges, OnDestroy {
  @Input({ required: true }) key!: string;
  @Input() variables?: Record<string, string | number>;
  @Input() desc?: string;

  protected translated$!: Observable<string>;

  private readonly i18n = inject(ShipEasyI18nService);
  private sub: Subscription | null = null;

  ngOnInit(): void {
    this.buildObservable();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes["key"] || changes["variables"]) {
      this.buildObservable();
    }
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }

  private buildObservable(): void {
    this.translated$ = this.i18n.translate(this.key, this.variables);
  }

  protected toJson(v: Record<string, string | number>): string {
    return JSON.stringify(v);
  }
}
