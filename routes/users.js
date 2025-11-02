var express = require('express');
var router = express.Router();
var db = require('../dbconfig');
const jwt = require('jsonwebtoken');
const secretKey = "5d8424d84c1b3e816490ed0b072dc7113c48d73e37633bfb41f6b7abdaaa8c9515d5b0c2ab89901f8eaf61cc638b02f495d1719c82076f00d70277bbb63c09cc";

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
}

router.post('/generateRequest', (req, res) => {

    let request_item = req.body.request_item;
    let quantity = req.body.quantity;
    let remark = req.body.remark;
    let created_by = req.body.created_by;

    // db.query(`SELECT * FROM generate_request('${request_item}',${quantity}, '${remark}', '${created_by}')`, (err, result) => {
        db.query(`SELECT * FROM generate_request($1,$2,#,$4)`,[request_item,quantity, remark, created_by], (err, result) => {

        if (err) {
            throw err;
        }
    })
    res.status(200).send({ message: "Request Generated ..." })
})


// router.post('/onacceptrequest', (req,res)=>{
//     let request_id = req.body.request_id;

//     db.query(`SELECT * FROM change_requeststatus_onaccept(${request_id})`, (err, results)=>{
//         if(err){
//             throw err
//         }
//         res.status(200).send(results.rows);
//     })

// })

router.get('/getallRequest', (req, res) => {

    db.query(`SELECT * FROM get_allrequest()`, (err, results) => {
        if (err) {
            throw err
        }
        res.status(200).send(results.rows);
    })

})

router.post('/updaterequestgrantedQuantity', (req, res) => {

    let request_id = req.body.request_id;
    let quantity = req.body.quantity;

    // db.query(`SELECT * FROM update_request_quantity(${request_id},${quantity})`, (err, result) => {
        db.query(`SELECT * FROM update_request_quantity($1,$2)`,[request_id,quantity], (err, result) => {

        if (err) {
            throw err;
        }
    })
    res.status(200).send({ message: 'Request Accepted Successfully...' })
})


module.exports = router;