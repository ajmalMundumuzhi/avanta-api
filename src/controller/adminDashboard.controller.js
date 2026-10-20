
const Property = require("../models/Property");
const Booking = require("../models/Booking");
const Inquiry = require("../models/Inquiry");

exports.getDashboard = async (req, res, next) => {
  try {
    const [
      totalProperties,
      activeProperties,
      totalBookings,
      pendingBookings,
      confirmedBookings,
      totalInquiries,
      pendingInquiries,
      revenueResult,
    ] = await Promise.all([
      Property.countDocuments(),
      Property.countDocuments({ isActive: true }),
      Booking.countDocuments(),
      Booking.countDocuments({ status: "pending" }),
      Booking.countDocuments({
        status: "confirmed",
        "payment.status": "paid",
      }),
      Inquiry.countDocuments(),
      Inquiry.countDocuments({
        status: { $in: ["pending", "new", "unread"] },
      }),
      Booking.aggregate([
        {
          $match: {
            status: "confirmed",
            "payment.status": "paid",
          },
        },
        {
          $group: {
            _id: null,
            total: {
              $sum: {
                $ifNull: [
                  "$priceBreakdown.total",
                  {
                    $ifNull: [
                      "$priceBreakdown.totalAmount",
                      "$priceBreakdown.totalPrice",
                    ],
                  },
                ],
              },
            },
          },
        },
      ]),
    ]);

    return res.status(200).json({
      success: true,
      data: {
        properties: {
          total: totalProperties,
          active: activeProperties,
        },
        bookings: {
          total: totalBookings,
          pending: pendingBookings,
          confirmedAndPaid: confirmedBookings,
        },
        inquiries: {
          total: totalInquiries,
          pending: pendingInquiries,
        },
        revenue: {
          amount: revenueResult[0]?.total || 0,
          currency: "AUD",
        },
      },
    });
  } catch (error) {
    next(error);
  }
};
