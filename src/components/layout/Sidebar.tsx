import { NavLink } from "react-router-dom";
import {
  MapPin,
  Users,
  Building2,
  Scroll,
  Clock,
  Sword,
  User,
  Calendar,
  Lock,
  Search,
  ChevronLeft,
  Home,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useUIStore } from "@/stores";

interface NavItem {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  to: string;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

const navSections: NavSection[] = [
  {
    title: "World",
    items: [
      { label: "Locations", icon: MapPin, to: "/locations" },
      { label: "Characters", icon: Users, to: "/characters" },
      { label: "Organizations", icon: Building2, to: "/organizations" },
    ],
  },
  {
    title: "Story",
    items: [
      { label: "Quests", icon: Scroll, to: "/quests" },
      { label: "Timeline", icon: Clock, to: "/timeline" },
    ],
  },
  {
    title: "Campaign",
    items: [
      { label: "Heroes", icon: Sword, to: "/heroes" },
      { label: "Players", icon: User, to: "/players" },
      { label: "Sessions", icon: Calendar, to: "/sessions" },
    ],
  },
  {
    title: "GM Tools",
    items: [{ label: "Secrets", icon: Lock, to: "/secrets" }],
  },
];

function NavItemLink({
  item,
  collapsed,
}: {
  item: NavItem;
  collapsed: boolean;
}) {
  const link = (
    <NavLink
      to={item.to}
      className={({ isActive }) =>
        cn(
          "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
          "hover:bg-accent hover:text-accent-foreground",
          isActive
            ? "bg-accent text-accent-foreground"
            : "text-muted-foreground"
        )
      }
    >
      <item.icon className="h-4 w-4 shrink-0" />
      {!collapsed && <span>{item.label}</span>}
    </NavLink>
  );

  if (collapsed) {
    return (
      <Tooltip delayDuration={0}>
        <TooltipTrigger asChild>{link}</TooltipTrigger>
        <TooltipContent side="right">{item.label}</TooltipContent>
      </Tooltip>
    );
  }

  return link;
}

export function Sidebar() {
  const { sidebarCollapsed, toggleSidebar } = useUIStore();

  return (
    <aside
      className={cn(
        "flex flex-col border-r bg-card transition-all duration-300",
        sidebarCollapsed ? "w-16" : "w-56"
      )}
    >
      <ScrollArea className="flex-1 py-4">
        <div className={cn("space-y-1 px-2", sidebarCollapsed && "px-2")}>
          <NavItemLink
            item={{ label: "Dashboard", icon: Home, to: "/" }}
            collapsed={sidebarCollapsed}
          />
          <NavItemLink
            item={{ label: "Search", icon: Search, to: "/search" }}
            collapsed={sidebarCollapsed}
          />
        </div>

        <Separator className="my-4" />

        {navSections.map((section) => (
          <div key={section.title} className="mb-4">
            {!sidebarCollapsed && (
              <h4 className="mb-2 px-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {section.title}
              </h4>
            )}
            <div className={cn("space-y-1 px-2", sidebarCollapsed && "px-2")}>
              {section.items.map((item) => (
                <NavItemLink
                  key={item.to}
                  item={item}
                  collapsed={sidebarCollapsed}
                />
              ))}
            </div>
          </div>
        ))}
      </ScrollArea>

      <div className="border-t p-2 space-y-1">
        <NavItemLink
          item={{ label: "Settings", icon: Settings, to: "/settings" }}
          collapsed={sidebarCollapsed}
        />
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleSidebar}
          className="w-full"
        >
          <ChevronLeft
            className={cn(
              "h-4 w-4 transition-transform",
              sidebarCollapsed && "rotate-180"
            )}
          />
        </Button>
      </div>
    </aside>
  );
}
