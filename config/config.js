const config = {
    production: {
        SECRET: process.env.SECRET,
        DATABASE: process.env.MONGODB
    },
    default: {
        SECRET: process.env.SECRET,
        DATABASE: process.env.MONGODB
    }
}

exports.get = (env) => {
    return config[env] || config.default;
}