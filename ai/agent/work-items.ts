/**
 * Work Item Tracker
 *
 * Provides a todo-list-like structure for the AI agent to track
 * what it needs to look up and what it has found.
 */

export interface WorkItem {
  id: string;
  description: string;
  status: "pending" | "in_progress" | "completed";
  result?: string;
  createdAt: Date;
  completedAt?: Date;
}

/**
 * Tracks work items for an agent session.
 * Each agent run gets its own tracker instance.
 */
export class WorkItemTracker {
  private items: Map<string, WorkItem> = new Map();
  private counter = 0;

  /**
   * Add a new work item to track
   */
  add(description: string): WorkItem {
    const id = `wi_${++this.counter}`;
    const item: WorkItem = {
      id,
      description,
      status: "pending",
      createdAt: new Date(),
    };
    this.items.set(id, item);
    return item;
  }

  /**
   * Update a work item's status and optionally record a result
   */
  update(
    id: string,
    status: WorkItem["status"],
    result?: string
  ): WorkItem | null {
    const item = this.items.get(id);
    if (!item) return null;

    item.status = status;
    if (result !== undefined) item.result = result;
    if (status === "completed") item.completedAt = new Date();

    return item;
  }

  /**
   * Get a specific work item by ID
   */
  get(id: string): WorkItem | null {
    return this.items.get(id) ?? null;
  }

  /**
   * List all work items
   */
  list(): WorkItem[] {
    return Array.from(this.items.values());
  }

  /**
   * Get pending work items
   */
  getPending(): WorkItem[] {
    return this.list().filter((i) => i.status === "pending");
  }

  /**
   * Get completed work items
   */
  getCompleted(): WorkItem[] {
    return this.list().filter((i) => i.status === "completed");
  }

  /**
   * Check if all work items are completed
   */
  allCompleted(): boolean {
    const items = this.list();
    return items.length > 0 && items.every((i) => i.status === "completed");
  }

  /**
   * Format work items as markdown for the agent
   */
  toMarkdown(): string {
    const items = this.list();
    if (items.length === 0) return "No work items.";

    return items
      .map((i) => {
        const status =
          i.status === "completed"
            ? "[x]"
            : i.status === "in_progress"
              ? "[~]"
              : "[ ]";
        let line = `${status} **${i.id}**: ${i.description}`;
        if (i.result) line += `\n    → ${i.result}`;
        return line;
      })
      .join("\n");
  }

  /**
   * Get a summary of progress
   */
  getSummary(): { total: number; pending: number; completed: number } {
    const items = this.list();
    return {
      total: items.length,
      pending: items.filter((i) => i.status === "pending").length,
      completed: items.filter((i) => i.status === "completed").length,
    };
  }
}
