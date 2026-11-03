const router = require('express').Router();
const todo = require('./notImplemented');

router.post('/register', todo('Create patient account'));
router.post('/login', todo('Authenticate and issue tokens'));
router.post('/refresh', todo('Refresh access token'));
router.post('/logout', todo('End current session'));

module.exports = router;
