// Location type constants matching DESIGN_DOC.md Section 4.2.2
export const LOCATION_TYPES = [
  { value: "world", label: "World" },
  { value: "continent", label: "Continent" },
  { value: "region", label: "Region" },
  { value: "territory", label: "Territory" },
  { value: "settlement", label: "Settlement" },
  { value: "district", label: "District" },
  { value: "building", label: "Building" },
  { value: "room", label: "Room" },
  { value: "landmark", label: "Landmark" },
  { value: "wilderness", label: "Wilderness" },
] as const;

export type LocationTypeValue = (typeof LOCATION_TYPES)[number]["value"];

export function getLocationTypeLabel(type: string): string {
  return LOCATION_TYPES.find((t) => t.value === type)?.label || type;
}

export function getLocationTypeIndex(type: string): number {
  const index = LOCATION_TYPES.findIndex((t) => t.value === type);
  return index === -1 ? 999 : index;
}

/**
 * Returns the valid parent location types for a given child type.
 * Based on hierarchy: world > continent > region > territory > settlement > district > building > room
 * Special cases: landmark (can be child of most), wilderness (larger areas only)
 */
export function getValidParentTypes(childType: string): string[] {
  const childIndex = getLocationTypeIndex(childType);

  // Special cases
  if (childType === "landmark") {
    // Landmarks can be anywhere except in rooms or other landmarks
    return LOCATION_TYPES.filter(t => t.value !== "room" && t.value !== "landmark")
      .map(t => t.value);
  }
  if (childType === "wilderness") {
    // Wilderness is typically in larger areas
    return ["world", "continent", "region", "territory"];
  }

  // Normal hierarchy: parent must be larger (lower index)
  return LOCATION_TYPES.slice(0, childIndex).map(t => t.value);
}

// Organization type constants
export const ORG_TYPES = [
  { value: "government", label: "Government" },
  { value: "guild", label: "Guild" },
  { value: "religion", label: "Religion" },
  { value: "military", label: "Military" },
  { value: "criminal", label: "Criminal" },
  { value: "mercantile", label: "Mercantile" },
  { value: "academic", label: "Academic" },
  { value: "secret_society", label: "Secret Society" },
  { value: "family", label: "Family" },
  { value: "other", label: "Other" },
] as const;

export type OrgTypeValue = (typeof ORG_TYPES)[number]["value"];

export function getOrgTypeLabel(type: string): string {
  return ORG_TYPES.find((t) => t.value === type)?.label || type;
}

// Quest status constants
export const QUEST_STATUS = [
  { value: "planned", label: "Planned" },
  { value: "available", label: "Available" },
  { value: "active", label: "Active" },
  { value: "completed", label: "Completed" },
  { value: "failed", label: "Failed" },
  { value: "abandoned", label: "Abandoned" },
] as const;

export type QuestStatusValue = (typeof QUEST_STATUS)[number]["value"];

export function getQuestStatusLabel(status: string): string {
  return QUEST_STATUS.find((s) => s.value === status)?.label || status;
}

// Quest plot type constants
export const PLOT_TYPES = [
  { value: "main", label: "Main Quest" },
  { value: "secondary", label: "Secondary" },
  { value: "side", label: "Side Quest" },
  { value: "background", label: "Background" },
] as const;

export type PlotTypeValue = (typeof PLOT_TYPES)[number]["value"];

export function getPlotTypeLabel(plotType: string): string {
  return PLOT_TYPES.find((p) => p.value === plotType)?.label || plotType;
}

// Timeline event significance constants (matches DESIGN_DOC.md Section 4.2.10)
export const SIGNIFICANCE_LEVELS = [
  { value: "world", label: "World" },
  { value: "regional", label: "Regional" },
  { value: "local", label: "Local" },
  { value: "personal", label: "Personal" },
] as const;

export type SignificanceValue = (typeof SIGNIFICANCE_LEVELS)[number]["value"];

export function getSignificanceLabel(significance: string): string {
  return SIGNIFICANCE_LEVELS.find((s) => s.value === significance)?.label || significance;
}
