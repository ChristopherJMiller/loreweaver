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
