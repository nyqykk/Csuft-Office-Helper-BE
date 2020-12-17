const express = require('express')
const router = express.Router()
const getJSID = require('./controller/controller.js')

router.post('/', getJSID)

module.exports = router