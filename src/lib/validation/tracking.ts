import { z } from 'zod';

/**
 * 트래킹 이벤트 등록/수정 검증 스키마
 */
export const trackingEventSchema = z.object({
  event_code: z.enum([
    'BOOKED', 
    'PICKED_UP', 
    'TERMINAL_IN', 
    'DEPARTED', 
    'IN_TRANSIT', 
    'ARRIVED', 
    'OUT_FOR_DELIVERY', 
    'DELIVERED', 
    'DELAYED', 
    'EXCEPTION'
  ]),
  location: z.string().min(1, 'Location is required'),
  description: z.string().min(5, 'Description must be at least 5 characters'),
  event_time: z.string().optional()
});

export type TrackingEventInput = z.infer<typeof trackingEventSchema>;
