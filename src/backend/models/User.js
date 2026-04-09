import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    tg_id: {
      type: Number,
      required: true,
      unique: true,
      index: true
    },
    first_name: {
      type: String,
      required: true
    },
    last_name: {
      type: String,
      default: ''
    },
    username: {
      type: String,
      default: '',
      index: true
    },
    avatar_url: {
      type: String,
      default: ''
    },
    phone: {
      type: String,
      default: ''
    },
    verified: {
      type: Boolean,
      default: false,
      index: true
    },
    rating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5
    },
    delivery_count: {
      type: Number,
      default: 0,
      min: 0
    },
    reviews_count: {
      type: Number,
      default: 0,
      min: 0
    },
    bio: {
      type: String,
      default: '',
      maxlength: 500
    },
    languages: {
      type: [String],
      default: []
    },
    is_bot: {
      type: Boolean,
      default: false
    },
    language_code: {
      type: String,
      default: 'en'
    },
    allows_write_to_pm: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true
  }
);

export const User = mongoose.model('User', userSchema);
