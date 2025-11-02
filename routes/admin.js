
var express = require('express');
var router = express.Router();
const axios = require('axios');
const jwt = require('jsonwebtoken');
var db = require('../dbconfig');
var generator = require('generate-password');
const moment = require('moment');
// var moment = require('moment-timezone');

const bcrypt = require('bcrypt');
var path = require('path');
const fs = require('fs');
// const mailconfig = require('../services/emailjs');
const { sendEmail, mailConfig } = require('../services/emailjs');
const { error, message } = require('emailjs');

// const mailServer_email = mailconfig.email
// const mailServer_password = mailconfig.password

// const server = email.server.connect({
//     user: mailServer_email,
//     password: mailServer_password,
//     host: mailconfig.host,
//     ssl: mailconfig.ssl,
//     tls: mailconfig.tls,
//     port: mailconfig.port,

// });

const secretKey = "5d8424d84c1b3e816490ed0b072dc7113c48d73e37633bfb41f6b7abdaaa8c9515d5b0c2ab89901f8eaf61cc638b02f495d1719c82076f00d70277bbb63c09cc";

function ensureToken(req, res, next) {
    const bearerHeader = req.headers["authorization"];

    if (typeof bearerHeader !== 'undefined') {
        // console.log('bearerHeader', bearerHeader);

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
                    res.status(500).json({ message: 'Token expired', expirationTime });
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
}


router.post('/addUser', (req, res) => {
    console.log(req.body)
    const { user_name, user_email, grp_id, modified_by } = req.body
    let password = generator.generate({
        length: 10,                                 //auto generated password of 10 words combination of numbers and alphabet
        numbers: true
    });
    let UserprivilegeId = req.body.privilege_id;
    let UserDesignationId = req.body.designation_id;
    // let userCreatedDate = currentDate;
    let UserStatus = "1";

    // Encrypt the password before saving it in the database
    bcrypt.hash(password, 10, (err, hashedPassword) => {
        if (err) {
            throw err
        }
        else {
            console.log(req.body);
            db.query('SELECT * FROM adduser($1,$2,$3,$4,$5,$6,$7,$8)', [user_name, password, user_email, grp_id, UserprivilegeId, UserDesignationId, UserStatus, modified_by], (err, respond) => {
                if (err) {
                    throw err
                }
                return res.status(200).json(respond.rows);

            });
        }
    });
});

router.post('/updateUser', (req, res) => {
    let user_status = '1'
    const { user_id, user_name, user_email, grp_id, privilege_id, designation_id, modified_by } = req.body;

    db.query('SELECT * FROM update_user($1,$2,$3,$4,$5,$6,$7,$8)', [user_id, user_name, user_email, grp_id, privilege_id, designation_id, modified_by, user_status],
        (err, results) => {
            if (err) {
                throw err;
            }
            res.status(200).json({ message: 'User Updated Successfully ...' })
        });
});


router.post('/deactivateuserstatusbyid', (req, res) => {
    let user_id = req.body.user_id;
    db.query('SELECT * FROM deactivate_userstatus_byid($1)', [user_id], (err, results) => {
        if (err) {
            throw err
        }
        res.status(200).json(results.rows);
    });
});

//supplier 
router.post('/addSupplier', async (req, res) => {
    const { supplier_name, contact_person, rating, address, phone, mobile, email, status, createdby, category, gstn, pan_no } = req.body;
    const insertQuery = `SELECT * FROM addsupplier($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`;

    try {
        const respond = await db.query(insertQuery, [supplier_name, contact_person, rating, address, phone, mobile, email, status, createdby, category, gstn, pan_no]);
        res.status(200).json(respond.rows);
    }
    catch (error) {
        // Log for debugging
        console.error('🔥 ACTUAL Error:', error);
        console.log(error.code, error.message.includes('already exists'))
        // Handle known PostgreSQL exception
        if (error.code === 'P0001' && error.message.includes('already exists')) {
            return res.status(400).json({ message: error.message });
        }

        // Fallback: Internal server error
        return res.status(500).json({ message: 'Internal Server Error' });
    }
});

router.put('/updatesupplier', (req, res) => {
    let supplierid = req.body.supplier_id;
    let suppliername = req.body.supplier_name;
    let contact = req.body.contact_person;
    let currentdate = moment().format('YYYY-MM-DD');

    let modifieddate = req.body.modified_date ? req.body.modified_date : currentdate;
    const { rating, email, phone, mobile, address, category, gstn, pan_no } = req.body;

    db.query('SELECT * from update_supplier($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)',
        [suppliername, contact, rating, address, phone, mobile, email, modifieddate, category, gstn, pan_no, supplierid], ((err, results) => {
            if (err) {
                throw err
            }
            res.status(200).json(results.rows[0]);
        })
    );
});

router.post('/sendvendorApprovalmail', async (req, res) => {
    const supplierId = {
        supplier_id: req.body.supplier_id
    }

    const url = process.env.BACKEND_URL + '/shared' + '/getSupplierdatabyid';
    const updateQuery = `Update supplier set status='2' where supplier_id =$1`;

    try {
        const getSupplierDatabyid = await axios.post(url, supplierId);
        const supplierData = getSupplierDatabyid.data[0];
        await db.query(updateQuery, [supplierId.supplier_id]);

        let message = `Request Approval for Adding new Vendor: ${supplierData.supplier_name} (${process.env.ENVIRONMENT_STATUS})`;
        const encodeSupplierId = encodeURIComponent(supplierId.supplier_id);
        console.log(encodeSupplierId, "decodePurchasaId");

        const approvalLink = `${process.env.BASE_URL}/#/user/vendor-approval-mail/${encodeSupplierId}`;
        const rejectLink = `${process.env.BASE_URL}/#/user/vendor-rejection-mail/${encodeSupplierId}`;
        const discussLink = `${process.env.BACKEND_URL}/admin/discussvendorApproval/${encodeSupplierId}`;

        // Function to generate HTML content for the email
        function generateEmailHTML(data, isDirector) {
            let html = `
                <div style="margin: 20px; margin-left:0;">
                    <p>Hi Sir,</p>
                    <p>Please provide your approval for adding the following new vendor in AIMS.</p>
                    <div style="overflow-x: auto; width: 100%; max-width: 100%;">
                        <table style="border-collapse: collapse; width: 100%; table-layout: fixed; border: 1px solid #000; font-family: sans-serif; background-color: #f2f2f2; color: #004080; font-size: 12px;">
                            <thead>
                                <tr>
                                    <th style="border: 1px solid #000; padding: 5px; width: 5%; color: #004080; text-align: left; white-space: nowrap;">S.No.</th>
                                    <th style="border: 1px solid #000; padding: 5px; width: 10%; color: #004080; text-align: left; white-space: nowrap;">Vendor Name</th>
                                    <th style="border: 1px solid #000; padding: 5px; width: 10%; color: #004080; text-align: left; white-space: nowrap;">Contact Person</th>
                                    <th style="border: 1px solid #000; padding: 5px; width: 8%; color: #004080; text-align: left; white-space: nowrap;">Initial Rating</th>
                                    <th style="border: 1px solid #000; padding: 5px; width: 10%; color: #004080; text-align: left; white-space: nowrap;">Phone</th>
                                    <th style="border: 1px solid #000; padding: 5px; width: 10%; color: #004080; text-align: left; white-space: nowrap;">Mobile</th>
                                    <th style="border: 1px solid #000; padding: 5px; width: 15%; color: #004080; text-align: left; white-space: nowrap;">Email</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td style="border: 1px solid #000; padding: 5px; color: #000000; white-space: nowrap;">1</td>
                                    <td style="border: 1px solid #000; padding: 5px; color: #000000; white-space: nowrap;">${data.supplier_name}</td>
                                    <td style="border: 1px solid #000; padding: 5px; color: #000000; white-space: nowrap;">${data.contact_person}</td>
                                    <td style="border: 1px solid #000; padding: 5px; color: #000000; white-space: nowrap;">${data.rating}</td>
                                    <td style="border: 1px solid #000; padding: 5px; color: #000000; white-space: nowrap;">${data.phone}</td>
                                    <td style="border: 1px solid #000; padding: 5px; color: #000000; white-space: nowrap;">${data.mobile}</td>
                                    <td style="border: 1px solid #000; padding: 5px; color: #000000; white-space: nowrap;">${data.email}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                    <div style="font-size: 16px; font-style: italic; margin-top: 20px; color: #004080;">
                        Thanks and Regards,<br>
                        System Admin Department<br>
                    </div>`;

            if (isDirector) {
                html += `
                    <div style="margin-top: 15px;">
                        <a href="${approvalLink}" style="background-color: #2d6c3e; color: white; padding: 14px 20px; text-decoration: none; display: inline-block;">Approve</a>
                        <a href="${rejectLink}" style="background-color: #f44336; color: white; padding: 14px 20px; text-decoration: none; display: inline-block;">Reject</a>
                        <a href="${discussLink}" style="background-color: #ffff00; color: black; padding: 14px 20px; text-decoration: none; display: inline-block;">Discuss</a>
                    </div>`;
            }

            // Add the no-reply message here
            html += `
            <div style="margin-top: 100px; font-size: 14px; color: #888; text-align:center">
        This is an auto-generated email intended solely for internal use by APV Technologies Pvt. Ltd. Please do not reply to this mail.
            </div>
            `;

            return html;
        }

        const mailOptionsSAdmin = {
            from: 'apvaims@apvtechnologies.com',
            to: mailConfig.to,
            subject: message,
            html: generateEmailHTML(supplierData, true)
        };

        const mailOptionsAdmin = {
            from: 'apvaims@apvtechnologies.com',
            cc: mailConfig.cc,
            subject: message,
            html: generateEmailHTML(supplierData, false)
        };

        // Send email
        await sendEmail(mailOptionsSAdmin);
        await sendEmail(mailOptionsAdmin);
        // console.log(getSupplierDatabyid.data);
        res.status(200).json({ message: 'Mail sent successfully!' });
    } catch (error) {
        res.status(500).json(error);
        console.log(error);
    }

})

router.get('/getSupplierdata', (req, res) => {
    db.query(`SELECT * FROM get_supplier_data()`, (err, results) => {
        if (err) {
            throw err;
        }
        res.status(200).json(results.rows);
    });

});

router.post('/getSupplierdatabyid', (req, res) => {
    let supplierid = req.body.supplier_id;
    db.query(`SELECT * FROM get_supplier_data_byid($1)`, [supplierid], (err, results) => {
        if (err) {
            throw err;
        }
        res.status(200).json(results.rows);
    });
});

//have to move in admin29/04/2023
router.post('/getSupplierdatabyname', (req, res) => {
    let suppliername = req.body.supplier_name;
    db.query(`SELECT * FROM get_supplier_data_byname($1)`, [suppliername], (err, results) => {
        if (err) {
            throw err;
        }
        res.status(200).json(results.rows);
    });
});

router.post('/deleteSupplierdata', (req, res) => {
    let supplierid = req.body.supplier_id;

    db.query(`SELECT * FROM deactivate_supplier_detail($1)`, [supplierid], (err, results) => {
        if (err) {
            throw err;
        }
        res.status(200).json({ message: 'Delete supplier succesfully...' });
    });
});

router.put('/updateproduct', (req, res) => {
    console.log(req.body);
    const { category_id, product_name, modified_by, product_id, is_asset, life_cycle } = req.body;

    db.query(`SELECT update_product($1,$2,$3,$4,$5, $6)`, [category_id, product_name, modified_by, is_asset, product_id, life_cycle]
        , ((err, results) => {
            if (err) {
                throw err
            }
            res.status(200).json(results.rows);
        })
    )

});

router.put('/updatecategory', async (req, res) => {

    try {
        let categoryname = req.body.category_name;
        let modified_by = req.body.modified_by;
        let category_id = req.body.category_id;

        await db.query('BEGIN');
        const categoryverification = await db.query(`SELECT verification_category_name($1)`, [categoryname]);

        if (categoryverification.rows[0].verification_category_name == 1) {
            await db.query('COMMIT');
            res.status(200).json({ message: 'true' });
        }
        else {
            await db.query(`SELECT update_category($1,$2,$3)`, [categoryname, modified_by, category_id]);
            await db.query('COMMIT');
            res.status(200).json({ message: 'Category Added Successfully' });
        }

    }
    catch (err) {
        await db.query('ROLLBACK');
        console.error(err);
        res.status(500).json({ error: 'Internal Server Error!' });
    }
});



router.put('/updatelocation', async (req, res) => {
    try {
        let locationname = req.body.location_name;
        let modified_by = req.body.modified_by;
        let location_id = req.body.location_id;

        await db.query('BEGIN');
        const locationverification = await db.query(`SELECT verification_location_name($1)`, [locationname]);
        if (locationverification.rows[0].verification_location_name == 1) {
            await db.query('COMMIT');
            res.status(200).send({ message: 'true' });
        }
        else {
            await db.query(`SELECT * FROM update_location($1,$2,$3)`, [locationname, modified_by, location_id]);
            await db.query('COMMIT');
            res.status(200).send({ message: 'Location updated Successfully...' });
        }
    }
    catch (err) {
        await db.query('ROLLBACK');
        console.error(err);
        res.status(500).json({ error: 'Internal Server Error!' });
    }

});

//LocalForms(Main Forms) Module API's
router.post('/addPrivilege', (req, res) => {
    let privilegeName = req.body.privilege_name;
    let creationDate = moment().format('YYYY-MM-DD');
    let privilegestatus = '1';
    const { level, modified_by, created_by } = req.body;

    db.query(`SELECT verification_privilege_name($1)`, [privilegeName], (err, result) => {
        if (err) {
            throw err
        }
        if (result.rows[0].verification_privilege_name == 1) {

            res.status(200).json({ message: 'true' })
        }

        else {
            db.query(`SELECT * FROM add_privilege($1,$2,$3,$4,$5,$6)`, [privilegeName, creationDate, privilegestatus, modified_by, level, created_by], (err, results) => {
                if (err) {
                    throw err
                }

            })
            res.status(200).json({ message: 'Privilege Added Successfully' });
        }
    });
});

router.post('/updatePrivilegedata', (req, res) => {
    console.log(req.body)
    const { privilege_name, modified_by, privilege_id, level } = req.body;

    db.query(`SELECT update_privilege($1,$2,$3,$4)`, [privilege_name, modified_by, privilege_id, level], (err, results) => {
        if (err) {
            throw err
        }
        res.status(200).json({ result: results.rows[0], message: 'Privilege Updated Successfully' });
    })

});

router.post('/addGroup', (req, res) => {
    let groupName = req.body.grp_name;
    let groupstatus = '1';
    let modified_by = req.body.modified_by;
    let created_by = req.body.created_by;

    db.query(`SELECT verification_group_name($1)`, [groupName], (err, result) => {
        if (err) {
            throw err
        }
        else {

            if (result.rows[0].verification_group_name == 1) {
                res.status(200).json({ message: 'true' });
            }
            else {
                db.query(`SELECT * FROM add_group($1,$2,$3,$4)`, [groupName, groupstatus, modified_by, created_by], (err, results) => {
                    if (err) {
                        throw err
                    }
                })
                res.status(200).json({ message: 'Group Added Successfully' });

            }
        }

    });
});

router.post('/updateGrpdata', (req, res) => {
    let name = req.body.grp_name;
    let modified_by = req.body.modified_by;
    let id = req.body.grp_id;

    db.query(`SELECT verification_group_name($1)`, [name], (err, result) => {
        if (err) {
            throw err
        }
        else {
            if (result.rows[0].verification_group_name == 1) {
                res.status(200).json({ message: 'true' })
            }
            else {
                db.query(`SELECT update_grp($1,$2,$3)`, [name, modified_by, id], (err, results) => {
                    if (err) {
                        throw err
                    }
                })
                res.status(200).json({ message: 'Group update successfully' });
            }
        }
    });
});


router.post('/addDesignation', (req, res) => {
    let designationName = req.body.designation_name;
    let creationDate = moment().format('YYYY-MM-DD');
    let designationStatus = '1';
    let modified_by = req.body.modified_by;
    let created_by = req.body.created_by;

    db.query(`SELECT verification_designation_name($1)`, [designationName], (err, result) => {

        if (err) {
            throw err
        }

        else {
            if (result.rows[0].verification_designation_name == 1) {
                res.status(200).json({ message: 'true' });
            }
            else {

                // db.query(`SELECT * FROM add_designation('${designationName}', '${creationDate}', '${designationStatus}', '${modified_by}', '${created_by}')`, (err, results) => {
                db.query(`SELECT * FROM add_designation($1,$2,$3,$4,$5)`, [designationName, creationDate, designationStatus, modified_by, created_by], (err, results) => {
                    if (err) {
                        throw err
                    }
                })
                res.status(200).json({ message: 'Designation Added Successfully' });
            }
        }
    });
});

router.post('/updateDesignationdata', (req, res) => {

    let name = req.body.designation_name;
    let modified_by = req.body.modified_by;
    let id = req.body.designation_id;

    db.query(`SELECT verification_designation_name($1)`, [name], (err, result) => {

        if (err) {
            throw err
        }

        else {
            if (result.rows[0].verification_designation_name == 1) {
                res.status(200).json({ message: 'true' });
            }
            else {
                db.query(`SELECT update_designation($1,$2,$3)`, [name, modified_by, id], (err, results) => {
                    if (err) {
                        throw err
                    }
                })
                res.status(200).json({ message: 'Designation Added Successfully' });

            }
        }
    });
});

router.post('/addProducts', async (req, res) => {
    try {
        console.log(req.body, 'addproduct')
        let productStatus = '1';
        const { category_id, product_name, modified_by, is_asset, created_by, last_item_code, life_cycle } = req.body;
        const checkcreatedby = created_by && created_by.trim() !== '' ? created_by.trim() : '1';

        const productverificationresponse = await db.query(`SELECT verification_product_name($1)`, [product_name]);

        if (productverificationresponse.rows[0].verification_product_name == 1) {
            return res.status(200).json({ message: 'true' });
        }

        await db.query(`SELECT * FROM add_products($1,$2,$3,$4,$5,$6,$7,$8)`, [category_id, product_name, productStatus, modified_by, is_asset, checkcreatedby, last_item_code, +life_cycle]);
        res.status(200).json({ message: 'Product Added Successfully' });
    }
    catch (err) {
        console.error("Error executing query:", err);
        res.status(500).json({ error: "An error occurred while processing your request." });
    }

});

router.post('/addlocation', async (req, res) => {
    try {

        const { location_name, created_by, modified_by } = req.body;
        let createdDate = moment().format('YYYY-MM-DD');
        let locationStatus = '1';

        const locationverificationresponse = await db.query(`SELECT verification_location_name($1)`, [location_name]);

        if (locationverificationresponse.rows[0].verification_location_name == 1) {
            return res.status(200).json({ message: 'true' })
        }

        const addlocationresult = await db.query(`SELECT * FROM add_location($1,$2,$3,$4,$5)`, [location_name, createdDate, locationStatus, modified_by, created_by]);

        res.status(200).json({ message: 'Location Added Successfully' });

    }
    catch (err) {
        console.error("Error executing query:", err);
        res.status(500).json({ error: "Internal Server Error!" });
    }
})

router.post('/addCategory', async (req, res) => {

    try {
        const { category_name, modified_by, created_by } = req.body;
        let creationDate = moment().local().format('YYYY-MM-DD');
        let categoryStatus = '1';

        const verificationResult = await db.query(`SELECT verification_category_name($1)`, [category_name]);

        if (verificationResult.rows[0].verification_category_name == 1) {

            return res.status(200).json({ message: 'true' });
        }

        const addCategoryResult = await db.query('SELECT * FROM add_category($1, $2, $3, $4, $5)', [category_name, creationDate, categoryStatus, modified_by, created_by]);
        res.status(200).json({ message: 'Category Added Successfully' });
    }

    catch (err) {
        console.error("Error executing query:", err);
        res.status(500).json({ error: "An error occurred while processing your request." });
    }

});
//purchase order

router.post('/verificationofpurchaseid', (req, res) => {
    let purchase_id = req.body.purchase_id;

    db.query(`SELECT * FROM verification_of_purchaseid($1)`, [purchase_id], (err, result) => {
        if (err) {
            throw err;
        }
        res.status(200).json(result.rows[0]);
    });
});

router.post('/makenewPurchaseOrder', async (req, res) => {
    console.log(req.body, "reqbodymakepurchaseorder");
    try {
        // Convert each object in the req.body array to a JSON string
        const jsonItems = req.body.map(item => JSON.stringify(item));
        const { purchase_id, sent_by, supplier_id, issue_date, currency } = req.body[0];
        await db.query('BEGIN');

        const verificationquery = `SELECT * FROM verification_of_purchaseid('${purchase_id}')`;

        const verificationrespond = await db.query(verificationquery);

        if (verificationrespond.rows[0].verification_of_purchaseid == 0) {

            // const addpidquery = `SELECT * FROM add_purchaseid_in_purchaseorder2('${purchase_id}','${sent_by}',${supplier_id},'${issue_date}',${currency})`;
            const addpidquery = `SELECT * FROM add_purchaseid_in_purchaseorder2($1, $2, $3, $4, $5)`;
            await db.query(addpidquery, [purchase_id, sent_by, supplier_id, issue_date, currency]);

            const makenewpoquery = `SELECT * FROM make_new_purchase_order($1::jsonb[])`;
            await db.query(makenewpoquery, [jsonItems]);
        }
        else {
            const makenewpoquery = `SELECT * FROM make_new_purchase_order($1::jsonb[])`;
            await db.query(makenewpoquery, [jsonItems]);

        }

        await db.query('COMMIT');
        res.status(200).json('PO generated successfully!');


    } catch (error) {
        await db.query('ROLLBACK');

        console.error("Error executing query:", err);
        res.status(500).json({ error: "An error occurred while processing your request." });
    }
});


router.post('/makePurchaseOrder', async (req, res) => {
    try {
        let gst_in_percent = +req.body.gst_in_percent * 100;
        const { purchase_id, issue_date, expected_date, product_id, unit_price, quantity, sub_total, discount_in_rs, total, description, gst_calculation, sent_by, supplier_id, received_quantity } = req.body;
        console.log(req.body.purchase_id);
        await db.query('BEGIN');

        const verificationresponse = await db.query(`SELECT * FROM verification_of_purchaseid($1)`, [purchase_id]);

        if (verificationresponse.rows[0].verification_of_purchaseid == 0) {
            // await db.query(`SELECT * FROM add_purchaseid_in_purchaseorder($1,$2,$3)`, [purchase_id, sent_by, supplier_id]);
            const makepurchaseorder = await db.query(` 
           WITH add_purchase AS (
            SELECT * FROM add_purchaseid_in_purchaseorder($1, $2, $3, $4),[purchase_id, sent_by, supplier_id, issue_date];
        )
        SELECT * FROM make_purchase_order($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`, [purchase_id, issue_date, expected_date, product_id, unit_price, quantity, sub_total, discount_in_rs, total, description, gst_calculation, gst_in_percent, received_quantity]);
            await db.query('COMMIT');
            return res.status(200).json(makepurchaseorder.rows);
        } else {
            // If purchase ID exists, simply make the purchase order
            const makePurchaseOrderResult = await db.query(`SELECT * FROM make_purchase_order($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`, [purchase_id, issue_date, expected_date, product_id, unit_price, quantity, sub_total, discount_in_rs, total, description, gst_calculation, gst_in_percent, received_quantity]);
            await db.query('COMMIT');
            res.status(200).json(makePurchaseOrderResult.rows);
        }

    }
    catch (err) {
        await db.query('ROLLBACK');
        console.error('Error generating purchase Orders:', err);
        res.status(500).json('Error generating purchase: ' + err.message);
    }
});


router.post('/updatePurchaseOrder', (req, res) => {
    const gst_in_percent = + req.body.gst_in_percent;

    const { issue_date, expected_date, product_id, unit_price, quantity, sub_total, discount_in_rs, total, description, sent_by, gst_calculation, received_quantity, id, purpose, expected_user } = req.body
    console.log(req.body);

    const query = `UPDATE purchase_item set 
    issue_date = $1  , expected_date = $2 ,product_id = $3 ,unit_price = $4 , 
	quantity = $5 ,sub_total = $6  ,discount_in_rs = $7 ,total = $8, 
	description = $9 ,gst_calculation = $10,gst_in_percent = $11, received_quantity = $12, purpose=$13,expected_user=$14   WHERE purchase_item.id = $15`;

    const values = [issue_date, expected_date, product_id, unit_price, quantity, sub_total, discount_in_rs, total, description, gst_calculation, gst_in_percent, received_quantity, purpose, expected_user, id];

    db.query(query, values, (err, results) => {
        if (err) {
            throw err;
        }

        res.status(200).json({ message: 'PO updated Successfully!' });
    });
});


router.post('/deletePo', async (req, res) => {
    const id = req.body.id;
    const query = `Delete from purchase_item pi where pi.id= $1 returning purchase_id`;
    const deletionfrompurchaseorder = `SELECT * FROM delete_purchase_order($1)`;

    try {
        let message = 'Item deleted. PO not deleted';
        const purchaseOrder = await db.query(query, [id]);

        if (purchaseOrder.rows.length > 0) {

            const purchaseId = purchaseOrder.rows[0].purchase_id;
            const result = await db.query(deletionfrompurchaseorder, [purchaseId]);
            console.log(result.rows[0].delete_purchase_order, "purchase Order deleted");
            message = result.rows[0].delete_purchase_order;
        }
        else {
            console.log('No purchase item found with this ID.');
            message = 'Purchase Order can not delete.';
        }

        // db.query(query, [id], (err, result) => {
        //     if (err) {
        //         throw err;
        //     }

        //     res.status(200).json({ message: 'PO deleted successfully!' })
        // });
        res.status(200).json({
            message
        });

    }

    catch (error) {
        console.error('Error deleting PO:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

router.post('/updatePurchaseItemforholdingStock', async (req, res) => {

    const receivedData = req.body;
    console.log(req.body, "receivedData");
    if (!Array.isArray(receivedData) || receivedData.length === 0) {
        return res.status(400).json({ error: 'Invalid or empty array of received quantity.' });
    }

    try {
        await db.query('BEGIN');

        // Iterate through each set of data
        for (const data of receivedData) {
            const { id, received_quantity } = data;
            const values = [received_quantity, id];

            // Execute the database query for each set of inspection data
            await db.query('UPDATE purchase_item SET received_quantity=$1 WHERE purchase_item.id =$2', values);

        }
        // Commit the transaction
        await db.query('COMMIT');
        res.status(200).json({ message: 'Purchase Item Updated successfully!' });
    }
    catch (error) {
        // Rollback the transaction in case of an error
        await db.query('ROLLBACK');
        console.error(error);
        res.status(500).json({ error: 'Internal Server Error!' });
    }

})


router.post('/updateapproval2inpi', (req, res) => {
    let approved_by_admin2 = req.body.approved_by_admin2;
    let p_id = req.body.purchase_id;

    // db.query(`UPDATE purchase_item SET approved_by_admin2=${approved_by_admin2} WHERE purchase_item.purchase_id ='${p_id}'`, (err, result) => {
    db.query(`UPDATE purchase_item SET approved_by_admin2=$1 WHERE purchase_item.purchase_id =$2`, [approved_by_admin2, p_id], (err, result) => {
        if (err) {
            throw err;
        }
    })
    res.status(200).json({ message: 'Approval2 Updated' });
})

router.post('/updateapproval1inpi', (req, res) => {
    let approved_by_admin1 = req.body.approved_by_admin1;
    let p_id = req.body.purchase_id;

    // db.query(`UPDATE purchase_item SET approved_by_admin1 =${approved_by_admin1} WHERE purchase_item.purchase_id ='${p_id}'`, (err, result) => {
    db.query(`UPDATE purchase_item SET approved_by_admin1 =$1 WHERE purchase_item.purchase_id =$2`, [approved_by_admin1, p_id], (err, result) => {
        if (err) {
            throw err;
        }

    })
    res.status(200).json({ message: 'Approval1 Updated' });

})

router.post('/updatesentApprovedpurchaseorder', async (req, res) => {
    try {

        let purchase_id = req.body.purchase_id;
        // let modified_date = moment().format('YYYY-MM-DD');
        let modified_date = moment().format('DD-MM-YYYY');


        // Begin transaction
        await db.query('BEGIN');
        // let grandtotalofpodata = 0;
        const purchase_data = await db.query(`SELECT * FROM get_purchasejoindatabypid($1)`, [purchase_id]);
        const grandtotal = purchase_data.rows.reduce((accumulator, currentValue) => {
            return accumulator + parseFloat(currentValue.total);
        }, 0);

        // Proper rounding to 2 decimals
        const grandtotalofpodata = Math.round((grandtotal + Number.EPSILON) * 100) / 100;

        let message = `Approval of the Purchase Order with Purchase id-${purchase_id} on ${modified_date} :${process.env.ENVIRONMENT_STATUS}`;

        const mailOptions = {
            from: 'apvaims@apvtechnologies.com',
            to: mailConfig.to,
            cc: mailConfig.cc,
            subject: message,
            html: generateEmailHTML(purchase_data.rows)
        };

        // Function to generate HTML content for the email
        function generateEmailHTML(purchases) {
            let html = `
            <div style="margin: 20px; margin-left:0;">
                <p>Hi System Admin Department,</p>
                <div style="overflow-x: auto; width: 100%; max-width: 100%;"> <!-- Ensure scrollable area takes full width -->
                    <table style="border-collapse: collapse; width: 100%; table-layout: fixed; border: 1px solid #000; font-family: sans-serif; background-color: #cbf5dd; color: #004080; font-size: 12px;">
                        <thead>
                            <tr>
                                <th style="border: 1px solid #000; padding: 5px; width: 5%; color: #004080; text-align: left; white-space: nowrap;">S.No.</th>
                                <th style="border: 1px solid #000; padding: 5px; width: 12%; color: #004080; text-align: left; white-space: nowrap;">Purchase ID</th>
                                <th style="border: 1px solid #000; padding: 5px; width: 12%; color: #004080; text-align: left; white-space: nowrap;">Supplier Name</th>
                                <th style="border: 1px solid #000; padding: 5px; width: 10%; color: #004080; text-align: left; white-space: nowrap;">Issue Date</th>
                                <th style="border: 1px solid #000; padding: 5px; width: 10%; color: #004080; text-align: left; white-space: nowrap;">Expected Date</th>
                                <th style="border: 1px solid #000; padding: 5px; width: 10%; color: #004080; text-align: left; white-space: nowrap;">Product</th>
                                <th style="border: 1px solid #000; padding: 5px; width: 5%; color: #004080; text-align: left; white-space: nowrap;">Unit Price</th>
                                <th style="border: 1px solid #000; padding: 5px; width: 5%; color: #004080; text-align: left; white-space: nowrap;">Quantity</th>
                                <th style="border: 1px solid #000; padding: 5px; width: 5%; color: #004080; text-align: left; white-space: nowrap;">Discount</th>
                                <th style="border: 1px solid #000; padding: 5px; width: 8%; color: #004080; text-align: left; white-space: nowrap;">GST(%)</th>
                                <th style="border: 1px solid #000; padding: 5px; width: 8%; color: #004080; text-align: left; white-space: nowrap;">Sub Total</th>
                                <th style="border: 1px solid #000; padding: 5px; width: 5%; color: #004080; text-align: left; white-space: nowrap;">Total</th>
                                <th style="border: 1px solid #000; padding: 5px; width: 10%; color: #004080; text-align: left; white-space: nowrap;">Description</th>
                                <th style="border: 1px solid #000; padding: 5px; width: 10%; color: #004080; text-align: left; white-space: nowrap;">Purpose</th>
                                <th style="border: 1px solid #000; padding: 5px; width: 10%; color: #004080; text-align: left; white-space: nowrap;">Intended User</th>
                            </tr>
                        </thead>
                        <tbody>
            `;

            purchases.forEach((purchase, index) => {
                // Format dates using Moment.js
                let issueDateFormatted = moment(purchase.issue_date).format('DD-MM-YYYY');
                let expectedDateFormatted = moment(purchase.expected_date).format('DD-MM-YYYY');

                html += `
                    <tr>
                        <td style="border: 1px solid #000; padding: 5px; color: #000000; white-space: nowrap;">${index + 1}</td>
                        <td style="border: 1px solid #000; padding: 5px; color: #000000; white-space: nowrap;">${purchase.purchase_id}</td>
                        <td style="border: 1px solid #000; padding: 5px; color: #000000; white-space: nowrap;">${purchase.supplier_name}</td>
                        <td style="border: 1px solid #000; padding: 5px; color: #000000; white-space: nowrap;">${issueDateFormatted}</td>
                        <td style="border: 1px solid #000; padding: 5px; color: #000000; white-space: nowrap;">${expectedDateFormatted}</td>
                        <td style="border: 1px solid #000; padding: 5px; color: #000000; white-space: nowrap;">${purchase.product_name}</td>
                        <td style="border: 1px solid #000; padding: 5px; color: #000000; text-align: right; white-space: nowrap;">${purchase.unit_price.toFixed(2)}</td>
                        <td style="border: 1px solid #000; padding: 5px; color: #000000; text-align: right; white-space: nowrap;">${purchase.quantity}</td>
                        <td style="border: 1px solid #000; padding: 5px; color: #000000; text-align: right; white-space: nowrap;">${purchase.discount_in_rs.toFixed(2)}</td>
                        <td style="border: 1px solid #000; padding: 5px; color: #000000; text-align: right; white-space: nowrap;">${(purchase.gst_in_percent * 100).toFixed(0)}</td>
                        <td style="border: 1px solid #000; padding: 5px; color: #000000; text-align: right; white-space: nowrap;">${purchase.sub_total.toFixed(2)}</td>
                        <td style="border: 1px solid #000; padding: 5px; color: #000000; text-align: right; white-space: nowrap;">${purchase.total.toFixed(2)}</td>
                                                <td style="border: 1px solid #000; padding: 5px; color: #000000; white-space: nowrap;">${purchase.description ? purchase.description : 'NA'}</td>

                        <td style="border: 1px solid #000; padding: 5px; color: #000000; white-space: nowrap;">${purchase.purpose ? purchase.purpose : 'NA'}</td>
                        <td style="border: 1px solid #000; padding: 5px; color: #000000; white-space: nowrap;">${purchase.expected_user ? purchase.expected_user : 'NA'}</td>
                    </tr>
                `;
            });

            html += `
                <tr>
                    <td colspan="11" style="text-align:right; color:black; border: 1px solid black; white-space: nowrap;"><strong>Grand Total(₹)</strong></td>
                    <td class="font-weight-bold" style="border: 1px solid #000; padding: 3px; color: green; white-space: nowrap;"><b>${grandtotalofpodata.toFixed(2)}</b></td>
                </tr>
                </tbody>
            </table>
            </div> <!-- Close scrollable container div -->
            <div style="font-size: 16px; font-style: italic; margin-top: 20px; color: #004080;">
                    Approved,<br> Director
    </div>
        </div>
            `;

            // Add the no-reply message here
            html += `
            <div style="margin-top: 100px; font-size: 14px; color: #888; text-align:center">
        This is an auto-generated email intended solely for internal use by APV Technologies Pvt. Ltd. Please do not reply to this mail.
            </div>
            `;

            return html;
        };

        const poapproval = await db.query(`SELECT * FROM update_sent_approvedpurchaseorder($1)`, [purchase_id]);

        // Send email
        // Sent email only if its not direct purchase
        if (!purchase_id.startsWith('DP-')) {
            await sendEmail(mailOptions);
        }
        // Commit transaction
        await db.query('COMMIT');
        res.status(200).json(poapproval.rows);

    }
    catch (err) {
        await db.query('ROLLBACK');
        console.error(err);
        res.status(500).json({ error: 'Internal Server Error!' });
    }

    // // db.query(`SELECT * FROM update_sent_approvedpurchaseorder('${purchase_id}')`, (err, result) => {
    // db.query(`SELECT * FROM update_sent_approvedpurchaseorder($1)`, [purchase_id], (err, result) => {
    //     if (err) {
    //         throw err;
    //     }
    //     res.status(200).json(result.rows);
    // })
})

// router.get('/approvePurchaseOrder/:purchase_id', async (req, res) => {
//     // const purchase_id = req.params.purchase_id;

//     try {
//         let purchase_id = req.params.purchase_id;
//         // let modified_date = moment().format('YYYY-MM-DD');
//         let modified_date = moment().format('DD-MM-YYYY');


//         // Begin transaction
//         await db.query('BEGIN');
//         let grandtotalofpodata = 0;
//         const purchase_data = await db.query(`SELECT * FROM get_purchasejoindatabypid($1)`, [purchase_id]);

//         const grandtotal = purchase_data.rows.reduce((accumulator, currentValue) => {
//             return accumulator + parseFloat(currentValue.total);
//         }, 0);

//         grandtotalofpodata = grandtotal.toFixed(2);

//         console.log(purchase_data.rows, "approvePurchaseOrder");

//         let message = `Approval of the Purchase Order with Purchase id-${purchase_id} on ${modified_date}`;

//         const isSent = purchase_data.rows[0].is_sent;

//         if(isSent == 1){

//         const mailOptions = {
//             from: 'apvaims@apvtechnologies.com',
//             to: mailConfig.to,
//             cc: mailConfig.cc,
//             subject: message,
//             html: generateEmailHTML(purchase_data.rows)
//         };

//         // Function to generate HTML content for the email
//         function generateEmailHTML(purchases) {
//             let html = `
//             <div style="margin: 20px; margin-left:0;">
//                 <p>Hi System Admin Department,</p>
//                 <div style="overflow-x: auto; width: 100%; max-width: 100%;"> <!-- Ensure scrollable area takes full width -->
//                     <table style="border-collapse: collapse; width: 100%; table-layout: fixed; border: 1px solid #000; font-family: sans-serif; background-color: #cbf5dd; color: #004080; font-size: 12px;">
//                         <thead>
//                             <tr>
//                                 <th style="border: 1px solid #000; padding: 5px; width: 5%; color: #004080; text-align: left; white-space: nowrap;">S.No.</th>
//                                 <th style="border: 1px solid #000; padding: 5px; width: 12%; color: #004080; text-align: left; white-space: nowrap;">Purchase ID</th>
//                                 <th style="border: 1px solid #000; padding: 5px; width: 12%; color: #004080; text-align: left; white-space: nowrap;">Supplier Name</th>
//                                 <th style="border: 1px solid #000; padding: 5px; width: 10%; color: #004080; text-align: left; white-space: nowrap;">Issue Date</th>
//                                 <th style="border: 1px solid #000; padding: 5px; width: 10%; color: #004080; text-align: left; white-space: nowrap;">Expected Date</th>
//                                 <th style="border: 1px solid #000; padding: 5px; width: 10%; color: #004080; text-align: left; white-space: nowrap;">Product</th>
//                                 <th style="border: 1px solid #000; padding: 5px; width: 5%; color: #004080; text-align: left; white-space: nowrap;">Unit Price</th>
//                                 <th style="border: 1px solid #000; padding: 5px; width: 5%; color: #004080; text-align: left; white-space: nowrap;">Quantity</th>
//                                 <th style="border: 1px solid #000; padding: 5px; width: 5%; color: #004080; text-align: left; white-space: nowrap;">Discount</th>
//                                 <th style="border: 1px solid #000; padding: 5px; width: 8%; color: #004080; text-align: left; white-space: nowrap;">GST(%)</th>
//                                 <th style="border: 1px solid #000; padding: 5px; width: 8%; color: #004080; text-align: left; white-space: nowrap;">Sub Total</th>
//                                 <th style="border: 1px solid #000; padding: 5px; width: 5%; color: #004080; text-align: left; white-space: nowrap;">Total</th>
//                                 <th style="border: 1px solid #000; padding: 5px; width: 10%; color: #004080; text-align: left; white-space: nowrap;">Description</th>
//                                 <th style="border: 1px solid #000; padding: 5px; width: 10%; color: #004080; text-align: left; white-space: nowrap;">Purpose</th>
//                                 <th style="border: 1px solid #000; padding: 5px; width: 10%; color: #004080; text-align: left; white-space: nowrap;">Intended User</th>
//                             </tr>
//                         </thead>
//                         <tbody>
//             `;

//             purchases.forEach((purchase, index) => {
//                 // Format dates using Moment.js
//                 let issueDateFormatted = moment(purchase.issue_date).format('DD-MM-YYYY');
//                 let expectedDateFormatted = moment(purchase.expected_date).format('DD-MM-YYYY');

//                 html += `
//                     <tr>
//                         <td style="border: 1px solid #000; padding: 5px; color: #000000; white-space: nowrap;">${index + 1}</td>
//                         <td style="border: 1px solid #000; padding: 5px; color: #000000; white-space: nowrap;">${purchase.purchase_id}</td>
//                         <td style="border: 1px solid #000; padding: 5px; color: #000000; white-space: nowrap;">${purchase.supplier_name}</td>
//                         <td style="border: 1px solid #000; padding: 5px; color: #000000; white-space: nowrap;">${issueDateFormatted}</td>
//                         <td style="border: 1px solid #000; padding: 5px; color: #000000; white-space: nowrap;">${expectedDateFormatted}</td>
//                         <td style="border: 1px solid #000; padding: 5px; color: #000000; white-space: nowrap;">${purchase.product_name}</td>
//                         <td style="border: 1px solid #000; padding: 5px; color: #000000; text-align: right; white-space: nowrap;">${purchase.unit_price}</td>
//                         <td style="border: 1px solid #000; padding: 5px; color: #000000; text-align: right; white-space: nowrap;">${purchase.quantity}</td>
//                         <td style="border: 1px solid #000; padding: 5px; color: #000000; text-align: right; white-space: nowrap;">${purchase.discount_in_rs}</td>
//                         <td style="border: 1px solid #000; padding: 5px; color: #000000; text-align: right; white-space: nowrap;">${purchase.gst_in_percent * 100}</td>
//                         <td style="border: 1px solid #000; padding: 5px; color: #000000; text-align: right; white-space: nowrap;">${purchase.sub_total}</td>
//                         <td style="border: 1px solid #000; padding: 5px; color: #000000; text-align: right; white-space: nowrap;">${purchase.total}</td>
//                                                 <td style="border: 1px solid #000; padding: 5px; color: #000000; white-space: nowrap;">${purchase.description ? purchase.description : 'NA'}</td>

//                         <td style="border: 1px solid #000; padding: 5px; color: #000000; white-space: nowrap;">${purchase.purpose ? purchase.purpose : 'NA'}</td>
//                         <td style="border: 1px solid #000; padding: 5px; color: #000000; white-space: nowrap;">${purchase.expected_user ? purchase.expected_user : 'NA'}</td>
//                     </tr>
//                 `;
//             });

//             html += `
//                 <tr>
//                     <td colspan="11" style="text-align:right; color:black; border: 1px solid black; white-space: nowrap;"><strong>Grand Total(₹)</strong></td>
//                     <td class="font-weight-bold" style="border: 1px solid #000; padding: 3px; color: green; white-space: nowrap;"><b>${grandtotalofpodata}</b></td>
//                 </tr>
//                 </tbody>
//             </table>
//             </div> <!-- Close scrollable container div -->
//             <div style="font-size: 16px; font-style: italic; margin-top: 20px; color: #004080;">
//                     Approved,<br> Director
//     </div>
//         </div>
//             `;

//             return html;
//         };

//         const poapproval = await db.query(`SELECT * FROM update_sent_approvedpurchaseorder($1)`, [purchase_id]);
//         // Send email
//         await sendEmail(mailOptions);
//         // Commit transaction
//         await db.query('COMMIT');
//         // res.status(200).json(poapproval.rows);
//         res.status(200).send(`
//             <!DOCTYPE html>
//             <html lang="en">
//             <head>
//                 <meta charset="UTF-8">
//                 <meta name="viewport" content="width=device-width, initial-scale=1.0">
//                 <title>Approval Success</title>
//                 <style>
//                     body {
//                         font-family: Arial, sans-serif;
//                         margin: 0;
//                         padding: 0;
//                         background-color: #fff;
//                         color: #333;
//                         display: flex;
//                         justify-content: center;
//                         align-items: center;
//                         height: 100vh;
//                         text-align: center;
//                     }

//                     .container {
//                         display: flex;
//                         flex-direction: column;
//                         justify-content: center;
//                         align-items: center;
//                         text-align: center;
//                     }

//                     .icon {
//                         font-size: 100px;
//                         color: green;
//                     }

//                     h1 {
//                         color: #004080;
//                         font-size: 24px;
//                         margin-top: 20px;
//                     }

//                     p {
//                         font-size: 18px;
//                         margin-top: 10px;
//                         color: #333;
//                     }
//                 </style>
//             </head>
//             <body>
//                 <div class="container">
//                       <img src="/files/verified.gif" alt="Approved PO" style="width: 150px; height: 150px;"/>
//                     <h1 style="font-family: 'Trebuchet MS', Helvetica, sans-sarif;">PO Approved!</h1>

//                 </div>
//             </body>
//             </html>
//         `);
//         }
//         else{
//             res.status(200).send(`
//                 <!DOCTYPE html>
//                 <html lang="en">
//                 <head>
//                     <meta charset="UTF-8">
//                     <meta name="viewport" content="width=device-width, initial-scale=1.0">
//                     <title>Approval Success</title>
//                     <style>
//                         body {
//                             font-family: Arial, sans-serif;
//                             margin: 0;
//                             padding: 0;
//                             background-color: #fff;
//                             color: #333;
//                             display: flex;
//                             justify-content: center;
//                             align-items: center;
//                             height: 100vh;
//                             text-align: center;
//                         }

//                         .container {
//                             display: flex;
//                             flex-direction: column;
//                             justify-content: center;
//                             align-items: center;
//                             text-align: center;
//                         }

//                         .icon {
//                             font-size: 100px;
//                             color: green;
//                         }

//                         h1 {
//                             color: #004080;
//                             font-size: 24px;
//                             margin-top: 20px;
//                         }

//                         p {
//                             font-size: 18px;
//                             margin-top: 10px;
//                             color: #333;
//                         }
//                     </style>
//                 </head>
//                 <body>
//                     <div class="container">
//                      <img src="/files/pikachu-deliciousdaywithpokemon.gif" alt="Approved PO" style="width: 150px; height: 150px;"/>
//                         <h1 style="font-family: 'Trebuchet MS', Helvetica, sans-sarif;">This operation has already been completed and cannot be performed again.</h1>
//                     </div>
//                 </body>
//                 </html>
//             `);
//         }


//     }
//     catch (err) {
//         await db.query('ROLLBACK');
//         console.error(err);
//         res.status(500).json({ error: 'Internal Server Error!' });
//     }
// })

router.get('/approvePurchaseOrder/:purchase_id', async (req, res) => {
    // const purchase_id = req.params.purchase_id;

    try {
        let purchase_id = req.params.purchase_id;
        // let modified_date = moment().format('YYYY-MM-DD');
        let modified_date = moment().format('DD-MM-YYYY');


        // Begin transaction
        await db.query('BEGIN');
        // let grandtotalofpodata = 0;
        const purchase_data = await db.query(`SELECT * FROM get_purchasejoindatabypid($1)`, [purchase_id]);

        const grandtotal = purchase_data.rows.reduce((accumulator, currentValue) => {
            return accumulator + parseFloat(currentValue.total);
        }, 0);

        // Proper rounding to 2 decimals
        const grandtotalofpodata = Math.round((grandtotal + Number.EPSILON) * 100) / 100;

        console.log(purchase_data.rows, "approvePurchaseOrder");

        let message = `Approval of the Purchase Order with Purchase id-${purchase_id} on ${modified_date} :${process.env.ENVIRONMENT_STATUS}`;

        const isSent = purchase_data.rows[0].is_sent;

        if (isSent == 1) {

            const mailOptions = {
                from: 'apvaims@apvtechnologies.com',
                to: mailConfig.to,
                cc: mailConfig.cc,
                subject: message,
                html: generateEmailHTML(purchase_data.rows)
            };

            // Function to generate HTML content for the email
            function generateEmailHTML(purchases) {
                let html = `
            <div style="margin: 20px; margin-left:0;">
                <p>Hi System Admin Department,</p>
                <div style="overflow-x: auto; width: 100%; max-width: 100%;"> <!-- Ensure scrollable area takes full width -->
                    <table style="border-collapse: collapse; width: 100%; table-layout: fixed; border: 1px solid #000; font-family: sans-serif; background-color: #cbf5dd; color: #004080; font-size: 12px;">
                        <thead>
                            <tr>
                                <th style="border: 1px solid #000; padding: 5px; width: 5%; color: #004080; text-align: left; white-space: nowrap;">S.No.</th>
                                <th style="border: 1px solid #000; padding: 5px; width: 12%; color: #004080; text-align: left; white-space: nowrap;">Purchase ID</th>
                                <th style="border: 1px solid #000; padding: 5px; width: 12%; color: #004080; text-align: left; white-space: nowrap;">Supplier Name</th>
                                <th style="border: 1px solid #000; padding: 5px; width: 10%; color: #004080; text-align: left; white-space: nowrap;">Issue Date</th>
                                <th style="border: 1px solid #000; padding: 5px; width: 10%; color: #004080; text-align: left; white-space: nowrap;">Expected Date</th>
                                <th style="border: 1px solid #000; padding: 5px; width: 10%; color: #004080; text-align: left; white-space: nowrap;">Product</th>
                                <th style="border: 1px solid #000; padding: 5px; width: 5%; color: #004080; text-align: left; white-space: nowrap;">Unit Price</th>
                                <th style="border: 1px solid #000; padding: 5px; width: 5%; color: #004080; text-align: left; white-space: nowrap;">Quantity</th>
                                <th style="border: 1px solid #000; padding: 5px; width: 5%; color: #004080; text-align: left; white-space: nowrap;">Discount</th>
                                <th style="border: 1px solid #000; padding: 5px; width: 8%; color: #004080; text-align: left; white-space: nowrap;">GST(%)</th>
                                <th style="border: 1px solid #000; padding: 5px; width: 8%; color: #004080; text-align: left; white-space: nowrap;">Sub Total</th>
                                <th style="border: 1px solid #000; padding: 5px; width: 5%; color: #004080; text-align: left; white-space: nowrap;">Total</th>
                                <th style="border: 1px solid #000; padding: 5px; width: 10%; color: #004080; text-align: left; white-space: nowrap;">Description</th>
                                <th style="border: 1px solid #000; padding: 5px; width: 10%; color: #004080; text-align: left; white-space: nowrap;">Purpose</th>
                                <th style="border: 1px solid #000; padding: 5px; width: 10%; color: #004080; text-align: left; white-space: nowrap;">Intended User</th>
                            </tr>
                        </thead>
                        <tbody>
            `;

                purchases.forEach((purchase, index) => {
                    // Format dates using Moment.js
                    let issueDateFormatted = moment(purchase.issue_date).format('DD-MM-YYYY');
                    let expectedDateFormatted = moment(purchase.expected_date).format('DD-MM-YYYY');

                    html += `
                    <tr>
                        <td style="border: 1px solid #000; padding: 5px; color: #000000; white-space: nowrap;">${index + 1}</td>
                        <td style="border: 1px solid #000; padding: 5px; color: #000000; white-space: nowrap;">${purchase.purchase_id}</td>
                        <td style="border: 1px solid #000; padding: 5px; color: #000000; white-space: nowrap;">${purchase.supplier_name}</td>
                        <td style="border: 1px solid #000; padding: 5px; color: #000000; white-space: nowrap;">${issueDateFormatted}</td>
                        <td style="border: 1px solid #000; padding: 5px; color: #000000; white-space: nowrap;">${expectedDateFormatted}</td>
                        <td style="border: 1px solid #000; padding: 5px; color: #000000; white-space: nowrap;">${purchase.product_name}</td>
                        <td style="border: 1px solid #000; padding: 5px; color: #000000; text-align: right; white-space: nowrap;">${purchase.currency} ${purchase.unit_price.toFixed(2)}</td>
                        <td style="border: 1px solid #000; padding: 5px; color: #000000; text-align: right; white-space: nowrap;">${purchase.quantity}</td>
                        <td style="border: 1px solid #000; padding: 5px; color: #000000; text-align: right; white-space: nowrap;">${purchase.currency} ${purchase.discount_in_rs.toFixed(2)}</td>
                        <td style="border: 1px solid #000; padding: 5px; color: #000000; text-align: right; white-space: nowrap;">${(purchase.gst_in_percent * 100).toFixed(0)}</td>
                        <td style="border: 1px solid #000; padding: 5px; color: #000000; text-align: right; white-space: nowrap;">${purchase.currency} ${purchase.sub_total.toFixed(2)}</td>
                        <td style="border: 1px solid #000; padding: 5px; color: #000000; text-align: right; white-space: nowrap;">${purchase.currency} ${purchase.total.toFixed(2)}</td>
                                                <td style="border: 1px solid #000; padding: 5px; color: #000000; white-space: nowrap;">${purchase.description ? purchase.description : 'NA'}</td>

                        <td style="border: 1px solid #000; padding: 5px; color: #000000; white-space: nowrap;">${purchase.purpose ? purchase.purpose : 'NA'}</td>
                        <td style="border: 1px solid #000; padding: 5px; color: #000000; white-space: nowrap;">${purchase.expected_user ? purchase.expected_user : 'NA'}</td>
                    </tr>
                       
                `;

                });

                html += `
                 <tr>
                    <td colspan="11" style="text-align:right; color:black; border: 1px solid black; white-space: nowrap;"><strong>Grand Total(${purchases[0].currency})</strong></td>
                    <td class="font-weight-bold" style="border: 1px solid #000; padding: 3px; color: green; white-space: nowrap;"><b>${Math.round(grandtotalofpodata).toFixed(2)}</b></td>
                </tr>
                      </tbody>
            </table>
                </div> <!-- Close scrollable container div -->
            <div style="font-size: 16px; font-style: italic; margin-top: 20px; color: #004080;">
                    Approved,<br> Director
    </div>
        </div>
            <div style="margin-top: 100px; font-size: 14px; color: #888; text-align:center">
        This is an auto-generated email intended solely for internal use by APV Technologies Pvt. Ltd. Please do not reply to this mail.
            </div>
            `;

                return html;
            };

            const poapproval = await db.query(`SELECT * FROM update_sent_approvedpurchaseorder($1)`, [purchase_id]);
            // Send email
            await sendEmail(mailOptions);
            // Commit transaction
            await db.query('COMMIT');
            // res.status(200).json(poapproval.rows);
            res.status(200).json({ message: true });
        }
        else {
            res.status(200).json({ message: false });
        }


    }
    catch (err) {
        await db.query('ROLLBACK');
        console.error(err);
        res.status(500).json({ error: 'Internal Server Error!' });
    }
})


// router.get('/rejectPurchaseOrder/:purchase_id', async (req, res) => {

//     try {
//         const purchase_id = req.params.purchase_id;
//         const rejection_reason = req.body.rejection_reason;

//         const updateQuery = `Update purchase_order set rejection_reason=$1 where purchase_id=$2`;

//         console.log(purchase_id, "rejectPurchaseOrder");
//         // let modified_date = moment().format('YYYY-MM-DD');
//         let modified_date = moment().format('DD-MM-YYYY');
//         // Begin transaction
//         await db.query('BEGIN');
//         let grandtotalofpodata = 0;
//         const purchase_data = await db.query(`SELECT * FROM get_purchasejoindatabypid($1)`, [purchase_id]);

//         const update_rejection_reason_in_po = await db.query(updateQuery, [purchase_id]);


//         const grandtotal = purchase_data.rows.reduce((accumulator, currentValue) => {
//             return accumulator + parseFloat(currentValue.total);
//         }, 0);

//         grandtotalofpodata = grandtotal.toFixed(2);

//         const isSent = purchase_data.rows[0].is_sent;

//         if(isSent == 1){
//             let message = `Rejection of the Purchase Order with Purchase id-${purchase_id} on ${modified_date}`;

//             const mailOptions = {
//                 from: 'apvaims@apvtechnologies.com',
//                 to: mailConfig.to,
//                 cc: mailConfig.cc,
//                 subject: message,
//                 html: generateEmailHTML(purchase_data.rows)
//             };

//             console.log(purchase_data.rows, "purchase_data");

//             // Function to generate HTML content for the email
//             function generateEmailHTML(purchases) {
//                 let html = `
//                 <div style="margin: 20px; margin-left:0;">
//                     <p>Hi System Admin Department,</p>
//                     <div style="overflow-x: auto; width: 100%; max-width: 100%;"> <!-- Ensure scrollable area takes full width -->
//                         <table style="border-collapse: collapse; width: 100%; table-layout: fixed; border: 1px solid #000; font-family: sans-serif; background-color: #ff9a98; color: #004080; font-size: 12px;">
//                             <thead>
//                                 <tr>
//                                     <th style="border: 1px solid #000; padding: 5px; width: 5%; color: #004080; text-align: left; white-space: nowrap;">S.No.</th>
//                                     <th style="border: 1px solid #000; padding: 5px; width: 12%; color: #004080; text-align: left; white-space: nowrap;">Purchase ID</th>
//                                     <th style="border: 1px solid #000; padding: 5px; width: 12%; color: #004080; text-align: left; white-space: nowrap;">Supplier Name</th>
//                                     <th style="border: 1px solid #000; padding: 5px; width: 10%; color: #004080; text-align: left; white-space: nowrap;">Issue Date</th>
//                                     <th style="border: 1px solid #000; padding: 5px; width: 10%; color: #004080; text-align: left; white-space: nowrap;">Expected Date</th>
//                                     <th style="border: 1px solid #000; padding: 5px; width: 10%; color: #004080; text-align: left; white-space: nowrap;">Product</th>
//                                     <th style="border: 1px solid #000; padding: 5px; width: 5%; color: #004080; text-align: left; white-space: nowrap;">Unit Price</th>
//                                     <th style="border: 1px solid #000; padding: 5px; width: 5%; color: #004080; text-align: left; white-space: nowrap;">Quantity</th>
//                                     <th style="border: 1px solid #000; padding: 5px; width: 5%; color: #004080; text-align: left; white-space: nowrap;">Discount</th>
//                                     <th style="border: 1px solid #000; padding: 5px; width: 8%; color: #004080; text-align: left; white-space: nowrap;">GST(%)</th>
//                                     <th style="border: 1px solid #000; padding: 5px; width: 8%; color: #004080; text-align: left; white-space: nowrap;">Sub Total</th>
//                                     <th style="border: 1px solid #000; padding: 5px; width: 5%; color: #004080; text-align: left; white-space: nowrap;">Total</th>
//                                     <th style="border: 1px solid #000; padding: 5px; width: 10%; color: #004080; text-align: left; white-space: nowrap;">Description</th>
//                                     <th style="border: 1px solid #000; padding: 5px; width: 10%; color: #004080; text-align: left; white-space: nowrap;">Purpose</th>
//                                     <th style="border: 1px solid #000; padding: 5px; width: 10%; color: #004080; text-align: left; white-space: nowrap;">Intended User</th>
//                                 </tr>
//                             </thead>
//                             <tbody>
//                 `;

//                 purchases.forEach((purchase, index) => {
//                     // Format dates using Moment.js
//                     let issueDateFormatted = moment(purchase.issue_date).format('DD-MM-YYYY');
//                     let expectedDateFormatted = moment(purchase.expected_date).format('DD-MM-YYYY');

//                     html += `
//                         <tr>
//                             <td style="border: 1px solid #000; padding: 5px; color: #000000; white-space: nowrap;">${index + 1}</td>
//                             <td style="border: 1px solid #000; padding: 5px; color: #000000; white-space: nowrap;">${purchase.purchase_id}</td>
//                             <td style="border: 1px solid #000; padding: 5px; color: #000000; white-space: nowrap;">${purchase.supplier_name}</td>
//                             <td style="border: 1px solid #000; padding: 5px; color: #000000; white-space: nowrap;">${issueDateFormatted}</td>
//                             <td style="border: 1px solid #000; padding: 5px; color: #000000; white-space: nowrap;">${expectedDateFormatted}</td>
//                             <td style="border: 1px solid #000; padding: 5px; color: #000000; white-space: nowrap;">${purchase.product_name}</td>
//                             <td style="border: 1px solid #000; padding: 5px; color: #000000; text-align: right; white-space: nowrap;">${purchase.unit_price}</td>
//                             <td style="border: 1px solid #000; padding: 5px; color: #000000; text-align: right; white-space: nowrap;">${purchase.quantity}</td>
//                             <td style="border: 1px solid #000; padding: 5px; color: #000000; text-align: right; white-space: nowrap;">${purchase.discount_in_rs}</td>
//                             <td style="border: 1px solid #000; padding: 5px; color: #000000; text-align: right; white-space: nowrap;">${purchase.gst_in_percent * 100}</td>
//                             <td style="border: 1px solid #000; padding: 5px; color: #000000; text-align: right; white-space: nowrap;">${purchase.sub_total}</td>
//                             <td style="border: 1px solid #000; padding: 5px; color: #000000; text-align: right; white-space: nowrap;">${purchase.total}</td>
//                             <td style="border: 1px solid #000; padding: 5px; color: #000000; white-space: nowrap;">${purchase.description ? purchase.description : 'NA'}</td>
//                             <td style="border: 1px solid #000; padding: 5px; color: #000000; white-space: nowrap;">${purchase.purpose ? purchase.purpose : 'NA'}</td>
//                             <td style="border: 1px solid #000; padding: 5px; color: #000000; white-space: nowrap;">${purchase.expected_user ? purchase.expected_user : 'NA'}</td>
//                         </tr>
//                     `;
//                 });

//                 html += `
//                     <tr>
//                         <td colspan="11" style="text-align:right; color:black; border: 1px solid black; white-space: nowrap;"><strong>Grand Total(₹)</strong></td>
//                         <td class="font-weight-bold" style="border: 1px solid #000; padding: 3px; color: green; white-space: nowrap;"><b>${grandtotalofpodata}</b></td>
//                     </tr>
//                     </tbody>
//                 </table>
//                 </div> <!-- Close scrollable container div -->
//                 <div style="font-size: 16px; font-style: italic; margin-top: 20px; color: #004080;">
//                         Rejected,<br> Director
//         </div>
//             </div>
//                 `;

//                 return html;
//             };

//             const porejection = await db.query(`SELECT * FROM update_sent_rejectpurchaseorder($1)`, [purchase_id]);
//             const porejectionreason = await db.query(update_rejection_reason_in_po, [rejection_reason, purchase_id]);
//             // Send email
//             await sendEmail(mailOptions);
//             // Commit transaction
//             await db.query('COMMIT');
//             // res.status(200).json(porejection.rows);

//             res.status(200).send(`
//                 <!DOCTYPE html>
//                 <html lang="en">
//                 <head>
//                     <meta charset="UTF-8">
//                     <meta name="viewport" content="width=device-width, initial-scale=1.0">
//                     <title>Purchase Order Rejected</title>
//                     <style>
//                 body {
//                     font-family: Arial, sans-serif;
//                     margin: 0;
//                     padding: 0;
//                     background-color: #fff;
//                     color: #333;
//                     display: flex;
//                     justify-content: center;
//                     align-items: center;
//                     height: 100vh;
//                     text-align: center;
//                 }

//                 .container {
//                     display: flex;
//                     flex-direction: column;
//                     justify-content: center;
//                     align-items: center;
//                     text-align: center;
//                 }


//                 .icon {
//                     font-size: 100px;
//                     color: red;
//                     animation: blink 1s infinite;
//                 }

//                 h1 {
//                     color: #004080;
//                     font-size: 24px;
//                     margin-top: 20px;
//                 }

//                 p {
//                     font-size: 18px;
//                     margin-top: 10px;
//                     color: #333;
//                 }

//                 .action-links {
//                     margin-top: 30px;
//                 }

//                 .action-links a {
//                     text-decoration: none;
//                     font-size: 18px;
//                     font-weight: bold;
//                     padding: 10px 20px;
//                     border-radius: 5px;
//                     margin: 0 10px;
//                 }

//                 .approve-btn {
//                     background-color: #004080;
//                     color: white;
//                 }

//                 .reject-btn {
//                     background-color: #e74c3c;
//                     color: white;
//                 }
//             </style>
//                 </head>
//                 <body>
//                     <div class="container">

//                            <div class="icon">
//                     <img src="/files/icons8-cross.gif" alt="Rejected" style="width: 150px; height: 150px;"/>
//                 </div>
//                         <h1 style="font-family: 'Trebuchet MS', Helvetica, sans-sarif;">PO Rejected!</h1>
//                     </div>
//                 </body>
//                 </html>
//             `);
//         }
//         else{
//             res.status(200).send(`
//                 <!DOCTYPE html>
//                 <html lang="en">
//                 <head>
//                     <meta charset="UTF-8">
//                     <meta name="viewport" content="width=device-width, initial-scale=1.0">
//                     <title>Approval Success</title>
//                     <style>
//                         body {
//                             font-family: Arial, sans-serif;
//                             margin: 0;
//                             padding: 0;
//                             background-color: #fff;
//                             color: #333;
//                             display: flex;
//                             justify-content: center;
//                             align-items: center;
//                             height: 100vh;
//                             text-align: center;
//                         }

//                         .container {
//                             display: flex;
//                             flex-direction: column;
//                             justify-content: center;
//                             align-items: center;
//                             text-align: center;
//                         }

//                         .icon {
//                             font-size: 100px;
//                             color: green;
//                         }

//                         h1 {
//                             color: #004080;
//                             font-size: 24px;
//                             margin-top: 20px;
//                         }

//                         p {
//                             font-size: 18px;
//                             margin-top: 10px;
//                             color: #333;
//                         }
//                     </style>
//                 </head>
//                 <body>
//                     <div class="container">
//                      <img src="/files/pikachu-deliciousdaywithpokemon.gif" alt="Approved PO" style="width: 150px; height: 150px;"/>
//                         <h1 style="font-family: 'Trebuchet MS', Helvetica, sans-sarif;">This operation has already been completed and cannot be performed again.</h1>
//                     </div>
//                 </body>
//                 </html>
//             `);
//         }


//         // db.query(`SELECT * FROM update_sent_rejectpurchaseorder('${purchase_id}')`, (err, result) => {
//         // db.query(`SELECT * FROM update_sent_rejectpurchaseorder($1)`, [purchase_id], (err, result) => {
//         //     if (err) {
//         //         throw err;
//         //     }
//         //     re
//         // })

//     }
//     catch (err) {
//         await db.query('ROLLBACK');
//         console.error(err);
//         res.status(500).json({ error: 'Internal Server Error!' });
//     }

// })

router.post('/rejectPurchaseOrder', async (req, res) => {

    try {

        const { purchase_id, rejection_reason } = req.body;
        const update_rejection_reason_in_po = `Update purchase_order set rejection_cause=$1 where purchase_id=$2`;

        console.log(purchase_id, "rejectPurchaseOrder");

        let modified_date = moment().format('DD-MM-YYYY');

        // Begin transaction
        await db.query('BEGIN');
        // let grandtotalofpodata = 0;
        const purchase_data = await db.query(`SELECT * FROM get_purchasejoindatabypid($1)`, [purchase_id]);

        const grandtotal = purchase_data.rows.reduce((accumulator, currentValue) => {
            return accumulator + parseFloat(currentValue.total);
        }, 0);

        // Proper rounding to 2 decimals
        const grandtotalofpodata = Math.round((grandtotal + Number.EPSILON) * 100) / 100;

        const isSent = purchase_data.rows[0].is_sent;

        if (isSent == 1) {
            let message = `Rejection of the Purchase Order with Purchase id-${purchase_id} on ${modified_date} :${process.env.ENVIRONMENT_STATUS}`;

            const mailOptions = {
                from: 'apvaims@apvtechnologies.com',
                to: mailConfig.to,
                cc: mailConfig.cc,
                subject: message,
                html: generateEmailHTML(purchase_data.rows)
            };

            console.log(purchase_data.rows, "purchase_data");

            // Function to generate HTML content for the email
            function generateEmailHTML(purchases) {
                let html = `
                <div style="margin: 20px; margin-left:0;">
                    <p>Hi System Admin Department,</p>
                    <div style="overflow-x: auto; width: 100%; max-width: 100%;"> <!-- Ensure scrollable area takes full width -->
                        <table style="border-collapse: collapse; width: 100%; table-layout: fixed; border: 1px solid #000; font-family: sans-serif; background-color: #ff9a98; color: #004080; font-size: 12px;">
                            <thead>
                                <tr>
                                    <th style="border: 1px solid #000; padding: 5px; width: 5%; color: #004080; text-align: left; white-space: nowrap;">S.No.</th>
                                    <th style="border: 1px solid #000; padding: 5px; width: 10%; color: #004080; text-align: left; white-space: nowrap;">Purchase ID</th>
                                    <th style="border: 1px solid #000; padding: 5px; width: 10%; color: #004080; text-align: left; white-space: nowrap;">Supplier Name</th>
                                    <th style="border: 1px solid #000; padding: 5px; width: 10%; color: #004080; text-align: left; white-space: nowrap;">Issue Date</th>
                                    <th style="border: 1px solid #000; padding: 5px; width: 10%; color: #004080; text-align: left; white-space: nowrap;">Expected Date</th>
                                    <th style="border: 1px solid #000; padding: 5px; width: 10%; color: #004080; text-align: left; white-space: nowrap;">Product</th>
                                    <th style="border: 1px solid #000; padding: 5px; width: 5%; color: #004080; text-align: left; white-space: nowrap;">Unit Price</th>
                                    <th style="border: 1px solid #000; padding: 5px; width: 5%; color: #004080; text-align: left; white-space: nowrap;">Quantity</th>
                                    <th style="border: 1px solid #000; padding: 5px; width: 5%; color: #004080; text-align: left; white-space: nowrap;">Discount</th>
                                    <th style="border: 1px solid #000; padding: 5px; width: 8%; color: #004080; text-align: left; white-space: nowrap;">GST(%)</th>
                                    <th style="border: 1px solid #000; padding: 5px; width: 8%; color: #004080; text-align: left; white-space: nowrap;">Sub Total</th>
                                    <th style="border: 1px solid #000; padding: 5px; width: 5%; color: #004080; text-align: left; white-space: nowrap;">Total</th>
                                    <th style="border: 1px solid #000; padding: 5px; width: 10%; color: #004080; text-align: left; white-space: nowrap;">Description</th>
                                    <th style="border: 1px solid #000; padding: 5px; width: 10%; color: #004080; text-align: left; white-space: nowrap;">Purpose</th>
                                    <th style="border: 1px solid #000; padding: 5px; width: 10%; color: #004080; text-align: left; white-space: nowrap;">Intended User</th>
                                    <th style="border: 1px solid #000; padding: 5px; width: 10%; color: #004080; text-align: left; white-space: nowrap;">Rejection Reason</th>
                                </tr>
                            </thead>
                            <tbody>
                `;

                purchases.forEach((purchase, index) => {
                    // Format dates using Moment.js
                    let issueDateFormatted = moment(purchase.issue_date).format('DD-MM-YYYY');
                    let expectedDateFormatted = moment(purchase.expected_date).format('DD-MM-YYYY');

                    html += `
                        <tr>
                            <td style="border: 1px solid #000; padding: 5px; color: #000000; white-space: nowrap;">${index + 1}</td>
                            <td style="border: 1px solid #000; padding: 5px; color: #000000; white-space: nowrap;">${purchase.purchase_id}</td>
                            <td style="border: 1px solid #000; padding: 5px; color: #000000; white-space: nowrap;">${purchase.supplier_name}</td>
                            <td style="border: 1px solid #000; padding: 5px; color: #000000; white-space: nowrap;">${issueDateFormatted}</td>
                            <td style="border: 1px solid #000; padding: 5px; color: #000000; white-space: nowrap;">${expectedDateFormatted}</td>
                            <td style="border: 1px solid #000; padding: 5px; color: #000000; white-space: nowrap;">${purchase.product_name}</td>
                            <td style="border: 1px solid #000; padding: 5px; color: #000000; text-align: right; white-space: nowrap;">${purchase.unit_price.toFixed(2)}</td>
                            <td style="border: 1px solid #000; padding: 5px; color: #000000; text-align: right; white-space: nowrap;">${purchase.quantity}</td>
                            <td style="border: 1px solid #000; padding: 5px; color: #000000; text-align: right; white-space: nowrap;">${purchase.discount_in_rs.toFixed(2)}</td>
                            <td style="border: 1px solid #000; padding: 5px; color: #000000; text-align: right; white-space: nowrap;">${(purchase.gst_in_percent * 100).toFixed(0)}</td>
                            <td style="border: 1px solid #000; padding: 5px; color: #000000; text-align: right; white-space: nowrap;">${purchase.sub_total.toFixed(2)}</td>
                            <td style="border: 1px solid #000; padding: 5px; color: #000000; text-align: right; white-space: nowrap;">${purchase.total.toFixed(2)}</td>
                            <td style="border: 1px solid #000; padding: 5px; color: #000000; white-space: nowrap;">${purchase.description ? purchase.description : 'NA'}</td>
                            <td style="border: 1px solid #000; padding: 5px; color: #000000; white-space: nowrap;">${purchase.purpose ? purchase.purpose : 'NA'}</td>
                            <td style="border: 1px solid #000; padding: 5px; color: #000000; white-space: nowrap;">${purchase.expected_user ? purchase.expected_user : 'NA'}</td>
                            <td style="border: 1px solid #000; padding: 5px; color: #000000; white-space: nowrap;">${rejection_reason ? rejection_reason : 'NA'}</td>
                        </tr>
                          

                    `;
                });

                html += `
                <tr>
                    <td colspan="11" style="text-align:right; color:black; border: 1px solid black; white-space: nowrap;"><strong>Grand Total(${purchases[0].currency})</strong></td>
                    <td class="font-weight-bold" style="border: 1px solid #000; padding: 3px; color: green; white-space: nowrap;"><b>${Math.round(grandtotalofpodata)}</b></td>
                </tr>
               
                      </tbody>
                      </table>
      
                <div style="font-size: 16px; font-style: italic; margin-top: 20px; color: #004080;">
                        Rejected,<br> Director
                    </div>
          
            <div style="margin-top: 100px; font-size: 14px; color: #888; text-align:center">
        This is an auto-generated email intended solely for internal use by APV Technologies Pvt. Ltd. Please do not reply to this mail.
            </div>
            `;

                return html;
            };

            await db.query(`SELECT * FROM update_sent_rejectpurchaseorder($1)`, [purchase_id]);
            await db.query(update_rejection_reason_in_po, [rejection_reason, purchase_id]);
            // Send email
            await sendEmail(mailOptions);
            // Commit transaction
            await db.query('COMMIT');
            // res.status(200).json(porejection.rows);

            res.status(200).json({ message: true });
        }
        else {
            res.status(200).json({ message: false });
        }

    }
    catch (err) {
        await db.query('ROLLBACK');
        console.error(err);
        res.status(500).json({ error: 'Internal Server Error!' });
    }

})


//new discuss purchase order according to approval/rejection

router.get('/discussPurchaseOrder/:purchase_id', async (req, res) => {
    try {
        const purchase_id = req.params.purchase_id;
        const modified_date = moment().format('DD-MM-YYYY');

        // const bearerHeader = req.headers["authorization"];
        // console.log(bearerHeader, "bearerHeader");


        // Begin transaction
        await db.query('BEGIN');

        const url = process.env.BACKEND_URL + `/shared/getpurchaseorderData`;
        console.log(url, "url for getpurchaseOrder");

        const results = await axios.get(url);
        console.log(results.data, "results");
        const checkPOapproval = results.data.filter(item => item.purchase_id === purchase_id);

        // Helper: Generate email HTML
        function generateEmailHTML() {
            return `
                <div style="margin: 20px; margin-left:0;">
                    <p>Hi System Admin Department,</p>
                    <p>Please discuss the Purchase Order ID: <strong>${purchase_id}</strong> with me before proceeding with the next steps. Kindly reach out to me to review it.</p>
                    <div style="font-size: 16px; font-style: italic; margin-top: 20px; color: #004080;">
                        Regards,<br> Director
                    </div>
                </div>         
            <div style="margin-top: 100px; font-size: 14px; color: #888; text-align:center">
        This is an auto-generated email intended solely for internal use by APV Technologies Pvt. Ltd. Please do not reply to this mail.
            </div>
            `;

        }

        // Helper: Generate full HTML to return to user
        function getStatusHTML(type) {
            let message = '';
            let imagePath = '';

            switch (type) {
                case 'approved':
                    message = 'This PO has already been approved!';
                    imagePath = '/files/info_icon.png';
                    break;
                case 'rejected':
                    message = 'This PO has already been rejected!';
                    imagePath = '/files/info_icon.png';
                    break;
                case 'notified':
                    message = 'Notification has been sent to the Admin team to discuss the PO with you.<br>Thanks!';
                    imagePath = '/files/po_discuss.jpg';
                    break;
                default:
                    message = 'Status unknown!';
                    imagePath = '/files/info_icon.png';
            }

            return `
                <!DOCTYPE html>
                <html lang="en">
                <head>
                    <meta charset="UTF-8" />
                    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
                    <link rel="icon" type="image/x-icon" href="${process.env.BACKEND_URL}/files/MINI-LOGO-ICON-WHITE-2-3.png">
                    <title>IMS</title>
                    <style>
                        body {
                            font-family: Arial, sans-serif;
                            margin: 0;
                            padding: 0;
                            background-color: #fff;
                            color: #333;
                            display: flex;
                            justify-content: center;
                            align-items: center;
                            height: 100vh;
                            text-align: center;
                        }
                        
                        .container {
                            display: flex;
                            flex-direction: column;
                            align-items: center;
                        }
                        .icon img {
                            width: 150px;
                            height: 150px;
                        }

                      h1 {
    color: #004080;
    font-size: 28px;
    margin-top: 0 0 16px 0;
    line-height: 32px;
    font-weight: 400;

}

                    </style>
                </head>
                <body>
                    <div class="container">
                        <div class="icon">
                            <img src="${process.env.BACKEND_URL}${imagePath}" alt="PO Status" style="width: 110px; height: 110px;"/>
                        </div>
                        <h1 style="font-family: 'Trebuchet MS', Helvetica, sans-serif;">${message}</h1>
                    </div>
                </body>
                </html>
            `;
        }

        if (checkPOapproval && checkPOapproval.length > 0) {
            const status = checkPOapproval[0].is_sent;

            // Send correct UI HTML for each status
            if (status == 2) {
                await db.query('COMMIT');
                return res.status(200).send(getStatusHTML('approved'));
            } else if (status == 3) {
                await db.query('COMMIT');
                return res.status(200).send(getStatusHTML('rejected'));
            } else {
                // Email and Notify Admin
                const mailOptions = {
                    from: 'apvaims@apvtechnologies.com',
                    to: mailConfig.to,
                    cc: mailConfig.cc,
                    subject: `Discussion of the Purchase Order with Purchase id-${purchase_id} on ${modified_date}: ${process.env.ENVIRONMENT_STATUS}`,
                    html: generateEmailHTML()
                };

                await sendEmail(mailOptions);
                await db.query('COMMIT');
                return res.status(200).send(getStatusHTML('notified'));
            }
        }
        else {
            await db.query('ROLLBACK');
            return res.status(404).send("Purchase Order not found.");
        }


    } catch (err) {
        await db.query('ROLLBACK');
        console.error(err);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
});


router.post('/updatesentRejectpurchaseorder', async (req, res) => {

    try {
        const purchase_id = req.body.purchase_id;
        // let modified_date = moment().format('YYYY-MM-DD');
        let modified_date = moment().format('DD-MM-YYYY');
        // Begin transaction
        await db.query('BEGIN');
        // let grandtotalofpodata = 0;
        const purchase_data = await db.query(`SELECT * FROM get_purchasejoindatabypid($1)`, [purchase_id]);
        const grandtotal = purchase_data.rows.reduce((accumulator, currentValue) => {
            return accumulator + parseFloat(currentValue.total);
        }, 0);

        // grandtotalofpodata = grandtotal.toFixed(2);

        // Proper rounding to 2 decimals
        const grandtotalofpodata = Math.round((grandtotal + Number.EPSILON) * 100) / 100;

        let message = `Rejection of the Purchase Order with Purchase id-${purchase_id} on ${modified_date} :${process.env.ENVIRONMENT_STATUS}`;

        const mailOptions = {
            from: 'apvaims@apvtechnologies.com',
            to: mailConfig.to,
            cc: mailConfig.cc,
            subject: message,
            html: generateEmailHTML(purchase_data.rows)
        };

        // Function to generate HTML content for the email
        function generateEmailHTML(purchases) {
            let html = `
            <div style="margin: 20px; margin-left:0;">
                <p>Hi System Admin Department,</p>
                <div style="overflow-x: auto; width: 100%; max-width: 100%;"> <!-- Ensure scrollable area takes full width -->
                    <table style="border-collapse: collapse; width: 100%; table-layout: fixed; border: 1px solid #000; font-family: sans-serif; background-color: #ff9a98; color: #004080; font-size: 12px;">
                        <thead>
                            <tr>
                                <th style="border: 1px solid #000; padding: 5px; width: 5%; color: #004080; text-align: left; white-space: nowrap;">S.No.</th>
                                <th style="border: 1px solid #000; padding: 5px; width: 12%; color: #004080; text-align: left; white-space: nowrap;">Purchase ID</th>
                                <th style="border: 1px solid #000; padding: 5px; width: 12%; color: #004080; text-align: left; white-space: nowrap;">Supplier Name</th>
                                <th style="border: 1px solid #000; padding: 5px; width: 10%; color: #004080; text-align: left; white-space: nowrap;">Issue Date</th>
                                <th style="border: 1px solid #000; padding: 5px; width: 10%; color: #004080; text-align: left; white-space: nowrap;">Expected Date</th>
                                <th style="border: 1px solid #000; padding: 5px; width: 10%; color: #004080; text-align: left; white-space: nowrap;">Product</th>
                                <th style="border: 1px solid #000; padding: 5px; width: 5%; color: #004080; text-align: left; white-space: nowrap;">Unit Price</th>
                                <th style="border: 1px solid #000; padding: 5px; width: 5%; color: #004080; text-align: left; white-space: nowrap;">Quantity</th>
                                <th style="border: 1px solid #000; padding: 5px; width: 5%; color: #004080; text-align: left; white-space: nowrap;">Discount</th>
                                <th style="border: 1px solid #000; padding: 5px; width: 8%; color: #004080; text-align: left; white-space: nowrap;">GST(%)</th>
                                <th style="border: 1px solid #000; padding: 5px; width: 8%; color: #004080; text-align: left; white-space: nowrap;">Sub Total</th>
                                <th style="border: 1px solid #000; padding: 5px; width: 5%; color: #004080; text-align: left; white-space: nowrap;">Total</th>
                                <th style="border: 1px solid #000; padding: 5px; width: 10%; color: #004080; text-align: left; white-space: nowrap;">Description</th>
                                <th style="border: 1px solid #000; padding: 5px; width: 10%; color: #004080; text-align: left; white-space: nowrap;">Purpose</th>
                                <th style="border: 1px solid #000; padding: 5px; width: 10%; color: #004080; text-align: left; white-space: nowrap;">Intended User</th>
                            </tr>
                        </thead>
                        <tbody>
            `;

            purchases.forEach((purchase, index) => {
                // Format dates using Moment.js
                let issueDateFormatted = moment(purchase.issue_date).format('DD-MM-YYYY');
                let expectedDateFormatted = moment(purchase.expected_date).format('DD-MM-YYYY');

                html += `
                    <tr>
                        <td style="border: 1px solid #000; padding: 5px; color: #000000; white-space: nowrap;">${index + 1}</td>
                        <td style="border: 1px solid #000; padding: 5px; color: #000000; white-space: nowrap;">${purchase.purchase_id}</td>
                        <td style="border: 1px solid #000; padding: 5px; color: #000000; white-space: nowrap;">${purchase.supplier_name}</td>
                        <td style="border: 1px solid #000; padding: 5px; color: #000000; white-space: nowrap;">${issueDateFormatted}</td>
                        <td style="border: 1px solid #000; padding: 5px; color: #000000; white-space: nowrap;">${expectedDateFormatted}</td>
                        <td style="border: 1px solid #000; padding: 5px; color: #000000; white-space: nowrap;">${purchase.product_name}</td>
                        <td style="border: 1px solid #000; padding: 5px; color: #000000; text-align: right; white-space: nowrap;">${purchase.unit_price.toFixed(2)}</td>
                        <td style="border: 1px solid #000; padding: 5px; color: #000000; text-align: right; white-space: nowrap;">${purchase.quantity}</td>
                        <td style="border: 1px solid #000; padding: 5px; color: #000000; text-align: right; white-space: nowrap;">${purchase.discount_in_rs.toFixed(2)}</td>
                        <td style="border: 1px solid #000; padding: 5px; color: #000000; text-align: right; white-space: nowrap;">${(purchase.gst_in_percent * 100).toFixed(0)}</td>
                        <td style="border: 1px solid #000; padding: 5px; color: #000000; text-align: right; white-space: nowrap;">${purchase.sub_total.toFixed(2)}</td>
                        <td style="border: 1px solid #000; padding: 5px; color: #000000; text-align: right; white-space: nowrap;">${purchase.total.toFixed(2)}</td>
                        <td style="border: 1px solid #000; padding: 5px; color: #000000; white-space: nowrap;">${purchase.description ? purchase.description : 'NA'}</td>
                        <td style="border: 1px solid #000; padding: 5px; color: #000000; white-space: nowrap;">${purchase.purpose ? purchase.purpose : 'NA'}</td>
                        <td style="border: 1px solid #000; padding: 5px; color: #000000; white-space: nowrap;">${purchase.expected_user ? purchase.expected_user : 'NA'}</td>
                    </tr>
                `;
            });

            html += `
                <tr>
                    <td colspan="11" style="text-align:right; color:black; border: 1px solid black; white-space: nowrap;"><strong>Grand Total(₹)</strong></td>
                    <td class="font-weight-bold" style="border: 1px solid #000; padding: 3px; color: green; white-space: nowrap;"><b>${grandtotalofpodata.toFixed(2)}</b></td>
                </tr>
                </tbody>
            </table>
            </div> <!-- Close scrollable container div -->
            <div style="font-size: 16px; font-style: italic; margin-top: 20px; color: #004080;">
                    Rejected,<br> Director
    </div>
        </div>
        
            `;

            html += `
            <div style="margin-top: 100px; font-size: 14px; color: #888; text-align:center">
        This is an auto-generated email intended solely for internal use by APV Technologies Pvt. Ltd. Please do not reply to this mail.
            </div>
            `;

            return html;
        };

        const porejection = await db.query(`SELECT * FROM update_sent_rejectpurchaseorder($1)`, [purchase_id]);
        // Send email
        await sendEmail(mailOptions);
        // Commit transaction
        await db.query('COMMIT');
        res.status(200).json(porejection.rows);
    }
    catch (err) {
        await db.query('ROLLBACK');
        console.error(err);
        res.status(500).json({ error: 'Internal Server Error!' });
    }

})

router.post('/updateSentinpurchaseOrder', async (req, res) => {
    try {
        let purchase_id = req.body.purchase_id;
        let modified_date_for_mail = moment().format('DD-MM-YYYY');
        let modified_date = moment().format('YYYY-MM-DD');
        console.log(modified_date, "modified_date");

        const encodePurchasaId = encodeURIComponent(purchase_id);
        console.log(encodePurchasaId, "decodePurchasaId");

        const approvalLink = `${process.env.BASE_URL}/#/user/po-approval-mail/${encodePurchasaId}`;
        const rejectLink = `${process.env.BASE_URL}/#/user/po-rejection-mail/${encodePurchasaId}`;
        const discussLink = `${process.env.BACKEND_URL}/admin/discussPurchaseOrder/${encodePurchasaId}`;


        console.log(modified_date);
        // Begin transaction
        await db.query('BEGIN');
        // let grandtotalofpodata = 0;

        const purchase_data = await db.query(`SELECT * FROM get_purchasejoindatabypid($1)`, [purchase_id]);

        console.log(purchase_data.rows, "purchase_data");

        const grandtotal = purchase_data.rows.reduce((accumulator, currentValue) => {
            return accumulator + parseFloat(currentValue.total);
        }, 0);

        // Proper rounding to 2 decimals
        const grandtotalofpodata = Math.round((grandtotal + Number.EPSILON) * 100) / 100;

        let message = `Request for Approval of the Purchase Order with Purchase id-${purchase_id} on ${modified_date_for_mail} :${process.env.ENVIRONMENT_STATUS}`;

        const mailOptionsSAdmin = {
            from: 'apvaims@apvtechnologies.com',
            to: mailConfig.to,
            subject: message,
            html: generateEmailHTML(purchase_data.rows, true)
            ,
        };

        const mailOptionsAdmin = {
            from: 'apvaims@apvtechnologies.com',
            cc: mailConfig.cc,
            subject: message,
            html: generateEmailHTML(purchase_data.rows, false)
            ,
        };

        // Function to generate HTML content for the email
        function generateEmailHTML(purchases, isDirector) {
            let html = `
                <div style="margin: 20px; margin-left:0;">
                    <p>Hi Sir,</p>
                    <div style="overflow-x: auto; width: 100%; max-width: 100%;"> <!-- Ensure scrollable area takes full width -->
                        <table style="border-collapse: collapse; width: 100%; table-layout: fixed; border: 1px solid #000; font-family: sans-serif; background-color: #f2f2f2; color: #004080; font-size: 12px;">
                            <thead>
                                <tr>
                                    <th style="border: 1px solid #000; padding: 5px; width: 5%; color: #004080; text-align: left; white-space: nowrap;">S.No.</th>
                                    <th style="border: 1px solid #000; padding: 5px; width: 12%; color: #004080; text-align: left; white-space: nowrap;">Purchase ID</th>
                                    <th style="border: 1px solid #000; padding: 5px; width: 12%; color: #004080; text-align: left; white-space: nowrap;">Supplier Name</th>
                                    <th style="border: 1px solid #000; padding: 5px; width: 10%; color: #004080; text-align: left; white-space: nowrap;">Issue Date</th>
                                    <th style="border: 1px solid #000; padding: 5px; width: 10%; color: #004080; text-align: left; white-space: nowrap;">Expected Date</th>
                                    <th style="border: 1px solid #000; padding: 5px; width: 10%; color: #004080; text-align: left; white-space: nowrap;">Product</th>
                                    <th style="border: 1px solid #000; padding: 5px; width: 5%; color: #004080; text-align: left; white-space: nowrap;">Unit Price</th>
                                    <th style="border: 1px solid #000; padding: 5px; width: 5%; color: #004080; text-align: left; white-space: nowrap;">Quantity</th>
                                    <th style="border: 1px solid #000; padding: 5px; width: 5%; color: #004080; text-align: left; white-space: nowrap;">Discount</th>
                                    <th style="border: 1px solid #000; padding: 5px; width: 8%; color: #004080; text-align: left; white-space: nowrap;">GST(%)</th>
                                    <th style="border: 1px solid #000; padding: 5px; width: 8%; color: #004080; text-align: left; white-space: nowrap;">Sub Total</th>
                                    <th style="border: 1px solid #000; padding: 5px; width: 5%; color: #004080; text-align: left; white-space: nowrap;">Total</th>
                                    <th style="border: 1px solid #000; padding: 5px; width: 10%; color: #004080; text-align: left; white-space: nowrap;">Description</th>
                                    <th style="border: 1px solid #000; padding: 5px; width: 10%; color: #004080; text-align: left; white-space: nowrap;">Purpose</th>
                                    <th style="border: 1px solid #000; padding: 5px; width: 10%; color: #004080; text-align: left; white-space: nowrap;">Intended User</th>
                                </tr>
                            </thead>
                            <tbody>
                `;

            purchases.forEach((purchase, index) => {
                let issueDateFormatted = moment(purchase.issue_date).format('DD-MM-YYYY');
                let expectedDateFormatted = moment(purchase.expected_date).format('DD-MM-YYYY');

                html += `
                        <tr>
                            <td style="border: 1px solid #000; padding: 5px; color: #000000; white-space: nowrap;">${index + 1}</td>
                            <td style="border: 1px solid #000; padding: 5px; color: #000000; white-space: nowrap;">${purchase.purchase_id}</td>
                            <td style="border: 1px solid #000; padding: 5px; color: #000000; white-space: nowrap;">${purchase.supplier_name}</td>
                            <td style="border: 1px solid #000; padding: 5px; color: #000000; white-space: nowrap;">${issueDateFormatted}</td>
                            <td style="border: 1px solid #000; padding: 5px; color: #000000; white-space: nowrap;">${expectedDateFormatted}</td>
                            <td style="border: 1px solid #000; padding: 5px; color: #000000; white-space: nowrap;">${purchase.product_name}</td>
                            <td style="border: 1px solid #000; padding: 5px; color: #000000; text-align: right; white-space: nowrap;">${purchase.currency} ${purchase.unit_price.toFixed(2)}</td>
                            <td style="border: 1px solid #000; padding: 5px; color: #000000; text-align: right; white-space: nowrap;">${purchase.quantity}</td>
                            <td style="border: 1px solid #000; padding: 5px; color: #000000; text-align: right; white-space: nowrap;">${purchase.currency} ${purchase.discount_in_rs.toFixed(2)}</td>
                            <td style="border: 1px solid #000; padding: 5px; color: #000000; text-align: right; white-space: nowrap;">${(purchase.gst_in_percent * 100).toFixed(0)}</td>
                            <td style="border: 1px solid #000; padding: 5px; color: #000000; text-align: right; white-space: nowrap;">${purchase.currency} ${purchase.sub_total.toFixed(2)}</td>
                            <td style="border: 1px solid #000; padding: 5px; color: #000000; text-align: right; white-space: nowrap;">${purchase.currency} ${purchase.total.toFixed(2)}</td>
                            <td style="border: 1px solid #000; padding: 5px; color: #000000; white-space: nowrap;">${purchase.description ? purchase.description : 'NA'}</td>
                             <td style="border: 1px solid #000; padding: 5px; color: #000000; white-space: nowrap;">${purchase.purpose ? purchase.purpose : 'NA'}</td>
                            <td style="border: 1px solid #000; padding: 5px; color: #000000; white-space: nowrap;">${purchase.expected_user ? purchase.expected_user : 'NA'}</td>
                        </tr>     
                    `;
            });


            // ✅ Close table only once, after loop
            html += `
            <tr>
                <td colspan="11" style="text-align:right; color:black; border: 1px solid black; white-space: nowrap;"><strong>Grand Total (${purchases[0].currency})</strong></td>
                <td style="border: 1px solid #000; padding: 3px; color: green;"><b>${Math.round(grandtotalofpodata)}</b></td>
            </tr>
            </tbody>
        </table>
        </div>
        <div style="font-size: 16px; font-style: italic; margin-top: 20px; color: #004080;">
            Thanks and Regards,<br>
            System Admin Department<br>
        </div>
    `;


            if (isDirector) {
                html += `
                        <div style="margin-top: 15px;">
                            <a href="${approvalLink}" style="background-color: #2d6c3e; color: white; padding: 14px 20px; text-align: center; text-decoration: none; display: inline-block;">Approve</a>
                            <a href="${rejectLink}" style="background-color: #f44336; color: white; padding: 14px 20px; text-align: center; text-decoration: none; display: inline-block;">Reject</a>
                            <a href="${discussLink}" style="background-color: #ffff00; color: black; padding: 14px 20px; text-align: center; text-decoration: none; display: inline-block;">Discuss</a>
                        </div>
                         <div style="margin-top: 100px; font-size: 14px; color: #888; text-align:center">
        This is an auto-generated email intended solely for internal use by APV Technologies Pvt. Ltd. Please do not reply to this mail.
            </div>
                    `;
            }

            return html;
        }

        const updatedsentinporepsonse = await db.query(`SELECT * FROM update_sent_inpurchaseorder($1, $2)`, [purchase_id, modified_date]);
        // Send email
        await sendEmail(mailOptionsSAdmin);
        await sendEmail(mailOptionsAdmin);
        // Commit transaction
        await db.query('COMMIT');
        res.status(200).json(updatedsentinporepsonse.rows);
    }
    catch (err) {
        await db.query('ROLLBACK');
        console.error(err);
        res.status(500).json({ error: 'Internal Server Error!' });
    }

})

router.post('/addInspectionapprovalinpi', (req, res) => {
    let approvalfromadmin1 = req.body.approved_by_admin1 ? req.body.approved_by_admin1 : 0;
    let approvalfromadmin2 = req.body.approved_by_admin2 ? req.body.approved_by_admin2 : 0;
    const { id, product_id, inspected_by, date_of_inspection, product_received_date, approved_by_admin1, approved_by_admin2 } = req.body
    console.log(req.body, "add inspection");

    db.query(`SELECT * FROM add_inspectionapproval_in_pi($1,$2,$3,$4,$5,$6,$7)`, [id, product_id, inspected_by, approved_by_admin1, approved_by_admin2, date_of_inspection, product_received_date], (err, result) => {
        if (err) {
            throw err;
        }
        res.status(200).json(result.rows);
    })

})


router.post('/addmutipleInspectionapprovalinpi', async (req, res) => {
    const inspectionDataArray = req.body;
    console.log(req.body, "inspectionDataArray");
    if (!Array.isArray(inspectionDataArray) || inspectionDataArray.length === 0) {
        return res.status(400).json({ error: 'Invalid or empty array of inspection data.' });
    }

    try {
        await db.query('BEGIN');
        // Iterate through each set of data
        for (const data of inspectionDataArray) {
            const { id, product_id, approved_by_admin1, approved_by_admin2, inspected_by, date_of_inspection, product_received_date } = data;
            const values = [id, product_id, approved_by_admin1 || 0, approved_by_admin2 || 0, inspected_by, date_of_inspection, product_received_date];
            // Execute the database query for each set of inspection data
            await db.query('SELECT * FROM add_inspectionapproval_in_pi($1, $2, $3, $4, $5, $6, $7)', values);
            // Commit the transaction
            await db.query('COMMIT');
        }
        res.status(200).json({ message: 'Inspection done Sucessfully' });
    }
    catch (error) {
        // Rollback the transaction in case of an error
        await db.query('ROLLBACK');
        console.error(error);
        res.status(500).json({ error: 'Internal Server Error!' });
    }

})

router.post('/addItems', async (req, res) => {
    try {
        // Start the transaction
        await db.query('BEGIN');
        // Convert each object in the req.body array to a JSON string
        console.log("add items", req.body)
        const jsonItems = req.body.map(item => JSON.stringify(item));

        // Call the add_items function with the modified array
        const query = `SELECT add_items2($1::jsonb[])`;
        await db.query(query, [jsonItems]);

        // Commit the transaction
        await db.query('COMMIT');

        res.status(200).json('Items inserted successfully');
    } catch (error) {
        // If an error occurs, rollback the transaction
        await db.query('ROLLBACK');
        console.error('Error inserting items:', error);
        res.status(500).json('Error inserting items');
    }
});

router.post('/updateItem', (req, res) => {
    const { item_id, date_, description, warrantyend_date } = req.body;

    // Check if the date is null or an empty string, and set it to null if true
    let sanitizedDate = (warrantyend_date && warrantyend_date.trim() !== '') ? warrantyend_date : null;

    db.query(`SELECT * FROM update_item($1,$2,$3,$4)`, [item_id, date_, description, sanitizedDate], (err, result) => {
        if (err) {
            throw err;
        }
        res.status(200).json(result.rows);
    })

});

router.post('/generateRequest', async (req, res) => {
    try {
        const { request_item, quantity, remark, created_by, estimated_price, created_by_username } = req.body;

        const message = `Request for purchasing ${quantity} ${request_item} with estimated price of ₹ ${estimated_price}(each) from ${created_by_username} :${process.env.ENVIRONMENT_STATUS}.`;

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
                    <td style="padding: 10px;"><b>Status:</b></td>
                    <td style="padding: 10px;"><p style="margin: 0; color: orange;">Pending</p></td>
                </tr>
                <tr style="border: 1px solid black;">
                    <td colspan="2" style="padding: 10px;">
                        <hr style="border-color: #004080;">
                        <h4 style="margin: 0; color: #004080;">This email is sent from APVAIMS (http://192.168.0.112/ims).</h4>
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
        // Execute the database query
        await db.query(`SELECT * FROM generate_request($1,$2,$3,$4,$5)`, [request_item, quantity, remark, created_by, estimated_price]);

        // Send email
        await sendEmail(mailOptions);
        db.query('COMMIT');
        // Respond to the client
        res.status(200).json({ message: 'Request generated successfully and email sent.' });
    } catch (error) {
        db.query('ROLLBACK');
        console.error(error);
        res.status(500).json({ error: 'Internal Server Error' });

    }
});

router.post('/supplierEvaluation', (req, res) => {
    let flag = 'true';
    const { purchase_id, evaluation_basis, vendor_status, qualitybasis_grading, pricebasis_grading, communicationbasis_grading, deliverybasis_grading, commitmentbasis_grading, evaluation_done_by } = req.body;
    console.log(req.body.evaluation_basis, "evaluation_basis");

    db.query(`SELECT * FROM supplier_evaluation($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`, [purchase_id, evaluation_basis, vendor_status, qualitybasis_grading,
        pricebasis_grading, communicationbasis_grading, deliverybasis_grading, commitmentbasis_grading, flag, evaluation_done_by]
        , (err, result) => {

            if (err) {
                res.json(500).json(err);
                console.error(err);
            }
            res.status(200).json(result.rows);
        })

})

//Received request by superadmin

// router.post('/generateRequest', (req, res) => {
//     const { request_item, quantity, remark, created_by } = req.body;

//     // db.query(`SELECT * FROM generate_request('${request_item}',${quantity}, '${remark}', '${created_by}')`, (err, result) => {
//     db.query(`SELECT * FROM generate_request($1, $2, $3, $4)`, [request_item, quantity, remark, created_by], (err, result) => {

//         if (err) {
//             throw err;
//         }
//     })
//     res.status(200).json({ message: "Request Generated ..." })
// })


// router.post('/onacceptrequest', (req,res)=>{
//     let request_id = req.body.request_id;

//     db.query(`SELECT * FROM change_requeststatus_onaccept(${request_id})`, (err, results)=>{
//         if(err){
//             throw err
//         }
//         res.status(200).json(results.rows);
//     })

// })

router.get('/getallRequest', (req, res) => {

    db.query(`SELECT * FROM get_allrequest()`, (err, results) => {
        if (err) {
            throw err
        }
        res.status(200).json(results.rows);
    })

})

router.post('/updaterequestgrantedQuantity', async (req, res) => {
    try {
        const modified_date = moment().format('YYYY-MM-DD');
        const { request_id, quantity } = req.body;
        console.log(req.body);
        db.query('BEGIN');
        const requestdetail = await db.query(`Select * from request where request_id = $1`, [request_id]);

        console.log(requestdetail.rows[0], "requestdetail");
        const { request_item, remark, estimated_price } = requestdetail.rows[0];
        const message = `Request accepted for ${quantity} ${request_item} :${process.env.ENVIRONMENT_STATUS}.`;
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
                    <td style="padding: 10px;"><b>Status:</b></td>
                    <td style="padding: 10px;"><p style="margin: 0; color: green;">Approved</p></td>
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

        await db.query(`SELECT * FROM update_request_quantity($1,$2,$3)`, [request_id, quantity, modified_date]);
        // Send email
        await sendEmail(mailOptions);
        db.query('COMMIT');
        res.status(200).json({ message: 'Request Accepted Successfully...' })
    }
    catch (err) {
        db.query('ROLLBACK');
        console.error(err);
        res.status(500).json({ error: 'Internal Server Error!' });
    }

})

router.post('/companyRegisteration', (req, res) => {
    const { company_logo, company_logo2, company_name, nick_name, address, telephone_no, mobile1, mobile2, registered_email, status, created_by, gstin } = req.body;
    db.query(`SELECT * FROM registercompany($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`, [company_logo, company_logo2, company_name, nick_name, address, telephone_no, mobile1, mobile2, registered_email, status, created_by, gstin]
        , (err, result) => {

            if (err) {
                throw err;
            }
            res.status(200).json(result.rows);
        })

})

//tranfer stock and updating location in transfer stock as well as in item table
//modified04/07/2024
router.post('/transferStock', async (req, res) => {
    console.log(req.body, "transferStock");

    try {
        const { item_id, transfer_to_system, location_id, transfer_by, transfer_category, transfer_to_user } = req.body;
        console.log(req.body);
        const queryfortransferStock = `SELECT * FROM transfer_stock2($1,$2,$3,$4,$5,$6)`;

        const transferStockValue = [item_id, transfer_to_system, location_id, transfer_by, transfer_category, transfer_to_user];

        // const queryforUpdatelocationintransferStock = `UPDATE transfer_stock set location_id = $1 WHERE item_id = $2`;

        // const updatelocationintsValue = [location_id, item_id];
        console.log(location_id);
        db.query('BEGIN');
        await db.query(queryfortransferStock, transferStockValue);

        // await db.query(queryforUpdatelocationintransferStock, updatelocationintsValue);

        db.query('COMMIT');

        res.status(200).json({ message: 'Stock is transferred...' });
    }
    catch (error) {
        db.query('ROLLBACK');

        console.error(error);
        res.status(500).json({ error: 'Internal Server Error!' });
    }
})

// additems
// router.post('/transfermultipleitems', async (req,res)=>{
// try{
//     await db.query('BEGIN');

//     // Convert each object in the req.body array to a JSON string
//     console.log("transferring items", req.body);

//       // Prepare the transfer items as JSONB
//         const jsonItems = req.body.map(item => ({
//             item_id: item.item_id,
//             transfer_to: item.transferto,
//             location_id: item.locationid,
//             transfer_by: item.transferby,
//             transfer_category: item.transfercategory
//         }));

//     // Call the add_items function with the modified array
//     const query = `SELECT transfer_multipleitems($1::jsonb[])`;
//     await db.query(query, [jsonItems]);
//     // Commit the transaction
//     await db.query('COMMIT');

//     res.status(200).json('Items transferred successfully');
// }
// catch (error) {
//     // If an error occurs, rollback the transaction
//     await db.query('ROLLBACK');
//     console.error('Error inserting items:', error);
//     res.status(500).json('Error inserting items');
// }
// })



router.post('/transferStockformultipledata', async (req, res) => {
    console.log(req.body, "transferStockformultipledata");

    try {
        const transferDataArray = req.body;
        if (!Array.isArray(transferDataArray)) {
            throw new Error('Invalid input. Expected an array.');
        }
        await db.query('BEGIN'); // Start a transaction

        try {
            for (const data of transferDataArray) {
                const queryForTransferStock = 'SELECT * FROM transfer_stock2($1, $2, $3, $4, $5,$6)';
                const transferStockValues = [
                    data.item_id,
                    data.transfer_to_system,
                    data.location_id,
                    data.transfer_by,
                    data.transfer_category,
                    data.transfer_to_user
                ];
                await db.query(queryForTransferStock, transferStockValues);

                // const queryForUpdateLocationInItem = 'UPDATE items SET location_id = $1 WHERE item_id = $2';
                // const updateLocationInItemValues = [data.location_id, data.item_id];
                // await db.query(queryForUpdateLocationInItem, updateLocationInItemValues);

                // const queryForUpdateLocationInTransferStock = 'UPDATE transfer_stock SET location_id = $1 WHERE item_id = $2';
                // const updateLocationInTransferStockValues = [data.location_id, data.item_id];
                // await db.query(queryForUpdateLocationInTransferStock, updateLocationInTransferStockValues);
            }

            await db.query('COMMIT'); // Commit the transaction
            res.status(200).json({ message: 'Stock is transferred...' });
        } catch (error) {
            await db.query('ROLLBACK'); // Rollback the transaction on error
            console.error(error);
            res.status(500).json({ error: 'Internal Server Error!' });
        }
    } catch (error) {
        await db.query('ROLLBACK');
        console.error(error);
        res.status(400).json({ error: 'Bad Request' });
    }
});

//updating location in transfer stock as well as in item table
router.post('/updateLocinItemandtransferStock', async (req, res) => {

    try {
        let item_id = req.body.item_id;
        let location_id = req.body.location_id;
        console.log(req.body);
        await db.query('BEGIN'); // Start a transaction

        const queryforUpdatelocationinitem = `UPDATE items set location_id = $1 WHERE item_id = $2`;
        const updatelocationinitemValue = [location_id, item_id];
        // const queryforUpdatelocationintransferStock = `UPDATE transfer_stock set location_id = $1 WHERE item_id = $2`
        // const updatelocationintsValue = [location_id, item_id];
        // console.log(location_id);
        await db.query(queryforUpdatelocationinitem, updatelocationinitemValue);
        // await db.query(queryforUpdatelocationintransferStock, updatelocationintsValue);

        await db.query('COMMIT'); // Commit the transaction
        res.status(200).json({ message: 'Location updated successfully...' });
    }
    catch (error) {
        await db.query('ROLLBACK');
        console.error(error);
        res.status(500).json({ error: 'Internal Server Error!' });
    }

})

router.post('/updateIsActiveinpi', (req, res) => {
    console.log('Received req.body:', req.body);
    const ids = req.body.ids;
    // Convert the array of IDs into a comma-separated string
    const idsString = ids.join(',');

    if (!ids || !Array.isArray(ids)) {
        console.error('Invalid or missing ids:', ids);
        res.status(400).json('Bad Request');
        return;
    }

    db.query(`select * from update_isactiveinpi(ARRAY[${idsString}]) `
        , (err, result) => {
            if (err) {
                throw err;
            }
            res.status(200).json(result.rows[0]);
        })

})

router.post('/deletesysteminformation', (req, res) => {
    const sid = req.body.sid;
    db.query(`Update system_info set system_status = '0' where sid=$1`, [sid], (err, results) => {
        if (err) {
            throw err;
        }
        res.status(200).json({ message: 'System Infomation deactivated sucessfully...' });
    })
})

router.post('/addsysteminformation', (req, res) => {
    const { cpucode, username, processor, processorcode, ram1, ram1code, ram2, ram2code, ram3, ram3code, ram4,
        ram4code, hdd1, hdd1code, hdd2, hdd2code, graphiccard,
        graphiccardcode, smps, smpscode, cabinet, cabinetcode, cmos, cmoscode, motherboard, motherboardcode, system_type, description, system_status, created_by } = req.body

    console.log("System Info: ", req.body)
    db.query(`SELECT * FROM add_system_information($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, 
        $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30)`,
        [cpucode, username, processor, processorcode, ram1, ram1code, ram2, ram2code, ram3, ram3code, ram4, ram4code, hdd1, hdd1code, hdd2, hdd2code, graphiccard,
            graphiccardcode, smps, smpscode, cabinet, cabinetcode, cmos, cmoscode, motherboard, motherboardcode, system_type, description, system_status, created_by], (err, results) => {
                if (err) {
                    throw err;
                }
                res.status(200).json({ message: 'System infomation added sucessfully...' })
            })
})

router.post('/updatesysteminformation', (req, res) => {
    const { sid, username, processor, ram1, ram1code, ram2, ram2code, ram3, ram3code, ram4, ram4code, hdd1, hdd1code, hdd2, hdd2code, graphiccard, graphiccardcode,
        smps, smpscode, cabinet, cmos, motherboard, system_type, description, system_status } = req.body
    console.log("System Info: ", req.body);

    db.query(`SELECT * FROM update_system_information($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17,$18,$19,$20,$21, $22,$23,$24,$25)`,
        [sid, username, processor, ram1, ram1code, ram2, ram2code, ram3, ram3code, ram4, ram4code, hdd1, hdd1code, hdd2, hdd2code, graphiccard, graphiccardcode, smps, smpscode, cabinet, cmos, motherboard, system_type, description, system_status], (err, results) => {
            if (err) {
                throw err;
            }
            res.status(200).json({ message: 'System Infomation updated sucessfully...' });
        })
})

router.post('/updateuserinsysteminformation', (req, res) => {
    const { item_code, username } = req.body
    console.log("System Info: ", req.body)
    db.query(`UPDATE system_info set username = $1 where cpucode= $2`, [username, item_code], (err, results) => {
        if (err) {
            throw err;
        }
        res.status(200).json({ message: 'User in System Infomation updated sucessfully...' })
    })
})

router.post('/updatescrappediteminsysteminformation', async (req, res) => {

    // when transferring any item related to system to any particular location it should remove from systeminfo
    // Note: Now its also working for any location you send

    const { item_code } = req.body;
    console.log("System Info: ", req.body);
    await db.query('BEGIN'); // Start a transaction

    db.query(`UPDATE system_info
      SET
         processorcode = CASE WHEN processorcode::text ILIKE '%' || $1 || '%' THEN NULL ELSE processorcode END,
         processor = CASE WHEN processorcode::text ILIKE '%' || $1 || '%' THEN NULL ELSE processor END,
         ram1code = CASE WHEN ram1code::text ILIKE '%' || $1 || '%' THEN NULL ELSE ram1code END,
         ram1 = CASE WHEN ram1code::text ILIKE '%' || $1 || '%' THEN NULL ELSE ram1 END,
         ram2code = CASE WHEN ram2code::text ILIKE '%' || $1 || '%' THEN NULL ELSE ram2code END,
         ram2 = CASE WHEN ram2code::text ILIKE '%' || $1 || '%' THEN NULL ELSE ram2 END,
         ram3code = CASE WHEN ram3code::text ILIKE '%' || $1 || '%' THEN NULL ELSE ram3code END,
         ram3 = CASE WHEN ram3code::text ILIKE '%' || $1 || '%' THEN NULL ELSE ram3 END,
         ram4code = CASE WHEN ram4code::text ILIKE '%' || $1 || '%' THEN NULL ELSE ram4code END,
         ram4 = CASE WHEN ram4code::text ILIKE '%' || $1 || '%' THEN NULL ELSE ram4 END,
         hdd1code = CASE WHEN hdd1code::text ILIKE '%' || $1 || '%' THEN NULL ELSE hdd1code END,
         hdd1 = CASE WHEN hdd1code::text ILIKE '%' || $1 || '%' THEN NULL ELSE hdd1 END,
         hdd2code = CASE WHEN hdd2code::text ILIKE '%' || $1 || '%' THEN NULL ELSE hdd2code END,
         hdd2 = CASE WHEN hdd2code::text ILIKE '%' || $1 || '%' THEN NULL ELSE hdd2 END,
         graphiccardcode = CASE WHEN graphiccardcode::text ILIKE '%' || $1 || '%' THEN NULL ELSE graphiccardcode END,
         graphiccard = CASE WHEN graphiccardcode::text ILIKE '%' || $1 || '%' THEN NULL ELSE graphiccard END,
         smpscode = CASE WHEN smpscode::text ILIKE '%' || $1 || '%' THEN NULL ELSE smpscode END,
         smps = CASE WHEN smpscode::text ILIKE '%' || $1 || '%' THEN NULL ELSE smps END,
         cabinetcode = CASE WHEN cabinetcode::text ILIKE '%' || $1 || '%' THEN NULL ELSE cabinetcode END,
         cabinet = CASE WHEN cabinetcode::text ILIKE '%' || $1 || '%' THEN NULL ELSE cabinet END,
         cmoscode = CASE WHEN cmoscode::text ILIKE '%' || $1 || '%' THEN NULL ELSE cmoscode END,
         cmos = CASE WHEN cmoscode::text ILIKE '%' || $1 || '%' THEN NULL ELSE cmos END,
         motherboardcode = CASE WHEN motherboardcode::text ILIKE '%' || $1 || '%' THEN NULL ELSE motherboardcode END,
         motherboard = CASE WHEN motherboardcode::text ILIKE '%' || $1 || '%' THEN NULL ELSE motherboard END
      WHERE
         processorcode::text ILIKE '%' || $1 || '%' OR
         ram1code::text ILIKE '%' || $1 || '%' OR
         ram2code::text ILIKE '%' || $1 || '%' OR
         ram3code::text ILIKE '%' || $1 || '%' OR
         ram4code::text ILIKE '%' || $1 || '%' OR
         hdd1code::text ILIKE '%' || $1 || '%' OR
         hdd2code::text ILIKE '%' || $1 || '%' OR
         graphiccardcode::text ILIKE '%' || $1 || '%' OR
         smpscode::text ILIKE '%' || $1 || '%' OR
         cabinetcode::text ILIKE '%' || $1 || '%' OR
         cmoscode::text ILIKE '%' || $1 || '%' OR
         motherboardcode::text ILIKE '%' || $1 || '%';
      `, [item_code],
        async (err, results) => {
            if (err) {
                await db.query('ROLLBACK');
                throw err;
            }
            await db.query('COMMIT');
            res.status(200).json({ message: 'Scrapped Item in System Infomation updated sucessfully...' })
        })
})


router.post('/insertmultipledatainitemstable', async (req, res) => {
    console.log(req.body, "itemsDAta")
    const itemsData = req.body;
    try {
        if (!itemsData || !Array.isArray(itemsData)) {
            return res.status(400).json({ error: 'Invalid request format' });
        }

        await db.query('BEGIN'); // Start a transaction
        const query = `INSERT INTO items (purchase_id, item_code, item_name, description, category_id,
     location_id, invoice_no,warrantyend_date, item_status, created_by,complain_id) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`;

        for (const items of itemsData) {
            // const queryForTransferStock = 'SELECT * FROM transfer_stock($1, $2, $3, $4, $5)';
            const itemsoforitemtable = [
                items.purchase_id,
                items.item_code,
                items.item_name,
                items.description,
                items.category_id,
                items.location_id,
                items.invoice_no,
                items.warrantyend_date,
                items.item_status,
                items.created_by,
                items.complain_id
            ];
            await db.query(query, itemsoforitemtable);
        }
        await db.query('COMMIT');
        res.status(200).json({ message: 'Items inserted successfully' });

    } catch (error) {
        await db.query('ROLLBACK'); // Rollback the transaction on error
        console.error('Transaction failed:', error);
        res.status(500).json({ error: 'Internal Server Error!' });
    }
});

router.post('/update-last-itemCode', async (req, res) => {
    try {
        console.log(req.body, "update-last-itemCode");
        const { product_id, last_item_code } = req.body;
        const updateQuery = `UPDATE products SET last_item_code=$1 WHERE product_id=$2`;
        await db.query(updateQuery, [last_item_code, product_id]);

        res.status(200).json({ message: 'Last item code updated!' })
    } catch (error) {
        console.error('Updation failed:', error);
        res.status(500).json({ error: 'Internal Server Error!' });
    }
});

router.post('/savegatepass', async (req, res) => {
    try {
        const in_date = req.body.in_date ? req.body.in_date : null;
        const { gatepass_id, issued_to, issued_by, received_by, out_date, item_code, description, quantity, remarks, is_returnable, item_name, party_name } = req.body;
        const checkquery = `SELECT * from tbl_gatepassid where gatepass_id=$1`;
        const insertgatepassidquery = `INSERT INTO tbl_gatepassid(issued_to, issued_by, out_date,party_name) values ($1,$2, $3,$4)`;
        const insertgatepassdataquery = `INSERT INTO gatepass(gatepass_id, item_code, description, quantity, remarks,in_date, is_returnable, received_by,item_name) values ($1,$2,$3,$4,$5,$6,$7,$8,$9)`;
        await db.query('BEGIN');
        const verifygatepassid = await db.query(checkquery, [gatepass_id]);
        if (verifygatepassid.rows.length === 0) {
            console.log('added in gatepassid');
            await db.query(insertgatepassidquery, [issued_to, issued_by, out_date, party_name]);
        }

        await db.query(insertgatepassdataquery, [gatepass_id, item_code, description, quantity, remarks, in_date, is_returnable, received_by, item_name]);
        await db.query('COMMIT');

        res.status(200).json({ message: 'Gatepass generated sucessfully!' });
    }
    catch (error) {
        await db.query('ROLLBACK');
        console.error('Updation failed:', error);
        res.status(500).json({ error: 'Internal Server Error!' });
    }
});



router.post('/receiveditemfromuserforgp', async (req, res) => {
    try {
        const { gatepass_id, received_by, item_code } = req.body;

        const in_date = req.body.in_date
            ? moment(req.body.in_date, 'DD-MM-YYYY').format('YYYY-MM-DD')
            : null;


        const updateQueryfortblgatepass = `UPDATE gatepass SET in_date=$1, received_by=$2 WHERE gatepass_id = $3 and item_code=$4`;
        db.query('BEGIN');
        await db.query(updateQueryfortblgatepass, [in_date, received_by, gatepass_id, item_code]);
        db.query('COMMIT');
        res.status(200).json({ message: 'Item received successfully!' });
    }
    catch (error) {
        db.query('ROLLBACK');
        console.error('Updation failed:', error);
        res.status(500).json({ error: 'Internal Server Error!' });
    }
});


router.post('/sendgatepassforapproval', async (req, res) => {
    try {
        const gatepass_id = req.body.gatepass_id;
        // const modified_date = moment().format('YYYY-MM-DD');

        const updateQueryfortblgatepass = `UPDATE tbl_gatepassid SET is_sent=1 where gatepass_id=$1`;

        const getgatepassdatabyid = `select * , gpid.issued_to,gpid.issued_by,gpid.out_date, gpid.is_sent, gpid.party_name, gpid.gatepass_approval_date from gatepass as gp
        left outer join tbl_gatepassid as gpid on gpid.gatepass_id = gp.gatepass_id where gp.gatepass_id= $1 order by id desc`

        const gatepassdata = await db.query(getgatepassdatabyid, [gatepass_id]);
        console.log(gatepassdata, "gatepassdata")


        let message = `Request for approval of the Gatepass with Gatepass id-${gatepass_id} :${process.env.ENVIRONMENT_STATUS}`

        const mailOptions = {
            from: 'apvaims@apvtechnologies.com',
            to: mailConfig.to,
            cc: mailConfig.cc,
            subject: message,
            html: generateEmailHTML(gatepassdata.rows)
        };

        // Function to generate HTML content for the email
        function generateEmailHTML(purchases) {
            let html = `
    <div style="margin: 20px;">
    <p><strong>Hi Sir</strong>,</p>
    <p>Gate pass for below item/s has been generated and send you for approval.</p>

    <table style="border-collapse: collapse; width: 100%; border: 1px solid #000; font-family: Arial, sans-serif; background-color: #f2f2f2; color: #004080; font-size: 12px;">
    <thead>
        <tr>
                <th style="border: 1px solid #000; padding: 3px; color: #004080;">S.No.</th>
                <th style="border: 1px solid #000; padding: 3px; color: #004080;">Item Code</th>
                <th style="border: 1px solid #000; padding: 3px; color: #004080;">Item Name</th>
                <th style="border: 1px solid #000; padding: 3px; color: #004080;">Issued to</th>
                <th style="border: 1px solid #000; padding: 3px; color: #004080;">Description</th>
                <th style="border: 1px solid #000; padding: 3px; color: #004080;">Quantity</th>
                <th style="border: 1px solid #000; padding: 3px; color: #004080;">Remarks</th>
                <th style="border: 1px solid #000; padding: 3px; color: #004080;">Out-date</th>
                <th style="border: 1px solid #000; padding: 3px; color: #004080;">Type</th>
                <th style="border: 1px solid #000; padding: 3px; color: #004080;">Status</th>
            </tr>
            </thead>
                   <tbody>
         
    `;



            purchases.forEach((purchase, index) => {
                // Format dates using Moment.js
                let formatedoutdate = moment(purchase.out_date).format('YYYY-MM-DD');
                html += `
        <tr>
            <td style="border: 1px solid #000; padding: 3px;  color: #000000;">${index + 1}</td>
            <td style="border: 1px solid #000; padding: 3px;  color: #000000;">${purchase.item_code}</td>
            <td style="border: 1px solid #000; padding: 3px;  color: #000000;">${purchase.item_name}</td>
            <td style="border: 1px solid #000; padding: 3px;  color: #000000;">${purchase.issued_to}</td>
            <td style="border: 1px solid #000; padding: 3px;  color: #000000;">${purchase.description}</td>
            <td style="border: 1px solid #000; padding: 3px;  color: #000000;">${purchase.quantity}</td>
            <td style="border: 1px solid #000; padding: 3px;  color: #000000;">${purchase.remarks}</td>
            <td style="border: 1px solid #000; padding: 3px;  color: #000000;">${formatedoutdate}</td>
        <td class="table-heading-sub-text" style="border: 1px solid #000; padding: 3px; color: ${purchase.is_returnable === 1 ? 'green' : 'red'};">
        ${purchase.is_returnable === 1 ? 'Returnable' : 'Non-Returnable'}
      </td>
      <td style="border: 1px solid #000; padding: 3px;  color: orange;">Pending</td>
        </tr> 
      
        
        `;
            });

            html +=
                `  </tbody>
            </table>
            <br/>
        <p style="margin: 15px 0;">Thanks & Regards,</p>
        <p style="margin: 5px 0;"><strong>System Admin Department</strong></p> 
        <br>
        <br>
        <br>
        <h2 style="font-size: 14px;text-align:center">Click on link for more details AIMS (http://192.168.0.112/ims)</h4>
            <div style="margin-top: 100px; font-size: 14px; color: #888; text-align:center">
        This is an auto-generated email intended solely for internal use by APV Technologies Pvt. Ltd. Please do not reply to this mail.
            </div>
       `
            return html;
        };

        // const poapproval = await db.query(`SELECT * FROM update_sent_approvedpurchaseorder($1)`, [purchase_id]);

        await db.query('BEGIN');
        await db.query(updateQueryfortblgatepass, [gatepass_id]);
        await sendEmail(mailOptions);

        await db.query('COMMIT');
        res.status(200).json({ message: 'Sent for approval!' });
    }
    catch (error) {
        await db.query('ROLLBACK');
        console.error('Updation failed:', error);
        res.status(500).json({ error: 'Internal Server Error!' });
    }
})

router.post('/gatepassapproval', async (req, res) => {
    try {
        console.log(req.body);
        const { gatepass_id, gatepass_approval_date } = req.body;
        const modified_date = moment().format('YYYY-MM-DD');

        const updateQueryfortblgatepass = `UPDATE tbl_gatepassid SET is_sent=2 , gatepass_approval_date=$1 where gatepass_id=$2`;

        const getgatepassdatabyid = `select * , gpid.issued_to,gpid.issued_by,gpid.out_date, gpid.is_sent, gpid.party_name, gpid.gatepass_approval_date from gatepass as gp
        left outer join tbl_gatepassid as gpid on gpid.gatepass_id = gp.gatepass_id where gp.gatepass_id= $1 order by id desc`;

        const gatepassdata = await db.query(getgatepassdatabyid, [gatepass_id]);

        let message = `Approval of the Gatepass with Gatepass id-${gatepass_id} on ${modified_date} :${process.env.ENVIRONMENT_STATUS}`;

        const mailOptions = {
            from: 'apvaims@apvtechnologies.com',
            to: mailConfig.to,
            cc: mailConfig.cc,
            subject: message,
            html: generateEmailHTML(gatepassdata.rows)
        };

        // Function to generate HTML content for the email
        function generateEmailHTML(purchases) {
            let html = `
    <div style="margin: 20px;">
    <p><strong>Hi System Admin Department</strong>,</p>
    <p>Gate pass for below item/s has been approved.</p>
    <table style="border-collapse: collapse; width: 100%; border: 1px solid #000; font-family: Arial, sans-serif; background-color: #cbf5dd; color: #004080; font-size: 13px;">
    <thead>
        <tr>
                <th style="border: 1px solid #000; padding: 3px; color: #004080;">S.No.</th>
                <th style="border: 1px solid #000; padding: 3px; color: #004080;">Item Code</th>
                <th style="border: 1px solid #000; padding: 3px; color: #004080;">Item Name</th>
                <th style="border: 1px solid #000; padding: 3px; color: #004080;">Issued to</th>
                <th style="border: 1px solid #000; padding: 3px; color: #004080;">Description</th>
                <th style="border: 1px solid #000; padding: 3px; color: #004080;">Quantity</th>
                <th style="border: 1px solid #000; padding: 3px; color: #004080;">Remarks</th>
                <th style="border: 1px solid #000; padding: 3px; color: #004080;">Out-date</th>
                <th style="border: 1px solid #000; padding: 3px; color: #004080;">Type</th>
                <th style="border: 1px solid #000; padding: 3px; color: #004080;">Status</th>
            </tr>
            </thead>
            <tbody>
    `;



            purchases.forEach((purchase, index) => {
                // Format dates using Moment.js
                let formatedoutdate = moment(purchase.out_date).format('YYYY-MM-DD');
                html += `
        <tr>
            <td style="border: 1px solid #000; padding: 3px;  color: #000000;">${index + 1}</td>
            <td style="border: 1px solid #000; padding: 3px;  color: #000000;">${purchase.item_code}</td>
            <td style="border: 1px solid #000; padding: 3px;  color: #000000;">${purchase.item_name}</td>
            <td style="border: 1px solid #000; padding: 3px;  color: #000000;">${purchase.issued_to}</td>
            <td style="border: 1px solid #000; padding: 3px;  color: #000000;">${purchase.description}</td>
            <td style="border: 1px solid #000; padding: 3px;  color: #000000;">${purchase.quantity}</td>
            <td style="border: 1px solid #000; padding: 3px;  color: #000000;">${purchase.remarks}</td>
            <td style="border: 1px solid #000; padding: 3px;  color: #000000;">${formatedoutdate}</td>
        <td class="table-heading-sub-text" style="border: 1px solid #000; padding: 3px; color: #000000;">
        ${purchase.is_returnable === 1 ? 'Returnable' : 'Non-Returnable'}
      </td>
      <td style="border: 1px solid #000; padding: 3px;  color: green;">Approved</td>
        </tr>  
     

        `;
            });

            html += `
               </tbody>
            </table>
            <br/>
            <p style="margin-top: 15px">Regards,</p>
            <p style="margin: 5px 0;"><strong>Director</strong></p>
            <div style="margin-top: 100px; font-size: 14px; color: #888; text-align:center">
        This is an auto-generated email intended solely for internal use by APV Technologies Pvt. Ltd. Please do not reply to this mail.
            </div>
            `;
            return html;
        };

        // const poapproval = await db.query(`SELECT * FROM update_sent_approvedpurchaseorder($1)`, [purchase_id]);
        // Send email
        db.query('BEGIN');
        await db.query(updateQueryfortblgatepass, [gatepass_approval_date, gatepass_id]);
        await sendEmail(mailOptions);
        db.query('COMMIT');
        res.status(200).json({ message: 'Gatepass Approved!' });
    }
    catch (error) {
        db.query('ROLLBACK');
        console.error('Updation failed:', error);
        res.status(500).json({ error: 'Internal Server Error!' });
    }
})

router.post('/gatepassrejection', async (req, res) => {
    try {
        console.log(req.body);
        const modified_date = moment().format('YYYY-MM-DD');
        const { gatepass_id, gatepass_approval_date } = req.body;

        const updateQueryfortblgatepass = `UPDATE tbl_gatepassid SET is_sent=3 , gatepass_approval_date = $1 where gatepass_id=$2`;

        const getgatepassdatabyid = `select * , gpid.issued_to,gpid.issued_by,gpid.out_date, gpid.is_sent, gpid.party_name, gpid.gatepass_approval_date from gatepass as gp
        left outer join tbl_gatepassid as gpid on gpid.gatepass_id = gp.gatepass_id where gp.gatepass_id= $1 order by id desc`

        const gatepassdata = await db.query(getgatepassdatabyid, [gatepass_id]);
        console.log(gatepassdata, "gatepassdata")

        let message = `Rejection of the Gatepass with Gatepass id-${gatepass_id} on ${modified_date} :${process.env.ENVIRONMENT_STATUS}`

        const mailOptions = {
            from: 'apvaims@apvtechnologies.com',
            to: mailConfig.to,
            cc: mailConfig.cc,
            subject: message,
            html: generateEmailHTML(gatepassdata.rows)
        };

        // Function to generate HTML content for the email
        function generateEmailHTML(purchases) {
            let html = `
    <div style="margin: 20px;">
    <p><strong>Hi System Admin Department</strong>,</p>
    <p>Gate pass for below item/s has been rejected.</p>
    <table style="border-collapse: collapse; width: 100%; border: 1px solid #000; font-family: Arial, sans-serif; background-color: #ff9a98; color: #004080; font-size: 13px;">
    <thead>
        <tr>
                <th style="border: 1px solid #000; padding: 3px; color: #004080;">S.No.</th>
                <th style="border: 1px solid #000; padding: 3px; color: #004080;">Item Code</th>
                <th style="border: 1px solid #000; padding: 3px; color: #004080;">Item Name</th>
                <th style="border: 1px solid #000; padding: 3px; color: #004080;">Issued to</th>
                <th style="border: 1px solid #000; padding: 3px; color: #004080;">Description</th>
                <th style="border: 1px solid #000; padding: 3px; color: #004080;">Quantity</th>
                <th style="border: 1px solid #000; padding: 3px; color: #004080;">Remarks</th>
                <th style="border: 1px solid #000; padding: 3px; color: #004080;">Out-date</th>
                <th style="border: 1px solid #000; padding: 3px; color: #004080;">Type</th>
                <th style="border: 1px solid #000; padding: 3px; color: #004080;">Status</th>
            </tr>
            </thead>
            <tbody>
    `;

            purchases.forEach((purchase, index) => {
                // Format dates using Moment.js
                let formatedoutdate = moment(purchase.out_date).format('YYYY-MM-DD');
                html += `
        <tr>
            <td style="border: 1px solid #000; padding: 3px;  color: #000000;">${index + 1}</td>
            <td style="border: 1px solid #000; padding: 3px;  color: #000000;">${purchase.item_code}</td>
            <td style="border: 1px solid #000; padding: 3px;  color: #000000;">${purchase.item_name}</td>
            <td style="border: 1px solid #000; padding: 3px;  color: #000000;">${purchase.issued_to}</td>
            <td style="border: 1px solid #000; padding: 3px;  color: #000000;">${purchase.description}</td>
            <td style="border: 1px solid #000; padding: 3px;  color: #000000;">${purchase.quantity}</td>
            <td style="border: 1px solid #000; padding: 3px;  color: #000000;">${purchase.remarks}</td>
            <td style="border: 1px solid #000; padding: 3px;  color: #000000;">${formatedoutdate}</td>
        <td class="table-heading-sub-text" style="border: 1px solid #000; padding: 3px; color: #000000;">
        ${purchase.is_returnable === 1 ? 'Returnable' : 'Non-Retunable'}
      </td>
      <td style="border: 1px solid #000; padding: 3px;  color: red;">Rejected</td>
        </tr>  
        
          
        `;
            });
            html += `
            </tbody>
            </table>
            <br>
              <p style="margin-top: 15px">Regards,</p>
            <p style="margin: 5px 0;"><strong>Director</strong></p>
            <div style="margin-top: 100px; font-size: 14px; color: #888; text-align:center">
        This is an auto-generated email intended solely for internal use by APV Technologies Pvt. Ltd. Please do not reply to this mail.
            </div>
            `;

            return html;
        };
        // Send email
        db.query('BEGIN');
        await db.query(updateQueryfortblgatepass, [gatepass_approval_date, gatepass_id]);
        await sendEmail(mailOptions);

        db.query('COMMIT');
        res.status(200).json({ message: 'Gatepass Rejected!' });
    }
    catch (error) {
        db.query('ROLLBACK');
        console.error('Updation failed:', error);
        res.status(500).json({ error: 'Internal Server Error!' });
    }
})

router.post('/updatescrappedcpuinsyteminfo', async (req, res) => {
    try {
        const item_code = req.body.item_code;
        console.log(item_code, "UPDATE system_info set system_status='0', user_name='' where cpucode=$1");
        const query = `UPDATE system_info set system_status='0', username='' where cpucode=$1`

        await db.query(query, [item_code]);
        res.status(200).json({ message: `${item_code} info is saved in System information!` });
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal Server Error!' });
    }

})

router.post('/sendmailwhenallinspected', async (req, res) => {
    const { purchase_id } = req.body;

    try {

        let message = `Notification of Successfully Inspected Items : ${process.env.ENVIRONMENT_STATUS}.`;

        const mailOptions = {
            from: 'apvaims@apvtechnologies.com',
            to: mailConfig.to,
            cc: mailConfig.cc,
            subject: message,
            html: generateEmailHTML(purchase_id)
        };

        // Function to generate HTML content for the email
        function generateEmailHTML(purchases) {
            let html = `
<div style="margin: 20px;">
<p><strong>Hi Sir and everyone</strong>,</p>
<p>This is a notification that the items regarding Purchase ID: <strong>${purchases}</strong> have been successfully inspected by the System Administrators.</p>
<p style="margin-top: 15px">Regards,</p>
<p style="margin: 5px 0;"><strong>System Administrators</strong></p>
<div style="margin-top: 100px; font-size: 14px; color: #888; text-align:center">
        This is an auto-generated email intended solely for internal use by APV Technologies Pvt. Ltd. Please do not reply to this mail.
            </div>
`
            return html;

        };

        db.query('BEGIN');
        await sendEmail(mailOptions);
        db.query('COMMIT');
        res.status(200).json({ message: 'Notification e-mail sent successfully!' });
    }
    catch (error) {
        db.query('ROLLBACK');
        console.error(err);
        res.status(500).json({ error: 'Internal Server Error!' });
    }
})

router.post('/deleteitemsfromItemsandSysteminfo', async (req, res) => {
    console.log(req.body);
    const { item_code, admin_url } = req.body;
    if (!item_code || !admin_url) {
        return res.status(400).json({ message: 'item_code and admin_url are required' });
    }

    const deleteFromItems = `Delete from items where item_code = $1`;

    try {
        // const deleteFromsystemInfo = `Delete from items where item_code = $1`;
        db.query('BEGIN');

        await db.query(deleteFromItems, [item_code]);

        const bearerHeader = req.headers["authorization"];

        const results = await axios.post(`${admin_url}updatescrappediteminsysteminformation`, req.body,
            {
                headers: {
                    'Authorization': bearerHeader
                }
            }
        );

        db.query('COMMIT');

        res.status(200).json(results.data);
    }
    catch {
        db.query('ROLLBACK');
        console.error('Error occurred:', error); // Log the error
        res.status(500).json({ message: 'Internal Server Error', error: error.message || 'Unknown error' });
    }
})

router.post('/updateItemStatus', async (req, res) => {
    const { item_id, item_status } = req.body;
    const updateQuery = `UPDATE items set item_status=$1 where item_id=$2`;
    try {
        await db.query(updateQuery, [item_status, item_id]);
        res.status(200).json(true);
    }
    catch (err) {
        console.error('Error occurred:', error); // Log the error
        res.status(500).json(false);
    }
})

// router.post('/sentMailforverification', async (req, res) => {
//     try {
//         let purchase_id = req.body.purchase_id;
//         let attachments = [];
//         console.log(purchase_id, "purchase_id");

//         // Begin transaction
//         await db.query('BEGIN');

//         const purchase_data = await db.query(`SELECT * FROM get_purchasejoindatabypid($1)`, [purchase_id]);
//         console.log(purchase_data.rows, "purchase_data");


//         const file = purchase_data.rows[0].filepath;
//         if (file) {

//             const fileName = path.basename(file);
//             console.log(fileName, "filename");

//             const filePath = path.join(__dirname, '..', 'files', 'invoice', fileName);
//             // Check if the file exists on the filesystem
//             if (fs.existsSync(filePath)) {
//                 attachments.push({
//                     filename: fileName,
//                     path: filePath,
//                     contentType: 'application/pdf'
//                 });
//             } else {
//                 console.warn(`File not found at path: ${filePath}`);
//             }
//         } else {
//             console.warn('No filepath provided in purchase data.');
//         }

//         let message = `PO ${purchase_id}: Steps Completion Update `;
//         // console.log(purchase_data.rows, "purchase_data.rows in sent purchase order");


//         const mailOption = {
//             from: 'apvaims@apvtechnologies.com',
//             to: mailConfig.to,
//             cc: mailConfig.cc,
//             subject: message,
//             html: generateEmailHTML(purchase_data.rows, true),
//             attachments: attachments.length > 0 ? attachments : undefined, 
//         };

//         // Function to generate HTML content for the email
//         function generateEmailHTML(purchases) {
//             let html = `
//         <style>
//         .uppermost-container {
//         font-family: Arial, sans-serif;
//         color: #333;
//         background-color: #f9f9f9;

//       }
//       .container {
//         background-color: #fff;
//         padding: 20px;
//         width:100%;

//       }
//       h2 {
//         color: #2b6cb0;
//       }
//       table {
//         width: 100%;
//         border-collapse: collapse;
//         margin-top: 15px;
//       }

//       th, td {
//         padding: 8px;
//         text-align: left;
//         border-bottom: 1px solid #eee;
//       }

//         th {
//   background-color: #f0f0f0;
//   font-weight: bold;
//   text-align: left;
// }
//       .tick {
//         color: green;
//         font-weight: bold;
//         font-size: 18px;
//       }
//       .footer {
//         margin-top: 20px;
//         font-size: 14px;
//       }
//             </style>

//             <div class='uppermost-container'>
//      <div class="container">
//       <p>Dear Sir,</p>
//       <p>The following steps for <strong>PO:<span style="color:#2b6cb0;">${purchase_id}</span></strong> have been successfully completed:</p>

//       <table>
//         <thead>
//     <tr>
//       <th>Step</th>
//       <th>Status</th>
//     </tr>
//   </thead>
//   <tbody>
//         <tr>
//           <td>PO Approval by Director</td>
//           <td class="tick">&#10004;</td>
//         </tr>
//         <tr>
//           <td>Item(s) Inspection</td>
//           <td class="tick">&#10004;</td>
//         </tr>
//         <tr>
//           <td>Invoice Upload</td>
//           <td class="tick">&#10004;</td>
//         </tr>
//         <tr>
//           <td>Vendor Evaluation</td>
//           <td class="tick">&#10004;</td>
//         </tr>
//         </tbody>
//       </table>

//       <p>Please proceed with the next steps at your earliest.</p>
//       <p>Please find the invoice attached with this mail.</p>

//       <div class="footer">
//         Best regards,<br/><br/>
//         <strong>Team Adminstrator</strong>  
//       </div>
//     </div>
//   </div>
//             `;

//             return html;
//         }

//         // Send email
//         await sendEmail(mailOption);

//         // Commit transaction
//         await db.query('COMMIT');
//         res.status(200).json(true);
//     }
//     catch (err) {
//         await db.query('ROLLBACK');
//         console.error(err);
//         res.status(500).json({ error: 'Internal Server Error!' });
//     }

// })

router.post('/sentMailforverification', async (req, res) => {
    try {
        const purchase_id = req.body.purchase_id;
        let attachments = [];

        console.log(purchase_id, "purchase_id");

        // Begin DB transaction
        await db.query('BEGIN');

        const purchase_data = await db.query(`SELECT * FROM get_purchasejoindatabypid($1)`, [purchase_id]);
        console.log(purchase_data.rows, "purchase_data");

        if (purchase_data.rows.length > 0) {
            const file = purchase_data.rows[0].filepath;

            if (file) {
                const fileName = path.basename(file);
                const filePath = path.join(__dirname, '..', 'files', 'invoice', fileName);

                if (fs.existsSync(filePath)) {
                    attachments.push({
                        filename: fileName,
                        path: filePath,
                        contentType: 'application/pdf'
                    });
                } else {
                    console.warn(`File not found at path: ${filePath}`);
                }
            } else {
                console.warn('No filepath provided in purchase data.');
            }
        } else {
            console.warn('No purchase data returned from DB.');
        }

        const message = `PO ${purchase_id}: Steps Completion Update :${process.env.ENVIRONMENT_STATUS}`;

        const mailOption = {
            from: 'apvaims@apvtechnologies.com',
            to: mailConfig.to,
            cc: mailConfig.cc,
            subject: message,
            html: generateEmailHTML(purchase_id),
            attachments: attachments.length > 0 ? attachments : undefined,
        };

        // Generate email content (placed within the API)
        function generateEmailHTML(purchase_id) {
            return `
                <style>
                    .uppermost-container {
                        font-family: Arial, sans-serif;
                        color: #333;
                        background-color: #f9f9f9;
                    }
                    .container {
                        background-color: #fff;
                        padding: 20px;
                        width: 100%;
                    }
                    h2 {
                        color: #2b6cb0;
                    }
                    table {
                        width: 100%;
                        border-collapse: collapse;
                        margin-top: 15px;
                        font-family: Arial, sans-serif !important;
                    }
                    th, td {
                        padding: 8px;
                        text-align: left;
                        border-bottom: 1px solid #eee;
                    }
                    th {
                        background-color: #f0f0f0;
                        font-weight: bold;
                        text-align: left;
                        padding:5px !important;
                    }
                    .tick {
                        color: green;
                        font-weight: bold;
                        font-size: 18px;
                    }
                    .footer {
                        margin-top: 40px;
                        font-size: 15px;
                        line-height:2;
                    }

                    .footer-admin{
                        font-size: 16px;
                    }

                </style>
                <div class="uppermost-container">
    <div class="container">
        <p>Dear Sir/Madam,</p>
        <p>We are pleased to inform you that the following steps for <strong>PO: <span>${purchase_id}</span></strong> have been successfully completed:</p>
        <table>
            <thead>
                <tr>
                    <th>Step</th>
                    <th>Status</th>
                </tr>
            </thead>
            <tbody>
                <tr><td>PO Approval by Director</td><td class="tick">&#10004;</td></tr>
                <tr><td>Item(s) Inspection</td><td class="tick">&#10004;</td></tr>
                <tr><td>Invoice Upload</td><td class="tick">&#10004;</td></tr>
                <tr><td>Vendor Evaluation</td><td class="tick">&#10004;</td></tr>
            </tbody>
        </table>
        ${attachments.length == 0 ? `<p>Please proceed with the next steps at your earliest convenience.</p>` : ''}
        ${attachments.length > 0 ? `<p>Please find the invoice attached to this email and proceed with the next steps at your earliest convenience.</p>` : ''}
        <div class="footer">
            Best regards,<br/>
            <span class="footer-admin">Team Administrator</span>
        </div>
    </div>
</div>
<div style="margin-top: 100px; font-size: 14px; color: #888; text-align:center">
        This is an auto-generated email intended solely for internal use by APV Technologies Pvt. Ltd. Please do not reply to this mail.
            </div>
            `;
        }

        // Send the email
        await sendEmail(mailOption);

        // Commit transaction
        await db.query('COMMIT');
        res.status(200).json(true);

    } catch (err) {
        await db.query('ROLLBACK');
        console.error(err);
        res.status(500).json({ error: 'Internal Server Error!' });
    }
});


router.post('/approveorrejectVendor', async (req, res) => {
    try {
        let { supplier_id, status } = req.body;
        const supplierData = req.body;
        console.log(req.body, "req.body");

        let modified_date = moment().format('YYYY-MM-DD');
        let modified_dateForMail = moment().format('DD-MM-YYYY');
        const updateQuery = `UPDATE supplier set status=$1, modified_date=$2 where supplier_id=$3`;

        // let modified_date = moment().format('YYYY-MM-DD');

        // Begin transaction
        await db.query('BEGIN');
        let tableBackground = (Number(status) === 3) ? '#cbf5dd' : '#ff9a98';

        let message = (Number(status) === 3) ? `Approval for Adding new Vendor: ${supplierData.supplier_name} :${process.env.ENVIRONMENT_STATUS}` : `Rejection of Approval for Adding new Vendor: ${supplierData.supplier_name}:${process.env.ENVIRONMENT_STATUS}`;



        // Function to generate HTML content for the email
        function generateEmailHTML(data) {
            let html = `
              <div style="margin: 20px; margin-left:0;">
                    <p>Hi System Admin Department,</p>
                    <p>The addition of the following vendor to AIMS has been ${(Number(status) === 3) ? 'approved.' : 'rejected.'}</p>
                    <div style="overflow-x: auto; width: 100%; max-width: 100%;">
                        <table style="border-collapse: collapse; width: 100%; table-layout: fixed; border: 1px solid #000; font-family: sans-serif;background-color:${tableBackground};color: #004080; font-size: 12px;">
                            <thead>
                                <tr>
                                    <th style="border: 1px solid #000; padding: 5px; width: 5%; color: #004080; text-align: left; white-space: nowrap;">S.No.</th>
                                    <th style="border: 1px solid #000; padding: 5px; width: 10%; color: #004080; text-align: left; white-space: nowrap;">Vendor Name</th>
                                    <th style="border: 1px solid #000; padding: 5px; width: 10%; color: #004080; text-align: left; white-space: nowrap;">Contact Person</th>
                                    <th style="border: 1px solid #000; padding: 5px; width: 8%; color: #004080; text-align: left; white-space: nowrap;">Initial Rating</th>
                                    <th style="border: 1px solid #000; padding: 5px; width: 10%; color: #004080; text-align: left; white-space: nowrap;">Phone</th>
                                    <th style="border: 1px solid #000; padding: 5px; width: 10%; color: #004080; text-align: left; white-space: nowrap;">Mobile</th>
                                    <th style="border: 1px solid #000; padding: 5px; width: 15%; color: #004080; text-align: left; white-space: nowrap;">Email</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td style="border: 1px solid #000; padding: 5px; color: #000000; white-space: nowrap;">1</td>
                                    <td style="border: 1px solid #000; padding: 5px; color: #000000; white-space: nowrap;">${data.supplier_name}</td>
                                    <td style="border: 1px solid #000; padding: 5px; color: #000000; white-space: nowrap;">${data.contact_person}</td>
                                    <td style="border: 1px solid #000; padding: 5px; color: #000000; white-space: nowrap;">${data.rating}</td>
                                    <td style="border: 1px solid #000; padding: 5px; color: #000000; white-space: nowrap;">${data.phone}</td>
                                    <td style="border: 1px solid #000; padding: 5px; color: #000000; white-space: nowrap;">${data.mobile}</td>
                                    <td style="border: 1px solid #000; padding: 5px; color: #000000; white-space: nowrap;">${data.email}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                    <div style="font-size: 16px; font-style: italic; margin-top: 20px; color: #004080;">
                        Regards,<br>
                        Director<br>
                    </div>

                    <div style="margin-top: 100px; font-size: 14px; color: #888; text-align:center">
        This is an auto-generated email intended solely for internal use by APV Technologies Pvt. Ltd. Please do not reply to this mail.
            </div>
                    
                    `;

            return html;
        };

        const mailOptions = {
            from: 'apvaims@apvtechnologies.com',
            to: mailConfig.to,
            cc: mailConfig.cc,
            subject: message,
            html: generateEmailHTML(supplierData)
        };

        await db.query(updateQuery, [status, modified_date, supplier_id]);
        // Send the email
        await sendEmail(mailOptions);
        // Commit transaction
        await db.query('COMMIT');
        res.status(200).json(true);

    }
    catch (err) {
        await db.query('ROLLBACK');
        console.error(err);
        res.status(500).json({ error: 'Internal Server Error!' });
    }
})

// router.post('/rejectVendor', async (req, res) => {
//     try {
//         let { supplier_id, status } = req.body;
//         const supplierData = req.body;
//         console.log(req.body, "req.body");

//         let modified_date = moment().format('YYYY-MM-DD');
//         let modified_dateForMail = moment().format('DD-MM-YYYY');
//         const updateQuery = `UPDATE supplier set status=$1, modified_date=$2 where supplier_id=$3`;

//         // let modified_date = moment().format('YYYY-MM-DD');

//         // Begin transaction
//         await db.query('BEGIN');

//         let message = `Approval of the Vendor:${supplierData.supplier_name} on ${modified_dateForMail}`;



//         // Function to generate HTML content for the email
//         function generateEmailHTML(data) {
//             let html = `
//               <div style="margin: 20px; margin-left:0;">
//                     <p>Hi System Admin Department,</p>
//                     <div style="overflow-x: auto; width: 100%; max-width: 100%;">
//                         <table style="border-collapse: collapse; width: 100%; table-layout: fixed; border: 1px solid #000; font-family: sans-serif;background-color: #ff9a98;color: #004080; font-size: 12px;">
//                             <thead>
//                                 <tr>
//                                     <th style="border: 1px solid #000; padding: 5px; width: 5%; color: #004080; text-align: left; white-space: nowrap;">S.No.</th>
//                                     <th style="border: 1px solid #000; padding: 5px; width: 10%; color: #004080; text-align: left; white-space: nowrap;">Vendor Name</th>
//                                     <th style="border: 1px solid #000; padding: 5px; width: 10%; color: #004080; text-align: left; white-space: nowrap;">Contact Person</th>
//                                     <th style="border: 1px solid #000; padding: 5px; width: 8%; color: #004080; text-align: left; white-space: nowrap;">Initial Rating</th>
//                                     <th style="border: 1px solid #000; padding: 5px; width: 10%; color: #004080; text-align: left; white-space: nowrap;">Phone</th>
//                                     <th style="border: 1px solid #000; padding: 5px; width: 10%; color: #004080; text-align: left; white-space: nowrap;">Mobile</th>
//                                     <th style="border: 1px solid #000; padding: 5px; width: 15%; color: #004080; text-align: left; white-space: nowrap;">Email</th>
//                                 </tr>
//                             </thead>
//                             <tbody>
//                                 <tr>
//                                     <td style="border: 1px solid #000; padding: 5px; color: #000000; white-space: nowrap;">1</td>
//                                     <td style="border: 1px solid #000; padding: 5px; color: #000000; white-space: nowrap;">${data.supplier_name}</td>
//                                     <td style="border: 1px solid #000; padding: 5px; color: #000000; white-space: nowrap;">${data.contact_person}</td>
//                                     <td style="border: 1px solid #000; padding: 5px; color: #000000; white-space: nowrap;">${data.rating}</td>
//                                     <td style="border: 1px solid #000; padding: 5px; color: #000000; white-space: nowrap;">${data.phone}</td>
//                                     <td style="border: 1px solid #000; padding: 5px; color: #000000; white-space: nowrap;">${data.mobile}</td>
//                                     <td style="border: 1px solid #000; padding: 5px; color: #000000; white-space: nowrap;">${data.email}</td>
//                                 </tr>
//                             </tbody>
//                         </table>
//                     </div>
//                     <div style="font-size: 16px; font-style: italic; margin-top: 20px; color: #004080;">
//                         Regards,<br>
//                         Director<br>
//                     </div>`;

//             return html;
//         };

//         const mailOptions = {
//             from: 'apvaims@apvtechnologies.com',
//             to: mailConfig.to,
//             cc: mailConfig.cc,
//             subject: message,
//             html: generateEmailHTML(supplierData)
//         };

//         await db.query(updateQuery, [status, modified_date, supplier_id]);
//         // Send the email
//         await sendEmail(mailOptions);
//         // Commit transaction
//         await db.query('COMMIT');
//         res.status(200).json(true);

//     }
//     catch (err) {
//         await db.query('ROLLBACK');
//         console.error(err);
//         res.status(500).json({ error: 'Internal Server Error!' });
//     }
// })


router.get('/discussvendorApproval/:supplier_id', async (req, res) => {
    try {
        // console.log(req.params, "vendor_id")
        const supplier_id = Number(req.params.supplier_id);

        const modified_date = moment().format('DD-MM-YYYY');

        // Begin transaction
        await db.query('BEGIN');

        const url = process.env.BACKEND_URL + `/shared/getSupplierdata`;
        // console.log(url, "url for getSupplierdata");

        const results = await axios.get(url);
        // console.log(results.data, "results");
        const checkvendorapproval = results.data.filter(item => item.supplier_id === supplier_id);

        // Helper: Generate email HTML
        function generateEmailHTML() {
            return `
                <div style="margin: 20px; margin-left:0;">
                    <p>Hi System Admin Department,</p>
                    <p>Please discuss about the Vendor: <strong>${checkvendorapproval[0].supplier_name}</strong> with me before proceeding with the next steps. Kindly reach out to me to review it.</p>
                    <div style="font-size: 16px; font-style: italic; margin-top: 20px; color: #004080;">
                        Regards,<br> Director
                    </div>
                    <div style="margin-top: 100px; font-size: 14px; color: #888; text-align:center">
        This is an auto-generated email intended solely for internal use by APV Technologies Pvt. Ltd. Please do not reply to this mail.
            </div>
                </div>
            `;
        }

        // Helper: Generate full HTML to return to user
        function getStatusHTML(type) {
            let message = '';
            let imagePath = '';

            switch (type) {
                case 'approved':
                    message = 'This Vendor has already been approved!';
                    imagePath = '/files/info_icon.png';
                    break;
                case 'rejected':
                    message = 'This Vendor has already been rejected!';
                    imagePath = '/files/info_icon.png';
                    break;
                case 'notified':
                    message = 'Notification has been sent to the Admin team to discuss the approval of Vendor with you.<br>Thanks!';
                    imagePath = '/files/po_discuss.jpg';
                    break;
                default:
                    message = 'Status unknown!';
                    imagePath = '/files/info_icon.png';
            }

            return `
                <!DOCTYPE html>
                <html lang="en">
                <head>
                    <meta charset="UTF-8" />
                    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
                    <link rel="icon" type="image/x-icon" href="${process.env.BACKEND_URL}/files/MINI-LOGO-ICON-WHITE-2-3.png">
                    <title>IMS</title>
                    <style>
                        body {
                            font-family: Arial, sans-serif;
                            margin: 0;
                            padding: 0;
                            background-color: #fff;
                            color: #333;
                            display: flex;
                            justify-content: center;
                            align-items: center;
                            height: 100vh;
                            text-align: center;
                        }
                        
                        .container {
                            display: flex;
                            flex-direction: column;
                            align-items: center;
                        }
                        .icon img {
                            width: 150px;
                            height: 150px;
                        }

                      h1 {
    color: #004080;
    font-size: 28px;
    margin-top: 0 0 16px 0;
    line-height: 32px;
    font-weight: 400;

}

                    </style>
                </head>
                <body>
                    <div class="container">
                        <div class="icon">
                            <img src="${process.env.BACKEND_URL}${imagePath}" alt="Vendor Status" style="width: 110px; height: 110px;"/>
                        </div>
                        <h1 style="font-family: 'Trebuchet MS', Helvetica, sans-serif;">${message}</h1>
                    </div>
                </body>
                </html>
            `;
        }

        if (checkvendorapproval && checkvendorapproval.length > 0) {
            const status = Number(checkvendorapproval[0].status);

            // Send correct UI HTML for each status
            if (status == 3) {
                await db.query('COMMIT');
                return res.status(200).send(getStatusHTML('approved'));
            }
            else if (status == 0) {
                await db.query('COMMIT');
                return res.status(200).send(getStatusHTML('rejected'));
            }
            else {
                // Email and Notify Admin
                const mailOptions = {
                    from: 'apvaims@apvtechnologies.com',
                    to: mailConfig.to,
                    cc: mailConfig.cc,
                    subject: `Discussion about the Vendor: ${checkvendorapproval[0].supplier_name} on ${modified_date} (${process.env.ENVIRONMENT_STATUS})`,
                    html: generateEmailHTML()
                };

                await sendEmail(mailOptions);
                await db.query('COMMIT');
                return res.status(200).send(getStatusHTML('notified'));
            }
        }
        else {
            await db.query('ROLLBACK');
            return res.status(404).send("Vendor not found.");
        }


    } catch (err) {
        await db.query('ROLLBACK');
        console.error(err);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
});

router.post('/extendLifecycle', async (req, res) => {
    try {
        console.log(req.body, "req.body for extendLifecycle");

        const { item_id, extended_duration } = req.body;
        const updateQuery = `UPDATE items set extended_life_cycle=$1 where item_id=$2`;
        await db.query(updateQuery, [extended_duration, item_id]);
        res.status(200).json({ success: true, message: 'Lifecycle extended successfully!' });
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ success: false, error: 'Internal Server Error!' });
    }
})

module.exports = router;