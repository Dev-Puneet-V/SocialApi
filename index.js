require('dotenv').config();
const cors = require('cors');
const express = require('express');
const bodyParser = require('body-parser');
const app = express();
require('./config/db.js');

const PORT = process.env.PORT || 4000;

app.use(cors({
    origin: '*'
}));

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

app.use('/api', require('./routes'));

// error handling
app.use((err, req, res, next) => {
    console.log(err.status)
    console.error(err.stack);
    res.status(err.status || 500).json({
        success: false,
        message: err.message || 'Something went wrong'
    });
})


const server = app.listen(PORT, () => {
    console.log(`Server is active on PORT ${PORT}`);
});

module.exports = {
    app,
    server
}