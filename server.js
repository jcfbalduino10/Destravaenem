const express = require("express");
const app = express();
const Stripe = require("stripe");
const cors = require("cors");

app.use(cors());
app.use(express.json());

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

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

app.get("/", (req, res) => {
  res.send("Servidor Stripe funcionando!");
});

app.listen(process.env.PORT || 3000, () =>
  console.log("Servidor rodando na porta 3000")
);
