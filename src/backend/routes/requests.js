import {
  createRequestSchema,
  updateRequestSchema,
  listRequestsSchema,
  validateRequest
} from '../utils/validation.js';
import { NotFoundError, ForbiddenError } from '../utils/errors.js';

export async function requestRoutes(fastify) {
  const prisma = fastify.prisma;

  /**
   * GET /api/requests
   */
  fastify.get('/api/requests', async (request, reply) => {
    const filters = validateRequest(listRequestsSchema, request.query);
    const { page = 1, limit = 20, ...q } = filters;
    const skip = (page - 1) * limit;

    const where = { status: 'open' };

    if (q.from_city) {
      where.from_city = { equals: q.from_city, mode: 'insensitive' };
    }
    if (q.to_city) {
      where.to_city = { equals: q.to_city, mode: 'insensitive' };
    }
    if (q.status) {
      where.status = q.status;
    }
    if (q.parcel_type) {
      where.parcel_type = q.parcel_type;
    }
    if (q.desired_date_start || q.desired_date_end) {
      if (q.desired_date_start) {
        where.desired_date_end = { gte: new Date(q.desired_date_start) };
      }
      if (q.desired_date_end) {
        where.desired_date_start = {
          ...(where.desired_date_start || {}),
          lte: new Date(q.desired_date_end)
        };
      }
    }

    const [requests, total] = await Promise.all([
      prisma.request.findMany({
        where,
        orderBy: [
          { desired_date_start: 'asc' },
          { reward_amount: 'desc' },
          { created_at: 'desc' }
        ],
        skip,
        take: limit
      }),
      prisma.request.count({ where })
    ]);

    return {
      data: requests.map(serializeRequest),
      pagination: { page, limit, total, pages: Math.ceil(total / limit) }
    };
  });

  /**
   * POST /api/requests
   */
  fastify.post('/api/requests', async (request, reply) => {
    const data = validateRequest(createRequestSchema, request.body);
    const sender_id = BigInt(request.user.tg_id);

    const req = await prisma.request.create({
      data: {
        sender_id,
        from_city: data.from_city,
        to_city: data.to_city,
        from_country: data.from_country,
        to_country: data.to_country,
        desired_date_start: new Date(data.desired_date_start),
        desired_date_end: new Date(data.desired_date_end),
        parcel_type: data.parcel_type,
        weight_kg: data.weight_kg,
        reward_amount: data.reward_amount,
        reward_currency: data.reward_currency || 'EUR',
        description: data.description || '',
        photo_url: data.photo_url || '',
        pickup_address: data.pickup_address || '',
        delivery_address: data.delivery_address || '',
        special_instructions: data.special_instructions || '',
        fragile: data.fragile || false
      }
    });

    return reply.code(201).send(serializeRequest(req));
  });

  /**
   * GET /api/requests/my/list
   */
  fastify.get('/api/requests/my/list', async (request, reply) => {
    const sender_id = BigInt(request.user.tg_id);
    const { status, page = 1, limit = 20 } = request.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = { sender_id };
    if (status) where.status = status;

    const [requests, total] = await Promise.all([
      prisma.request.findMany({
        where,
        orderBy: { desired_date_start: 'desc' },
        skip,
        take: parseInt(limit)
      }),
      prisma.request.count({ where })
    ]);

    return {
      data: requests.map(serializeRequest),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    };
  });

  /**
   * GET /api/requests/:id
   */
  fastify.get('/api/requests/:id', async (request, reply) => {
    const req = await prisma.request.findUnique({
      where: { id: request.params.id }
    });

    if (!req) throw new NotFoundError('Request');

    return {
      ...serializeRequest(req),
      pickup_address: req.pickup_address,
      delivery_address: req.delivery_address,
      special_instructions: req.special_instructions
    };
  });

  /**
   * PUT /api/requests/:id
   */
  fastify.put('/api/requests/:id', async (request, reply) => {
    const data = validateRequest(updateRequestSchema, request.body);
    const sender_id = BigInt(request.user.tg_id);

    const req = await prisma.request.findUnique({
      where: { id: request.params.id }
    });

    if (!req) throw new NotFoundError('Request');
    if (req.sender_id !== sender_id) throw new ForbiddenError('Can only update your own requests');
    if (req.status !== 'open') throw new ForbiddenError('Can only update open requests');

    const updated = await prisma.request.update({
      where: { id: req.id },
      data
    });

    return serializeRequest(updated);
  });

  /**
   * DELETE /api/requests/:id
   */
  fastify.delete('/api/requests/:id', async (request, reply) => {
    const sender_id = BigInt(request.user.tg_id);

    const req = await prisma.request.findUnique({
      where: { id: request.params.id }
    });

    if (!req) throw new NotFoundError('Request');
    if (req.sender_id !== sender_id) throw new ForbiddenError('Can only cancel your own requests');

    await prisma.request.update({
      where: { id: req.id },
      data: { status: 'cancelled' }
    });

    return { message: 'Request cancelled', id: req.id };
  });
}

function serializeRequest(req) {
  return {
    id: req.id,
    sender_id: Number(req.sender_id),
    from_city: req.from_city,
    to_city: req.to_city,
    from_country: req.from_country,
    to_country: req.to_country,
    desired_date_start: req.desired_date_start,
    desired_date_end: req.desired_date_end,
    parcel_type: req.parcel_type,
    weight_kg: req.weight_kg,
    reward_amount: req.reward_amount,
    reward_currency: req.reward_currency,
    description: req.description,
    photo_url: req.photo_url,
    fragile: req.fragile,
    status: req.status,
    created_at: req.created_at,
    updated_at: req.updated_at
  };
}
