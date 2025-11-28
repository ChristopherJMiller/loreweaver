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
