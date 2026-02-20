const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3002;

app.use(cors());
app.use(express.json());

app.use('/api/games', require('./routes/games'));
app.use('/api/games/:id/players', require('./routes/players'));
app.use('/api/games/:id/settle', require('./routes/settle'));

// Serve React static build in production
const clientDist = path.join(__dirname, '..', '..', 'client', 'dist');
app.use(express.static(clientDist));
app.get('*', (req, res) => res.sendFile(path.join(clientDist, 'index.html')));

app.listen(PORT, () => console.log(`Poker Settle server running on http://localhost:${PORT}`));
