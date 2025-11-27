import { Construction } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface PlaceholderPageProps {
  title: string;
  description?: string;
}

export function PlaceholderPage({ title, description }: PlaceholderPageProps) {
  return (
    <div className="flex h-full items-center justify-center">
      <Card className="w-96 text-center">
        <CardHeader>
          <Construction className="mx-auto mb-2 h-12 w-12 text-muted-foreground" />
          <CardTitle>{title}</CardTitle>
          {description && <CardDescription>{description}</CardDescription>}
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            This page is under construction. Check back soon!
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
