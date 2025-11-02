var express = require('express');
var router = express.Router();
var db = require('../dbconfig');
const secretKey = "5d8424d84c1b3e816490ed0b072dc7113c48d73e37633bfb41f6b7abdaaa8c9515d5b0c2ab89901f8eaf61cc638b02f495d1719c82076f00d70277bbb63c09cc";
const refreshSecretKey = "fd5ed75c776f33727a6c0626a025a8a3b3ad5643a75875b8a16a04844af1eb06c314f158288e5524901dce7e158e99b67db440a86d7c51778dd606342e746466";

/* GET home page. */
router.post('/refresh-token', (req, res) => {
    const refreshToken = req.body.refreshToken;

    if (!refreshToken) {
        return res.status(403).json({ message: 'Refresh token not provided' });
    }

    jwt.verify(refreshToken, refreshSecretKey, (err, authData) => {
        if (err) {
            return res.status(403).json({ message: 'Invalid refresh token' });
        }

          // Valid refresh token, generate a new access token
          const newAccessToken = generateAccessToken(authData);

        res.status(200).json({ accessToken: newAccessToken });
    });
});

// Function to generate access token
function generateAccessToken(user) {
    return jwt.sign(user, secretKey, { expiresIn: '2h' });
}



module.exports = router;