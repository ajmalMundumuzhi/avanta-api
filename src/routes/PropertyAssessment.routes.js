const express = require('express')
const router = express.Router()

const {
  createPropertyAssessment,
} = require('../controller/PropertyAssessment.controller')

router.post('/', createPropertyAssessment)

module.exports = router