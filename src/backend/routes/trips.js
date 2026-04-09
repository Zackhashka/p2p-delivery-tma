const express = require('express');
const { fetchTrips } = require('../utils/data');

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const trips = await fetchTrips();
    res.json(trips);
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch trips' });
  }
});

router.post('/', async (req, res) => {
  const newTrip = req.body;
  res.status(201).json(newTrip);
});

module.exports = router;