// Statistics primitives for experiment analysis.
// See experiment-platform/06-analysis.md and stats-decisions.md.

export interface GroupSample {
  n: number;
  mean: number;
  variance: number; // sample variance (n-1 denominator)
}

export function winsorize(values: number[], pct: number): number[] {
  if (!values.length) return values;
  if (pct <= 0 || pct >= 100) return values.slice();
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.min(sorted.length - 1, Math.floor((sorted.length * pct) / 100) - 1);
  const cap = sorted[Math.max(0, idx)];
  return values.map((v) => (v > cap ? cap : v));
}

export function meanVariance(values: number[]): { mean: number; variance: number } {
  const n = values.length;
  if (n === 0) return { mean: 0, variance: 0 };
  let sum = 0;
  for (const v of values) sum += v;
  const mean = sum / n;
  if (n === 1) return { mean, variance: 0 };
  let sq = 0;
  for (const v of values) {
    const d = v - mean;
    sq += d * d;
  }
  return { mean, variance: sq / (n - 1) };
}

// CUPED — covariance-adjusted metric using a pre-period baseline.
export function cupedAdjust(values: Array<{ y: number; x: number }>): {
  adjusted: number[];
  theta: number;
} {
  if (!values.length) return { adjusted: [], theta: 0 };
  const meanX = values.reduce((a, b) => a + b.x, 0) / values.length;
  const meanY = values.reduce((a, b) => a + b.y, 0) / values.length;
  let covXY = 0;
  let varX = 0;
  for (const v of values) {
    const dx = v.x - meanX;
    covXY += dx * (v.y - meanY);
    varX += dx * dx;
  }
  const theta = varX === 0 ? 0 : covXY / varX;
  const adjusted = values.map((v) => v.y - theta * (v.x - meanX));
  return { adjusted, theta };
}

// Welch's t-test (unequal variances). Returns two-sided p-value approximation.
export function welchTTest(
  control: GroupSample,
  treatment: GroupSample,
): { t: number; df: number; pValue: number } {
  const seA2 = control.n > 0 ? control.variance / control.n : 0;
  const seB2 = treatment.n > 0 ? treatment.variance / treatment.n : 0;
  const se = Math.sqrt(seA2 + seB2);
  const diff = treatment.mean - control.mean;
  const t = se === 0 ? 0 : diff / se;

  const numerator = Math.pow(seA2 + seB2, 2);
  const denomA = control.n > 1 ? Math.pow(seA2, 2) / (control.n - 1) : 0;
  const denomB = treatment.n > 1 ? Math.pow(seB2, 2) / (treatment.n - 1) : 0;
  const df = denomA + denomB === 0 ? 1 : numerator / (denomA + denomB);

  const pValue = 2 * (1 - studentTCdf(Math.abs(t), df));
  return { t, df, pValue };
}

// 95% CI around (treatment − control) using normal approximation at large df.
export function confidenceInterval(
  control: GroupSample,
  treatment: GroupSample,
  confidence: 0.95 | 0.99 = 0.95,
): { low: number; high: number } {
  const seA2 = control.n > 0 ? control.variance / control.n : 0;
  const seB2 = treatment.n > 0 ? treatment.variance / treatment.n : 0;
  const se = Math.sqrt(seA2 + seB2);
  const z = confidence === 0.99 ? 2.576 : 1.96;
  const diff = treatment.mean - control.mean;
  return { low: diff - z * se, high: diff + z * se };
}

// mSPRT log-likelihood ratio for sequential monitoring. Positive λ favors H1.
// Returns { lambda, significant } where significant uses alpha=0.05 boundary.
export function msprt(
  control: GroupSample,
  treatment: GroupSample,
  tau2 = 1,
  alpha = 0.05,
): { lambda: number; significant: 0 | 1 } {
  if (control.n === 0 || treatment.n === 0) return { lambda: 0, significant: 0 };
  const se2 = control.variance / control.n + treatment.variance / treatment.n;
  const delta = treatment.mean - control.mean;
  if (se2 === 0) return { lambda: 0, significant: 0 };

  const logBF =
    0.5 * Math.log(se2 / (se2 + tau2)) + 0.5 * ((delta * delta) / (se2 + tau2)) * (tau2 / se2);
  const threshold = Math.log(1 / alpha);
  return { lambda: logBF, significant: logBF > threshold ? 1 : 0 };
}

// Chi-square goodness-of-fit for SRM detection.
// observed[i] / expected[i] are group sample counts; returns two-sided p-value.
export function srmPValue(observed: number[], expected: number[]): number {
  if (observed.length !== expected.length || observed.length < 2) return 1;
  let chi2 = 0;
  for (let i = 0; i < observed.length; i++) {
    if (expected[i] <= 0) continue;
    const diff = observed[i] - expected[i];
    chi2 += (diff * diff) / expected[i];
  }
  return 1 - chiSquareCdf(chi2, observed.length - 1);
}

// ── Numerical approximations (no SciPy available on Workers) ─────────────────

// Student-t CDF via regularized incomplete beta. Good to ~1e-4 accuracy.
function studentTCdf(t: number, df: number): number {
  const x = df / (df + t * t);
  const a = df / 2;
  const b = 0.5;
  const ibeta = incompleteBeta(x, a, b);
  const p = 0.5 * ibeta;
  return t >= 0 ? 1 - p : p;
}

function chiSquareCdf(x: number, k: number): number {
  if (x <= 0) return 0;
  return lowerIncompleteGamma(k / 2, x / 2) / gammaFn(k / 2);
}

// Lanczos approximation for Γ(z).
function gammaFn(z: number): number {
  const g = 7;
  const coeff = [
    0.99999999999980993, 676.5203681218851, -1259.1392167224028, 771.32342877765313,
    -176.61502916214059, 12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6,
    1.5056327351493116e-7,
  ];
  if (z < 0.5) return Math.PI / (Math.sin(Math.PI * z) * gammaFn(1 - z));
  z -= 1;
  let x = coeff[0];
  for (let i = 1; i < g + 2; i++) x += coeff[i] / (z + i);
  const t = z + g + 0.5;
  return Math.sqrt(2 * Math.PI) * Math.pow(t, z + 0.5) * Math.exp(-t) * x;
}

// Lower incomplete gamma via series for x < s+1, continued fraction otherwise.
function lowerIncompleteGamma(s: number, x: number): number {
  if (x < 0 || s <= 0) return 0;
  if (x < s + 1) {
    let term = 1 / s;
    let sum = term;
    for (let i = 1; i < 200; i++) {
      term *= x / (s + i);
      sum += term;
      if (Math.abs(term) < Math.abs(sum) * 1e-12) break;
    }
    return Math.pow(x, s) * Math.exp(-x) * sum;
  }
  // upper via CF → convert to lower
  return gammaFn(s) - upperIncompleteGamma(s, x);
}

function upperIncompleteGamma(s: number, x: number): number {
  let b = x + 1 - s;
  let c = 1 / 1e-30;
  let d = 1 / b;
  let h = d;
  for (let i = 1; i < 200; i++) {
    const an = -i * (i - s);
    b += 2;
    d = an * d + b;
    if (Math.abs(d) < 1e-30) d = 1e-30;
    c = b + an / c;
    if (Math.abs(c) < 1e-30) c = 1e-30;
    d = 1 / d;
    const delta = d * c;
    h *= delta;
    if (Math.abs(delta - 1) < 1e-12) break;
  }
  return Math.pow(x, s) * Math.exp(-x) * h;
}

// Regularized incomplete beta I_x(a,b) via continued fraction.
function incompleteBeta(x: number, a: number, b: number): number {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  const bt = Math.exp(
    logGamma(a + b) - logGamma(a) - logGamma(b) + a * Math.log(x) + b * Math.log(1 - x),
  );
  if (x < (a + 1) / (a + b + 2)) {
    return (bt * betaCF(x, a, b)) / a;
  }
  return 1 - (bt * betaCF(1 - x, b, a)) / b;
}

function logGamma(z: number): number {
  return Math.log(Math.abs(gammaFn(z)));
}

function betaCF(x: number, a: number, b: number): number {
  const MAXIT = 200;
  const EPS = 3e-12;
  const FPMIN = 1e-30;
  const qab = a + b;
  const qap = a + 1;
  const qam = a - 1;
  let c = 1;
  let d = 1 - (qab * x) / qap;
  if (Math.abs(d) < FPMIN) d = FPMIN;
  d = 1 / d;
  let h = d;
  for (let m = 1; m <= MAXIT; m++) {
    const m2 = 2 * m;
    let aa = (m * (b - m) * x) / ((qam + m2) * (a + m2));
    d = 1 + aa * d;
    if (Math.abs(d) < FPMIN) d = FPMIN;
    c = 1 + aa / c;
    if (Math.abs(c) < FPMIN) c = FPMIN;
    d = 1 / d;
    h *= d * c;
    aa = (-(a + m) * (qab + m) * x) / ((a + m2) * (qap + m2));
    d = 1 + aa * d;
    if (Math.abs(d) < FPMIN) d = FPMIN;
    c = 1 + aa / c;
    if (Math.abs(c) < FPMIN) c = FPMIN;
    d = 1 / d;
    const del = d * c;
    h *= del;
    if (Math.abs(del - 1) < EPS) break;
  }
  return h;
}
