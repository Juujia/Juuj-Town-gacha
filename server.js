require('dotenv').config();
const express = require('express');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const crypto = require('crypto');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(express.json());
app.use(express.static('public'));
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});
app.use(cors());

app.post('/create-checkout-session', async (req, res) => {
  const { banner = 'standard' } = req.body; // Ex: 'banner1' pour rate-up

  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'eur',
          product_data: {
            name: `Tirage Gacha - Banner ${banner}`,
            description: '1 tirage chance légendaire !',
            images: ['https://via.placeholder.com/400x600?text=GACHA'], // Ajoute ton image
          },
          unit_amount: 100, // 1€
        },
        quantity: 1,
      }],
      mode: 'payment',
      success_url: `${req.headers.origin}/success.html?session_id={CHECKOUT_SESSION_ID}&banner=${banner}`,
      cancel_url: `${req.headers.origin}/`,
      metadata: { banner }, // Pour rates spécifiques
    });
    res.json({ url: session.url });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

function doGacha(banner) {
  const rand = crypto.randomInt(0, 9999) / 10000; // RNG sécurisé 0.0000 -> 0.9999

  // Exemple STANDARD (modifie ici tes rates !)
  if (banner === 'standard') {
    if (rand < 0.005) return { rarity: 'LR', name: 'Légendaire Rate-up 🐉', color: '#ff00ff' }; // 0.5%
    if (rand < 0.015) return { rarity: 'UR', name: 'Ultra Rare ⭐⭐⭐⭐⭐', color: '#ffd700' }; // 1%
    if (rand < 0.095) return { rarity: 'SSR', name: 'Super Rare 🔥', color: '#ff4500' }; // 8%
    if (rand < 0.295) return { rarity: 'SR', name: 'Rare ✨', color: '#00bfff' }; // 20%
    return { rarity: 'N', name: 'Normal 😴', color: '#ccc' }; // 70%
  }

  // Exemple BANNER RATE-UP (double chance sur LR)
  if (banner === 'banner1') {
    if (rand < 0.010) return { rarity: 'LR', name: 'Légendaire Rate-up (Banner!) 🐉', color: '#ff00ff' }; // 1%
    if (rand < 0.015) return { rarity: 'UR', name: 'Ultra Rare ⭐⭐⭐⭐⭐', color: '#ffd700' }; // 0.5%
    // ... même que standard
    if (rand < 0.095) return { rarity: 'SSR', name: 'Super Rare 🔥', color: '#ff4500' };
    if (rand < 0.295) return { rarity: 'SR', name: 'Rare ✨', color: '#00bfff' };
    return { rarity: 'N', name: 'Normal 😴', color: '#ccc' };
  }

  // Ajoute d'autres banners...
}

app.get('/success.html', async (req, res) => {
  const { session_id, banner } = req.query;

  try {
    const session = await stripe.checkout.sessions.retrieve(session_id);
    if (session.payment_status === 'paid') {
      const result = doGacha(banner);
      // Animation + résultat (HTML dynamique)
      res.send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Résultat Gacha!</title>
          <script src="https://cdn.jsdelivr.net/npm/canvas-confetti@1.9.3/dist/confetti.browser.min.js"></script>
          <style>
            body { font-family: Arial; text-align: center; background: linear-gradient(45deg, #667eea 0%, #764ba2 100%); color: white; padding: 50px; }
            .result { font-size: 3em; margin: 50px; padding: 20px; border-radius: 20px; }
          </style>
        </head>
        <body>
          <h1>🎉 PAIEMENT CONFIRMÉ ! 🎉</h1>
          <div class="result" style="background: ${result.color}; color: white; display: inline-block;">
            ${result.rarity}<br>${result.name}
          </div>
          <p><a href="/">Nouveau tirage ?</a></p>
          <script>
            confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
            confetti({ particleCount: 100, angle: 60, spread: 55, origin: { x: 0 } });
            confetti({ particleCount: 100, angle: 120, spread: 55, origin: { x: 1 } });
          </script>
        </body>
        </html>
      `);
    } else {
      res.redirect('/');
    }
  } catch (error) {
    res.status(500).send('Erreur: ' + error.message);
  }
});

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Server prêt sur ' + listener.address().port);
});
