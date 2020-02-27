import React from 'react';
import {useStripe, useElements, CardElement} from '@stripe/react-stripe-js';

//import CardSection from './CardSection';

export default function CheckoutForm() {
    const stripe = useStripe();
    const elements = useElements();

    const handleSubmit = async (event) => {
        // We don't want to let default form submission happen here,
        // which would refresh the page.
        event.preventDefault();

        if (!stripe || !elements) {
            // Stripe.js has not yet loaded.
            // Make sure to disable form submission until Stripe.js has loaded.
            return;
        }

        // Get the clientSecret from the backend
        let clientSecret = 0;
        console.log(process.env.REACT_APP_API_URL + '/create-payment-intent');
        await fetch(process.env.REACT_APP_API_URL + '/create-payment-intent',
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json'},
                body: JSON.stringify({ items: 1, currency : 'usd'})
            })
            .then(response => response.json())
            .then(response => {
                console.log(response)
                clientSecret = response.clientSecret
            });

        console.log(clientSecret);

        // Submit card details to Stripe
        const result = await stripe.confirmCardPayment(
            clientSecret,
            {
                payment_method:
                {
                    card: elements.getElement(CardElement),
                    billing_details: {
                        name: 'Jenny Rosen',
                    },
                }
            });

        if (result.error) {
            // Show error to your customer (e.g., insufficient funds)
            console.log(result.error.message);
        } else {
            // The payment has been processed!
            if (result.paymentIntent.status === 'succeeded') {

                // Show a success message to your customer
                console.log('Payment has been processed. Watch for webhook.');
            } else {
                console.log('Other payment status: ' +
                    result.paymentIntent.status);
            }
        }
    };

    // Display the Card UI and set up submit handler
    return (
        <form onSubmit={handleSubmit}>
            <CardElement />
                <button type="submit" disabled={!stripe}>
                    Pay $4.99
                </button>
        </form>
    );
};
