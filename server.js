const express = require('express');
const cors = require('cors');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const app = express();
const PORT = process.env.PORT || 3000;

// MIDDLEWARES
app.use(cors({ origin: '*', methods: ['GET', 'POST'], credentials: true }));
app.use(express.json());

// Logs
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// ROTA DE SAÚDE
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    message: 'Backend Destrava Redação IA funcionando!',
    timestamp: new Date().toISOString()
  });
});

// CRIAR CHECKOUT STRIPE
app.post('/api/stripe/create-checkout', async (req, res) => {
  try {
    const { user_id, user_email, user_name, success_url, cancel_url } = req.body;
    
    console.log('📝 Criando checkout para:', { email: user_email, name: user_name, id: user_id });
    
    if (!user_email || !user_id) {
      return res.status(400).json({ error: 'Email e ID do usuário são obrigatórios' });
    }
    
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card', 'boleto'],
      mode: 'payment',
      line_items: [{
        price_data: {
          currency: 'brl',
          product_data: {
            name: 'Destrava Redação Premium',
            description: '30 dias de acesso ilimitado'
          },
          unit_amount: 2390
        },
        quantity: 1
      }],
      customer_email: user_email,
      metadata: { user_id, user_email, user_name, plano: 'premium' },
      success_url: success_url || 'https://destravaenem.onrender.com/pagamento-sucesso',
      cancel_url: cancel_url || 'https://destravaenem.onrender.com/assinatura'
    });
    
    console.log('✅ Checkout criado:', session.id);
    res.json({ url: session.url, session_id: session.id });
    
  } catch (error) {
    console.error('❌ Erro ao criar checkout:', error);
    res.status(500).json({ error: 'Erro ao criar sessão de pagamento', details: error.message });
  }
});

// WEBHOOK STRIPE
app.post('/api/stripe/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  let event;
  
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
    console.log('🔔 Webhook recebido:', event.type);
  } catch (err) {
    console.error('❌ Erro webhook:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }
  
  try {
    switch (event.type) {
      case 'checkout.session.completed':
        const session = event.data.object;
        console.log('💳 Pagamento confirmado!', {
          email: session.customer_email,
          valor: session.amount_total / 100,
          user_id: session.metadata.user_id
        });
        break;
      
      case 'payment_intent.succeeded':
        const paymentIntent = event.data.object;
        console.log('✅ Pagamento processado:', paymentIntent.id);
        break;
        
      default:
        console.log(`ℹ️ Evento não tratado: ${event.type}`);
    }
    res.json({ received: true });
  } catch (error) {
    console.error('❌ Erro ao processar webhook:', error);
    res.status(500).json({ error: 'Erro ao processar webhook' });
  }
});

// ROTA PRINCIPAL
app.get('/', (req, res) => {
  res.json({ message: 'Servidor Destrava Redação IA funcionando!', status: 'online' });
});

// PÁGINA DE SUCESSO
app.get('/pagamento-sucesso', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
        <title>Pagamento Confirmado</title>
        <meta charset="utf-8">
        <style>
            body { font-family: Arial; text-align: center; padding: 50px; background: #f0f9ff; }
            .container { max-width: 500px; margin: 0 auto; background: white; padding: 30px; border-radius: 10px; }
            .success { color: #16a34a; font-size: 48px; margin-bottom: 20px; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="success">✅</div>
            <h1>Pagamento Confirmado!</h1>
            <p>Seu plano Premium foi ativado com sucesso.</p>
            <p>Você já pode usar todos os recursos da plataforma.</p>
            <a href="/" style="display: inline-block; margin-top: 20px; padding: 10px 20px; background: #3b82f6; color: white; text-decoration: none; border-radius: 5px;">Voltar ao App</a>
        </div>
    </body>
    </html>
  `);
});

// INICIAR SERVIDOR
app.listen(PORT, () => {
  console.log('='.repeat(50));
  console.log('🚀 Servidor Destrava Redação IA');
  console.log(`📡 Porta: ${PORT}`);
  console.log(`🌐 URL: https://destravaenem.onrender.com`);
  console.log(`✅ Status: ONLINE`);
  console.log('='.repeat(50));
});
