const { BookingRepository } = require("../repositories");
const { StatusCodes } = require("http-status-codes");
const { ServerConfig } = require("../config");
const axios = require("axios");
const { Enums } = require("../utils/common");
const db = require("../models");
const { AppError } = require("../utils/errors");

const bookingRepository = new BookingRepository();
const { BOOKED, CANCELLED } = Enums.BOOKING_STATUS;

async function createBooking(data) {
  const transaction = await db.sequelize.transaction();
  try {
    const flight = await axios.get(
      `${ServerConfig.FLIGHT_SERVICE}/api/v1/flights/${data.flightId}`
    );
    const flightData = flight.data.data;
    if (data.noOfSeats > flightData.totalSeats) {
      return new AppError(
        "not enough available seats",
        StatusCodes.BAD_REQUEST
      );
    }
    const totalBookingAmount = data.noOfSeats * flightData.price;
    const bookingPayload = { ...data, totalCost: totalBookingAmount };
    const booking = await bookingRepository.createBooking(
      bookingPayload,
      transaction
    );
    console.log("booking object:", booking);
    await axios.patch(
      `${ServerConfig.FLIGHT_SERVICE}/api/v1/flights/${data.flightId}/seats`,
      {
        seats: data.noOfSeats,
      }
    );
    //console.log("updated flight:", updatedFlight);
    await transaction.commit();
    return booking;
  } catch (err) {
    console.log("error:", err);
    await transaction.rollback();
    return err;
  }
}

module.exports = {
  createBooking,
};
