const nodemailer = require("nodemailer");
require("dotenv").config();

const otpStore = {}; 
exports.generateOTP = () =>
  Math.floor(100000 + Math.random() * 900000).toString(); 

exports.saveOTP = (email, otp) => {
  otpStore[email] = {
    otp,
    expiresAt: Date.now() + 5 * 60 * 1000, 
  };
};

exports.verifyOTP = (email, otp) => {
  const record = otpStore[email];
  if (!record) return false;

  const isValid = record.otp === otp && record.expiresAt > Date.now();
  if (isValid) delete otpStore[email]; 

  return isValid;
};

const transporter = nodemailer.createTransport({
  service: "Gmail",
  auth: {
    user: "athulraj2027@gmail.com",
    pass: "esjt bulm isvz neqd",
  },
});

transporter.verify((error, success) => {
  console.log(process.env.EMAIL,process.env.EMAIL_PASSWORD)
  if (error) {
    console.error("Error with email transport configuration:", error);
  } else {
    console.log("Email transport configuration is successful");
  }
});

exports.sendOTP = (email, otp) => {
  const mailOptions = {
    from: process.env.EMAIL,
    to: email,
    subject: "Your OTP Code",
    text: `Your OTP code is ${otp}`,
  };

  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.error("Error sending email:", error);
    } else {
      console.log("Email sent: " + info.response);
    }
  });
};
