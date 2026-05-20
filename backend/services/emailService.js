import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: process.env.SMTP_PORT || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export const sendBookingConfirmation = async (booking, event, user) => {
  const ticketUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/bookings/${booking.id}/ticket`;

  const mailOptions = {
    from: process.env.SMTP_USER,
    to: booking.customer_email || user.email,
    subject: `Your K-MER Event Ticket - ${booking.booking_number}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #070b18; color: white; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #00ffd5; margin: 0;">K-MER Events</h1>
          <p style="color: #ffffff; margin: 10px 0;">Your ticket confirmation</p>
        </div>

        <div style="background: rgba(255, 255, 255, 0.05); padding: 20px; border-radius: 10px; margin-bottom: 20px;">
          <h2 style="color: #ffffff; margin-top: 0;">${event.title}</h2>
          <p style="color: #ffffff; margin: 5px 0;"><strong>Booking Number:</strong> ${booking.booking_number}</p>
          <p style="color: #ffffff; margin: 5px 0;"><strong>Date:</strong> ${new Date(event.start_date).toLocaleDateString()}</p>
          <p style="color: #ffffff; margin: 5px 0;"><strong>Venue:</strong> ${event.venue}</p>
          <p style="color: #ffffff; margin: 5px 0;"><strong>Quantity:</strong> ${booking.quantity}</p>
          <p style="color: #ffffff; margin: 5px 0;"><strong>Total:</strong> $${booking.total_price.toFixed(2)}</p>
        </div>

        <div style="text-align: center; margin: 30px 0;">
          <a href="${ticketUrl}" style="background: #00ffd5; color: #070b18; padding: 15px 30px; text-decoration: none; border-radius: 25px; font-weight: bold; display: inline-block;">
            Download Your Ticket
          </a>
        </div>

        <div style="background: rgba(255, 255, 255, 0.05); padding: 15px; border-radius: 10px; margin-bottom: 20px;">
          <h3 style="color: #ffffff; margin-top: 0;">Important Information</h3>
          <ul style="color: #ffffff; padding-left: 20px;">
            <li>Present this ticket at the venue entrance</li>
            <li>Keep this email for your records</li>
            <li>Tickets are non-transferable</li>
            <li>Arrive 30 minutes before the event</li>
          </ul>
        </div>

        <div style="text-align: center; color: #ffffff; font-size: 12px;">
          <p>Thank you for choosing K-MER Events!</p>
          <p>Questions? Contact us at support@kmer-events.com</p>
        </div>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`✅ Confirmation email sent to ${booking.customer_email || user.email}`);
  } catch (error) {
    console.error('❌ Failed to send confirmation email:', error);
  }
};
