const { array, object } = require('@hapi/joi');
const mongoose = require('mongoose');


const userSchema = mongoose.Schema({
    name: {
        type: String,
        required: true,
        min: 6,
        max: 255
    },
    email: {
        type: String,
        required: true,
        min: 6,
        max: 1024
    },
    password: {
        type: String,
        required: true,
        minlength: 6
    },
    privilege:{
        type: String,
        required: true,
        minlength:3,
        default: "user"
    },
    services:{
        type: Array,
        required: true,
        minlength: 5,
        default: ["nadas","todos"]
    },
    date: {
        type: Date,
        default: Date.now
    }
})

module.exports = mongoose.model('User', userSchema);