import type { EventDetail, EventInventoryResponse } from "./events";

export const INVENTORY_UPDATE_EVENT = "inventory-update";
export const INVENTORY_HEARTBEAT_EVENT = "inventory-heartbeat";

export function mergeInventoryIntoEvent(
  currentEvent: EventDetail,
  inventory: EventInventoryResponse,
) {
  const inventoryByTicketTypeId = new Map(
    inventory.ticketTypes.map((ticketType) => [
      ticketType.ticketTypeId,
      ticketType,
    ]),
  );

  return {
    ...currentEvent,
    availableTickets: inventory.totals.availableQuantity,
    totalTickets: inventory.totals.totalQuantity,
    ticketTypes: currentEvent.ticketTypes.map((ticketType) => {
      const snapshot = inventoryByTicketTypeId.get(ticketType.id);

      if (!snapshot) {
        return ticketType;
      }

      return {
        ...ticketType,
        totalQuantity: snapshot.totalQuantity,
        availableQuantity: snapshot.availableQuantity,
        heldQuantity: snapshot.heldQuantity,
        soldQuantity: snapshot.soldQuantity,
      };
    }),
  };
}
