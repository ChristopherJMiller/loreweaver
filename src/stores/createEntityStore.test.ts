import { describe, it, expect, vi, beforeEach } from "vitest";
import { invoke } from "@tauri-apps/api/core";
import { createEntityStore, type BaseEntity } from "./createEntityStore";

const mockInvoke = vi.mocked(invoke);

interface TestEntity extends BaseEntity {
  name: string;
}

describe("createEntityStore Contract", () => {
  beforeEach(() => {
    mockInvoke.mockClear();
    mockInvoke.mockResolvedValue([]);
  });

  describe("fetchAll", () => {
    it("passes campaign_id in snake_case (not campaignId)", async () => {
      const useTestStore = createEntityStore<TestEntity>(
        "test_entity",
        "test_entities"
      );
      const store = useTestStore.getState();

      await store.fetchAll("campaign-uuid");

      expect(mockInvoke).toHaveBeenCalledWith("list_test_entities", {
        campaign_id: "campaign-uuid",
      });

      // Verify snake_case is used
      const callArgs = mockInvoke.mock.calls[0][1] as Record<string, unknown>;
      expect(callArgs).toHaveProperty("campaign_id");
      expect(callArgs).not.toHaveProperty("campaignId");
    });

    it("uses the correct command name based on plural", async () => {
      const useCharacterStore = createEntityStore<TestEntity>(
        "character",
        "characters"
      );
      const store = useCharacterStore.getState();

      await store.fetchAll("camp-id");

      expect(mockInvoke).toHaveBeenCalledWith("list_characters", {
        campaign_id: "camp-id",
      });
    });

    it("uses default plural when not specified", async () => {
      const useItemStore = createEntityStore<TestEntity>("item");
      const store = useItemStore.getState();

      await store.fetchAll("camp-id");

      expect(mockInvoke).toHaveBeenCalledWith("list_items", {
        campaign_id: "camp-id",
      });
    });
  });

  describe("create", () => {
    it("passes data to the create command", async () => {
      mockInvoke.mockResolvedValue({
        id: "new-id",
        campaign_id: "camp-id",
        name: "New Item",
        created_at: "2024-01-01",
        updated_at: "2024-01-01",
      });

      const useTestStore = createEntityStore<TestEntity>("test_entity");
      const store = useTestStore.getState();

      await store.create({
        campaign_id: "camp-id",
        name: "New Item",
      });

      expect(mockInvoke).toHaveBeenCalledWith("create_test_entity", {
        campaign_id: "camp-id",
        name: "New Item",
      });
    });
  });

  describe("update", () => {
    it("passes id and data to the update command", async () => {
      mockInvoke.mockResolvedValue({
        id: "existing-id",
        campaign_id: "camp-id",
        name: "Updated Item",
        created_at: "2024-01-01",
        updated_at: "2024-01-02",
      });

      const useTestStore = createEntityStore<TestEntity>("test_entity");
      const store = useTestStore.getState();

      await store.update("existing-id", { name: "Updated Item" });

      expect(mockInvoke).toHaveBeenCalledWith("update_test_entity", {
        id: "existing-id",
        name: "Updated Item",
      });
    });
  });

  describe("remove", () => {
    it("passes id to the delete command", async () => {
      mockInvoke.mockResolvedValue(true);

      const useTestStore = createEntityStore<TestEntity>("test_entity");
      const store = useTestStore.getState();

      await store.remove("entity-id");

      expect(mockInvoke).toHaveBeenCalledWith("delete_test_entity", {
        id: "entity-id",
      });
    });
  });

  describe("fetchOne", () => {
    it("passes id to the get command", async () => {
      mockInvoke.mockResolvedValue({
        id: "entity-id",
        campaign_id: "camp-id",
        name: "Test Item",
        created_at: "2024-01-01",
        updated_at: "2024-01-01",
      });

      const useTestStore = createEntityStore<TestEntity>("test_entity");
      const store = useTestStore.getState();

      await store.fetchOne("entity-id");

      expect(mockInvoke).toHaveBeenCalledWith("get_test_entity", {
        id: "entity-id",
      });
    });
  });
});
