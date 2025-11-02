var express = require('express');
var router = express.Router();
var db = require('../dbconfig');
const jwt = require('jsonwebtoken');
const secretKey = "5d8424d84c1b3e816490ed0b072dc7113c48d73e37633bfb41f6b7abdaaa8c9515d5b0c2ab89901f8eaf61cc638b02f495d1719c82076f00d70277bbb63c09cc";
const { sendEmail, mailConfig } = require('../services/emailjs');
const moment = require('moment');
const fs = require('fs');
const path = require('path');

function ensureToken(req, res, next) {
    const bearerHeader = req.headers["authorization"];


    if (typeof bearerHeader !== 'undefined') {
        console.log('bearerHeader', bearerHeader);

        const bearer = bearerHeader.split(" ");

        console.log('bearer', bearer);

        const bearerToken = bearer[1];
        req.token = bearerToken;


        jwt.verify(req.token, secretKey, (err, authData) => {
            if (err) {
                if (err.name === 'TokenExpiredError') {
                    // Token has expired
                    // Access the expiration time using err.expiredAt
                    const expirationTime = err.expiredAt;
                    res.status(403).json({ message: 'Token expired', expirationTime });
                } else {

                    res.sendStatus(403);
                }

            }
            else {
                next();
            }
        });

    } else {
        res.sendStatus(403);
    }
};

//Admin
//done operation by checking
router.post('/deletecategorydetailbycheck', ensureToken, (req, res) => {
    let category_id = req.body.category_id;

    db.query(`SELECT * FROM delete_product_detail_check($1)`,[category_id], (err, results) => {
        if (err) {
            throw err
        }

        res.status(200).json(results.rows[0]);
    });
});

router.get('/getproductDatabystatus', ensureToken, (req, res) => {

    db.query(`SELECT * FROM get_product_databystatus()`, (err, results) => {
        if (err) {
            throw err
        }

        res.status(200).json(results.rows);
    });
});


router.post('/deactivateproductstatuscheck', ensureToken, (req, res) => {
    let productid = req.body.product_id;
    db.query(`SELECT * FROM change_productstatus_byid($1)`,[productid] ,(err, results) => {
        if (err) {
            throw err
        }

        res.status(200).json(results.rows[0]);
    });
});

router.get('/getcategorytDatabystatus', ensureToken, (req, res) => {

    db.query(`SELECT * FROM get_category_databystatus() order by category_id desc;`, (err, results) => {
        if (err) {
            throw err
        }

        res.status(200).json(results.rows);
    });
});

router.post('/deactivateCategorystatuscheck', ensureToken, (req, res) => {
    let category_id = req.body.category_id;
    db.query(`SELECT * FROM deactivate_category_detail_check($1)`,[category_id], (err, results) => {
        if (err) {
            throw err
        }

        res.status(200).json(results.rows[0]);
    });
});

router.get('/getprivilegeDatabystatus', ensureToken, (req, res) => {

    db.query(`SELECT * FROM get_privilege_databystatus() order by privilege_id desc`, (err, results) => {
        if (err) {
            throw err
        }
        res.status(200).json(results.rows);
    });
});

router.post('/deactivatePrivilegestatuscheck', ensureToken, (req, res) => {
    let privilegeId = req.body.privilege_id;

    db.query(`SELECT * FROM deactivate_privilege_detail_check($1)`,[privilegeId], (err, results) => {
        if (err) {
            throw err
        }
        res.status(200).json(results.rows);
    });
});

router.get('/getdesignationDatabystatus', ensureToken, (req, res) => {
    db.query(`SELECT * FROM get_designation_databystatus() order by designation_id desc`, (err, results) => {
        if (err) {
            throw err;
        }

        res.status(200).json(results.rows);
    });
});

router.post('/deactivateDesingationstatuscheck', ensureToken, (req, res) => {
    let designation_id = req.body.designation_id;
    db.query(`SELECT * FROM deactivate_designation_detail_check($1)`,[designation_id], (err, results) => {
        if (err) {
            throw err
        }
        res.status(200).json(results.rows);
    });
});

router.get('/getgroupDatabystatus', ensureToken, (req, res) => {

    db.query(`SELECT * FROM get_group_databystatus() order by grp_id desc`, (err, results) => {
        if (err) {
            throw err
        }

        res.status(200).json(results.rows);
    });
});

router.post('/deactivateGroupstatuscheck', ensureToken, (req, res) => {
    let grp_id = req.body.grp_id;
    console.log(grp_id);

    db.query(`SELECT * FROM deactivate_group_detail_check($1)`,[grp_id], (err, results) => {
        if (err) {
            throw err
        }
        res.status(200).json(results.rows);
    });
});

router.get('/getLocationbystatus', ensureToken, async(req, res) => {

    db.query(`SELECT * FROM get_location_databystatus() order by location_id desc`, (err, results) => {
        if (err) {
            throw err
        }

        res.status(200).json(results.rows);
    });
});

router.post('/deactivateLocationstatusbyid', ensureToken, (req, res) => {
    let location_id = req.body.location_id;

    db.query(`SELECT * FROM deactivate_locationstatus_byid($1)`,[location_id], (err, results) => {
        if (err) {
            throw err
        }
        res.status(200).json(results.rows);
    });
});

// router.post('/deactivateuserstatusbyid', (req,res)=>{
//     let user_id = req.body.user_id;

//     db.query(`SELECT * FROM deactivate_userstatus_byid(${user_id})`, (err, results)=>{
//         if(err){
//             throw err
//         }
//         res.status(200).json(results.rows);
//     })

// })

router.post('/verificationofpIdinsupplierEvaluation', ensureToken, (req, res) => {
    let purchase_id = req.body.purchase_id;

    db.query(`SELECT * FROM verification_of_supplierevaluation($1)`,[purchase_id], (err, result) => {

        if (err) {
            throw err;
        }
        res.status(200).json(result.rows);
    });
});

//users

router.post('/onacceptrequest', ensureToken, (req, res) => {
    let request_id = req.body.request_id;

    db.query(`SELECT * FROM change_requeststatus_onaccept($1)`,[request_id], (err, results) => {
        if (err) {
            throw err
        }
        res.status(200).json(results.rows);
    });
});

router.post('/onrejectrequest', ensureToken, async (req, res) => {
    try {

        let request_id = req.body.request_id;
        let rejection_reason = req.body.rejection_reason;
        const modified_date = moment().format('YYYY-MM-DD');
        const requestdetail = await db.query(`Select * from request where request_id = $1`, [request_id]);
        console.log(requestdetail.rows[0], "requestdetail");
        const { quantity, request_item, remark, estimated_price} = requestdetail.rows[0];

        const message = `Request rejected for ${quantity} ${request_item} :${process.env.ENVIRONMENT_STATUS}.`

        const mailOptions = {
            from: 'apvaims@apvtechnologies.com',
            to: mailConfig.to,
            cc: mailConfig.cc,
            subject: message,
            html: `
            <div style="font-family: Arial, sans-serif; padding: 10px;">
            <table style="width: 50%; max-width: 400px; margin: 0 auto; border-collapse: collapse; border: 1px solid #000; background-color: #eaf6ff;">
                <tr style="border: 1px solid black; background-color: #b3d9ff;">
                    <th colspan="2" style="text-align: center; padding: 10px;">
                        <h3 style="margin: 0; color: #004080;">Email from <b>APVAIMS</b></h3>
                    </th>
                </tr>
                <tr style="border: 1px solid black;">
                    <td style="padding: 10px;"><b>Requested Item:</b></td>
                    <td style="padding: 10px;">${request_item}</td>
                </tr>
                <tr style="border: 1px solid black;">
                    <td style="padding: 10px;"><b>Quantity:</b></td>
                    <td style="padding: 10px;">${quantity}</td>
                </tr>
                <tr style="border: 1px solid black;">
                    <td style="padding: 10px;"><b>Estimated Price:</b></td>
                    <td style="padding: 10px;">${estimated_price}</td>
                </tr>
                <tr style="border: 1px solid black;">
                    <td style="padding: 10px;"><b>Remark:</b></td>
                    <td style="padding: 10px;">${remark}</td>
                </tr>
                <tr style="border: 1px solid black;">
                <td style="padding: 10px;"><b>Rejection Reason(if any):</b></td>
                <td style="padding: 10px;">${rejection_reason}</td>
            </tr>
                <tr style="border: 1px solid black;">
                    <td style="padding: 10px;"><b>Status:</b></td>
                    <td style="padding: 10px;"><p style="margin: 0; color: red;">Rejected</p></td>
                </tr>


                <tr style="border: 1px solid black;">
                    <td colspan="2" style="padding: 10px;">
                        <hr style="border-color: #004080;">
                        <h4 style="margin: 0; color: #004080;">This email is sent from APVAIMS(http://192.168.0.112/ims).</h4>
                    </td>
                </tr>
            </table>
             <div style="margin-top: 100px; font-size: 14px; color: #888; text-align:center">
        This is an auto-generated email intended solely for internal use by APV Technologies Pvt. Ltd. Please do not reply to this mail.
            </div>
        </div>
            `,
        };  
        db.query('BEGIN');
        // let changerequeststatusquery = `SELECT * FROM change_requeststatus_onreject(${request_id})`;
        let changerequeststatusquery = `SELECT * FROM change_requeststatus_onreject($1)`;
        let valuesforchangerequeststatusquery = [request_id];
        // let query2 = `Update request set rejection_reason='${rejection_reason}', modified_date='${modified_date}' where request_id=${request_id}`;
        let updaterequestquery = `Update request set rejection_reason=$1, modified_date=$2 where request_id=$3`;
        let valuesforupdaterequestquery = [rejection_reason, modified_date, request_id];

        await db.query(changerequeststatusquery, valuesforchangerequeststatusquery);
        await db.query(updaterequestquery, valuesforupdaterequestquery);
           // Send email
        await sendEmail(mailOptions);
        db.query('COMMIT');
        res.status(200).json({ message: 'Request Rejected Successfully...' });
    }
    catch (error) {
        db.query('ROLLBACK');
        console.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});


router.post('/verificationofItems', ensureToken, (req, res) => {
    let purchase_id = req.body.purchase_id;
    let item_name = req.body.item_name;

    db.query(`SELECT * FROM verification_ofItems($1, $2)`, [purchase_id, item_name], (err, results) => {
        if (err) {
            throw err
        }
        res.status(200).json(results.rows);
    })

});

router.head('/file/:filename', (req, res) => {
    const filename = req.params.filename;
    const filePath = path.join(__dirname, 'filename', filename);

    fs.access(filePath, fs.constants.F_OK, (err) => {
        if (err) {
            return res.status(404).json({ error: 'File not found' });
        }

        res.sendFile(filePath);
    });
});




module.exports = router;