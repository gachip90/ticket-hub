import { getApiBaseUrl } from "./api";
import type { EventInventoryResponse } from "./events";
import {
  INVENTORY_HEARTBEAT_EVENT,
  INVENTORY_UPDATE_EVENT,
} from "./inventory";

type InventoryStreamOptions = {
  eventId: string;
  onInventory: (inventory: EventInventoryResponse) => void;
  onConnectionChange?: (isConnected: boolean) => void;
};

type AllInventoryStreamOptions = {
  onInventory: (inventory: EventInventoryResponse) => void;
  onConnectionChange?: (isConnected: boolean) => void;
};

export function subscribeEventInventoryStream({
  eventId,
  onInventory,
  onConnectionChange,
}: InventoryStreamOptions) {
  if (typeof window === "undefined" || typeof EventSource === "undefined") {
    return () => undefined;
  }

  const eventSource = new EventSource(
    `${getApiBaseUrl()}/api/events/${eventId}/inventory/stream`,
  );

  const markConnection = (isConnected: boolean) => {
    onConnectionChange?.(isConnected);
  };

  eventSource.onopen = () => {
    markConnection(true);
  };

  eventSource.onerror = () => {
    markConnection(false);
  };

  eventSource.addEventListener(
    INVENTORY_UPDATE_EVENT,
    (event: MessageEvent<string>) => {
      try {
        const payload = JSON.parse(event.data) as EventInventoryResponse;
        markConnection(true);
        onInventory(payload);
      } catch {
        markConnection(false);
      }
    },
  );

  eventSource.addEventListener(INVENTORY_HEARTBEAT_EVENT, () => {
    markConnection(true);
  });

  return () => {
    eventSource.close();
  };
}

export function subscribeAllInventoryStream({
  onInventory,
  onConnectionChange,
}: AllInventoryStreamOptions) {
  if (typeof window === "undefined" || typeof EventSource === "undefined") {
    return () => undefined;
  }

  const eventSource = new EventSource(
    `${getApiBaseUrl()}/api/events/inventory/stream`,
  );

  const markConnection = (isConnected: boolean) => {
    onConnectionChange?.(isConnected);
  };

  eventSource.onopen = () => {
    markConnection(true);
  };

  eventSource.onerror = () => {
    markConnection(false);
  };

  eventSource.addEventListener(
    INVENTORY_UPDATE_EVENT,
    (event: MessageEvent<string>) => {
      try {
        const payload = JSON.parse(event.data) as EventInventoryResponse;
        markConnection(true);
        onInventory(payload);
      } catch {
        markConnection(false);
      }
    },
  );

  eventSource.addEventListener(INVENTORY_HEARTBEAT_EVENT, () => {
    markConnection(true);
  });

  return () => {
    eventSource.close();
  };
}
