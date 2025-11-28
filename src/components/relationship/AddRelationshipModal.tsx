import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useRelationshipStore, useSearchStore } from "@/stores";
import type { EntityType, Relationship, SearchResult } from "@/types";

// Common relationship types
const RELATIONSHIP_TYPES = [
  { value: "ally", label: "Ally" },
  { value: "enemy", label: "Enemy" },
  { value: "rival", label: "Rival" },
  { value: "friend", label: "Friend" },
  { value: "family", label: "Family" },
  { value: "employer", label: "Employer" },
  { value: "employee", label: "Employee" },
  { value: "mentor", label: "Mentor" },
  { value: "student", label: "Student" },
  { value: "member", label: "Member" },
  { value: "leader", label: "Leader" },
  { value: "patron", label: "Patron" },
  { value: "supplier", label: "Supplier" },
  { value: "customer", label: "Customer" },
  { value: "located_in", label: "Located In" },
  { value: "owns", label: "Owns" },
  { value: "guards", label: "Guards" },
  { value: "controls", label: "Controls" },
  { value: "worships", label: "Worships" },
  { value: "custom", label: "Custom..." },
];

// Entity types that can be relationship targets
const TARGET_ENTITY_TYPES: { value: EntityType; label: string }[] = [
  { value: "character", label: "Character" },
  { value: "location", label: "Location" },
  { value: "organization", label: "Organization" },
  { value: "quest", label: "Quest" },
  { value: "secret", label: "Secret" },
];

interface AddRelationshipModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campaignId: string;
  sourceType: EntityType;
  sourceId: string;
  sourceName: string;
  editingRelationship?: Relationship | null;
}

export function AddRelationshipModal({
  open,
  onOpenChange,
  campaignId,
  sourceType,
  sourceId,
  sourceName,
  editingRelationship,
}: AddRelationshipModalProps) {
  const { create, update } = useRelationshipStore();
  const { results, search, clearResults } = useSearchStore();

  const [isSaving, setIsSaving] = useState(false);
  const [targetOpen, setTargetOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Form state
  const [targetType, setTargetType] = useState<EntityType>("character");
  const [targetId, setTargetId] = useState("");
  const [targetName, setTargetName] = useState("");
  const [relationshipType, setRelationshipType] = useState("ally");
  const [customType, setCustomType] = useState("");
  const [description, setDescription] = useState("");
  const [strength, setStrength] = useState<number>(50);
  const [isBidirectional, setIsBidirectional] = useState(true);

  const isEditing = !!editingRelationship;

  // Reset form when modal opens/closes
  useEffect(() => {
    if (open) {
      if (editingRelationship) {
        // Populate form with existing relationship data
        setTargetType(editingRelationship.target_type as EntityType);
        setTargetId(editingRelationship.target_id);
        setTargetName(""); // Would need to fetch name
        setDescription(editingRelationship.description || "");
        setStrength(editingRelationship.strength || 50);
        setIsBidirectional(editingRelationship.is_bidirectional);

        // Check if relationship type is a preset or custom
        const preset = RELATIONSHIP_TYPES.find(
          (t) => t.value === editingRelationship.relationship_type
        );
        if (preset && preset.value !== "custom") {
          setRelationshipType(editingRelationship.relationship_type);
          setCustomType("");
        } else {
          setRelationshipType("custom");
          setCustomType(editingRelationship.relationship_type);
        }
      } else {
        // Reset to defaults
        setTargetType("character");
        setTargetId("");
        setTargetName("");
        setRelationshipType("ally");
        setCustomType("");
        setDescription("");
        setStrength(50);
        setIsBidirectional(true);
      }
      clearResults();
      setSearchQuery("");
    }
  }, [open, editingRelationship, clearResults]);

  // Search when query changes
  useEffect(() => {
    if (searchQuery.length >= 2) {
      search({
        campaign_id: campaignId,
        query: searchQuery,
        entity_types: [targetType],
        limit: 10,
      });
    } else {
      clearResults();
    }
  }, [searchQuery, campaignId, targetType, search, clearResults]);

  const handleSubmit = async () => {
    if (!targetId) return;

    setIsSaving(true);
    try {
      const finalType =
        relationshipType === "custom" ? customType : relationshipType;

      if (isEditing && editingRelationship) {
        await update(editingRelationship.id, {
          relationship_type: finalType,
          description: description || undefined,
          strength,
          is_bidirectional: isBidirectional,
        });
      } else {
        await create({
          campaign_id: campaignId,
          source_type: sourceType,
          source_id: sourceId,
          target_type: targetType,
          target_id: targetId,
          relationship_type: finalType,
          description: description || undefined,
          strength,
          is_bidirectional: isBidirectional,
        });
      }
      onOpenChange(false);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSelectTarget = (result: SearchResult) => {
    setTargetId(result.entity_id);
    setTargetName(result.name);
    setTargetOpen(false);
    setSearchQuery("");
    clearResults();
  };

  const canSubmit = targetId && (relationshipType !== "custom" || customType);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Edit Relationship" : "Add Relationship"}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Update the relationship details."
              : `Create a connection from ${sourceName} to another entity.`}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {/* Target Entity Type - disabled when editing */}
          {!isEditing && (
            <div className="grid gap-2">
              <Label>Target Type</Label>
              <Select
                value={targetType}
                onValueChange={(v) => {
                  setTargetType(v as EntityType);
                  setTargetId("");
                  setTargetName("");
                  clearResults();
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TARGET_ENTITY_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Target Entity Search - disabled when editing */}
          {!isEditing && (
            <div className="grid gap-2">
              <Label>Target Entity</Label>
              <Popover open={targetOpen} onOpenChange={setTargetOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={targetOpen}
                    className="justify-between"
                  >
                    {targetName || "Search for an entity..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[400px] p-0">
                  <Command shouldFilter={false}>
                    <CommandInput
                      placeholder={`Search ${targetType}s...`}
                      value={searchQuery}
                      onValueChange={setSearchQuery}
                    />
                    <CommandList>
                      <CommandEmpty>
                        {searchQuery.length < 2
                          ? "Type at least 2 characters to search"
                          : "No results found."}
                      </CommandEmpty>
                      <CommandGroup>
                        {results.map((result) => (
                          <CommandItem
                            key={result.entity_id}
                            value={result.entity_id}
                            onSelect={() => handleSelectTarget(result)}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                targetId === result.entity_id
                                  ? "opacity-100"
                                  : "opacity-0"
                              )}
                            />
                            <div className="flex flex-col">
                              <span>{result.name}</span>
                              {result.snippet && (
                                <span className="text-xs text-muted-foreground">
                                  {result.snippet}
                                </span>
                              )}
                            </div>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
          )}

          {/* Relationship Type */}
          <div className="grid gap-2">
            <Label>Relationship Type</Label>
            <Select value={relationshipType} onValueChange={setRelationshipType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {RELATIONSHIP_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Custom Type Input */}
          {relationshipType === "custom" && (
            <div className="grid gap-2">
              <Label>Custom Type</Label>
              <Input
                value={customType}
                onChange={(e) => setCustomType(e.target.value)}
                placeholder="Enter custom relationship type..."
              />
            </div>
          )}

          {/* Description */}
          <div className="grid gap-2">
            <Label>Description (optional)</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe this relationship..."
              rows={2}
            />
          </div>

          {/* Strength */}
          <div className="grid gap-2">
            <div className="flex items-center justify-between">
              <Label>Strength</Label>
              <span className="text-sm text-muted-foreground">{strength}%</span>
            </div>
            <Slider
              value={[strength]}
              onValueChange={([v]) => setStrength(v)}
              min={0}
              max={100}
              step={5}
            />
          </div>

          {/* Bidirectional Toggle */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Bidirectional</Label>
              <p className="text-sm text-muted-foreground">
                Relationship applies in both directions
              </p>
            </div>
            <Switch
              checked={isBidirectional}
              onCheckedChange={setIsBidirectional}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!canSubmit || isSaving}>
            {isSaving ? "Saving..." : isEditing ? "Update" : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
