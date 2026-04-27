export interface LabelFile {
  v: number;
  profile: string;
  chunk: string;
  strings: Record<string, string>;
}

export interface FetchLabelsOptions {
  /** Public key (i18n_pk_...) */
  key: string;
  /** Profile string e.g. "en:prod" */
  profile: string;
  /** Chunk name, default "index" */
  chunk?: string;
  /** CDN base URL, default "https://cdn.i18n.shipeasy.ai" */
  cdnBaseUrl?: string;
  /** Fetch timeout ms, default 2000 */
  timeoutMs?: number;
}
