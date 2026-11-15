/**
 * NASA Space Apps 2026 - Trend Detective
 * AI-assisted generation for pure ES module zero-dependency OLS analysis.
 */

export function analyzeTrend(dataArray, startYear = 2003) {
  const n = dataArray.length;
  if (n < 3) throw new Error("At least 3 data points required for OLS analysis.");

  // Map to x (years) and y (values)
  const x = Array.from({ length: n }, (_, i) => startYear + i);
  const y = dataArray;

  // Means
  const meanX = x.reduce((a, b) => a + b, 0) / n;
  const meanY = y.reduce((a, b) => a + b, 0) / n;

  // Covariance and Variance for Slope/Intercept
  let ssCov = 0;
  let ssXx = 0;
  let ssYy = 0; // Total Sum of Squares (SST)

  for (let i = 0; i < n; i++) {
    const dx = x[i] - meanX;
    const dy = y[i] - meanY;
    ssCov += dx * dy;
    ssXx += dx * dx;
    ssYy += dy * dy;
  }

  const slope = ssCov / ssXx;
  const intercept = meanY - slope * meanX;
  const slopePerDecade = slope * 10;

  // Fitted values and Residual Sum of Squares (SSR)
  const trendLine = [];
  let ssRes = 0;

  for (let i = 0; i < n; i++) {
    const yFit = slope * x[i] + intercept;
    trendLine.push(yFit);
    ssRes += Math.pow(y[i] - yFit, 2);
  }

  // R-squared
  const rSquared = 1 - (ssRes / ssYy);

  // Degrees of Freedom and Standard Error
  const df = n - 2;
  const residualVariance = ssRes / df;
  const stdError = Math.sqrt(residualVariance / ssXx);

  // T-Statistic
  const tStat = slope / stdError;

  // Simple approximation for two-tailed p-value (Normal approximation for t-dist)
  // Accurate enough for significance thresholding at df >= 21
  const normalCDF = (z) => {
    const t = 1 / (1 + 0.2316419 * Math.abs(z));
    const d = 0.3989423 * Math.exp(-z * z / 2);
    let p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
    return z > 0 ? 1 - p : p;
  };
  const pValue = 2 * (1 - normalCDF(Math.abs(tStat)));

  // 95% Confidence Interval
  // Approximate critical t-value for 95% CI (two-tailed, based on df)
  const tCrit = 1.96 + (2.36 / df); // Rough adjustment for small sample sizes
  const ci95Low = slope - (tCrit * stdError);
  const ci95High = slope + (tCrit * stdError);

  const isSignificant = pValue < 0.05;
  const badgeText = isSignificant 
    ? "Statistically Significant Trend (p < 0.05)" 
    : "Not Statistically Significant (p ≥ 0.05)";

  return {
    slope,
    slopePerDecade,
    intercept,
    trendLine,
    rSquared,
    stdError,
    tStat,
    df,
    pValue,
    ci95Low,
    ci95High,
    isSignificant,
    badgeText
  };
}