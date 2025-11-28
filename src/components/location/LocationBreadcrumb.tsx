import { useMemo } from "react";
import { Link } from "react-router-dom";
import { Home, MapPin, MoreHorizontal } from "lucide-react";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Location } from "@/types";
import { getLocationTypeLabel } from "@/lib/constants";

interface LocationBreadcrumbProps {
  location: Location;
  allLocations: Location[];
  className?: string;
}

/**
 * Build path from current location up to root
 */
function buildLocationPath(
  locationId: string,
  allLocations: Location[]
): Location[] {
  const path: Location[] = [];
  let current = allLocations.find((l) => l.id === locationId);

  while (current) {
    path.unshift(current);
    current = current.parent_id
      ? allLocations.find((l) => l.id === current!.parent_id)
      : undefined;
  }

  return path;
}

export function LocationBreadcrumb({
  location,
  allLocations,
  className,
}: LocationBreadcrumbProps) {
  const path = useMemo(
    () => buildLocationPath(location.id, allLocations),
    [location.id, allLocations]
  );

  // If path is empty or just the current location, show minimal breadcrumb
  if (path.length <= 1) {
    return (
      <Breadcrumb className={className}>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link to="/locations" className="flex items-center gap-1">
                <Home className="h-4 w-4" />
                <span className="sr-only md:not-sr-only">Locations</span>
              </Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage className="flex items-center gap-1">
              <MapPin className="h-4 w-4" />
              {location.name}
            </BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
    );
  }

  // For longer paths, show: Home > ... (dropdown) > Parent > Current
  const showCollapsed = path.length > 3;
  const visiblePath = showCollapsed ? path.slice(-2) : path;
  const collapsedPath = showCollapsed ? path.slice(0, -2) : [];

  return (
    <Breadcrumb className={className}>
      <BreadcrumbList>
        {/* Home link */}
        <BreadcrumbItem>
          <BreadcrumbLink asChild>
            <Link to="/locations" className="flex items-center gap-1">
              <Home className="h-4 w-4" />
              <span className="sr-only md:not-sr-only">Locations</span>
            </Link>
          </BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator />

        {/* Collapsed items dropdown */}
        {showCollapsed && collapsedPath.length > 0 && (
          <>
            <BreadcrumbItem>
              <DropdownMenu>
                <DropdownMenuTrigger className="flex items-center gap-1 rounded-md p-1 hover:bg-accent">
                  <MoreHorizontal className="h-4 w-4" />
                  <span className="sr-only">More locations</span>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  {collapsedPath.map((loc) => (
                    <DropdownMenuItem key={loc.id} asChild>
                      <Link
                        to={`/locations/${loc.id}`}
                        className="flex items-center gap-2"
                      >
                        <MapPin className="h-4 w-4" />
                        <span>{loc.name}</span>
                        <span className="text-xs text-muted-foreground">
                          {getLocationTypeLabel(loc.location_type)}
                        </span>
                      </Link>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
          </>
        )}

        {/* Visible path items */}
        {visiblePath.map((loc, index) => {
          const isLast = index === visiblePath.length - 1;

          return (
            <BreadcrumbItem key={loc.id}>
              {isLast ? (
                <BreadcrumbPage className="flex items-center gap-1">
                  <MapPin className="h-4 w-4" />
                  {loc.name}
                </BreadcrumbPage>
              ) : (
                <>
                  <BreadcrumbLink asChild>
                    <Link
                      to={`/locations/${loc.id}`}
                      className="flex items-center gap-1"
                    >
                      <MapPin className="h-4 w-4" />
                      <span className="hidden md:inline">{loc.name}</span>
                      <span className="md:hidden">
                        {loc.name.length > 10
                          ? `${loc.name.slice(0, 10)}...`
                          : loc.name}
                      </span>
                    </Link>
                  </BreadcrumbLink>
                  <BreadcrumbSeparator />
                </>
              )}
            </BreadcrumbItem>
          );
        })}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
