import { z } from 'zod';

/**
 * User Validation Schemas
 */
export const updateUserSchema = z.object({
  first_name: z.string().min(1).max(100).optional(),
  last_name: z.string().max(100).optional(),
  username: z.string().max(100).optional(),
  avatar_url: z.string().url().optional(),
  phone: z.string().max(20).optional(),
  bio: z.string().max(500).optional(),
  languages: z.array(z.string()).optional()
});

/**
 * Trip Validation Schemas
 */
export const createTripSchema = z.object({
  from_city: z.string().min(1).max(100),
  to_city: z.string().min(1).max(100),
  from_country: z.string().min(1).max(100),
  to_country: z.string().min(1).max(100),
  date_start: z.string().datetime(),
  date_end: z.string().datetime(),
  capacity_kg: z.number().min(0.1).max(10000),
  categories: z.array(z.enum(['docs', 'medicine', 'clothes', 'food', 'books', 'other'])).optional(),
  price_per_kg: z.number().min(0),
  currency: z.enum(['EUR', 'USD', 'GBP', 'CHF', 'PLN']).optional(),
  description: z.string().max(1000).optional(),
  route_description: z.string().optional(),
  is_flexible: z.boolean().optional()
});

export const updateTripSchema = z.object({
  capacity_kg: z.number().min(0.1).max(10000).optional(),
  categories: z.array(z.enum(['docs', 'medicine', 'clothes', 'food', 'books', 'other'])).optional(),
  price_per_kg: z.number().min(0).optional(),
  description: z.string().max(1000).optional(),
  is_flexible: z.boolean().optional()
});

export const listTripsSchema = z.object({
  from_city: z.string().optional(),
  to_city: z.string().optional(),
  date_start: z.string().datetime().optional(),
  date_end: z.string().datetime().optional(),
  status: z.enum(['active', 'completed', 'cancelled']).optional(),
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().min(1).max(100).optional()
});

/**
 * Request Validation Schemas
 */
export const createRequestSchema = z.object({
  from_city: z.string().min(1).max(100),
  to_city: z.string().min(1).max(100),
  from_country: z.string().min(1).max(100),
  to_country: z.string().min(1).max(100),
  desired_date_start: z.string().datetime(),
  desired_date_end: z.string().datetime(),
  parcel_type: z.enum(['docs', 'medicine', 'clothes', 'food', 'books', 'other']),
  weight_kg: z.number().min(0.01).max(10000),
  reward_amount: z.number().min(0),
  reward_currency: z.enum(['EUR', 'USD', 'GBP', 'CHF', 'PLN']).optional(),
  description: z.string().max(1000).optional(),
  photo_url: z.string().url().optional(),
  pickup_address: z.string().optional(),
  delivery_address: z.string().optional(),
  special_instructions: z.string().optional(),
  fragile: z.boolean().optional()
});

export const updateRequestSchema = z.object({
  parcel_type: z.enum(['docs', 'medicine', 'clothes', 'food', 'books', 'other']).optional(),
  weight_kg: z.number().min(0.01).max(10000).optional(),
  reward_amount: z.number().min(0).optional(),
  description: z.string().max(1000).optional(),
  special_instructions: z.string().optional()
});

export const listRequestsSchema = z.object({
  from_city: z.string().optional(),
  to_city: z.string().optional(),
  desired_date_start: z.string().datetime().optional(),
  desired_date_end: z.string().datetime().optional(),
  status: z.enum(['open', 'matched', 'completed', 'cancelled']).optional(),
  parcel_type: z.enum(['docs', 'medicine', 'clothes', 'food', 'books', 'other']).optional(),
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().min(1).max(100).optional()
});

/**
 * Deal Validation Schemas
 */
export const createDealSchema = z.object({
  trip_id: z.string().uuid(),
  request_id: z.string().uuid()
});

export const updateDealStatusSchema = z.object({
  status: z.enum(['agreed', 'picked_up', 'in_transit', 'delivered', 'disputed', 'cancelled']),
  notes: z.string().optional()
});

export const addDealReviewSchema = z.object({
  rating: z.number().int().min(1).max(5),
  review: z.string().max(500).optional()
});

/**
 * Validate and throw on error
 */
export function validateRequest(schema, data) {
  const result = schema.safeParse(data);
  if (!result.success) {
    const errors = result.error.flatten().fieldErrors;
    const message = Object.entries(errors)
      .map(([field, msgs]) => `${field}: ${msgs.join(', ')}`)
      .join('; ');
    const error = new Error(message);
    error.code = 'VALIDATION_ERROR';
    throw error;
  }
  return result.data;
}
