import { describe, it, expect } from "vitest";
import {
  generateShareableSlug,
  isShareableSlug,
  parseShareableSlug,
} from "./slugGenerator";

describe("slugGenerator", () => {
  describe("generateShareableSlug", () => {
    it("should return a valid UUID v4 format", () => {
      const slug = generateShareableSlug();
      // UUID v4 format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
      // where y is one of [8, 9, a, b]
      const uuidV4Regex =
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      expect(slug).toMatch(uuidV4Regex);
    });

    it("should generate unique values on each call", () => {
      const slugs = new Set<string>();
      const iterations = 100;

      for (let i = 0; i < iterations; i++) {
        slugs.add(generateShareableSlug());
      }

      // All generated slugs should be unique
      expect(slugs.size).toBe(iterations);
    });

    it("should pass the isShareableSlug validation", () => {
      const slug = generateShareableSlug();
      expect(isShareableSlug(slug)).toBe(true);
    });

    it("should generate slugs with correct length", () => {
      const slug = generateShareableSlug();
      // UUID v4 is 36 characters: 32 hex digits + 4 hyphens
      expect(slug).toHaveLength(36);
    });
  });

  describe("isShareableSlug", () => {
    it("should return true for valid UUID v4", () => {
      expect(isShareableSlug("a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d")).toBe(true);
      expect(isShareableSlug("550e8400-e29b-41d4-a716-446655440000")).toBe(true);
      expect(isShareableSlug("6ba7b810-9dad-41d4-80b4-00c04fd430c8")).toBe(true);
    });

    it("should return false for invalid formats", () => {
      // Missing hyphen
      expect(isShareableSlug("a1b2c3d4e5f6-4a7b-8c9d-0e1f2a3b4c5d")).toBe(false);
      // Wrong version (not 4)
      expect(isShareableSlug("a1b2c3d4-e5f6-3a7b-8c9d-0e1f2a3b4c5d")).toBe(false);
      // Wrong variant (not 8, 9, a, or b)
      expect(isShareableSlug("a1b2c3d4-e5f6-4a7b-0c9d-0e1f2a3b4c5d")).toBe(false);
      // Too short
      expect(isShareableSlug("a1b2c3d4-e5f6-4a7b-8c9d")).toBe(false);
      // Too long
      expect(isShareableSlug("a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d-extra")).toBe(
        false
      );
      // Invalid characters
      expect(isShareableSlug("g1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d")).toBe(false);
      // Random string
      expect(isShareableSlug("not-a-uuid-at-all")).toBe(false);
      expect(isShareableSlug("hello-world")).toBe(false);
    });

    it("should return false for empty strings", () => {
      expect(isShareableSlug("")).toBe(false);
    });

    it("should be case-insensitive", () => {
      // Lowercase
      expect(isShareableSlug("a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d")).toBe(true);
      // Uppercase
      expect(isShareableSlug("A1B2C3D4-E5F6-4A7B-8C9D-0E1F2A3B4C5D")).toBe(true);
      // Mixed case
      expect(isShareableSlug("A1b2C3d4-E5f6-4A7b-8C9d-0E1f2A3b4C5d")).toBe(true);
    });

    it("should return false for whitespace strings", () => {
      expect(isShareableSlug("   ")).toBe(false);
      expect(isShareableSlug("\t\n")).toBe(false);
    });

    it("should return false for strings with leading/trailing whitespace", () => {
      expect(isShareableSlug(" a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d")).toBe(
        false
      );
      expect(isShareableSlug("a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d ")).toBe(
        false
      );
    });
  });

  describe("parseShareableSlug", () => {
    it("should return ShareableSlug for valid input", () => {
      const validUuid = "a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d";
      const result = parseShareableSlug(validUuid);

      expect(result).not.toBeNull();
      expect(result).toBe(validUuid);
      // The returned value should pass isShareableSlug validation
      expect(isShareableSlug(result!)).toBe(true);
    });

    it("should return null for invalid input", () => {
      expect(parseShareableSlug("not-a-valid-uuid")).toBeNull();
      expect(parseShareableSlug("12345")).toBeNull();
      expect(parseShareableSlug("a1b2c3d4-e5f6-3a7b-8c9d-0e1f2a3b4c5d")).toBeNull(); // v3, not v4
    });

    it("should return null for empty string", () => {
      expect(parseShareableSlug("")).toBeNull();
    });

    it("should handle uppercase valid UUIDs", () => {
      const result = parseShareableSlug("A1B2C3D4-E5F6-4A7B-8C9D-0E1F2A3B4C5D");
      expect(result).not.toBeNull();
    });

    it("should return the exact input string when valid", () => {
      const input = "550e8400-e29b-41d4-a716-446655440000";
      const result = parseShareableSlug(input);
      expect(result).toBe(input);
    });
  });
});
