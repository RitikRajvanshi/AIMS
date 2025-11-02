var express = require('express');
const jwt = require('jsonwebtoken');
var router = express.Router();
var db = require('../dbconfig');
let secretKey = "5d8424d84c1b3e816490ed0b072dc7113c48d73e37633bfb41f6b7abdaaa8c9515d5b0c2ab89901f8eaf61cc638b02f495d1719c82076f00d70277bbb63c09cc";
// var generator = require('generate-password');
const moment = require('moment');
const { sendEmail, mailConfig } = require('../services/emailjs');
const { error, message } = require('emailjs');

router.post('/login', async (req, res, next) => {
    try {
        const { user_email, user_name, user_password } = req.body;
        const verification = `SELECT * FROM login_varification($1,$2)`;
        const results = await db.query(verification, [user_email, user_password]);
        if (results.rows.length > 0) {

            const token = jwt.sign(results.rows[0], secretKey, { expiresIn: '24h' });

            if (results.rows.length > 0) {
                let data = results.rows[0];
                
                res.status(200).json(
                    {
                        message: 'true', token, data

                    });


            }
            else {

                res.status(200).json({ message: 'false' });

            }

            //token generation
            // jwt.sign(results.rows[0], secretKey, { expiresIn: '24h' }, (err, token) => {
            //     if (err) {
            //         throw err;
            //     }

            //     else {

            //         if (results.rows.length > 0) {
            //             let data = results.rows[0];
            //             res.status(200).json(
            //                 {
            //                     message: 'true', token, data

            //                 });


            //         }
            //         else {

            //             res.status(200).json({ message: 'false' });

            //         }



            //     }
            // })

        }

        else {
            res.status(200).json({ message: 0 })
        }
    }
    catch (error) {
        console.error('Error during login:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});


router.get('/companyregisteredorNot', async (req, res) => {

    const countcompanyregistration = `select count(*) from company_registration`;
    const results = await db.query(countcompanyregistration);
    if (results && results.rows[0].count > 0) {
        res.status(200).json({ 'register': 1 });
    }
    else {
        res.status(200).json({ 'register': 0 });
    }

    // db.query('select count(*) from company_registration', (err, results) => {
    //     // console.log(results);

    //     if (results && results.rows[0].count > 0) {
    //         res.status(200).json({ 'register': 1 });
    //     }
    //     else {
    //         res.status(200).json({ 'register': 0 });
    //     }
    // });
});


router.post('/addInitalData', async (req, res) => {

    try {
        let { user_name, user_email } = req.body
        let password = `superAdmin@123`;
        let privilegename = 'SuperAdmin';
        // const date = new Date();
        // let day = date.getDate();
        // const month = (date.getMonth() + 1).toString().padStart(2, '0'); // Zero-padding
        // let year = date.getFullYear();
        let currentDate = moment().format('YYYY-MM-DD');

        userData = {
            "user_name": user_name,
            "user_email": user_email,
            "grp_id": null,
            "privilege_id": 1,
            "designation_id": null,
            "modified_by": 1,
        };
        await db.query('BEGIN');

        const insertUser = `Select * from adduser($1,$2,$3,null, 1, null,'1','1')`;
        const values = [user_name, password, user_email];
        // console.log(insertUser, "insertUser")
        await db.query(insertUser, values)

        //Insert Privilege
        const insertPrivilege = `INSERT INTO privilege(privilege_name, privilege_creation_date, privilege_status, modified_by, level) VALUES ($1,$2,$3,$4,$5)`;
        const privilegevalues = [privilegename, currentDate, '1', '1', 1];
        await db.query(insertPrivilege, privilegevalues);
        await db.query('COMMIT');

        res.status(200).json({ message: 'User Created Successfully' });

    }
    catch (error) {
        await db.query('ROLLBACK');

        console.error('Database Error:', error);
        res.status(500).json({ message: 'Intenal Server Error' });

    }

});


router.post('/forgetPassword', async (req, res) => {
    console.log(req.body, "req.body")
    const { user_email } = req.body; // Extract user_email from the request body

    // Check if the email is provided
    if (!user_email) {
        return res.status(400).json({ message: "Email is required" });
    }

    const query = `SELECT * FROM users WHERE user_email = $1`;

    try {
        const userData = await db.query(query, [user_email]); // Use user_email here

        if (userData.rows.length === 0) {
            return res.status(404).json({ message: "User  Not Found" });
        }

        // console.log(userData.rows, "userData.rows");

        // Assuming the password is stored in plain text (not recommended)
        const password = userData.rows[0].user_password; // Get the password from the user data

        // Prepare email structure
        let mailOptions = {
            from: 'apvaims@apvtechnologies.com',
            to: user_email,
            cc:mailConfig.cc,
            subject: `Forget Password: ${process.env.ENVIRONMENT_STATUS}`,
           html: `
            <div style="font-family: Arial, sans-serif; padding: 20px; background-color: #f4f4f4; border-radius: 8px; max-width: 600px; margin: auto;">
                <p style="font-size: 16px; color: #555;">
                    We received a request to send you your password. Please find it below:
                </p>
                <h2 style="color: green; font-weight: bold;">${password}</h2>
                <p style="font-size: 16px; color: #555;">
                    If you did not request this email, please ignore it.
                </p>
                <hr style="border: 1px solid #ccc;">
                <p style="font-size: 14px; color: #777;">
                    Thank you,<br>
                    The Administrator Team,
                </p>
            </div>
        `
        };

        // Send email
        await sendEmail(mailOptions);
        console.log(`Password sent to ${user_email}`);
        res.status(200).json({ success: true, message: "Password sent to your email." });
    } catch (err) {
        console.error(err);
        res.status(500).json({success: false, message: "Internal Server Error" });
    }
});

// const sendEmail = (mailOptions) => {
//     return new Promise((resolve, reject) => {
//         transporter.sendMail(mailOptions, (error, info) => {
//             if (error) {
//                 reject(error);
//             } else {
// 				console.log('Email Send', info);
//                 resolve(info);
//             }
//         });
//     });
// };

router.post('/changePassword', async (req, res) => {
    console.log(req.body, "changePassword");
    const { user_email, old_password, new_password } = req.body;
    const checkQuery = `Select * from users where user_email = $1`;
    const updateQuery = `Update users set user_password = $1 where user_email = $2`;
  
    try {
      await db.query('BEGIN');
      const checkEmail = await db.query(checkQuery, [user_email]);
      console.log(checkEmail.rows, "checkEmail.body");
  
      if (checkEmail.rows.length == 0) {
        //  User not found
        await db.query('ROLLBACK');
        return res.status(201).json({ success: false, message: 'User not found' });
      }
  
      //user exists old password is incorrect 
      const user = checkEmail.rows[0];
      if (user.user_password !== old_password) {
        // Old password is incorrect
        await db.query('ROLLBACK');
        return res.status(201).json({ success: false, message: 'Old password is incorrect' });
      }

      if(old_password == new_password){
        // New password never be same
        await db.query('ROLLBACK');
        return res.status(201).json({ success: false, message: 'New password can\'t same as old password!' });

      }
  
      await db.query(updateQuery, [new_password, user_email]);
      await db.query('COMMIT');
      return res.status(200).json({ success: true });
    }
    catch (err) {
      await db.query('ROLLBACK');
      console.error(err);
      return res.status(500).json({ success: false, message: 'Internal server error' });
    }
  
    // db.query(`SELECT * FROM registercompany($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`, [company_logo, company_logo2, company_name, nick_name, address, telephone_no, mobile1, mobile2, registered_email, status, created_by, gstin]
    //     , (err, result) => {
  
    //         if (err) {
    //             throw err;
    //         }
    //         res.status(200).json(result.rows);
    //     })
  
  })

module.exports = router;