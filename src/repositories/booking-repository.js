const { Booing } = require("../models");
const CrudRepository = require("./crud-repository");
const { Op } = require("sequelize");
const { Booking } = require("../models");
const { Enums } = require("../utils/common");
const { BOOKED, CANCELLED } = Enums.BOOKING_STATUS;

class BooingRepository extends CrudRepository {
  constructor() {
    super(Booing);
  }

  async createBooking(data, transaction) {
    try {
      const booking = await Booking.create(data, { transaction: transaction });
      return booking;
    } catch (err) {
      return err;
    }
  }
}

module.exports = BooingRepository;
