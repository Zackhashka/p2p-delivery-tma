import mongoose from 'mongoose';

const tripSchema = new mongoose.Schema(
  {
    traveler_id: {
      type: Number,
      required: true,
      index: true
    },
    from_city: {
      type: String,
      required: true,
      index: true
    },
    to_city: {
      type: String,
      required: true,
      index: true
    },
    from_country: {
      type: String,
      required: true
    },
    to_country: {
      type: String,
      required: true
    },
    date_start: {
      type: Date,
      required: true,
      index: true
    },
    date_end: {
      type: Date,
      required: true
    },
    capacity_kg: {
      type: Number,
      required: true,
      min: 0.1,
      max: 10000
    },
    used_capacity_kg: {
      type: Number,
      default: 0,
      min: 0
    },
    categories: {
      type: [String],
      enum: ['docs', 'medicine', 'clothes', 'food', 'books', 'other'],
      default: []
    },
    price_per_kg: {
      type: Number,
      required: true,
      min: 0
    },
    currency: {
      type: String,
      default: 'EUR',
      enum: ['EUR', 'USD', 'GBP', 'CHF', 'PLN']
    },
    description: {
      type: String,
      default: '',
      maxlength: 1000
    },
    status: {
      type: String,
      enum: ['active', 'completed', 'cancelled'],
      default: 'active',
      index: true
    },
    route_description: {
      type: String,
      default: ''
    },
    is_flexible: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true
  }
);

tripSchema.index({ date_start: 1, status: 1 });
tripSchema.index({ from_city: 1, to_city: 1, status: 1 });

export const Trip = mongoose.model('Trip', tripSchema);
