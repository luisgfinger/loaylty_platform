export type FrequencyLevelType =
  | "LOW"
  | "MEDIUM"
  | "HIGH";

export type ValueLevelType =
  | "LOW"
  | "MEDIUM"
  | "HIGH";


const frequencyRank: Record<
  FrequencyLevelType,
  number
> = {
  LOW: 0,
  MEDIUM: 1,
  HIGH: 2,
};


// =====================================================
// FREQUÊNCIA
// =====================================================

export function calculateFrequencyLevel(
  purchaseDays: number
): FrequencyLevelType {
  if (purchaseDays >= 10) {
    return "HIGH";
  }

  if (purchaseDays >= 5) {
    return "MEDIUM";
  }

  return "LOW";
}


// =====================================================
// VALOR
// =====================================================

export function calculateValueLevel(
  medianPercentage: number
): ValueLevelType {
  if (medianPercentage < 75) {
    return "LOW";
  }

  if (medianPercentage <= 200) {
    return "MEDIUM";
  }

  return "HIGH";
}


// =====================================================
// PROGRESSÃO DO CICLO
// =====================================================

export function calculateCycleProgress(
  frequency: FrequencyLevelType,
  value: ValueLevelType,
  purchaseDays: number
): number {
  // Cliente não comprou no ciclo.
  if (purchaseDays === 0) {
    return 0;
  }

  // Baixo valor + baixa frequência.
  if (
    frequency === "LOW" &&
    value === "LOW"
  ) {
    return 0.5;
  }

  // Frequência alta + valor médio ou alto.
  if (
    frequency === "HIGH" &&
    value !== "LOW"
  ) {
    return 2.5;
  }

  // Frequência média + valor alto.
  if (
    frequency === "MEDIUM" &&
    value === "HIGH"
  ) {
    return 2.5;
  }

  // Demais combinações.
  return 1;
}


// =====================================================
// MEDIANA
// =====================================================

export function calculateMedian(
  values: number[]
): number | null {
  if (values.length === 0) {
    return null;
  }

  const sorted =
    [...values].sort(
      (a, b) => a - b
    );

  const middle =
    Math.floor(
      sorted.length / 2
    );

  if (
    sorted.length % 2 === 0
  ) {
    return (
      sorted[middle - 1]! +
      sorted[middle]!
    ) / 2;
  }

  return sorted[middle]!;
}


// =====================================================
// REGULARIDADE
// =====================================================

export function calculateRegularity(
  previousRegularity: number,

  previousFrequency:
    FrequencyLevelType | null,

  currentFrequency:
    FrequencyLevelType,

  lastThreeFrequencies:
    FrequencyLevelType[]
): number {
  // Primeiro ciclo.
  if (!previousFrequency) {
    return 1;
  }

  const previousRank =
    frequencyRank[
      previousFrequency
    ];

  const currentRank =
    frequencyRank[
      currentFrequency
    ];

  let regularity =
    previousRegularity;


  // Aumentou frequência.
  if (
    currentRank >
    previousRank
  ) {
    regularity += 1;
  }

  // Manteve frequência.
  else if (
    currentRank ===
    previousRank
  ) {
    regularity += 0.5;
  }

  // Caiu uma faixa.
  else if (
    currentRank ===
    previousRank - 1
  ) {
    regularity -= 0.5;
  }

  // Caiu duas faixas.
  else {
    regularity -= 1;
  }


  // Nunca abaixo de 1.
  regularity =
    Math.max(
      1,
      regularity
    );


  // ==================================================
  // TETO BASEADO NOS ÚLTIMOS 3 CICLOS
  // ==================================================

  let maximum = 3;

  if (
    lastThreeFrequencies.includes(
      "HIGH"
    )
  ) {
    maximum = 5;
  }

  else if (
    lastThreeFrequencies.includes(
      "MEDIUM"
    )
  ) {
    maximum = 4;
  }


  regularity =
    Math.min(
      regularity,
      maximum
    );


  return Number(
    regularity.toFixed(1)
  );
}