const express = require('express');
const v1Routes = require('./v1');

const router = express.Router();

// Mount versioned routes
router.use('/v1', v1Routes);

// Fallback for current clients (optional, but good for transition)
// If we want to strictly enforce versioning, we can remove the direct mount below
router.use('/', v1Routes);

module.exports = router;
