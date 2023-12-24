const { BookingController } = require("../../controllers");
const express = require("express");
const router = express.Router();

router.post("/", BookingController.createBooking);
// /api/v1/bookings/payment
router.post("/payments", BookingController.makePayment);

module.exports = router;
