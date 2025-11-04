import { describe, it, expect } from "vitest";
import {
  calculateExpectedEven,
  calculateCongestionRatio,
  calculateLikelihoodCategory,
  calculateCongestionData,
} from "./congestion";

describe("congestion", () => {
  describe("calculateExpectedEven", () => {
    it("should calculate expected even distribution", () => {
      expect(calculateExpectedEven(100, 10)).toBe(10);
      expect(calculateExpectedEven(50, 5)).toBe(10);
      expect(calculateExpectedEven(33, 3)).toBe(11);
    });

    it("should handle zero topics", () => {
      expect(calculateExpectedEven(100, 0)).toBe(0);
    });

    it("should handle zero students", () => {
      expect(calculateExpectedEven(0, 5)).toBe(0);
    });

    it("should handle decimal results", () => {
      expect(calculateExpectedEven(100, 3)).toBeCloseTo(33.33, 2);
      expect(calculateExpectedEven(1, 2)).toBe(0.5);
    });
  });

  describe("calculateCongestionRatio", () => {
    it("should calculate congestion ratio", () => {
      expect(calculateCongestionRatio(15, 10)).toBe(1.5);
      expect(calculateCongestionRatio(5, 10)).toBe(0.5);
      expect(calculateCongestionRatio(10, 10)).toBe(1);
    });

    it("should handle zero expected even", () => {
      expect(calculateCongestionRatio(15, 0)).toBe(0);
    });

    it("should handle zero student count", () => {
      expect(calculateCongestionRatio(0, 10)).toBe(0);
    });
  });

  describe("calculateLikelihoodCategory", () => {
    it("should categorize low likelihood", () => {
      expect(calculateLikelihoodCategory(0)).toBe("low");
      expect(calculateLikelihoodCategory(0.25)).toBe("low");
      expect(calculateLikelihoodCategory(0.49)).toBe("low");
    });

    it("should categorize moderate likelihood", () => {
      expect(calculateLikelihoodCategory(0.5)).toBe("moderate");
      expect(calculateLikelihoodCategory(0.75)).toBe("moderate");
      expect(calculateLikelihoodCategory(0.99)).toBe("moderate");
    });

    it("should categorize high likelihood", () => {
      expect(calculateLikelihoodCategory(1.0)).toBe("high");
      expect(calculateLikelihoodCategory(1.25)).toBe("high");
      expect(calculateLikelihoodCategory(1.49)).toBe("high");
    });

    it("should categorize very high likelihood", () => {
      expect(calculateLikelihoodCategory(1.5)).toBe("very-high");
      expect(calculateLikelihoodCategory(2.0)).toBe("very-high");
      expect(calculateLikelihoodCategory(3.0)).toBe("very-high");
    });
  });

  describe("calculateCongestionData", () => {
    it("should calculate complete congestion data", () => {
      const result = calculateCongestionData({
        studentCount: 15,
        totalStudents: 100,
        totalTopics: 10,
      });

      expect(result).toEqual({
        studentCount: 15,
        congestionRatio: 1.5,
        likelihoodCategory: "very-high",
      });
    });

    it("should handle under-subscribed topic", () => {
      const result = calculateCongestionData({
        studentCount: 5,
        totalStudents: 100,
        totalTopics: 10,
      });

      expect(result).toEqual({
        studentCount: 5,
        congestionRatio: 0.5,
        likelihoodCategory: "moderate",
      });
    });

    it("should handle perfectly distributed topic", () => {
      const result = calculateCongestionData({
        studentCount: 10,
        totalStudents: 100,
        totalTopics: 10,
      });

      expect(result).toEqual({
        studentCount: 10,
        congestionRatio: 1,
        likelihoodCategory: "high",
      });
    });

    it("should handle zero total topics", () => {
      const result = calculateCongestionData({
        studentCount: 15,
        totalStudents: 100,
        totalTopics: 0,
      });

      expect(result).toEqual({
        studentCount: 15,
        congestionRatio: 0,
        likelihoodCategory: "low",
      });
    });

    it("should handle zero total students", () => {
      const result = calculateCongestionData({
        studentCount: 0,
        totalStudents: 0,
        totalTopics: 10,
      });

      expect(result).toEqual({
        studentCount: 0,
        congestionRatio: 0,
        likelihoodCategory: "low",
      });
    });

    it("should return readonly data", () => {
      const result = calculateCongestionData({
        studentCount: 15,
        totalStudents: 100,
        totalTopics: 10,
      });

      // TypeScript should enforce readonly, but we can check the structure
      expect(Object.keys(result)).toEqual([
        "studentCount",
        "congestionRatio",
        "likelihoodCategory",
      ]);
    });

    it("should handle edge case with very small numbers", () => {
      const result = calculateCongestionData({
        studentCount: 1,
        totalStudents: 1,
        totalTopics: 100,
      });

      expect(result).toEqual({
        studentCount: 1,
        congestionRatio: 100,
        likelihoodCategory: "very-high",
      });
    });
  });
});