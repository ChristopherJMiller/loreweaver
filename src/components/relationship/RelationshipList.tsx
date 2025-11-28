import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  ArrowLeft,
  ArrowLeftRight,
  Link as LinkIcon,
  Plus,
  Trash2,
  Edit2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { EmptyState } from "@/components/common";
import { useRelationshipStore, useCampaignStore } from "@/stores";
import type { EntityType, Relationship } from "@/types";
import { AddRelationshipModal } from "./AddRelationshipModal";
import { DeleteDialog } from "@/components/common";

interface RelationshipListProps {
  entityType: EntityType;
  entityId: string;
  entityName: string;
}

// Map entity types to their list routes
const entityRoutes: Record<EntityType, string> = {
  campaign: "/campaigns",
  character: "/characters",
  location: "/locations",
  organization: "/organizations",
  quest: "/quests",
  hero: "/heroes",
  player: "/players",
  session: "/sessions",
  timeline_event: "/timeline",
  secret: "/secrets",
};

// Format entity type for display
function formatEntityType(type: string): string {
  return type
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

// Strength indicator component
function StrengthBadge({ strength }: { strength: number | null }) {
  if (strength === null) return null;

  const getVariant = () => {
    if (strength >= 80) return "default";
    if (strength >= 50) return "secondary";
    return "outline";
  };

  return (
    <Badge variant={getVariant()} className="text-xs">
      {strength}%
    </Badge>
  );
}

// Direction indicator component
function DirectionIcon({
  relationship,
  currentEntityId,
}: {
  relationship: Relationship;
  currentEntityId: string;
}) {
  if (relationship.is_bidirectional) {
    return <ArrowLeftRight className="h-4 w-4 text-muted-foreground" />;
  }

  const isSource = relationship.source_id === currentEntityId;
  return isSource ? (
    <ArrowRight className="h-4 w-4 text-muted-foreground" />
  ) : (
    <ArrowLeft className="h-4 w-4 text-muted-foreground" />
  );
}

// Get the related entity info (the one that isn't the current entity)
function getRelatedEntity(
  relationship: Relationship,
  currentEntityId: string
): { id: string; type: EntityType } {
  if (relationship.source_id === currentEntityId) {
    return {
      id: relationship.target_id,
      type: relationship.target_type as EntityType,
    };
  }
  return {
    id: relationship.source_id,
    type: relationship.source_type as EntityType,
  };
}

// Group relationships by type
function groupByType(
  relationships: Relationship[]
): Record<string, Relationship[]> {
  return relationships.reduce(
    (acc, rel) => {
      const type = rel.relationship_type;
      if (!acc[type]) {
        acc[type] = [];
      }
      acc[type].push(rel);
      return acc;
    },
    {} as Record<string, Relationship[]>
  );
}

export function RelationshipList({
  entityType,
  entityId,
  entityName,
}: RelationshipListProps) {
  const { activeCampaignId } = useCampaignStore();
  const { relationships, isLoading, fetchForEntity, remove } =
    useRelationshipStore();

  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editingRelationship, setEditingRelationship] =
    useState<Relationship | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [relationshipToDelete, setRelationshipToDelete] =
    useState<Relationship | null>(null);

  useEffect(() => {
    fetchForEntity(entityType, entityId);
  }, [entityType, entityId, fetchForEntity]);

  const handleDelete = async () => {
    if (!relationshipToDelete) return;
    await remove(relationshipToDelete.id);
    setRelationshipToDelete(null);
  };

  const handleEdit = (relationship: Relationship) => {
    setEditingRelationship(relationship);
    setAddModalOpen(true);
  };

  const handleAddModalClose = () => {
    setAddModalOpen(false);
    setEditingRelationship(null);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Relationships</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8 text-muted-foreground">
            Loading relationships...
          </div>
        </CardContent>
      </Card>
    );
  }

  const groupedRelationships = groupByType(relationships);
  const relationshipTypes = Object.keys(groupedRelationships).sort();

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Relationships</CardTitle>
            <CardDescription>
              Connections to other entities in your world
            </CardDescription>
          </div>
          <Button size="sm" onClick={() => setAddModalOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add
          </Button>
        </CardHeader>
        <CardContent>
          {relationships.length === 0 ? (
            <EmptyState
              icon={LinkIcon}
              title="No relationships yet"
              description={`${entityName} doesn't have any connections to other entities.`}
              actionLabel="Add Relationship"
              onAction={() => setAddModalOpen(true)}
            />
          ) : (
            <div className="space-y-6">
              {relationshipTypes.map((type) => (
                <div key={type}>
                  <h4 className="mb-3 text-sm font-medium text-muted-foreground">
                    {type}
                  </h4>
                  <div className="space-y-2">
                    {groupedRelationships[type].map((rel) => {
                      const related = getRelatedEntity(rel, entityId);
                      const route = entityRoutes[related.type];

                      return (
                        <div
                          key={rel.id}
                          className="flex items-center justify-between rounded-lg border p-3"
                        >
                          <div className="flex items-center gap-3">
                            <DirectionIcon
                              relationship={rel}
                              currentEntityId={entityId}
                            />
                            <div>
                              <div className="flex items-center gap-2">
                                <Link
                                  to={`${route}/${related.id}`}
                                  className="font-medium hover:underline"
                                >
                                  {/* Note: We'd need to fetch entity names - for now show type + ID */}
                                  {formatEntityType(related.type)}
                                </Link>
                                <Badge variant="outline" className="text-xs">
                                  {formatEntityType(related.type)}
                                </Badge>
                                <StrengthBadge strength={rel.strength} />
                              </div>
                              {rel.description && (
                                <p className="text-sm text-muted-foreground">
                                  {rel.description}
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEdit(rel)}
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setRelationshipToDelete(rel);
                                setDeleteDialogOpen(true);
                              }}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {activeCampaignId && (
        <AddRelationshipModal
          open={addModalOpen}
          onOpenChange={handleAddModalClose}
          campaignId={activeCampaignId}
          sourceType={entityType}
          sourceId={entityId}
          sourceName={entityName}
          editingRelationship={editingRelationship}
        />
      )}

      <DeleteDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Delete Relationship"
        description="Are you sure you want to delete this relationship? This action cannot be undone."
        onConfirm={handleDelete}
      />
    </>
  );
}
