import { describe, it, expect } from "vitest";
import {
  winsorize,
  meanVariance,
  cupedAdjust,
  welchTTest,
  confidenceInterval,
  msprt,
  srmPValue,
} from "../stats";

describe("winsorize", () => {
  it("returns empty array for empty input", () => {
    expect(winsorize([], 5)).toEqual([]);
  });

  it("returns a copy (not same reference) for pct=0", () => {
    const vals = [1, 2, 3];
    const result = winsorize(vals, 0);
    expect(result).toEqual(vals);
    expect(result).not.toBe(vals);
  });

  it("returns a copy for pct=100", () => {
    const vals = [1, 2, 3, 100];
    const result = winsorize(vals, 100);
    expect(result).toEqual(vals);
    expect(result).not.toBe(vals);
  });

  it("caps values above the threshold at the 80th-percentile cap", () => {
    // sorted=[1,2,3,4,100], pct=80: idx=min(4, floor(5*80/100)-1)=3, cap=sorted[3]=4
    const result = winsorize([1, 2, 3, 4, 100], 80);
    expect(result).toEqual([1, 2, 3, 4, 4]);
  });

  it("does not modify values at or below the cap", () => {
    const result = winsorize([10, 20, 30], 80);
    expect(result).toEqual([10, 20, 30]);
  });

  it("handles single-element array", () => {
    expect(winsorize([42], 50)).toEqual([42]);
  });
});

describe("meanVariance", () => {
  it("returns {mean: 0, variance: 0} for empty input", () => {
    expect(meanVariance([])).toEqual({ mean: 0, variance: 0 });
  });

  it("returns variance=0 for a single element", () => {
    expect(meanVariance([5])).toEqual({ mean: 5, variance: 0 });
  });

  it("computes mean and sample variance for [2, 4]", () => {
    const { mean, variance } = meanVariance([2, 4]);
    expect(mean).toBeCloseTo(3);
    expect(variance).toBeCloseTo(2); // ((2-3)²+(4-3)²) / (2-1) = 2
  });

  it("uses n-1 denominator (Bessel's correction)", () => {
    const { mean, variance } = meanVariance([1, 2, 3]);
    expect(mean).toBeCloseTo(2);
    expect(variance).toBeCloseTo(1); // (1+0+1)/2 = 1
  });

  it("handles negative values", () => {
    const { mean } = meanVariance([-3, -1, 1, 3]);
    expect(mean).toBeCloseTo(0);
  });
});

describe("cupedAdjust", () => {
  it("returns empty output for empty input", () => {
    expect(cupedAdjust([])).toEqual({ adjusted: [], theta: 0 });
  });

  it("computes theta=1 when y=x (perfect positive correlation)", () => {
    const values = [
      { y: 1, x: 1 },
      { y: 2, x: 2 },
      { y: 3, x: 3 },
    ];
    const { theta, adjusted } = cupedAdjust(values);
    expect(theta).toBeCloseTo(1);
    // adjusted[i] = y[i] - 1*(x[i] - meanX) = x[i] - (x[i] - 2) = 2
    expect(adjusted).toEqual([2, 2, 2]);
  });

  it("computes theta=0 when x has zero variance (all x equal)", () => {
    const values = [
      { y: 1, x: 5 },
      { y: 2, x: 5 },
      { y: 3, x: 5 },
    ];
    expect(cupedAdjust(values).theta).toBe(0);
  });

  it("returns adjusted array of same length as input", () => {
    const values = Array.from({ length: 10 }, (_, i) => ({ y: i, x: i * 2 }));
    expect(cupedAdjust(values).adjusted).toHaveLength(10);
  });
});

describe("welchTTest", () => {
  it("returns t=0 and p≈1 when group means are equal", () => {
    const group = { n: 100, mean: 0, variance: 1 };
    const { t, pValue } = welchTTest(group, group);
    expect(t).toBeCloseTo(0);
    expect(pValue).toBeCloseTo(1, 1);
  });

  it("returns a very small p-value for a large mean difference with many samples", () => {
    const ctrl = { n: 1000, mean: 0, variance: 1 };
    const trt = { n: 1000, mean: 1, variance: 1 };
    const { pValue } = welchTTest(ctrl, trt);
    expect(pValue).toBeLessThan(0.001);
  });

  it("t is positive when treatment mean > control mean", () => {
    const { t } = welchTTest({ n: 50, mean: 5, variance: 2 }, { n: 50, mean: 10, variance: 2 });
    expect(t).toBeGreaterThan(0);
  });

  it("t is negative when treatment mean < control mean", () => {
    const { t } = welchTTest({ n: 50, mean: 10, variance: 2 }, { n: 50, mean: 5, variance: 2 });
    expect(t).toBeLessThan(0);
  });

  it("returns t=0 when se=0 (both n=0)", () => {
    const { t } = welchTTest({ n: 0, mean: 5, variance: 0 }, { n: 0, mean: 5, variance: 0 });
    expect(t).toBe(0);
  });

  it("returns a df value", () => {
    const { df } = welchTTest({ n: 50, mean: 0, variance: 1 }, { n: 50, mean: 1, variance: 1 });
    expect(df).toBeGreaterThan(0);
  });
});

describe("confidenceInterval", () => {
  it("CI contains zero when group means are equal", () => {
    const group = { n: 100, mean: 5, variance: 1 };
    const { low, high } = confidenceInterval(group, group);
    expect(low).toBeLessThan(0);
    expect(high).toBeGreaterThan(0);
  });

  it("CI is entirely positive when treatment mean substantially exceeds control", () => {
    const ctrl = { n: 10000, mean: 0, variance: 1 };
    const trt = { n: 10000, mean: 1, variance: 1 };
    const { low, high } = confidenceInterval(ctrl, trt);
    expect(low).toBeGreaterThan(0);
    expect(high).toBeGreaterThan(low);
  });

  it("99% CI is wider than 95% CI", () => {
    const ctrl = { n: 100, mean: 0, variance: 1 };
    const trt = { n: 100, mean: 0.5, variance: 1 };
    const ci95 = confidenceInterval(ctrl, trt, 0.95);
    const ci99 = confidenceInterval(ctrl, trt, 0.99);
    expect(ci99.high - ci99.low).toBeGreaterThan(ci95.high - ci95.low);
  });

  it("high is always greater than low", () => {
    const ctrl = { n: 50, mean: 3, variance: 4 };
    const trt = { n: 50, mean: 7, variance: 4 };
    const { low, high } = confidenceInterval(ctrl, trt);
    expect(high).toBeGreaterThan(low);
  });
});

describe("msprt", () => {
  it("returns lambda=0 and significant=0 when control.n=0", () => {
    const { lambda, significant } = msprt(
      { n: 0, mean: 0, variance: 1 },
      { n: 100, mean: 1, variance: 1 },
    );
    expect(lambda).toBe(0);
    expect(significant).toBe(0);
  });

  it("returns lambda=0 when treatment.n=0", () => {
    const { lambda } = msprt({ n: 100, mean: 0, variance: 1 }, { n: 0, mean: 1, variance: 1 });
    expect(lambda).toBe(0);
  });

  it("returns significant=1 for an unmistakably large effect", () => {
    const ctrl = { n: 100000, mean: 0, variance: 0.001 };
    const trt = { n: 100000, mean: 10, variance: 0.001 };
    expect(msprt(ctrl, trt).significant).toBe(1);
  });

  it("returns significant=0 for equal groups (no effect)", () => {
    const group = { n: 100, mean: 0, variance: 1 };
    expect(msprt(group, group).significant).toBe(0);
  });

  it("lambda is a finite number", () => {
    const ctrl = { n: 200, mean: 0, variance: 2 };
    const trt = { n: 200, mean: 0.5, variance: 2 };
    const { lambda } = msprt(ctrl, trt);
    expect(Number.isFinite(lambda)).toBe(true);
  });
});

describe("srmPValue", () => {
  it("returns 1 when array lengths differ", () => {
    expect(srmPValue([100], [100, 100])).toBe(1);
  });

  it("returns 1 for fewer than 2 groups", () => {
    expect(srmPValue([100], [100])).toBe(1);
  });

  it("returns p close to 1 when observed matches expected", () => {
    expect(srmPValue([1000, 1000], [1000, 1000])).toBeGreaterThan(0.9);
  });

  it("returns small p-value for severe sample ratio mismatch", () => {
    // 200 vs 10, expected 105/105
    expect(srmPValue([200, 10], [105, 105])).toBeLessThan(0.05);
  });

  it("handles zero expected values without throwing", () => {
    const p = srmPValue([100, 0], [100, 0]);
    expect(typeof p).toBe("number");
  });

  it("handles more than 2 groups", () => {
    const p = srmPValue([333, 334, 333], [333, 333, 334]);
    expect(p).toBeGreaterThan(0.5);
  });
});
