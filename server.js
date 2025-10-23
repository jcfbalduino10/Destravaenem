const express = require("express");
const app = express();
const Stripe = require("stripe");
const cors = require("cors");
const bodyParser = require('body-parser'); // para o webhook

app.use(cors());
app.use(express.json());

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// -------------------------
// Rota existente: PaymentIntent
// -------------------------
app.post("/create-payment-intent", async (req, res) => {
  try {
    const { amount } = req.body;

    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency: "brl",
      automatic_payment_methods: { enabled: true },
    });

    res.send({
      clientSecret: paymentIntent.client_secret,
    });
  } catch (error) {
    res.status(500).send({ error: error.message });
  }
});

// -------------------------
// Nova rota Base44: Criar Checkout Session
// -------------------------
app.post('/api/stripe/create-checkout', express.json(), async (req, res) => {
  try {
    const { user_id, user_email, user_name, success_url, cancel_url } = req.body;

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      line_items: [
        {
          price_data: {
            currency: 'brl',
            product_data: {
              name: 'Destrava Redação Premium',
              description: '30 dias de acesso ilimitado',
            },
            unit_amount: 2390, // R$ 23,90 em centavos
          },
          quantity: 1,
        },
      ],
      customer_email: user_email,
      metadata: {
        user_id,
        user_email,
        user_name,
      },
      success_url: success_url,
      cancel_url: cancel_url,
    });

    res.json({ url: session.url });
  } catch (error) {
    console.error('Erro ao criar checkout:', error);
    res.status(500).json({ error: error.message });
  }
});

// -------------------------
// Nova rota Base44: Webhook
// -------------------------
app.post('/api/stripe/webhook', 
  bodyParser.raw({ type: 'application/json' }), 
  async (req, res) => {
    const sig = req.headers['stripe-signature'];
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    let event;

    try {
      event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
    } catch (err) {
      console.error('⚠️ Webhook signature verification failed:', err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      
      console.log('✅ Pagamento confirmado:', {
        user_email: session.metadata.user_email,
        user_id: session.metadata.user_id,
        amount: session.amount_total / 100,
      });

      // Aqui você pode chamar a API da Base44 para atualizar o plano do usuário
    }

    res.json({ received: true });
  });

// -------------------------
// Rota de teste
// -------------------------
app.get("/", (req, res) => {
  res.send("Servidor Stripe funcionando!");
});
const path = require("path");
app.use(express.static(__dirname)); // Permite servir arquivos estáticos (como HTML)

app.get("/pagamento-sucesso", (req, res) => {
  res.sendFile(path.join(__dirname, "pagamento-sucesso.html"));
});

// -------------------------
// Iniciar servidor
// -------------------------
app.listen(process.env.PORT || 3000, () =>
  console.log("Servidor rodando na porta 3000")
);

