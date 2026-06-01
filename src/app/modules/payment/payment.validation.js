import { z } from "zod";

const initiatePaymentValiadionSchema = z.object({
    body: z.object({
        invoiceId: z.string({ required_error : "Amount Id is required"}),
        amount: z
          .number({ required_error: "Amount is required"})
          .positive("Amount must greater than 0"),
          //You can add more fields like customer name/phone if you want the frontend to pass them,
          //but typically it's safer to fetch those from the DB using the logged-in user's ID.
    }),
});

export const paymentValidation = {
    initiatePaymentValiadionSchema,
};