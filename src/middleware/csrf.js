const { csrfSync } = require("csrf-sync");

const {
    csrfSynchronisedProtection,
    generateToken
} = csrfSync({
    getTokenFromRequest: (req) => {
        return (
            req.body?._csrf ||
            req.headers["x-csrf-token"]
        );
    }
});

function exposeCsrfToken(req, res, next) {
    res.locals.csrfToken = generateToken(req);
    next();
}

module.exports = {
    csrfSynchronisedProtection,
    exposeCsrfToken
};
