import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
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

export interface SearchableSelectProps<T> {
  value: string | null;
  onValueChange: (value: string | null) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  items: T[];
  getItemId: (item: T) => string;
  getItemLabel: (item: T) => string;
  getItemGroup?: (item: T) => string;
  groupOrder?: string[];
  allowNone?: boolean;
  noneLabel?: string;
  disabled?: boolean;
  className?: string;
}

export function SearchableSelect<T>({
  value,
  onValueChange,
  placeholder = "Select...",
  searchPlaceholder = "Search...",
  emptyText = "No results found.",
  items,
  getItemId,
  getItemLabel,
  getItemGroup,
  groupOrder,
  allowNone = false,
  noneLabel = "None",
  disabled = false,
  className,
}: SearchableSelectProps<T>) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  // Find the selected item's label
  const selectedLabel = useMemo(() => {
    if (!value) return null;
    const item = items.find((i) => getItemId(i) === value);
    return item ? getItemLabel(item) : null;
  }, [value, items, getItemId, getItemLabel]);

  // Filter items by search query
  const filteredItems = useMemo(() => {
    if (!search) return items;
    const lowerSearch = search.toLowerCase();
    return items.filter((item) =>
      getItemLabel(item).toLowerCase().includes(lowerSearch)
    );
  }, [items, search, getItemLabel]);

  // Group items if getItemGroup is provided
  const groupedItems = useMemo(() => {
    if (!getItemGroup) {
      return { ungrouped: filteredItems };
    }

    const groups: Record<string, T[]> = {};
    for (const item of filteredItems) {
      const group = getItemGroup(item);
      if (!groups[group]) {
        groups[group] = [];
      }
      groups[group].push(item);
    }

    // Sort groups by groupOrder if provided
    if (groupOrder) {
      const orderedGroups: Record<string, T[]> = {};
      for (const groupName of groupOrder) {
        if (groups[groupName]) {
          orderedGroups[groupName] = groups[groupName];
        }
      }
      // Add any remaining groups not in groupOrder
      for (const groupName of Object.keys(groups)) {
        if (!orderedGroups[groupName]) {
          orderedGroups[groupName] = groups[groupName];
        }
      }
      return orderedGroups;
    }

    return groups;
  }, [filteredItems, getItemGroup, groupOrder]);

  const handleSelect = (itemId: string | null) => {
    onValueChange(itemId);
    setOpen(false);
    setSearch("");
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn("justify-between", className)}
        >
          {value === null ? (
            allowNone ? (
              noneLabel
            ) : (
              <span className="text-muted-foreground">{placeholder}</span>
            )
          ) : (
            selectedLabel || <span className="text-muted-foreground">{placeholder}</span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder={searchPlaceholder}
            value={search}
            onValueChange={setSearch}
          />
          <CommandList>
            <CommandEmpty>{emptyText}</CommandEmpty>

            {/* None option */}
            {allowNone && (
              <CommandGroup>
                <CommandItem
                  value="__none__"
                  onSelect={() => handleSelect(null)}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === null ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {noneLabel}
                </CommandItem>
              </CommandGroup>
            )}

            {/* Grouped or ungrouped items */}
            {Object.entries(groupedItems).map(([groupName, groupItems]) => (
              <CommandGroup
                key={groupName}
                heading={groupName !== "ungrouped" ? groupName : undefined}
              >
                {groupItems.map((item) => {
                  const itemId = getItemId(item);
                  const itemLabel = getItemLabel(item);
                  return (
                    <CommandItem
                      key={itemId}
                      value={itemId}
                      onSelect={() => handleSelect(itemId)}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          value === itemId ? "opacity-100" : "opacity-0"
                        )}
                      />
                      {itemLabel}
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
