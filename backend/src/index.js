import express from 'express';

import SERVER_CONFIGS from './server';

import dotenv from 'dotenv';
import cors from 'cors';

const app = express();
app.use(express.json());

require('dotenv').config();

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const bodyParser = require('body-parser');

const fs = require('fs');

const paymentApi = app => {

    // Simple ping for Postman checks
    app.get('/', (req, res) => {
        res.send({
            message: 'Ping from Checkout Server',
            timestamp: new Date().toISOString(),
            env: process.env.NODE_ENV,
        });
    });

    // Handle paymentIntent from client
    app.post('/create-payment-intent', async (req, res) => {
        const { items, currency } = req.body;

        console.log(items);
        console.log(currency);

        // Create a paymentIntent for $4.99 (use items / currency later)
        const paymentIntent = await stripe.paymentIntents.create({
            amount:    499,
            currency: 'usd'
        });

        console.log(paymentIntent.client_secret);

        // Send publishable key and PaymentIntent details to client
        res.send({
            publishableKey: process.env.STRIPE_PUBLISH_KEY,
            clientSecret: paymentIntent.client_secret
        });
    });

    // Handle webhooks from Stripe
    app.post(
        '/webhook',
        bodyParser.raw({type: 'application/json'}),
        (request, response) => {
        let event;
 
        // Fix this -- clean this up
        try {
            event = request.body;
        } catch (err) {
            response.status(400).send(`Webhook Error: ${err.message}`);
        }

        // Handle the event
        switch (event.type) {
            case 'payment_intent.created':
                // Ignore this
                break;

            case 'payment_intent.succeeded':
                const paymentIntent = event.data.object;
                console.log('PaymentIntentx was successful!')
                console.log(paymentIntent.client_secret);

                let record = 'New payment info\n' +
                             'id= ' + paymentIntent.id + '\n' +
                             'created= ' + paymentIntent.created + '\n' +
                             'amount= ' + paymentIntent.amount + '\n' +
                             'currency= ' + paymentIntent.currency + '\n\n';

                fs.appendFile(
                    process.env.OUTPUT_FILE,
                    record,
                    function(err) {
                        if(err) {
                            // Hack because Heroku isn't playing nice
                            // and I'm having trouble with webhooks on localhost
                            console.log(record);
                        } else {
                            console.log("The file was saved!");
                        }
                });

                break;

            default:
                // Unexpected event type
                console.log("Unexpected webhook");
                console.log(event.type);

                return response.status(400).end();
        }

        // Return a 200 response to acknowledge receipt of the event
        response.json({received: true});
    });

    return app;
};

const configureServer = app => {
    app.use(
        express.json({
            // Because Stripe needs the raw body,
            // we compute it but only when hitting the Stripe callback URL.
            verify: (req, res, buf) => {
                if (req.originalUrl.startsWith('/payment/session-complete')) {
                    req.rawBody = buf.toString();
                }
            },
        })
    );
};

app.use(cors());
app.get('/products/:id', function (req, res, next) {
    res.json({msg: 'This is CORS-enabled for all origins!'})
});

const PORT = 3323;
app.listen(PORT, err => {
    if(err) throw err;
    console.log("%c Server running", "color: green");
});

configureServer(app);
paymentApi(app);

app.listen(SERVER_CONFIGS.PORT, error => {
  if (error) throw error;

  console.log('Server running on port: ' + SERVER_CONFIGS.PORT);

});
