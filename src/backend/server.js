const express = require('express');
const cors = require('cors');
const usersRouter = require('./routes/users');
const tripsRouter = require('./routes/trips');
const requestsRouter = require('./routes/requests');

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/users', usersRouter);
app.use('/api/trips', tripsRouter);
app.use('/api/requests', requestsRouter);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});