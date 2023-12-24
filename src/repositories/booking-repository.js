const { Booing } = require("../models");
const CrudRepository = require("./crud-repository");
const { Op } = require("sequelize");
const { Booking } = require("../models");
const { Enums } = require("../utils/common");
const { BOOKED, CANCELLED } = Enums.BOOKING_STATUS;
const { AppError } = require("../utils/errors");
const { StatusCodes } = require("http-status-codes");
class BooingRepository extends CrudRepository {
  constructor() {
    super(Booing);
  }

  async createBooking(data, transaction) {
    try {
      const booking = await Booking.create(data, { transaction: transaction });
      return booking;
    } catch (err) {
      throw err;
    }
  }

  async get(data, transaction) {
    const response = await Booking.findByPk(data, { transaction: transaction });
    if (!response) {
      throw new AppError(
        "Not able to find the resource.",
        StatusCodes.NOT_FOUND
      );
    }
    return response;
  }

  async update(id, data, transaction) {
    const response = await Booking.update(
      data,
      {
        where: {
          id: id,
        },
      },
      { transaction: transaction }
    );
    return response;
  }

  async cancelOldBookings(timestamp) {
    try {
      const response = await Booking.update(
        { status: CANCELLED },
        {
          where: {
            [Op.and]: [
              {
                createdAt: {
                  [Op.lt]: timestamp,
                },
              },
              {
                status: {
                  [Op.notIn]: [CANCELLED, BOOKED],
                },
              },
            ],
          },
        }
      );
      return response;
    } catch (error) {
      throw new AppError(
        "something went wrong while updating the bookings",
        StatusCodes.INTERNAL_SERVER_ERROR
      );
    }
  }
}

module.exports = BooingRepository;
