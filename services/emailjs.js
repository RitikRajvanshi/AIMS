// services/nodemailer.js
// import { SMTPClient } from 'emailjs';
const nodemailer = require('nodemailer');
// import emailjs from 'emailjs';
var email = require('emailjs/email');
const cron = require('node-cron');
const db = require('../dbconfig');
//For Gmail, you can use the
//  service: 'Gmail' option, and Nodemailer automatically knows the required SMTP settings (host, port, and secure) for Gmail.
//  It uses the Google SMTP (Simple Mail Transfer Protocol) server, which operates on secure port 465.

// const transporter = nodemailer.createTransport({
//   service: 'Gmail',
//   auth: {
//     user: 'ritik.rajvanshi@apvtechnolgies.com', // Replace with your Gmail email
//     pass: 'apv@123', // Replace with your Gmail password or an App Password
//   },
// });

//For outlook
// Unlike Gmail, Nodemailer does not have a pre-configured option for Outlook because there are multiple ways to set up Outlook for sending emails (e.g., Office 365, Outlook.com).
// Therefore, you need to specify the SMTP settings (host, port, and secure) explicitly for Outlook based on your specific Outlook configuration.

const mailConfig = {
	from: 'apvaims@apvtechnologies.com',
	to: 'ritik.rajvanshi@apvtechnologies.com',
	// cc: 'amit.tewari@apvtechnologies.com; akanksha.tripathi@apvtechnologies.com;  govind.wairya@apvtechnologies.com; shrey.srivastava@apvtechnologies.com',
	cc: 'shrey.srivastava@apvtechnologies.com;ritik.rajvanshi@apvtechnologies.com',
	info: ' ritik.rajvanshi@apvtechnologies.com;',
  };


const transporter = nodemailer.createTransport({
    host: '192.168.0.243',                      // Outlook SMTP server
    port: 25,                                   // Outlook SMTP port                                      
    secure: false,                             // true for secure TLS(Transport Layer Security) port 465, false for other ports
	ssl:false,
    tls: {
        rejectUnauthorized: false // Ignore any TLS certificate verification errors
      }
  });


 

//   // Create an email message
// const mailOptions = {
//     from: 'apvtechnologies1@gmail.com',
//     to: 'recipient@example.com',
//     subject: 'Test Email',
//     text: email_message,
// };

// Send the email
// transporter.sendMail(mailOptions, function(error, info){
//     if (error) {
//         console.log(error);
//     } else {
//         console.log('Email sent: ' + info.response);
// 		res.send('Email sent successfully');

//     }
// });


const mailCredentials={
    /**for local */

//email:"srivastava.siddharth",
email:"ritik.rajvanshi@apvtechnologies.com",
password : "",
host: "192.168.0.243",
ssl: true,
tls:false,
port: 25,
domain_name :'http://localhost:4200',

// mail_to_users_darMail3:'govind.wairya@apvtechnologies.com',
/**end------------------------------------------------------------------- */

// for local

// var server = email.server.connect({// user: "", //For Local
	// password: "", //For Local
	// host: "192.168.0.243", //For Local
	// ssl: false, //For Local
	// port: 25, //For Local
	// timeout: 20000 //For Local
// }); 
}



const sendEmail = (mailOptions) => {
    return new Promise((resolve, reject) => {
        transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
                reject(error);
            } else {
				console.log('Email Send', info);
                resolve(info);
            }
        });
    });
};


module.exports = { sendEmail,  mailConfig };