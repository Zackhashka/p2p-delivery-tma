import {
  createDealSchema,
  updateDealStatusSchema,
  addDealReviewSchema,
  validateRequest
} from '../utils/validation.js';
import { NotFoundError, ForbiddenError, ConflictError } from '../utils/errors.js';

const STATUS_TRANSITIONS = {
  agreed: ['picked_up', 'cancelled'],
  picked_up: ['in_transit', 'cancelled'],
  in_transit: ['delivered', 'disputed'],
  delivered: [],
  disputed: [],
  cancelled: []
};

export async function dealRoutes(fastify) {
  const prisma = fastify.prisma;

  /**
   * POST /api/deals
   */
  fastify.post('/api/deals', async (request, reply) => {
    const data = validateRequest(createDealSchema, request.body);
    const traveler_id = BigInt(request.user.tg_id);

    const trip = await prisma.trip.findUnique({ where: { id: data.trip_id } });
    if (!trip) throw new NotFoundError('Trip');

    const req = await prisma.request.findUnique({ where: { id: data.request_id } });
    if (!req) throw new NotFoundError('Request');

    if (req.sender_id === traveler_id) {
      throw new ConflictError('Cannot create deal for your own request');
    }
    if (trip.traveler_id !== traveler_id) {
      throw new ForbiddenError('Can only create deals for your own trips');
    }
    if (trip.used_capacity_kg + req.weight_kg > trip.capacity_kg) {
      throw new ConflictError('Insufficient capacity for this parcel');
    }
    if (req.status !== 'open') {
      throw new ConflictError('Request is not available');
    }

    // Check duplicate
    const existing = await prisma.deal.findFirst({
      where: {
        trip_id: data.trip_id,
        request_id: data.request_id,
        status: { not: 'cancelled' }
      }
    });
    if (existing) {
      throw new ConflictError('Deal already exists for this trip and request');
    }

    const agreed_price = parseFloat((trip.price_per_kg * req.weight_kg).toFixed(2));

    const deal = await prisma.deal.create({
      data: {
        trip_id: data.trip_id,
        request_id: data.request_id,
        traveler_id,
        sender_id: req.sender_id,
        agreed_price,
        currency: trip.currency
      }
    });

    return reply.code(201).send(serializeDeal(deal));
  });

  /**
   * GET /api/deals/my
   */
  fastify.get('/api/deals/my', async (request, reply) => {
    const tg_id = BigInt(request.user.tg_id);
    const { status, page = 1, limit = 20, role } = request.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = {};

    if (role === 'traveler') {
      where.traveler_id = tg_id;
    } else if (role === 'sender') {
      where.sender_id = tg_id;
    } else {
      where.OR = [{ traveler_id: tg_id }, { sender_id: tg_id }];
    }

    if (status) where.status = status;

    const [deals, total] = await Promise.all([
      prisma.deal.findMany({
        where,
        include: { trip: true, request: true },
        orderBy: { updated_at: 'desc' },
        skip,
        take: parseInt(limit)
      }),
      prisma.deal.count({ where })
    ]);

    const formatted = deals.map(d => ({
      ...serializeDeal(d),
      trip: {
        from_city: d.trip.from_city,
        to_city: d.trip.to_city,
        date_start: d.trip.date_start,
        date_end: d.trip.date_end
      },
      request: {
        parcel_type: d.request.parcel_type,
        weight_kg: d.request.weight_kg
      }
    }));

    return {
      data: formatted,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    };
  });

  /**
   * GET /api/deals/:id
   */
  fastify.get('/api/deals/:id', async (request, reply) => {
    const tg_id = BigInt(request.user.tg_id);

    const deal = await prisma.deal.findUnique({
      where: { id: request.params.id },
      include: { trip: true, request: true }
    });

    if (!deal) throw new NotFoundError('Deal');
    if (deal.traveler_id !== tg_id && deal.sender_id !== tg_id) {
      throw new ForbiddenError('Cannot access this deal');
    }

    return {
      ...serializeDeal(deal),
      pickup_confirmed_at: deal.pickup_confirmed_at,
      delivery_confirmed_at: deal.delivery_confirmed_at,
      traveler_rating: deal.traveler_rating,
      traveler_review: deal.traveler_review,
      sender_rating: deal.sender_rating,
      sender_review: deal.sender_review,
      dispute_reason: deal.dispute_reason,
      dispute_resolved_at: deal.dispute_resolved_at,
      notes: deal.notes,
      trip: {
        from_city: deal.trip.from_city,
        to_city: deal.trip.to_city,
        from_country: deal.trip.from_country,
        to_country: deal.trip.to_country,
        date_start: deal.trip.date_start,
        date_end: deal.trip.date_end
      },
      request: {
        parcel_type: deal.request.parcel_type,
        weight_kg: deal.request.weight_kg,
        reward_amount: deal.request.reward_amount,
        description: deal.request.description,
        fragile: deal.request.fragile
      }
    };
  });

  /**
   * PUT /api/deals/:id/status
   */
  fastify.put('/api/deals/:id/status', async (request, reply) => {
    const data = validateRequest(updateDealStatusSchema, request.body);
    const tg_id = BigInt(request.user.tg_id);

    const deal = await prisma.deal.findUnique({
      where: { id: request.params.id }
    });

    if (!deal) throw new NotFoundError('Deal');
    if (deal.traveler_id !== tg_id && deal.sender_id !== tg_id) {
      throw new ForbiddenError('Cannot access this deal');
    }
    if (!STATUS_TRANSITIONS[deal.status]?.includes(data.status)) {
      throw new ConflictError(`Cannot transition from ${deal.status} to ${data.status}`);
    }

    const updateData = { status: data.status };
    if (data.notes) updateData.notes = data.notes;
    if (data.status === 'picked_up') updateData.pickup_confirmed_at = new Date();
    if (data.status === 'delivered') updateData.delivery_confirmed_at = new Date();

    const updated = await prisma.deal.update({
      where: { id: deal.id },
      data: updateData
    });

    // Side effects on delivery/cancellation
    if (data.status === 'delivered') {
      const req = await prisma.request.findUnique({ where: { id: deal.request_id } });
      if (req) {
        await prisma.trip.update({
          where: { id: deal.trip_id },
          data: { used_capacity_kg: { increment: req.weight_kg } }
        });
        await prisma.request.update({
          where: { id: deal.request_id },
          data: { status: 'matched' }
        });
      }
    } else if (data.status === 'cancelled') {
      const req = await prisma.request.findUnique({ where: { id: deal.request_id } });
      if (req && req.status === 'matched') {
        await prisma.request.update({
          where: { id: deal.request_id },
          data: { status: 'open' }
        });
      }
    }

    return {
      id: updated.id,
      status: updated.status,
      updated_at: updated.updated_at
    };
  });

  /**
   * POST /api/deals/:id/review
   */
  fastify.post('/api/deals/:id/review', async (request, reply) => {
    const data = validateRequest(addDealReviewSchema, request.body);
    const tg_id = BigInt(request.user.tg_id);

    const deal = await prisma.deal.findUnique({
      where: { id: request.params.id }
    });

    if (!deal) throw new NotFoundError('Deal');
    if (deal.status !== 'delivered') throw new ConflictError('Can only review completed deals');

    const isTraveler = deal.traveler_id === tg_id;
    const isSender = deal.sender_id === tg_id;

    if (!isTraveler && !isSender) throw new ForbiddenError('Cannot review this deal');

    if (isTraveler) {
      if (deal.traveler_rating) throw new ConflictError('You already reviewed this deal');
      await prisma.deal.update({
        where: { id: deal.id },
        data: { traveler_rating: data.rating, traveler_review: data.review || '' }
      });
    } else {
      if (deal.sender_rating) throw new ConflictError('You already reviewed this deal');
      await prisma.deal.update({
        where: { id: deal.id },
        data: { sender_rating: data.rating, sender_review: data.review || '' }
      });
    }

    // Recalculate reviewee's rating
    const reviewee_id = isTraveler ? deal.sender_id : deal.traveler_id;

    const allRatings = await prisma.deal.findMany({
      where: {
        status: 'delivered',
        OR: [
          { traveler_id: reviewee_id, sender_rating: { not: null } },
          { sender_id: reviewee_id, traveler_rating: { not: null } }
        ]
      },
      select: { traveler_id: true, sender_id: true, traveler_rating: true, sender_rating: true }
    });

    const ratings = allRatings
      .map(d => d.traveler_id === reviewee_id ? d.sender_rating : d.traveler_rating)
      .filter(r => r !== null);

    if (ratings.length > 0) {
      const avg = parseFloat((ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1));
      await prisma.user.update({
        where: { tg_id: reviewee_id },
        data: { rating: avg, reviews_count: ratings.length }
      });
    }

    return {
      id: deal.id,
      rating_added: true,
      updated_at: new Date()
    };
  });
}

function serializeDeal(deal) {
  return {
    id: deal.id,
    trip_id: deal.trip_id,
    request_id: deal.request_id,
    traveler_id: Number(deal.traveler_id),
    sender_id: Number(deal.sender_id),
    agreed_price: deal.agreed_price,
    currency: deal.currency,
    status: deal.status,
    created_at: deal.created_at,
    updated_at: deal.updated_at
  };
}
