import { describe, it, expect } from "vitest"
import { shuffleArray } from "./utils"

describe("shuffleArray", () => {
  it("should return an array with the same length", () => {
    const input = [1, 2, 3, 4, 5]
    const result = shuffleArray(input)
    expect(result).toHaveLength(input.length)
  })

  it("should contain all the same elements", () => {
    const input = [1, 2, 3, 4, 5]
    const result = shuffleArray(input)
    expect([...result].sort()).toEqual(input.sort())
  })

  it("should handle empty arrays", () => {
    const input: number[] = []
    const result = shuffleArray(input)
    expect(result).toHaveLength(0)
    expect(result).toEqual([])
  })

  it("should handle single element arrays", () => {
    const input = [42]
    const result = shuffleArray(input)
    expect(result).toHaveLength(1)
    expect(result).toEqual([42])
  })

  it("should handle arrays with objects", () => {
    const input = [{ id: 1 }, { id: 2 }, { id: 3 }]
    const result = shuffleArray(input)
    expect(result).toHaveLength(3)
    expect(result).toContainEqual({ id: 1 })
    expect(result).toContainEqual({ id: 2 })
    expect(result).toContainEqual({ id: 3 })
  })

  it("should not mutate the original array", () => {
    const input = [1, 2, 3, 4, 5]
    const inputCopy = [...input]
    shuffleArray(input)
    expect(input).toEqual(inputCopy)
  })

  it("should handle large arrays without undefined values", () => {
    const size = 100
    const input = Array.from({ length: size }, (_, i) => i)
    const result = shuffleArray(input)

    // Check no undefined values
    expect(result).not.toContain(undefined)
    expect(result.every(x => x !== undefined)).toBe(true)

    // Check all values are present
    expect(result).toHaveLength(size)
    expect([...result].sort((a, b) => a - b)).toEqual(input)
  })

  it("should actually shuffle (probabilistic test)", () => {
    const input = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
    let samePositionCount = 0
    const iterations = 100

    for (let i = 0; i < iterations; i++) {
      const result = shuffleArray(input)
      const samePositions = input.filter((val, idx) => val === result[idx]).length
      if (samePositions === input.length) {
        samePositionCount++
      }
    }

    // It's extremely unlikely that the array remains unshuffled more than 5% of the time
    expect(samePositionCount).toBeLessThan(iterations * 0.05)
  })

  it("should handle arrays with undefined values properly", () => {
    // This tests what happens if someone passes undefined values
    const input = [1, undefined, 3, undefined, 5]
    const result = shuffleArray(input)

    expect(result).toHaveLength(5)
    expect(result.filter(x => x === undefined)).toHaveLength(2)
    expect(result.filter(x => x !== undefined)).toHaveLength(3)
  })
})