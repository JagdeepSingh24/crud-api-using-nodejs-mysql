var md5 = require('md5');
const cors = require('cors');
const express = require("express");
var nodemailer = require('nodemailer');
const app = express();
const jwt = require('jsonwebtoken');
const bodyParser = require("body-parser");
const mysql = require("mysql");
const req = require('express/lib/request');
const SendmailTransport = require('nodemailer/lib/sendmail-transport');
const { response } = require('express');

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
    extended: false
}));
// var token = jwt.sign({foo:bar},)
app.get('/', function (req, res) {
    return res.send({ error: true, message: 'hello' })
});
var corsOptions = {
    origin: "http://localhost:3001"
};
app.use(cors(corsOptions));
app.use("*", function (req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-header", "origin, X-Requested-With, Content-Type, Accept");
    if (req.originalUrl == "/token") return next();
    if (req.originalUrl == "/login") return next();
    if (req.originalUrl == "/users") return next();
    if (req.originalUrl == "/password") return next();
    if (req.originalUrl == "/forgotpassword") return next();
    if (req.originalUrl == "/validtoken") return next();
    if (req.originalUrl == "/inviteToken") return next();
    if (req.originalUrl == "/verify") return next();
    if (req.originalUrl == "/resend") return next();
    if (req.originalUrl == "/count") return next();
    let token = req.headers['authorization']
    if (token && token.startsWith("Bearer ")) {
        token = token.slice(7, token.length)
        jwt.verify(token, "privatekey", (err, decoded) => {
            if (err) {
                res.status(401).json({
                    error: "Token invalid"
                })
            } else {
                next()
            }
        })
    } else {
        res.status(400).json({
            error: "Token missing"
        })
    }


});


var dbconn = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'root',
    database: 'test'
});
dbconn.connect((err) => {
    if (err) throw err;
    else console.log("Connected");
});

app.get("/count", (req,res)=>{
    let num1;
    let num2;
    let sql =`SELECT COUNT(*) AS num FROM users WHERE verified="verified";`;
    dbconn.query(sql,(err,result)=>{
        if(err) throw err;
        else{
            console.log(result)
            num1 = result[0].num;
        }
    })
    sql = `SELECT COUNT(*) AS num FROM users WHERE verified="notVerified";`;
    dbconn.query(sql,(err,result)=>{
        if(err) throw err;
        else{
            console.log(result)
            num2 = result[0].num
            res.send({"notVerified":num2,"verified": num1})
        }
    })
});

app.post("/login", (req, res) => {

    let no;
    let email = req.body.email;
    let password = md5(req.body.password);
    dbconn.query(`SELECT COUNT(*) AS num FROM users WHERE email="${email}";`, (error, result) => {
        if (error) throw error;
        else {

            no = result[0].num;
            if (no != 0) {
                // console.log("why coming here");
                dbconn.query(`SELECT password, verified , token FROM users WHERE email="${email}";`, (error, result) => {
                    if (error) throw error;
                    else {
                        console.log("In login===> result ", result)
                        let loginToken = result[0].token;
                        let v1 = result[0].password;
                        let verify = result[0].verified;
                        if (v1 === password && verify === "verified") {
                            try {
                                var token = jwt.sign({ foo: `${email}` }, "privatekey");
                                console.log("token", token);
                                res.status(200).send(token);
                            } catch (error) {
                                console.log("error", error);
                            }

                        } else {
                            if (verify === "notVerified") {
                                // res.send("notVerified")
                                res.send({ "status": "notVerified", "token": `${loginToken}` });
                            } else {
                                res.status(401).send({ message: "Invalid password or email.." });
                            }

                        }


                    }

                });
            } else {
                res.status(401).send({ message: "Invalid password or email" });
            }
        }
    })



});

app.post("/resend", (req, res) => {
    let token = req.body.token;
    let email = req.body.email;
    sql = `UPDATE verify SET status="expires" WHERE useremail="${email}" AND status="notused";`;
    dbconn.query(sql, (err, result) => {
        if (err) throw err;
        else {
            console.log(result);
        }
    })
    require('crypto').randomBytes(48, async function (err, buffer) {
        token = buffer.toString('hex');
        console.log("==========>", token)
        sql = `INSERT INTO verify(token, useremail) VALUES("${token}","${email}");`;
        dbconn.query(sql, (err, result) => {
            if (err) throw err;
            else {
                console.log(result);
            }
        })
        sql = `UPDATE users SET  token="${token}" WHERE email="${email}";`;
        dbconn.query(sql, (err, result) => {
            if (err) throw err;
            else {
                console.log(result);
            }
        })
        var transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: 'jagdeepbajwa24@gmail.com',
                pass: 'avnoor24'
            }
        });

        var mailOptions = {
            from: 'jagdeepbajwa24@gmail.com',
            to: `${email}`,
            subject: 'Verification Mail',
            html: `<p>This is a verfication mail.</p><p>Please Click and verify your self. Without verfication you cannot login</p><br><br> <button><a href="http://localhost:3001/auth/verified?token=${token}">verify your email</a></button><br>`
        };

        transporter.sendMail(mailOptions, function (error, info) {
            if (error) {
                console.log("Error while sending mail", error);
                res.status(401).send(error);
            } else {
                console.log('Email sent: ' + info.response);
                res.status(200).send(info.response)
            }
        });
    });

})

app.post("/manageuser", (req, res) => {
    let email = req.body.email;
    var sql = `SELECT * FROM users WHERE email="${email}";`;
    dbconn.query(sql, (err, result) => {
        if (err) throw err;
        else {
            res.send(result);
            console.log(result);
        }
    })
});

app.get('/data', (req, res) => {
    var sql = 'SELECT * FROM users;';
    // console.log("here in get");
    dbconn.query(sql, function (err, result) {
        if (err) {
            res.send("error has come");
            console.log(err);
        }
        else {
            res.send(result);
        }
    })

});

app.post('/token', (req, res) => {

    let token = req.body.token;
    var decoded = jwt.verify(token, "privatekey");
    let email = decoded.foo;

    var sql = `SELECT * FROM users WHERE email="${email}";`;
    dbconn.query(sql, function (err, result) {
        if (err) {
            res.send(err);
        } else {
            res.send(result);
        }
    })
});
app.post('/users', (req, res) => {
    let token = req.body.token;

    let fname = req.body.fname;
    let email = req.body.email;
    let password = md5(req.body.password);
    sql = `INSERT INTO users(fname,email,password,token) VALUES ("${fname}","${email}","${password}","${token}");`;
    dbconn.query(sql, function (err, result) {
        if (err) throw err;
        else {
            res.send("SuccessFully Register");
            let sql = `UPDATE Invites SET status="used" WHERE token="${token}" AND status="notused";`;
            dbconn.query(sql, (err, result) => {
                if (err) throw err;
                else {
                    console.log(result);
                }
            })

            sql = `INSERT INTO verify(token, useremail) VALUES("${token}","${email}");`;
            dbconn.query(sql, (err, result) => {
                if (err) throw err;
                else {
                    console.log(result);
                }
            })
            var transporter = nodemailer.createTransport({
                service: 'gmail',
                auth: {
                    user: 'jagdeepbajwa24@gmail.com',
                    pass: 'avnoor24'
                }
            });

            var mailOptions = {
                from: 'jagdeepbajwa24@gmail.com',
                to: `${email}`,
                subject: 'Successfully Register',
                html: `<p>You Have successfully Register your self.</p><p>Please Click and verify your self</p><br><br> <button><a href="http://localhost:3001/auth/verified?token=${token}">verify your email</a></button><br>`
            };

            transporter.sendMail(mailOptions, function (error, info) {
                if (error) {
                    console.log("Error while sending mail", error);
                } else {
                    console.log('Email sent: ' + info.response);
                }
            });

        }
    });
});

app.put("/verify", (req, res) => {
    token = req.body.token;
    // ,token =""
    let sql = `SELECT status FROM verify WHERE token="${token}";`;
    dbconn.query(sql, (err, result) => {
        if (err) throw err;
        else {
            if (result[0].status === "notused") {
                sql = `UPDATE users SET verified="verified"  WHERE token="${token}";`;
                dbconn.query(sql, (err, result) => {
                    if (err) throw err;
                    else {
                        console.log("1) ", result);
                        sql = `UPDATE verify SET status="used"  WHERE token="${token}" AND status="notused";`;
                        dbconn.query(sql, (err, result) => {
                            if (err) throw err;
                            else {
                                res.send(result);
                                sql = `UPDATE users SET token=""  WHERE token="${token}";`;
                                dbconn.query(sql, (err, result) => {
                                    if (err) throw err;
                                    else {
                                        console.log("2", result);
                                    }
                                })
                            }
                        })
                    }
                })

            } else {
                res.status(401).send("already used or expired token");
            }
        }
    })

});

app.post('/password', async (req, res) => {
    email = req.body.email
    let num = 1;
    let userId;
    let token;
    let sql = `SELECT Id FROM users WHERE email="${email}";`;
    dbconn.query(sql, (err, result) => {
        if (err) throw err;
        else {
            console.log("ID", result[0].Id);
            userId = result[0].Id;
        }
    })
    let check = true;
    // for (let i = 0; i < 5; i++)

    console.log("i", num);

    require('crypto').randomBytes(48, async function (err, buffer) {
        token = buffer.toString('hex');
        console.log("==========>", token)
        let sql = `SELECT COUNT(*) AS num FROM resetPassword WHERE token="${token}"`;
        await dbconn.query(sql, function (err, result) {
            if (err) throw err;
            else {
                console.log("result: ", result[0].num);
                num = result[0].num;
                if (num == 0) {
                    console.log("here  ")
                    sql = `UPDATE resetPassword SET status = "expires" WHERE userId="${userId}" AND status = "unused";`;
                    dbconn.query(sql, (err, result) => {
                        if (err) throw err;
                        else {
                            console.log("<<<<< ", result, " >>>>>>>>>")
                        }
                    })
                    sql = `INSERT INTO resetPassword(token,userId) VALUES("${token}","${userId}");`;
                    dbconn.query(sql, (err, result) => {
                        if (err) throw err;
                        else {

                            res.status("200").send(result);
                            var transporter = nodemailer.createTransport({
                                service: 'gmail',
                                auth: {
                                    user: 'jagdeepbajwa24@gmail.com',
                                    pass: 'avnoor24'
                                }
                            });

                            var mailOptions = {
                                from: 'jagdeepbajwa24@gmail.com',
                                to: `${email}`,
                                subject: 'Change Password',
                                // text: `Please click on the link to change password http://localhost:3001/auth/password. After login please change your password`,
                                html: '<p>You requested for reset password, kindly use this <a href="http://localhost:3001/auth/password?token=' + token + '">link</a> to reset your password</p>'
                            };

                            transporter.sendMail(mailOptions, function (error, info) {
                                if (error) {
                                    console.log("Error while sending mail", error);
                                } else {
                                    console.log('Email sent: ' + info.response);
                                }
                            });
                        }
                    })
                } else {

                }
            }
        })

    });
})

app.post('/validtoken', (req, res) => {
    let token = req.body.token;
    let sql = `SELECT * FROM resetPassword WHERE token="${token}";`;
    dbconn.query(sql, (err, result) => {
        if (err) throw err;
        else {
            res.send(result[0].status);
        }
    })
})

app.put('/forgotpassword', (req, res) => {
    // console.log(req.body.password)
    password = md5(req.body.password);
    let userId;
    let token = req.body.token;
    let sql = `SELECT * FROM resetPassword WHERE token="${token}";`;
    dbconn.query(sql, (err, result) => {
        if (err) throw err;
        else {
            console.log("result in forgot password", result);
            userId = result[0].userId;
            if (result[0].status == "unused") {
                sql = `UPDATE users SET password="${password}" WHERE Id="${userId}";`;
                dbconn.query(sql, (err, result) => {
                    if (err) throw err;
                    else {

                        console.log("-------->", result);
                        sql = `UPDATE resetPassword SET status="used" WHERE token="${token}";`;
                        dbconn.query(sql, (err, result) => {
                            if (err) throw err;
                            else {
                                console.log("After coming here", result);
                                res.status(200).send(result);
                            }
                        })
                    }
                })
            }
            else {
                console.log("Token already used")
                res.status(400).send({
                    message: "Token was already used."
                });
            }
        }
    });

})

app.delete('/:Id', (req, res) => {

    let Id = req.params.Id;
    var sql = `Delete FROM users WHERE Id=${Id};`;
    dbconn.query(sql, function (err, result) {
        if (err) throw err;
        else {
            res.send("Successfully deleted");
        }
    })
});

app.get('/:Id', (req, res) => {
    let Id = req.params.Id;
    var sql = `SELECT * FROM users WHERE Id=${Id};`;
    dbconn.query(sql, function (err, result) {
        if (err) throw err;
        else {
            res.send(result);
        }
    })
});

app.put('/:Id', (req, res) => {
    let Id = req.params.Id;
    let fname = req.body.fname;
    let email = req.body.email;
    let account_type = req.body.account_type;
    let useremail;
    let sql = `SELECT email FROM users WHERE Id=${Id};`;
    dbconn.query(sql,(err, result)=>{
        if(err) throw err;
        else{
            console.log(result[0].email);
            useremail = result[0].email;
            sql = `UPDATE verify SET status="expires" WHERE useremail="${useremail}" AND status="notused";`;
            dbconn.query(sql, (err,result)=>{
                if(err) throw err;
                else{
                    console.log(result);
                }

            })
            if(email===useremail){
                console.log("email not changed");
                sql = `UPDATE users SET fname="${fname}", email="${email}", account_type="${account_type}" WHERE Id=${Id};`;
                    dbconn.query(sql, function (err, result) {
                        if (err) throw err;
                        else{
                            res.send(result);
                        }
                    })
            }else{
                console.log("email has been changed",useremail,"<==before and after==>",email);
                require('crypto').randomBytes(48, async function (err, buffer) {
                    token = buffer.toString('hex');
                    console.log("==========>", token)
                    sql = `UPDATE users SET fname="${fname}", email="${email}", account_type="${account_type}", verified="notVerified", token="${token}" WHERE Id=${Id};`;
                    dbconn.query(sql, function (err, result) {
                        if (err) throw err;
                        else {
                            console.log(result);
                            
                            sql = `UPDATE verify SET status="expires" WHERE useremail="${email}" AND status="notused";`;
                            dbconn.query(sql, (err, result) => {
                                if (err) throw err;
                                else {
                                    console.log(result);
                                }
                            })
                            sql = `INSERT INTO verify(token, useremail) VALUES("${token}","${email}");`;
                            dbconn.query(sql, (err, result) => {
                                if (err) throw err;
                                else {
                                    console.log(result);
                                }
                            })
                            var transporter = nodemailer.createTransport({
                                service: 'gmail',
                                auth: {
                                    user: 'jagdeepbajwa24@gmail.com',
                                    pass: 'avnoor24'
                                }
                            });
            
                            var mailOptions = {
                                from: 'jagdeepbajwa24@gmail.com',
                                to: `${email}`,
                                subject: 'Verification Email',
                                html: `<p>It look like you have changed your email Id.</p><p>Please Click and verify your self</p><br><br> <button><a href="http://localhost:3001/auth/verified?token=${token}">verify your email</a></button><br>`
                            };
            
                            transporter.sendMail(mailOptions, function (error, info) {
                                if (error) {
                                    console.log("Error while sending mail", error);
                                } else {
                                    console.log('Email sent: ' + info.response);
                                    res.send(info.response);
                                }
                            });
                        }
                    })
                })
            }
        }
    })
    
    

});

app.put('/password/:Id', (req, res) => {
    console.log("reach here")
    let Id = req.params.Id;
    console.log()
    let password = md5(req.body.password);
    let newpassword = md5(req.body.newpassword);
    var oldpassword;

    var sql = `SELECT password FROM users WHERE Id=${Id};`;
    dbconn.query(sql, function (err, result) {
        if (err) throw err;
        else {
            console.log("reach in first")
            // res.send(result);
            oldpassword = result[0].password;
            console.log(result[0].password)
            console.log("password", password);
            console.log("newpassword", newpassword);
            console.log("oldpassword", oldpassword);
            if (password === oldpassword) {
                console.log("reach in second")
                var sql = `UPDATE users SET password="${newpassword}" WHERE Id=${Id};`;
                dbconn.query(sql, function (err, result) {
                    if (err) throw err;
                    else {

                        res.send("Successfull updated")
                    }
                })
            } else {
                res.send("401");
            }
        }
    })



});

app.post("/inviteToken", (req, res) => {
    let token = req.body.token;
    let sql = `SELECT * FROM Invites WHERE token="${token}";`;
    dbconn.query(sql, (err, result) => {
        if (err) throw err;
        else {
            res.send(result[0].status);
        }
    })
});
app.post("/invite", (req, res) => {
    let email = req.body.email;
    let userEmail = req.body.userEmail;
    console.log("==> 1 ", email, "==> 2", userEmail);
    let userId;
    let sql = `SELECT Id FROM users WHERE email="${userEmail}";`;
    dbconn.query(sql, (err, result) => {
        if (err) throw err;
        else {
            console.log(result[0].Id)
            userId = result[0].Id;
            console.log("userId=>", userId);
            require('crypto').randomBytes(48, async function (err, buffer) {
                token = buffer.toString('hex');
                console.log("==========>", token);
                // res.send(token)
                sql = `UPDATE Invites SET status ="expires" WHERE adminId="${userId}" AND status="unused" AND email="${email}";`;
                dbconn.query(sql, (err, result) => {
                    if (err) throw err;
                    else {
                        console.log(result);
                    }
                })
                sql = `INSERT INTO Invites(token,adminId,email) VALUES("${token}","${userId}","${email}");`;
                dbconn.query(sql, (err, result) => {
                    if (err) throw err;
                    else {
                        console.log(result);
                        res.status("200").send(result);
                        var transporter = nodemailer.createTransport({
                            service: 'gmail',
                            auth: {
                                user: 'jagdeepbajwa24@gmail.com',
                                pass: 'avnoor24'
                            }
                        });

                        var mailOptions = {
                            from: 'jagdeepbajwa24@gmail.com',
                            to: `${email}`,
                            subject: 'Invitation For Sign Up',
                            // text: `Please click on the link to change password http://localhost:3001/auth/password. After login please change your password`,
                            html: '<p>You have been invited for sign up, kindly use this <a href="http://localhost:3001/auth/sign-up?token=' + token + '">link</a> to Sign up </p>'
                        };

                        transporter.sendMail(mailOptions, function (error, info) {
                            if (error) {
                                console.log("Error while sending mail", error);
                            } else {
                                console.log('Email sent: ' + info.response);
                            }
                        });
                    }
                })
            })
        }
    })

});

app.listen(3000, function () {
    console.log('Node app is running on port 3000');
});


app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-header", "origin, X-Requested-With, Content-Type, Accept");
    // next();
})