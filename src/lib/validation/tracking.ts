import { z } from 'zod';

const eventCodes = [
  'BOOKED', 'PICKED_UP', 'TERMINAL_IN', 'DEPARTED',
  'IN_TRANSIT', 'ARRIVED', 'OUT_FOR_DELIVERY', 'DELIVERED',
  'DELAYED', 'EXCEPTION',
  'TRANSIT_DEPARTED', 'TRANSIT_ARRIVED_HUB', 'TRANSIT_DEPARTED_HUB', 'TRANSIT_ARRIVED_DEST',
] as const;

export const trackingEventSchema = z.object({
  event_code: z.enum(eventCodes),
  location: z.string().min(1, 'Location is required'),
  description: z.string().min(5, 'Description must be at least 5 characters'),
  event_time: z.string().optional(),
  segment_index: z.number().int().min(0).optional(),
  hub_port_code: z.string().optional(),
});

export type TrackingEventInput = z.infer<typeof trackingEventSchema>;
