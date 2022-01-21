const express = require('express')
const mysql = require('mysql2/promise')
const expressjwt = require("express-jwt");
const jwt = require("jsonwebtoken");
const cors = require('cors')

const app = express()
const port = 3306

app.use(express.json())
app.use(cors())

const errorCheck = function (err, req, res) {
    if (err.name === 'UnauthorizedError') {
        res.json({success: false, status: 401, message: 'invalid token'})
    }
};

const jwtCheck = expressjwt({
    secret: "mysupersecretkey",
    algorithms: ['HS256']
});

app.get('/profile/:id', async (req,res) => {
    const userInfo = await connection.query("SELECT `id`, `username`, `bio` FROM `users` WHERE `id` = '" + req.params.id + "';")
    const posts = await connection.query("SELECT `posts`.`content` FROM `users` LEFT JOIN `posts` ON `users`.`id` = `posts`.`user-id` WHERE `users`.`id` = '" + req.params.id + "';")
    res.json({posts: posts, userInfo: userInfo})
})

// foreach over all the following ID's, then put them into profile root to get name.
app.get('/following/:id', async (req,res) => {
    const following = await connection.query("SELECT `user-following`.`following-id` FROM `users` LEFT JOIN `user-following` ON `users`.`id` = `user-following`.`user-id` WHERE `users`.`id` = '" + req.params.id + "';")
    res.json({following: following})
})

app.post('/signUp', async (req,res) => {
    let {username, bio, email, password} = req.body
    const result = await connection.query("INSERT INTO users (`username`, `bio`, `email`, `password`) VALUES ('" + username + "', '" + bio + "', '" + email + "', '" + password + "' );")

    if (!result){
        res.json({success: false, message: "something went wrong"})
        return
    }

    const token = jwt.sign({
        sub: result.insertId,
        username: username,
        email: email
    }, "mysupersecretkey", {expiresIn: "3 hours"});

    res.json({success: true, message: 'successfully logged in', data: {username, email, bio, access_token: token}})

})

app.post('/login', async (req,res) => {
    //check to see that the credentials are being sent in the body of the req
    //create the connection to the db
    //grab all the users from the db
    //search through the users for someone that matches the provided credentials
    //if no one matches send a fail response
    //if someone matches then create a new token and send a success response

    if (!req.body.email || !req.body.password) {
        res.json({success: false, message: 'please send all credentials needed'})
        return;
    }

    let {email, password} = req.body
    let user = await connection.execute('SELECT `username`, `bio`, `email`, `password`, `id` FROM `users` WHERE `email` = ? AND `password` = ?;', [email, password])

    if (!user) {
        res.json({success: false, message: 'couldn\'t find anyone that matches your credentials'})
        return;
    }
    user = user[0][0]
    const token = jwt.sign({
        sub: user.id,
        username: user.username,
        email: user.email
    }, "mysupersecretkey", {expiresIn: "3 hours"});
    res.json({data: {...user, access_token: token}, success: true, message: 'successfully logged in'})
})

//need to check JWTcheck
app.get('/myProfile', jwtCheck, errorCheck, async (req, res) => {
    let id = req.user.sub
    console.log("user id", id)
    const posts = await connection.execute("SELECT `content` FROM `posts` WHERE `user-id` = ? ", [id])

    console.log(id, posts[0])
    res.json({success: true, posts: posts})

})

app.listen(port, async () => {
    connection = await mysql.createConnection({
        host: 'localhost',
        user: 'root',
        password: 'password',
        database: 'social-app',
        port: 3306
    });
    await connection.connect()
    console.log("connected on port", port)
})
