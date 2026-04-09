import mongoose from 'mongoose';

const dealSchema = new mongoose.Schema(
  {
    trip_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Trip',
      required: true,
      index: true
    },
    request_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Request',
      required: true,
      index: true
    },
    traveler_id: {
      type: Number,
      required: true,
      index: true
    },
    sender_id: {
      type: Number,
      required: true,
      index: true
    },
    agreed_price: {
      type: Number,
      required: true,
      min: 0
    },
    currency: {
      type: String,
      default: 'EUR',
      enum: ['EUR', 'USD', 'GBP', 'CHF', 'PLN']
    },
    status: {
      type: String,
      enum: ['agreed', 'picked_up', 'in_transit', 'delivered', 'disputed', 'cancelled'],
      default: 'agreed',
      index: true
    },
    pickup_confirmed_at: {
      type: Date,
      default: null
    },
    delivery_confirmed_at: {
      type: Date,
      default: null
    },
    traveler_rating: {
      type: Number,
      min: 1,
      max: 5,
      default: null
    },
    traveler_review: {
      type: String,
      default: '',
      maxlength: 500
    },
    sender_rating: {
      type: Number,
      min: 1,
      max: 5,
      default: null
    },
    sender_review: {
      type: String,
      default: '',
      maxlength: 500
    },
    dispute_reason: {
      type: String,
      default: ''
    },
    dispute_resolved_at: {
      type: Date,
      default: null
    },
    notes: {
      type: String,
      default: ''
    }
  },
  {
    timestamps: true
  }
);

dealSchema.index({ trip_id: 1, request_id: 1 });
dealSchema.index({ traveler_id: 1, status: 1 });
dealSchema.index({ sender_id: 1, status: 1 });
dealSchema.index({ status: 1, createdAt: -1 });

export const Deal = mongoose.model('Deal', dealSchema);
