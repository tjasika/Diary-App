const express = require('express');
const app = express();
require('dotenv').config();

const session = require('express-session');
const mysql = require('mysql2');
const path = require('path');
const bcrypt = require('bcrypt');

const { format } = require('date-fns');

const pool = mysql.createPool({
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
    host: process.env.DB_HOST,
    port: process.env.DB_PORT
});
module.exports = pool;

app.use(session({
	secret: 'secret',
	resave: true,
	saveUninitialized: true
}));

app.set("view engine", "ejs");          
app.use(express.static('public'));
app.use('/bootstrap-icons', express.static(path.join(__dirname, 'node_modules/bootstrap-icons/font')));    

app.set("views", path.join(__dirname, "views"));    
app.use(express.json());                            
app.use(express.urlencoded({ extended: true }));

app.use((req, res, next) => {
    res.locals.username = req.session.loggedin ? req.session.username : null; 
    next();
});

app.use((req, res, next) => {
	const formatted = format(new Date(), "EEEE, MMMM do yyyy");
	res.locals.currentDate = formatted;
	next();
})

//GET handlers
app.get('/login', (req, res)=>{
	res.render("login.ejs", {err: ""});
});

app.get('/signup', (req, res)=>{
	res.render("signup.ejs", {err: ""});
});

app.get('/', (req, res)=>{
	if(!req.session.username) {
		return res.redirect('/login');
	}
	const userId = req.session.userId;
	pool.query(
		`SELECT entry.id, entry.title, entry.date, entry.content, user.username
		FROM entry
		JOIN user ON entry.User_Id = user.id
		WHERE entry.User_Id = ?
		ORDER BY entry.date DESC
		LIMIT 3`, 
		[userId], (err, results) => {
			if(err) {
				console.error('Error fetching entries:', err.message);
				return res.render('index.ejs', { entries: [], err: err.message });
			}
			return res.render('index.ejs',{entries: results, err: ""});
		}
	)
});

app.get('/entries', (req, res)=>{
	if(!req.session.username) {
		return res.redirect('/login');
	}
	const userId = req.session.userId;
	pool.query(
		`SELECT entry.id, entry.title, entry.date, entry.content, user.username
		FROM entry
		JOIN user ON entry.User_Id = user.id
		WHERE entry.User_Id = ?
		ORDER BY entry.date DESC`, 
		[userId], (err, results) => {
			if(err) {
				console.error('Error fetching entries:', err.message);
				return res.render('entries.ejs', { entries: [], err: err.message });
			}
			return res.render('entries.ejs',{entries: results, err: ""});
		}
	)
});

app.get('/fullentry/:id', (req, res) => {
	if(!req.session.username) {
		return res.redirect('/login');
	}
	const userId = req.session.userId;
	const entryId = req.params.id;
	pool.query(
		`SELECT entry.id, entry.title, entry.date, entry.content
		FROM entry
		JOIN user ON entry.User_Id = user.id
		WHERE entry.User_Id = ?
		AND entry.id = ?`,
		[userId, entryId], (err, result) => {
			if(err) {
				console.error('Error fetching entry:', err.message);
				return res.redirect('/entries');
			}
			if (result.length === 0) {
				return res.status(404).send("Entry not found or access denied.");
			}
			console.log('Entry fetched successfully!');
			res.render('fullentry.ejs', {entry: result[0], err: ""});
		}
	)
});

app.get('/newentry', (req, res)=>{
	if(!req.session.username) {
		return res.redirect('/login');
	}
	res.render("newentry.ejs",{err: ""});
});

app.get('/account', (req, res)=> {
	if(!req.session.username) {
		return res.redirect('/login');
	}
	res.render("account.ejs",{err: ""});
})


//POST handlers
app.post('/signup', (req, res)=>{
	const data = req.body;
	if(!data.email || !data.username || !data.password || !data.password2) {
		return res.render('signup.ejs', {err: "All fields required"});
	}
	else if(data.password != data.password2) {
		return res.render('signup.ejs', {err: "Passwords don't match."});
	}

	pool.query(
		`SELECT Email, Username, Password FROM User WHERE Email = ? OR Username = ?`,
		[data.email, data.username],
		(err, response) => {
			if(err) {
				return res.render('signup.ejs', {err: err.message});
			}

			if(response.length > 0) {
				const emailExists = response.some(user => user.Email === data.email || user.Email === data.email.toLowerCase());
				const userExists = response.some(user => user.Username === data.username);

				if(emailExists) {
					return res.render('signup.ejs', {err: "User with that email already exists."});
				} 
				else if (userExists) {
					return res.render('signup.ejs', {err: "User with that username already exists."});
				}

			} else {
				const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
				const saltRounds = 10;
				bcrypt.hash(data.password, saltRounds, (err, hashedPassword) => {
					if(err) {
						return res.render('signup.ejs', {err: err.message});
					} else {
						pool.query(
							`INSERT INTO User (Username, Email, Password, first_used, last_used) VALUES (?, ?, ?, ?, ?)`,
							[data.username, data.email, hashedPassword, now, now],
							(err, response) => {
								if(err) {
									return res.render('signup.ejs', {err: err.message});
								} else {
									res.redirect('/login');
								}
							}
						)
					}
				});
			}
		}
	)
});

app.post('/login', (req, res)=> {
	const data = req.body;
	pool.query (
		`SELECT * FROM User WHERE Username = ?`, [data.username], (err, response)=>{
			if(err) {
				return res.render("login.ejs", {err: err.message});
			}
			
			if (response.length > 0) {
                const user = response[0];
                bcrypt.compare(data.password, user.Password, (err, isMatch) => {
                    if (err) {
                        return res.render("login.ejs", { err: err.message});
                    }
    
                    if (isMatch) {
						const newDate = new Date().toISOString().slice(0, 19).replace('T', ' ');
                        req.session.loggedin = true;
                        req.session.username = user.Username;
                        req.session.userId = user.Id;
						pool.query(
							`UPDATE User SET last_used = ? WHERE Id = ? `, [newDate, user.Id], (updateErr) => {
								if(updateErr) {
									console.error(updateErr);
								}
								return res.redirect('/');
							}
						);
                    } else {
                        res.render("login.ejs", { err: "Incorrect username or password"});
                    }
                });
    
            } else {
                res.render("login.ejs", { err: "Incorrect username or password"});
            }
		}
	);
});

app.post('/newentry', (req, res) => {
	const {title, content} = req.body;
	if (!content || content.trim() === '') {
		return res.render('index.ejs', { err: 'Content cannot be empty' });
	}
	const userId = req.session.userId;
	const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
	pool.query(
		`INSERT INTO Entry (User_Id, Title, Content, Date) values (?, ?, ?, ?) `, [userId, title, content, now], (err) => {
			if(err) {
				console.error("Error inserting entry in the database:", err);
				return res.render('index.ejs', {entries: [], err: err.message})
			}
			console.log('Entry added successfully!');
			return res.redirect('/entries');
		}
	);
});

app.post('/delete-entry', (req, res)=> {
	const data = req.body;
	const entryId = req.body.entryId;
	const userId = req.session.userId;
	pool.query(
		`DELETE FROM Entry 
		WHERE Id = ?
		AND User_Id = ?`,
		[entryId, userId], (err, result) => {
			if(err) {
				console.error('Error deleting entry:', err.message);
				return res.redirect('/entries');
			}
			console.log('Entry deleted successfully!');
			return res.redirect('/entries');
		}
	)
});

//Log-out
app.get("/logout", (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return res.send("Error logging out");
        }
        res.redirect("/login");
    });
});

app.listen(3456, ()=>{
	console.log('App listening on port 3456....');
});