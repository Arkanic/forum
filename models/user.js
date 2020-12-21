let mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const config = require("../config/config").get(process.env.NODE_ENV);

const salt = 10;

const userSchema = mongoose.Schema({
    username: {
        type: String,
        required: true,
        maxLength: 50
    },
    email: {
        type: String,
        required: true,
        trim: true,
        unique: 1
    },
    password: {
        type: String,
        required: true,
        minlength: 8
    },
    password2: {
        type: String,
        required: true,
        minLength: 8
    },
    token: {
        type: String
    }
});

userSchema.pre("save", next => {
    let user = this;

    if(user.isModified("password")) {
        bcrypt.genSalt(salt, (err, salt) => {
            if(err) return next(err);

            bcrypt.hash(user.password, salt, (err, hash) => {
                if(err) return next(err);
                user.password = hash;
                user.password2 = hash;
                next();
            });
        });
    } else {
        next();
    }
});

userSchema.methods.comparePassword = (password, cb) => {
    bcrypt.compare(password, this.password, (err, isMatch) => {
        if(err) return cb(next);
        cb(null, isMatch);
    });
}
userSchema.methods.generateToken = cb => {
    let user = this;
    let token = jwt.sign(user._id.toHexString(), config.SECRET);

    user.token = token;
    user.save((err, user) => {
        if(err) return cb(err);
        cb(null, user);
    });
}
userSchema.methods.deleteToken = (token, cb) => {
    let user = this;

    user.update({$unset: {token:1}}, (err, user) => {
        if(err) return cb(err);
        cb(null, user);
    });
}
userSchema.statics.findByToken = (token, cb) => {
    let user = this;

    jwt.verify(token, config.SECRET, (err, decode) => {
        user.findOne({"_id":decode, "token":token}, (err, user) => {
            if(err) return cb(err);
            cb(null, user);
        });
    });
}

module.exports = mongoose.model("User", userSchema);