import prisma from ".."
import AppError from "../../error/AppError";




// In production, these should be in your .env file
const store_id = process.env.SSLCZ_STORE_ID || "testbox";
const store_passwd = process.env.SSLCZ_STORE_PASSWORD || "qwerty";
const is_live = process.env.NODE_ENV === "production";// false for sandbox

//Base URL of your backend server for gateway callbacks
const SERVER_URL = process.env.SERVER_URL || "http://localhost:5000";

/**
 * Initiate payment
 */
const initiatePaymentService = async (userId, payload) => {
    const { invoiceId, amount } = payload;

    //Fetch user details needed for the gateway
    const user = await prisma.user.findunique({
        where: { id: userId },
        select: { email: true, username: true},
    });

    if(!user) throw new AppError(httpStatus.NOT_FOUND, "User not found");

    //Generate a unique transaction ID
    const tranId = `TXN_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

    //Create s PENDING record in our database
    await prisma.paymentLog.create({
        data: {
            userId,
            invoiceId,
            tranId,
            amount,
            status: "PENDING",
        }, 
    });

  //Prepare data for SSLCommerz
    const data = {
        total_amount: amount,
        currency: "BDT",
        tran_id: tranId,
        success_url: `${SERVER_URL}/api/payment/success`,
        fail_url: `${SERVER_URL}/api/payment/fail`,
        cancel_url: `${SERVER_URL}/api/payment/cancel`,
        ipn_url: `${SERVER_URL}/api/payment/ipn`,
        shipping_method: "NO",
        product_name: `Invoice Payment: ${invoiceId}`,
        product_category: "Education",
        product_profile: "non-physical-goods",
        cus_name: user.username,
        cus_email: user.email,
        cus_add1: "Dhaka",
        cus_city: "Dhaka",
        cus_postcode: "1000",
        cus_country: "Bangladesh",
        cus_phone: "01711111111", // Replace with actual user phone
    };

    //Initial SSLCommerz
    const sslcz = new SSLCommerzPayment(store_id, store_passwd, is_live);
    const apiResponse = await sslcz.init(data);

    if(!apiResponse?.GatewayPageURL){
        throw new AppError(httpStatus.BAD_GATEWAY, "Failed to connect to Payment Gateway");
    }

    return {
        gatewayUrl: apiResponse.GatewayPageURL,
    };

};

/**
 * Validate and Update payment
 */
const ValidateAndUpdatePaymentService = async (gatewayData) => {
    const { tran_id, val_id, status, card_type } = gatewayData;

    //Find the payment in our DB
    const payment = await prisma.paymentLog.findUnique({
        where: { tranId: tran_id},
    });

    if(!payment) {
        throw new AppError(httpStatus.NOT_FOUND, "Transaction not found in database");
    }

    //Idempotency Check: If already processed, don't process again
    if(payment.status === "SECCESS"){
        return payment;
    }

    //If Gateways says VALID/VALIDAED, we double-check via API (Security requirment)
    if(status === "VALID" || status === "VALIDATED"){
        const sslcz = new SSLCOmmerzPayment(store_id, store_passwd, is_live);

        //validate() pings SSLCommerz server-to-server to ensure the payload isn't spoofed
        const validateionResponse = await sslcz.validate({ val_id });

        if(validateionResponse.status === "VALID" || validateionResponse.status === "VALIDATED"){
            // Updated Database
            const updatePayment = await prisma.paymentLog.update({
                where: { tranId: tran_id },
                data: {
                    status: "SUCCESS",
                    valId: val_id,
                    paymentMethod: card_type,
                },
            });
        }
    }
}