import { NotFoundError } from '../utils/errors.js';

export async function matchingRoutes(fastify) {
  const prisma = fastify.prisma;

  /**
   * GET /api/matching/for-trip/:id
   */
  fastify.get('/api/matching/for-trip/:id', async (request, reply) => {
    const { id } = request.params;
    const page = parseInt(request.query.page) || 1;
    const limit = parseInt(request.query.limit) || 20;
    const skip = (page - 1) * limit;

    const trip = await prisma.trip.findUnique({ where: { id } });
    if (!trip) throw new NotFoundError('Trip');
    if (trip.status !== 'active') throw new Error('Can only match with active trips');

    const availableKg = trip.capacity_kg - trip.used_capacity_kg;

    const where = {
      status: 'open',
      from_city: { equals: trip.from_city, mode: 'insensitive' },
      to_city: { equals: trip.to_city, mode: 'insensitive' },
      desired_date_start: { lte: trip.date_end },
      desired_date_end: { gte: trip.date_start },
      weight_kg: { lte: availableKg }
    };

    if (trip.categories.length > 0) {
      where.parcel_type = { in: trip.categories };
    }

    const [requests, total] = await Promise.all([
      prisma.request.findMany({
        where,
        orderBy: [{ reward_amount: 'desc' }, { created_at: 'desc' }],
        skip,
        take: limit
      }),
      prisma.request.count({ where })
    ]);

    // Enrich with sender info
    const senderIds = [...new Set(requests.map(r => r.sender_id))];
    const senders = await prisma.user.findMany({
      where: { tg_id: { in: senderIds } },
      select: { tg_id: true, first_name: true, rating: true }
    });
    const senderMap = Object.fromEntries(senders.map(s => [s.tg_id.toString(), s]));

    const enriched = requests.map(req => {
      const sender = senderMap[req.sender_id.toString()];
      return {
        id: req.id,
        sender_id: Number(req.sender_id),
        sender_name: sender?.first_name || 'Unknown',
        sender_rating: sender?.rating || 0,
        from_city: req.from_city,
        to_city: req.to_city,
        desired_date_start: req.desired_date_start,
        desired_date_end: req.desired_date_end,
        parcel_type: req.parcel_type,
        weight_kg: req.weight_kg,
        reward_amount: req.reward_amount,
        reward_currency: req.reward_currency,
        description: req.description,
        fragile: req.fragile,
        delivery_price: parseFloat((req.weight_kg * trip.price_per_kg).toFixed(2)),
        created_at: req.created_at
      };
    });

    return {
      trip: {
        id: trip.id,
        traveler_id: Number(trip.traveler_id),
        from_city: trip.from_city,
        to_city: trip.to_city,
        date_start: trip.date_start,
        date_end: trip.date_end,
        capacity_kg: trip.capacity_kg,
        used_capacity_kg: trip.used_capacity_kg,
        available_capacity_kg: availableKg,
        price_per_kg: trip.price_per_kg,
        currency: trip.currency,
        categories: trip.categories
      },
      matching_requests: enriched,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) }
    };
  });

  /**
   * GET /api/matching/for-request/:id
   */
  fastify.get('/api/matching/for-request/:id', async (request, reply) => {
    const { id } = request.params;
    const page = parseInt(request.query.page) || 1;
    const limit = parseInt(request.query.limit) || 20;
    const skip = (page - 1) * limit;

    const req = await prisma.request.findUnique({ where: { id } });
    if (!req) throw new NotFoundError('Request');
    if (req.status !== 'open') throw new Error('Can only match with open requests');

    // Use raw SQL for capacity check (capacity_kg - used_capacity_kg >= weight)
    const trips = await prisma.$queryRaw`
      SELECT * FROM trips
      WHERE status = 'active'
        AND LOWER(from_city) = LOWER(${req.from_city})
        AND LOWER(to_city) = LOWER(${req.to_city})
        AND date_start <= ${req.desired_date_end}
        AND date_end >= ${req.desired_date_start}
        AND (capacity_kg - used_capacity_kg) >= ${req.weight_kg}
      ORDER BY price_per_kg ASC, created_at DESC
      LIMIT ${limit} OFFSET ${skip}
    `;

    const countResult = await prisma.$queryRaw`
      SELECT COUNT(*)::int as total FROM trips
      WHERE status = 'active'
        AND LOWER(from_city) = LOWER(${req.from_city})
        AND LOWER(to_city) = LOWER(${req.to_city})
        AND date_start <= ${req.desired_date_end}
        AND date_end >= ${req.desired_date_start}
        AND (capacity_kg - used_capacity_kg) >= ${req.weight_kg}
    `;
    const total = countResult[0]?.total || 0;

    // Enrich with traveler info
    const travelerIds = [...new Set(trips.map(t => t.traveler_id))];
    const travelers = travelerIds.length > 0
      ? await prisma.user.findMany({
          where: { tg_id: { in: travelerIds } },
          select: { tg_id: true, first_name: true, rating: true }
        })
      : [];
    const travelerMap = Object.fromEntries(travelers.map(t => [t.tg_id.toString(), t]));

    const enriched = trips.map(trip => {
      const traveler = travelerMap[trip.traveler_id.toString()];
      const availableKg = trip.capacity_kg - trip.used_capacity_kg;
      return {
        id: trip.id,
        traveler_id: Number(trip.traveler_id),
        traveler_name: traveler?.first_name || 'Unknown',
        traveler_rating: traveler?.rating || 0,
        from_city: trip.from_city,
        to_city: trip.to_city,
        date_start: trip.date_start,
        date_end: trip.date_end,
        capacity_kg: trip.capacity_kg,
        used_capacity_kg: trip.used_capacity_kg,
        available_capacity_kg: availableKg,
        categories: trip.categories,
        price_per_kg: trip.price_per_kg,
        currency: trip.currency,
        delivery_price: parseFloat((req.weight_kg * trip.price_per_kg).toFixed(2)),
        description: trip.description,
        is_flexible: trip.is_flexible,
        created_at: trip.created_at
      };
    });

    return {
      request: {
        id: req.id,
        sender_id: Number(req.sender_id),
        from_city: req.from_city,
        to_city: req.to_city,
        desired_date_start: req.desired_date_start,
        desired_date_end: req.desired_date_end,
        parcel_type: req.parcel_type,
        weight_kg: req.weight_kg,
        reward_amount: req.reward_amount,
        reward_currency: req.reward_currency,
        description: req.description,
        fragile: req.fragile
      },
      matching_trips: enriched,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) }
    };
  });

  /**
   * GET /api/matching/search
   */
  fastify.get('/api/matching/search', async (request, reply) => {
    const { from_city, to_city, date_start, date_end, page = 1, limit = 20 } = request.query;

    if (!from_city || !to_city) {
      throw new Error('from_city and to_city are required');
    }

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Search trips
    const tripWhere = {
      status: 'active',
      from_city: { equals: from_city, mode: 'insensitive' },
      to_city: { equals: to_city, mode: 'insensitive' }
    };
    if (date_start) tripWhere.date_end = { gte: new Date(date_start) };
    if (date_end) tripWhere.date_start = { ...(tripWhere.date_start || {}), lte: new Date(date_end) };

    // Search requests
    const reqWhere = {
      status: 'open',
      from_city: { equals: from_city, mode: 'insensitive' },
      to_city: { equals: to_city, mode: 'insensitive' }
    };
    if (date_start) reqWhere.desired_date_end = { gte: new Date(date_start) };
    if (date_end) reqWhere.desired_date_start = { ...(reqWhere.desired_date_start || {}), lte: new Date(date_end) };

    const [trips, tripsTotal, requests, requestsTotal] = await Promise.all([
      prisma.trip.findMany({
        where: tripWhere,
        orderBy: [{ price_per_kg: 'asc' }, { date_start: 'asc' }],
        skip, take: limitNum
      }),
      prisma.trip.count({ where: tripWhere }),
      prisma.request.findMany({
        where: reqWhere,
        orderBy: [{ reward_amount: 'desc' }, { desired_date_start: 'asc' }],
        skip, take: limitNum
      }),
      prisma.request.count({ where: reqWhere })
    ]);

    // Batch fetch users
    const allTgIds = [
      ...new Set([
        ...trips.map(t => t.traveler_id),
        ...requests.map(r => r.sender_id)
      ])
    ];
    const users = allTgIds.length > 0
      ? await prisma.user.findMany({
          where: { tg_id: { in: allTgIds } },
          select: { tg_id: true, first_name: true, rating: true }
        })
      : [];
    const userMap = Object.fromEntries(users.map(u => [u.tg_id.toString(), u]));

    const enrichedTrips = trips.map(trip => {
      const traveler = userMap[trip.traveler_id.toString()];
      return {
        id: trip.id,
        type: 'trip',
        from_city: trip.from_city,
        to_city: trip.to_city,
        date_start: trip.date_start,
        date_end: trip.date_end,
        price_per_kg: trip.price_per_kg,
        currency: trip.currency,
        available_kg: trip.capacity_kg - trip.used_capacity_kg,
        traveler_name: traveler?.first_name,
        traveler_rating: traveler?.rating
      };
    });

    const enrichedRequests = requests.map(req => {
      const sender = userMap[req.sender_id.toString()];
      return {
        id: req.id,
        type: 'request',
        from_city: req.from_city,
        to_city: req.to_city,
        desired_date_start: req.desired_date_start,
        desired_date_end: req.desired_date_end,
        parcel_type: req.parcel_type,
        weight_kg: req.weight_kg,
        reward_amount: req.reward_amount,
        reward_currency: req.reward_currency,
        sender_name: sender?.first_name,
        sender_rating: sender?.rating
      };
    });

    return {
      trips: enrichedTrips,
      requests: enrichedRequests,
      pagination: {
        page: pageNum,
        limit: limitNum,
        trips_total: tripsTotal,
        requests_total: requestsTotal,
        trips_pages: Math.ceil(tripsTotal / limitNum),
        requests_pages: Math.ceil(requestsTotal / limitNum)
      }
    };
  });
}
