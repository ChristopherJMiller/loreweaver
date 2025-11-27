import { useEffect } from "react";
import { Link } from "react-router-dom";
import {
  MapPin,
  Users,
  Building2,
  Scroll,
  Sword,
  Calendar,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useCampaignStore } from "@/stores";

const quickLinks = [
  {
    title: "Locations",
    description: "Places in your world",
    icon: MapPin,
    to: "/locations",
    color: "text-emerald-500",
  },
  {
    title: "Characters",
    description: "NPCs and personalities",
    icon: Users,
    to: "/characters",
    color: "text-blue-500",
  },
  {
    title: "Organizations",
    description: "Factions and groups",
    icon: Building2,
    to: "/organizations",
    color: "text-purple-500",
  },
  {
    title: "Quests",
    description: "Story threads",
    icon: Scroll,
    to: "/quests",
    color: "text-amber-500",
  },
  {
    title: "Heroes",
    description: "Player characters",
    icon: Sword,
    to: "/heroes",
    color: "text-red-500",
  },
  {
    title: "Sessions",
    description: "Game sessions",
    icon: Calendar,
    to: "/sessions",
    color: "text-cyan-500",
  },
];

export function DashboardPage() {
  const { campaigns, activeCampaignId } = useCampaignStore();
  const activeCampaign = campaigns.find((c) => c.id === activeCampaignId);

  useEffect(() => {
    document.title = activeCampaign
      ? `${activeCampaign.name} - Loreweaver`
      : "Loreweaver";
  }, [activeCampaign]);

  if (!activeCampaign) {
    return (
      <div className="flex h-full items-center justify-center">
        <Card className="w-96">
          <CardHeader>
            <CardTitle>No Campaign Selected</CardTitle>
            <CardDescription>
              Select or create a campaign to get started.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link
              to="/campaigns"
              className="text-primary underline-offset-4 hover:underline"
            >
              Go to Campaigns
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">{activeCampaign.name}</h1>
        {activeCampaign.description && (
          <p className="mt-2 text-muted-foreground">
            {activeCampaign.description}
          </p>
        )}
        {activeCampaign.system && (
          <p className="mt-1 text-sm text-muted-foreground">
            System: {activeCampaign.system}
          </p>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {quickLinks.map((link) => (
          <Link key={link.to} to={link.to}>
            <Card className="transition-colors hover:bg-accent">
              <CardHeader className="flex flex-row items-center gap-4">
                <link.icon className={`h-8 w-8 ${link.color}`} />
                <div>
                  <CardTitle className="text-lg">{link.title}</CardTitle>
                  <CardDescription>{link.description}</CardDescription>
                </div>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
