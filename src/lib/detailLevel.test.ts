import { describe, it, expect } from "vitest";
import {
  calculateDetailLevel,
  getDetailLevelBreakdown,
  getDetailLevelColor,
  getDetailLevelBgColor,
  getDetailLevelLabel,
} from "./detailLevel";
import type { Location, Relationship } from "@/types";

const createMockLocation = (overrides: Partial<Location> = {}): Location => ({
  id: "loc-123",
  campaign_id: "camp-123",
  name: "Test Location",
  location_type: "city",
  description: "",
  gm_notes: null,
  parent_id: null,
  detail_level: 0,
  created_at: "2024-01-01T00:00:00Z",
  updated_at: "2024-01-01T00:00:00Z",
  ...overrides,
});

const createMockRelationship = (
  sourceId: string,
  targetId: string
): Relationship => ({
  id: `rel-${sourceId}-${targetId}`,
  campaign_id: "camp-123",
  source_type: "location",
  source_id: sourceId,
  target_type: "location",
  target_id: targetId,
  relationship_type: "connected_to",
  description: null,
  strength: 50,
  is_bidirectional: false,
  is_public: true,
  created_at: "2024-01-01T00:00:00Z",
  updated_at: "2024-01-01T00:00:00Z",
});

describe("detailLevel utilities", () => {
  describe("calculateDetailLevel", () => {
    it("returns 0 for empty location", () => {
      const location = createMockLocation();
      const level = calculateDetailLevel({ location });
      expect(level).toBe(0);
    });

    it("adds 10 points for description > 100 chars", () => {
      const location = createMockLocation({
        description: "A".repeat(101),
      });
      const level = calculateDetailLevel({ location });
      expect(level).toBe(10);
    });

    it("adds 30 points total for description > 500 chars (10 + 20)", () => {
      const location = createMockLocation({
        description: "A".repeat(501),
      });
      const level = calculateDetailLevel({ location });
      expect(level).toBe(30);
    });

    it("adds 10 points for GM notes", () => {
      const location = createMockLocation({
        gm_notes: "Secret notes",
      });
      const level = calculateDetailLevel({ location });
      expect(level).toBe(10);
    });

    it("adds 5 points per relationship (max 20)", () => {
      const location = createMockLocation({ id: "loc-1" });
      const relationships = [
        createMockRelationship("loc-1", "loc-2"),
        createMockRelationship("loc-1", "loc-3"),
      ];
      const level = calculateDetailLevel({ location, relationships });
      expect(level).toBe(10); // 2 * 5
    });

    it("caps relationship points at 20", () => {
      const location = createMockLocation({ id: "loc-1" });
      const relationships = Array.from({ length: 10 }, (_, i) =>
        createMockRelationship("loc-1", `loc-${i + 2}`)
      );
      const level = calculateDetailLevel({ location, relationships });
      expect(level).toBe(20); // capped at 20
    });

    it("adds 5 points per child location (max 15)", () => {
      const location = createMockLocation();
      const level = calculateDetailLevel({ location, childCount: 2 });
      expect(level).toBe(10); // 2 * 5
    });

    it("caps children points at 15", () => {
      const location = createMockLocation();
      const level = calculateDetailLevel({ location, childCount: 10 });
      expect(level).toBe(15); // capped at 15
    });

    it("adds 5 points per session mention (max 15)", () => {
      const location = createMockLocation();
      const level = calculateDetailLevel({ location, sessionMentions: 2 });
      expect(level).toBe(10); // 2 * 5
    });

    it("caps session mentions at 15", () => {
      const location = createMockLocation();
      const level = calculateDetailLevel({ location, sessionMentions: 10 });
      expect(level).toBe(15); // capped at 15
    });

    it("caps total detail level at 100", () => {
      const location = createMockLocation({
        description: "A".repeat(501),
        gm_notes: "Notes",
        id: "loc-1",
      });
      const relationships = Array.from({ length: 10 }, (_, i) =>
        createMockRelationship("loc-1", `loc-${i + 2}`)
      );
      const level = calculateDetailLevel({
        location,
        relationships,
        childCount: 10,
        sessionMentions: 10,
      });
      // 30 (desc) + 10 (gm) + 20 (rel) + 15 (child) + 15 (session) = 90
      expect(level).toBe(90);
      expect(level).toBeLessThanOrEqual(100);
    });

    it("counts only relationships where location is source or target", () => {
      const location = createMockLocation({ id: "loc-1" });
      const relationships = [
        createMockRelationship("loc-1", "loc-2"), // counts
        createMockRelationship("loc-2", "loc-1"), // counts
        createMockRelationship("loc-3", "loc-4"), // doesn't count
      ];
      const level = calculateDetailLevel({ location, relationships });
      expect(level).toBe(10); // 2 * 5
    });
  });

  describe("getDetailLevelBreakdown", () => {
    it("provides detailed scoring breakdown", () => {
      const location = createMockLocation({
        description: "A".repeat(501),
        gm_notes: "Notes",
        id: "loc-1",
      });
      const relationships = [createMockRelationship("loc-1", "loc-2")];

      const breakdown = getDetailLevelBreakdown({
        location,
        relationships,
        childCount: 2,
        sessionMentions: 1,
      });

      expect(breakdown).toEqual({
        descriptionShort: 10,
        descriptionLong: 20,
        gmNotes: 10,
        relationships: 5,
        children: 10,
        sessionMentions: 5,
        total: 60,
      });
    });

    it("handles all zeros", () => {
      const location = createMockLocation();
      const breakdown = getDetailLevelBreakdown({ location });

      expect(breakdown).toEqual({
        descriptionShort: 0,
        descriptionLong: 0,
        gmNotes: 0,
        relationships: 0,
        children: 0,
        sessionMentions: 0,
        total: 0,
      });
    });
  });

  describe("ProseMirror content handling", () => {
    it("calculates length from ProseMirror JSON format", () => {
      const proseMirrorContent = JSON.stringify({
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [{ type: "text", text: "A".repeat(101) }],
          },
        ],
      });

      const location = createMockLocation({
        description: proseMirrorContent,
      });
      const level = calculateDetailLevel({ location });
      expect(level).toBe(10); // > 100 chars
    });

    it("handles nested ProseMirror content", () => {
      const proseMirrorContent = JSON.stringify({
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [{ type: "text", text: "A".repeat(300) }],
          },
          {
            type: "paragraph",
            content: [{ type: "text", text: "B".repeat(300) }],
          },
        ],
      });

      const location = createMockLocation({
        description: proseMirrorContent,
      });
      const level = calculateDetailLevel({ location });
      expect(level).toBe(30); // > 500 chars total
    });

    it("falls back to plain text if not valid JSON", () => {
      const location = createMockLocation({
        description: "Plain text " + "A".repeat(100),
      });
      const level = calculateDetailLevel({ location });
      expect(level).toBe(10); // > 100 chars
    });
  });

  describe("getDetailLevelColor", () => {
    it("returns red for level < 25", () => {
      expect(getDetailLevelColor(0)).toBe("text-red-500");
      expect(getDetailLevelColor(24)).toBe("text-red-500");
    });

    it("returns yellow for level 25-49", () => {
      expect(getDetailLevelColor(25)).toBe("text-yellow-500");
      expect(getDetailLevelColor(49)).toBe("text-yellow-500");
    });

    it("returns green for level >= 50", () => {
      expect(getDetailLevelColor(50)).toBe("text-green-500");
      expect(getDetailLevelColor(100)).toBe("text-green-500");
    });
  });

  describe("getDetailLevelBgColor", () => {
    it("returns red background for level < 25", () => {
      expect(getDetailLevelBgColor(0)).toBe("bg-red-500");
      expect(getDetailLevelBgColor(24)).toBe("bg-red-500");
    });

    it("returns yellow background for level 25-49", () => {
      expect(getDetailLevelBgColor(25)).toBe("bg-yellow-500");
      expect(getDetailLevelBgColor(49)).toBe("bg-yellow-500");
    });

    it("returns green background for level >= 50", () => {
      expect(getDetailLevelBgColor(50)).toBe("bg-green-500");
      expect(getDetailLevelBgColor(100)).toBe("bg-green-500");
    });
  });

  describe("getDetailLevelLabel", () => {
    it("returns Sparse for level < 25", () => {
      expect(getDetailLevelLabel(0)).toBe("Sparse");
      expect(getDetailLevelLabel(24)).toBe("Sparse");
    });

    it("returns Developing for level 25-49", () => {
      expect(getDetailLevelLabel(25)).toBe("Developing");
      expect(getDetailLevelLabel(49)).toBe("Developing");
    });

    it("returns Detailed for level 50-74", () => {
      expect(getDetailLevelLabel(50)).toBe("Detailed");
      expect(getDetailLevelLabel(74)).toBe("Detailed");
    });

    it("returns Comprehensive for level >= 75", () => {
      expect(getDetailLevelLabel(75)).toBe("Comprehensive");
      expect(getDetailLevelLabel(100)).toBe("Comprehensive");
    });
  });
});
