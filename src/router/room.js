const express = require('express');
const router = new express.Router();
const Room = require('../models/room');

router.get('/validateUser', async (req, res) => {
    try {
        const { email, username, room } = req.query;
        const chatRoom = await Room.findOne({ name: room });
        const isValid = chatRoom ? await chatRoom.validateUser(email, username) : true;

        res.status(200).send({
            isValid,
        });
    } catch (error) {
        res.status(400).send({
            error: error.message,
        });
    }
});

module.exports = router;
