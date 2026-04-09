import mongoose from 'mongoose';

const requestSchema = new mongoose.Schema(
  {
    sender_id: {
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
    desired_date_start: {
      type: Date,
      required: true,
      index: true
    },
    desired_date_end: {
      type: Date,
      required: true
    },
    parcel_type: {
      type: String,
      required: true,
      enum: ['docs', 'medicine', 'clothes', 'food', 'books', 'other']
    },
    weight_kg: {
      type: Number,
      required: true,
      min: 0.01,
      max: 10000
    },
    reward_amount: {
      type: Number,
      required: true,
      min: 0
    },
    reward_currency: {
      type: String,
      default: 'EUR',
      enum: ['EUR', 'USD', 'GBP', 'CHF', 'PLN']
    },
    description: {
      type: String,
      default: '',
      maxlength: 1000
    },
    photo_url: {
      type: String,
      default: ''
    },
    status: {
      type: String,
      enum: ['open', 'matched', 'completed', 'cancelled'],
      default: 'open',
      index: true
    },
    pickup_address: {
      type: String,
      default: ''
    },
    delivery_address: {
      type: String,
      default: ''
    },
    special_instructions: {
      type: String,
      default: ''
    },
    fragile: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true
  }
);

requestSchema.index({ desired_date_start: 1, status: 1 });
requestSchema.index({ from_city: 1, to_city: 1, status: 1 });

export const Request = mongoose.model('Request', requestSchema);
