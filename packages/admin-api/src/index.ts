export { ApiError, createHttpTransport } from "./transport.js";
export type { Transport, HttpMethod, AuthSnapshot, HttpTransportOptions } from "./transport.js";

export {
  createAdminClient,
  gatesClient,
  gatesResource,
  experimentsClient,
  experimentsResource,
  configsClient,
  configsResource,
  universesClient,
  universesResource,
  RESOURCE_REGISTRY,
} from "./resources/index.js";
export type { AdminClient } from "./resources/index.js";

export type { Gate, GatesClient, GateCreateInput, GateUpdateInput } from "./resources/gates.js";
export type {
  Experiment,
  ExperimentResult,
  ExperimentTimeseriesPoint,
  ExperimentStatus,
  ExperimentsClient,
  ExperimentCreateInput,
  ExperimentUpdateInput,
} from "./resources/experiments.js";
export type {
  Config,
  ConfigsClient,
  ConfigActivityEntry,
  ConfigCreateInput,
  ConfigUpdateInput,
  ConfigDraftUpsertInput,
  ConfigPublishInput,
} from "./resources/configs.js";
export type {
  Universe,
  UniversesClient,
  UniverseCreateInput,
  UniverseUpdateInput,
} from "./resources/universes.js";
