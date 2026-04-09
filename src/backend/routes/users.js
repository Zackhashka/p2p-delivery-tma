import { updateUserSchema, validateRequest } from '../utils/validation.js';
import { NotFoundError } from '../utils/errors.js';

export async function userRoutes(fastify) {
  const prisma = fastify.prisma;

  /**
   * GET /api/users/me
   */
  fastify.get('/api/users/me', async (request, reply) => {
    const tg_id = BigInt(request.user.tg_id);

    let user = await prisma.user.findUnique({ where: { tg_id } });

    if (!user) {
      user = await prisma.user.create({
        data: {
          tg_id,
          first_name: request.user.first_name,
          last_name: request.user.last_name,
          username: request.user.username,
          avatar_url: request.user.photo_url,
          language_code: request.user.language_code,
          allows_write_to_pm: request.user.allows_write_to_pm,
          is_bot: request.user.is_bot
        }
      });
    }

    return serializeUser(user);
  });

  /**
   * PUT /api/users/me
   */
  fastify.put('/api/users/me', async (request, reply) => {
    const tg_id = BigInt(request.user.tg_id);
    const data = validateRequest(updateUserSchema, request.body);

    const user = await prisma.user.update({
      where: { tg_id },
      data
    }).catch(() => null);

    if (!user) {
      throw new NotFoundError('User');
    }

    return serializeUser(user);
  });

  /**
   * GET /api/users/:tg_id
   */
  fastify.get('/api/users/:tg_id', async (request, reply) => {
    const tg_id = BigInt(request.params.tg_id);

    const user = await prisma.user.findUnique({ where: { tg_id } });

    if (!user) {
      throw new NotFoundError('User');
    }

    return {
      tg_id: Number(user.tg_id),
      first_name: user.first_name,
      last_name: user.last_name,
      username: user.username,
      avatar_url: user.avatar_url,
      verified: user.verified,
      rating: user.rating,
      delivery_count: user.delivery_count,
      reviews_count: user.reviews_count,
      bio: user.bio,
      languages: user.languages,
      joined_at: user.created_at
    };
  });

  /**
   * GET /api/users/:tg_id/stats
   */
  fastify.get('/api/users/:tg_id/stats', async (request, reply) => {
    const tg_id = BigInt(request.params.tg_id);

    const user = await prisma.user.findUnique({ where: { tg_id } });
    if (!user) {
      throw new NotFoundError('User');
    }

    const [asTraveler, asSender] = await Promise.all([
      prisma.deal.count({
        where: { traveler_id: tg_id, status: 'delivered' }
      }),
      prisma.deal.count({
        where: { sender_id: tg_id, status: 'delivered' }
      })
    ]);

    // Get all ratings received
    const dealsWithRatings = await prisma.deal.findMany({
      where: {
        status: 'delivered',
        OR: [
          { traveler_id: tg_id, sender_rating: { not: null } },
          { sender_id: tg_id, traveler_rating: { not: null } }
        ]
      },
      select: {
        traveler_id: true,
        sender_id: true,
        traveler_rating: true,
        sender_rating: true
      }
    });

    const ratings = dealsWithRatings.map(d =>
      d.traveler_id === tg_id ? d.sender_rating : d.traveler_rating
    ).filter(r => r !== null);

    const avgRating = ratings.length > 0
      ? parseFloat((ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1))
      : 0;

    return {
      tg_id: Number(user.tg_id),
      rating: avgRating,
      total_completed_deliveries: asTraveler + asSender,
      as_traveler: asTraveler,
      as_sender: asSender,
      reviews_count: ratings.length,
      member_since: user.created_at,
      verified: user.verified
    };
  });
}

function serializeUser(user) {
  return {
    id: user.id.toString(),
    tg_id: Number(user.tg_id),
    first_name: user.first_name,
    last_name: user.last_name,
    username: user.username,
    avatar_url: user.avatar_url,
    phone: user.phone,
    verified: user.verified,
    rating: user.rating,
    delivery_count: user.delivery_count,
    reviews_count: user.reviews_count,
    bio: user.bio,
    languages: user.languages,
    created_at: user.created_at,
    updated_at: user.updated_at
  };
}
