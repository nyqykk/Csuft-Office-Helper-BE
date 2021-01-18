const rateLimit = require('express-rate-limit')
const express = require('express')
const router = express.Router()
const getJSID = require('./controller/controller.js')


const limiter = rateLimit({
    windowMs: 30 * 1000,
    max: 100,
    message: "Too many requests"
})

router.post('/', limiter, getJSID)

module.exports = router