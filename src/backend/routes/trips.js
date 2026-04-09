import {
  createTripSchema,
  updateTripSchema,
  listTripsSchema,
  validateRequest
} from '../utils/validation.js';
import { NotFoundError, ForbiddenError } from '../utils/errors.js';

export async function tripRoutes(fastify) {
  const prisma = fastify.prisma;

  /**
   * GET /api/trips
   */
  fastify.get('/api/trips', async (request, reply) => {
    const filters = validateRequest(listTripsSchema, request.query);
    const { page = 1, limit = 20, ...q } = filters;
    const skip = (page - 1) * limit;

    const where = { status: 'active' };

    if (q.from_city) {
      where.from_city = { equals: q.from_city, mode: 'insensitive' };
    }
    if (q.to_city) {
      where.to_city = { equals: q.to_city, mode: 'insensitive' };
    }
    if (q.status) {
      where.status = q.status;
    }
    if (q.date_start || q.date_end) {
      if (q.date_start) {
        where.date_end = { gte: new Date(q.date_start) };
      }
      if (q.date_end) {
        where.date_start = { ...(where.date_start || {}), lte: new Date(q.date_end) };
      }
    }

    const [trips, total] = await Promise.all([
      prisma.trip.findMany({
        where,
        orderBy: [{ date_start: 'asc' }, { created_at: 'desc' }],
        skip,
        take: limit
      }),
      prisma.trip.count({ where })
    ]);

    return {
      data: trips.map(serializeTrip),
      pagination: { page, limit, total, pages: Math.ceil(total / limit) }
    };
  });

  /**
   * POST /api/trips
   */
  fastify.post('/api/trips', async (request, reply) => {
    const data = validateRequest(createTripSchema, request.body);
    const traveler_id = BigInt(request.user.tg_id);

    const trip = await prisma.trip.create({
      data: {
        traveler_id,
        from_city: data.from_city,
        to_city: data.to_city,
        from_country: data.from_country,
        to_country: data.to_country,
        date_start: new Date(data.date_start),
        date_end: new Date(data.date_end),
        capacity_kg: data.capacity_kg,
        categories: data.categories || [],
        price_per_kg: data.price_per_kg,
        currency: data.currency || 'EUR',
        description: data.description || '',
        route_description: data.route_description || '',
        is_flexible: data.is_flexible || false
      }
    });

    return reply.code(201).send(serializeTrip(trip));
  });

  /**
   * GET /api/trips/my/list
   */
  fastify.get('/api/trips/my/list', async (request, reply) => {
    const traveler_id = BigInt(request.user.tg_id);
    const { status, page = 1, limit = 20 } = request.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = { traveler_id };
    if (status) where.status = status;

    const [trips, total] = await Promise.all([
      prisma.trip.findMany({
        where,
        orderBy: { date_start: 'desc' },
        skip,
        take: parseInt(limit)
      }),
      prisma.trip.count({ where })
    ]);

    return {
      data: trips.map(serializeTrip),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    };
  });

  /**
   * GET /api/trips/:id
   */
  fastify.get('/api/trips/:id', async (request, reply) => {
    const trip = await prisma.trip.findUnique({
      where: { id: request.params.id }
    });

    if (!trip) throw new NotFoundError('Trip');

    return {
      ...serializeTrip(trip),
      available_capacity_kg: trip.capacity_kg - trip.used_capacity_kg,
      route_description: trip.route_description,
      is_flexible: trip.is_flexible
    };
  });

  /**
   * PUT /api/trips/:id
   */
  fastify.put('/api/trips/:id', async (request, reply) => {
    const data = validateRequest(updateTripSchema, request.body);
    const traveler_id = BigInt(request.user.tg_id);

    const trip = await prisma.trip.findUnique({
      where: { id: request.params.id }
    });

    if (!trip) throw new NotFoundError('Trip');
    if (trip.traveler_id !== traveler_id) throw new ForbiddenError('Can only update your own trips');
    if (trip.status !== 'active') throw new ForbiddenError('Can only update active trips');

    const updated = await prisma.trip.update({
      where: { id: trip.id },
      data
    });

    return serializeTrip(updated);
  });

  /**
   * DELETE /api/trips/:id
   */
  fastify.delete('/api/trips/:id', async (request, reply) => {
    const traveler_id = BigInt(request.user.tg_id);

    const trip = await prisma.trip.findUnique({
      where: { id: request.params.id }
    });

    if (!trip) throw new NotFoundError('Trip');
    if (trip.traveler_id !== traveler_id) throw new ForbiddenError('Can only cancel your own trips');

    await prisma.trip.update({
      where: { id: trip.id },
      data: { status: 'cancelled' }
    });

    return { message: 'Trip cancelled', id: trip.id };
  });
}

function serializeTrip(trip) {
  return {
    id: trip.id,
    traveler_id: Number(trip.traveler_id),
    from_city: trip.from_city,
    to_city: trip.to_city,
    from_country: trip.from_country,
    to_country: trip.to_country,
    date_start: trip.date_start,
    date_end: trip.date_end,
    capacity_kg: trip.capacity_kg,
    used_capacity_kg: trip.used_capacity_kg,
    categories: trip.categories,
    price_per_kg: trip.price_per_kg,
    currency: trip.currency,
    description: trip.description,
    status: trip.status,
    created_at: trip.created_at,
    updated_at: trip.updated_at
  };
}
