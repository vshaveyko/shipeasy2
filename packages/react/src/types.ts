/** Bridge written to window.__shipeasy — mirrors @shipeasy/devtools ShipeasySdkBridge. */
export interface ShipeasySdkBridge {
  getFlag(name: string): boolean;
  getExperiment(name: string): { inExperiment: boolean; group: string } | undefined;
  getConfig(name: string): unknown;
}
