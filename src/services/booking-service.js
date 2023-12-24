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
      throw new AppError("not enough available seats", StatusCodes.BAD_REQUEST);
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
    await transaction.rollback();
    if (err.code == "ECONNREFUSED") {
      throw new AppError(
        "The flight service is down:",
        StatusCodes.INTERNAL_SERVER_ERROR
      );
    }
    throw new AppError(
      "Some thing went wrong while booking",
      StatusCodes.INTERNAL_SERVER_ERROR
    );
  }
}

async function makePayment(data) {
  const transaction = await db.sequelize.transaction();
  try {
    const bookingDetails = await bookingRepository.get(
      data.bookingId,
      transaction
    );
    if (bookingDetails.status === CANCELLED) {
      throw new AppError("the booking is expired", StatusCodes.BAD_REQUEST);
    }
    const bookingTime = new Date(bookingDetails.createdAt);
    const currentTime = new Date();
    if (currentTime - bookingTime > 300000) {
      await cancelBooking(data.bookingId);
      throw new AppError("the booking is expired", StatusCodes.BAD_REQUEST);
    }
    if (bookingDetails.totalCost != data.totalCost) {
      throw new AppError("the booking is expired", StatusCodes.BAD_REQUEST);
    }
    if (bookingDetails.userId != data.userId) {
      throw new AppError(
        "There is no booking for this user",
        StatusCodes.BAD_REQUEST
      );
    }
    // here we assume that payment is done
    await bookingRepository.update(
      data.bookingId,
      { status: BOOKED },
      transaction
    );
    await transaction.commit();
  } catch (err) {
    console.log("error in bookingService", err);
    await transaction.rollback();
    throw err;
  }
}

async function cancelBooking(bookingId) {
  const transaction = await db.sequelize.transaction();
  try {
    const bookingDetails = await bookingRepository.get(bookingId, transaction);
    if (bookingDetails.status == CANCELLED) {
      await transaction.commit();
      return true;
    }
    const response = await axios.patch(
      `${ServerConfig.FLIGHT_SERVICE}/api/v1/flights/${bookingDetails.flightId}/seats`,
      {
        seats: bookingDetails.noOfSeats,
        dec: 0,
      }
    );
    console.log("seats added:", response);
    await bookingRepository.update(
      bookingId,
      { status: CANCELLED },
      transaction
    );
    await transaction.commit();
    return true;
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}

async function cancelOldBookings() {
  console.log("inside cancelOldBookings");
  try {
    const timestamp = new Date(Date.now() - 1000 * (5 * 60));
    const response = await bookingRepository.cancelOldBookings(timestamp);
    return response;
  } catch (error) {
    throw error;
  }
}

module.exports = {
  createBooking,
  makePayment,
  cancelOldBookings,
};
