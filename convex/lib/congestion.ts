/**
 * Pure functions for congestion calculations.
 * 
 * @module
 */

/**
 * Calculates the expected even distribution of students across topics.
 * 
 * @category Calculations
 * @since 0.1.0
 */
export const calculateExpectedEven = (
  totalStudents: number,
  totalTopics: number
): number => {
  if (totalTopics === 0) return 0
  return totalStudents / totalTopics
}

/**
 * Calculates the congestion ratio for a topic.
 * 
 * @category Calculations
 * @since 0.1.0
 */
export const calculateCongestionRatio = (
  studentCount: number,
  expectedEven: number
): number => {
  if (expectedEven === 0) return 0
  return studentCount / expectedEven
}

/**
 * Determines the likelihood category based on congestion ratio.
 * 
 * @category Calculations
 * @since 0.1.0
 */
export const calculateLikelihoodCategory = (
  ratio: number
): "low" | "moderate" | "high" | "very-high" => {
  if (ratio < 0.5) return "low"
  if (ratio < 1.0) return "moderate"
  if (ratio < 1.5) return "high"
  return "very-high"
}

/**
 * Calculates full congestion data for a topic.
 * 
 * @category Calculations
 * @since 0.1.0
 */
export const calculateCongestionData = (params: {
  readonly studentCount: number
  readonly totalStudents: number
  readonly totalTopics: number
}): {
  readonly studentCount: number
  readonly congestionRatio: number
  readonly likelihoodCategory: "low" | "moderate" | "high" | "very-high"
} => {
  const expectedEven = calculateExpectedEven(params.totalStudents, params.totalTopics)
  const congestionRatio = calculateCongestionRatio(params.studentCount, expectedEven)
  const likelihoodCategory = calculateLikelihoodCategory(congestionRatio)

  return {
    studentCount: params.studentCount,
    congestionRatio,
    likelihoodCategory
  } as const
}