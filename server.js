
require("dotenv").config();

const express = require("express");
const session = require("express-session");
const helmet = require("helmet");
const bcrypt = require("bcryptjs");
const sqlite3 = require("sqlite3").verbose();
const path = require("path");
const multer = require("multer");
const fs = require("fs");
const crypto = require("crypto");
const app = express();
const http = require("http");
const { Server } = require("socket.io");

const server = http.createServer(app);

const io = new Server(server);

const PORT = process.env.PORT || 3000;

if (!process.env.SESSION_SECRET) {
    throw new Error("SESSION_SECRET is missing from .env");
}

// Security and middleware
app.use(helmet());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));


const sessionMiddleware = session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
        httpOnly: true,
        secure: false,
        sameSite: "lax",
        maxAge: 24 * 60 * 60 * 1000
    }
});

app.use(sessionMiddleware);

// Share Express login sessions with Socket.IO
io.engine.use(sessionMiddleware);




// ==================================
// SOCKET.IO AUTHENTICATION
// ==================================

io.use((socket, next) => {
    const userId = socket.request.session?.userId;

    if (!userId) {
        return next(new Error("Authentication required"));
    }

    socket.userId = userId;
    next();
});


// ==========================================
// TRACK USERS WHO ARE CURRENTLY ONLINE
// ==========================================

const onlineUsers = new Map();

io.on("connection", (socket) => {
    console.log(`User ${socket.userId} connected to chat`);


    // Register this active connection for the user
const userId = Number(socket.userId);

// Join a private room for live story-view updates
socket.join(`story-owner-${userId}`);

// Private room for this user's live notifications
socket.join(`user-${userId}`);

if (!onlineUsers.has(userId)) {
    onlineUsers.set(userId, new Set());
}

onlineUsers.get(userId).add(socket.id);

// Notify connected users that this user is online
io.emit("user_status", {
    userId,
    isOnline: true
});

// Send the current online user list to this connection
socket.emit("online_users", {
    userIds: Array.from(onlineUsers.keys())
});

    // JOIN A CONVERSATION
    socket.on("join_conversation", (data) => {
        const conversationId = Number(data?.conversationId);

        if (!Number.isSafeInteger(conversationId) || conversationId <= 0) {
            return socket.emit("chat_error", {
                message: "Invalid conversation ID."
            });
        }

        db.get(
            `SELECT id FROM conversations
             WHERE id = ?
             AND (user1_id = ? OR user2_id = ?)`,
            [conversationId, socket.userId, socket.userId],
            (err, conversation) => {
                if (err || !conversation) {
                    return socket.emit("chat_error", {
                        message: "You cannot access this conversation."
                    });
                }

                
socket.join(`conversation:${conversationId}`);

// Mark incoming messages as read
db.run(
    `UPDATE messages
     SET read_at = CURRENT_TIMESTAMP
     WHERE conversation_id = ?
     AND sender_id != ?
     AND read_at IS NULL`,
    [conversationId, socket.userId],
    function (readError) {
        if (readError) {
            console.error("Read receipt error:", readError.message);

            return socket.emit("chat_error", {
                message: "Could not update read receipts."
            });
        }

        // Notify the other participant
        socket.to(`conversation:${conversationId}`).emit("messages_read", {
            conversationId,
            readerId: socket.userId
        });

        // Confirm only after the database update finishes
        socket.emit("conversation_joined", {
            conversationId
        });
    }
);

            }
        );
    });



    // HANDLE TYPING INDICATORS
    socket.on("typing", (data) => {
        const conversationId = Number(data?.conversationId);
        const isTyping = Boolean(data?.isTyping);

        if (
            !Number.isSafeInteger(conversationId) ||
            conversationId <= 0
        ) {
            return;
        }

        const room = `conversation:${conversationId}`;

        // Only allow typing updates from joined conversation members
        if (!socket.rooms.has(room)) {
            return;
        }

        socket.to(room).emit("typing_status", {
            conversationId,
            userId: socket.userId,
            isTyping
        });
    });



    // SEND A REAL-TIME MESSAGE
    socket.on("send_message", (data) => {
        const conversationId = Number(data?.conversationId);
        const content = typeof data?.content === "string"
            ? data.content.trim()
            : "";

        if (!Number.isSafeInteger(conversationId) || conversationId <= 0) {
            return socket.emit("chat_error", {
                message: "Invalid conversation ID."
            });
        }

        if (!content || content.length > 2000) {
            return socket.emit("chat_error", {
                message: "Message must contain 1–2000 characters."
            });
        }

        // Verify that the sender belongs to this conversation
        db.get(
            `SELECT id FROM conversations
             WHERE id = ?
             AND (user1_id = ? OR user2_id = ?)`,
            [conversationId, socket.userId, socket.userId],
            (err, conversation) => {
                if (err || !conversation) {
                    return socket.emit("chat_error", {
                        message: "You cannot send a message here."
                    });
                }

                // Save message in SQLite
                db.run(
                    `INSERT INTO messages
                     (conversation_id, sender_id, content)
                     VALUES (?, ?, ?)`,
                    [conversationId, socket.userId, content],
                    function (insertError) {
                        if (insertError) {
                            console.error("Message save error:", insertError.message);

                            return socket.emit("chat_error", {
                                message: "Could not send message."
                            });
                        }

                        const messageId = this.lastID;

                        // Update conversation activity
                        db.run(
                            `UPDATE conversations
                             SET updated_at = CURRENT_TIMESTAMP
                             WHERE id = ?`,
                            [conversationId],
                            (updateError) => {
                                if (updateError) {
                                    console.error("Conversation update error:", updateError.message);
                                }

                                // Retrieve saved message with sender details
                                db.get(
                                    `SELECT
                                        messages.id,
                                        messages.conversation_id,
                                        messages.sender_id,
                                        messages.content,
                                        messages.created_at,
                                        messages.read_at,
                                        messages.delivered_at,
                                        users.username,
                                        users.profile_pic
                                     FROM messages
                                     JOIN users
                                        ON users.id = messages.sender_id
                                     WHERE messages.id = ?`,
                                    [messageId],
                                    (fetchError, message) => {
                                        if (fetchError || !message) {
                                            return socket.emit("chat_error", {
                                                message: "Message was saved but could not be displayed."
                                            });
                                        }

                                        // Send message to everyone in this conversation
io.to(`conversation:${conversationId}`)
    .emit("new_message", message);

// Find the message recipient
db.get(
    `SELECT
        CASE
            WHEN user1_id = ? THEN user2_id
            ELSE user1_id
        END AS recipient_id
     FROM conversations
     WHERE id = ?`,
    [socket.userId, conversationId],
    (recipientError, result) => {
        if (recipientError || !result) {
            console.error("Message recipient lookup failed.");
            return;
        }

        createNotification(
            result.recipient_id,
            Number(socket.userId),
            "message",
            "sent you a message",
            "conversation",
            conversationId
        );
    }
);
                                    }
                                );
                            }
                        );
                    }
                );
            }
        );
    });


    // ==========================================
// HANDLE MESSAGE DELIVERY RECEIPTS
// ==========================================

socket.on("message_delivered", (data) => {
    const messageId = Number(data?.messageId);

    if (!Number.isSafeInteger(messageId) || messageId <= 0) {
        return;
    }

    // Verify that the logged-in user is the recipient
    db.get(
        `SELECT
            messages.id,
            messages.conversation_id,
            messages.sender_id
         FROM messages
         JOIN conversations
            ON conversations.id = messages.conversation_id
         WHERE messages.id = ?
         AND (
            conversations.user1_id = ?
            OR conversations.user2_id = ?
         )`,
        [messageId, socket.userId, socket.userId],
        (err, message) => {
            if (err || !message) {
                return;
            }

            // Do not mark your own messages as delivered
            if (Number(message.sender_id) === Number(socket.userId)) {
                return;
            }

            db.run(
                `UPDATE messages
                 SET delivered_at = CURRENT_TIMESTAMP
                 WHERE id = ?
                 AND delivered_at IS NULL`,
                [messageId],
                function (updateError) {
                    if (updateError) {
                        console.error(
                            "Delivery receipt error:",
                            updateError.message
                        );
                        return;
                    }

                    if (this.changes > 0) {
                        db.get(
                            `SELECT delivered_at
                             FROM messages
                             WHERE id = ?`,
                            [messageId],
                            (fetchError, result) => {
                                if (fetchError || !result) {
                                    return;
                                }

                                io.to(`conversation:${message.conversation_id}`)
                                    .emit("message_status_update", {
                                        messageId,
                                        deliveredAt: result.delivered_at
                                    });
                            }
                        );
                    }
                }
            );
        }
    );
});

    // HANDLE USER GOING OFFLINE
socket.on("disconnect", () => {
    console.log(`User ${socket.userId} disconnected from chat`);

    const userId = Number(socket.userId);
    const userConnections = onlineUsers.get(userId);

    if (!userConnections) {
        return;
    }

    // Remove only this disconnected browser connection
    userConnections.delete(socket.id);

    // Mark offline only when no other tabs/devices remain
    if (userConnections.size === 0) {
        onlineUsers.delete(userId);

        // Save the user's last seen time in SQLite
db.run(
    `UPDATE users
     SET last_seen = CURRENT_TIMESTAMP
     WHERE id = ?`,
    [userId],
    (err) => {
        if (err) {
            console.error("Failed to update last seen:", err.message);
        }
    }
);

        io.emit("user_status", {
            userId,
            isOnline: false
        });
    }
});
});



// Frontend folder
app.use(express.static(path.join(__dirname, "public")));

// SQLite database connection
const dbPath = path.join(__dirname, "database", "social.db");

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error("Database connection failed:", err.message);
        process.exit(1);
    }

    console.log("SQLite database connected successfully!");
});

// Enable foreign keys and create tables
db.serialize(() => {
    db.run("PRAGMA foreign_keys = ON");

    db.exec(`
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT NOT NULL UNIQUE,
            email TEXT NOT NULL UNIQUE,
            password TEXT NOT NULL,
            bio TEXT DEFAULT '',
            profile_pic TEXT DEFAULT '',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS posts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            content TEXT NOT NULL,
            image TEXT DEFAULT '',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(user_id) REFERENCES users(id)
                ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS comments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            post_id INTEGER NOT NULL,
            user_id INTEGER NOT NULL,
            content TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(post_id) REFERENCES posts(id)
                ON DELETE CASCADE,
            FOREIGN KEY(user_id) REFERENCES users(id)
                ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS likes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            post_id INTEGER NOT NULL,
            user_id INTEGER NOT NULL,
            UNIQUE(post_id, user_id),
            FOREIGN KEY(post_id) REFERENCES posts(id)
                ON DELETE CASCADE,
            FOREIGN KEY(user_id) REFERENCES users(id)
                ON DELETE CASCADE
        );


        CREATE TABLE IF NOT EXISTS saved_posts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    post_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    saved_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(post_id, user_id),

    FOREIGN KEY(post_id) REFERENCES posts(id)
        ON DELETE CASCADE,

    FOREIGN KEY(user_id) REFERENCES users(id)
        ON DELETE CASCADE
);



        CREATE TABLE IF NOT EXISTS conversations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user1_id INTEGER NOT NULL,
            user2_id INTEGER NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,

            UNIQUE(user1_id, user2_id),
            CHECK(user1_id < user2_id),

            FOREIGN KEY(user1_id) REFERENCES users(id)
                ON DELETE CASCADE,

            FOREIGN KEY(user2_id) REFERENCES users(id)
                ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS messages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            conversation_id INTEGER NOT NULL,
            sender_id INTEGER NOT NULL,
            content TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            read_at DATETIME DEFAULT NULL,

            FOREIGN KEY(conversation_id) REFERENCES conversations(id)
                ON DELETE CASCADE,

            FOREIGN KEY(sender_id) REFERENCES users(id)
                ON DELETE CASCADE
        );

        CREATE INDEX IF NOT EXISTS idx_messages_conversation
        ON messages(conversation_id, created_at);

        CREATE INDEX IF NOT EXISTS idx_messages_sender
        ON messages(sender_id);


        CREATE TABLE IF NOT EXISTS followers (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            follower_id INTEGER NOT NULL,
            following_id INTEGER NOT NULL,
            UNIQUE(follower_id, following_id),
            CHECK(follower_id != following_id),
            FOREIGN KEY(follower_id) REFERENCES users(id)
                ON DELETE CASCADE,
            FOREIGN KEY(following_id) REFERENCES users(id)
                ON DELETE CASCADE
        );

                CREATE TABLE IF NOT EXISTS stories (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            image TEXT NOT NULL,
            caption TEXT DEFAULT '',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            expires_at DATETIME NOT NULL,
            FOREIGN KEY(user_id) REFERENCES users(id)
                ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS story_views (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    story_id INTEGER NOT NULL,
    viewer_id INTEGER NOT NULL,
    viewed_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(story_id, viewer_id),

    FOREIGN KEY(story_id) REFERENCES stories(id)
        ON DELETE CASCADE,

    FOREIGN KEY(viewer_id) REFERENCES users(id)
        ON DELETE CASCADE
);

    -- ==================================
-- STORY REPLIES TABLE
-- ==================================

CREATE TABLE IF NOT EXISTS story_replies (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    story_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    content TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY(story_id) REFERENCES stories(id)
        ON DELETE CASCADE,

    FOREIGN KEY(user_id) REFERENCES users(id)
        ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_story_replies_story
ON story_replies(story_id, created_at);    
    
    CREATE INDEX IF NOT EXISTS idx_stories_expires
        ON stories(expires_at);
        
        -- ==================================
-- NOTIFICATIONS TABLE
-- ==================================

CREATE TABLE IF NOT EXISTS notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    recipient_id INTEGER NOT NULL,
    actor_id INTEGER NOT NULL,

    type TEXT NOT NULL,

    message TEXT NOT NULL,

    entity_type TEXT DEFAULT NULL,
    entity_id INTEGER DEFAULT NULL,

    is_read INTEGER DEFAULT 0,

    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY(recipient_id) REFERENCES users(id)
        ON DELETE CASCADE,

    FOREIGN KEY(actor_id) REFERENCES users(id)
        ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_notifications_recipient
ON notifications(recipient_id, is_read, created_at);

    `, (err) => {
        if (err) {
            console.error("Table creation failed:", err.message);
            process.exit(1);
        }

        // Add delivered_at column for message delivery receipts
db.run(
    "ALTER TABLE messages ADD COLUMN delivered_at DATETIME DEFAULT NULL",
    (alterError) => {

        // Ignore the error if this column already exists
        if (
            alterError &&
            !alterError.message.includes("duplicate column name")
        ) {
            console.error(
                "Message delivery migration failed:",
                alterError.message
            );
            process.exit(1);
        }

        
// Add last_seen column to users table
db.run(
    "ALTER TABLE users ADD COLUMN last_seen DATETIME DEFAULT NULL",
    (lastSeenError) => {
        if (
            lastSeenError &&
            !lastSeenError.message.includes("duplicate column name")
        ) {
            console.error(
                "Last seen migration failed:",
                lastSeenError.message
            );
            process.exit(1);
        }

        console.log("Last seen tracking is ready!");
        console.log("Message delivery tracking is ready!");
        console.log("All database tables created successfully!");

        server.listen(PORT, () => {
    console.log(
        `Connectly server running at http://localhost:${PORT}`
    );

    // Clean expired stories when the server starts
    cleanupExpiredStories();

    // Repeat cleanup every hour
    setInterval(cleanupExpiredStories, 60 * 60 * 1000);
});
    }
);
    });
}); 
});

// Test API
app.get("/api/health", (req, res) => {
    res.json({
        success: true,
        message: "Connectly backend is running!"
    });
});


// ===============================
// USER AUTHENTICATION APIs
// ===============================

// Register a new user
app.post("/api/register", async (req, res) => {
    try {
        const { username, email, password } = req.body;

        if (!username || !email || !password) {
            return res.status(400).json({
                success: false,
                message: "All fields are required."
            });
        }

        const cleanUsername = username.trim();
        const cleanEmail = email.trim().toLowerCase();

        if (!/^[a-zA-Z0-9_]{3,20}$/.test(cleanUsername)) {
            return res.status(400).json({
                success: false,
                message: "Username must be 3-20 characters."
            });
        }

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
            return res.status(400).json({
                success: false,
                message: "Enter a valid email address."
            });
        }

        if (password.length < 8) {
            return res.status(400).json({
                success: false,
                message: "Password must contain at least 8 characters."
            });
        }

        const existingUser = await new Promise((resolve, reject) => {
            db.get(
                "SELECT id FROM users WHERE username = ? OR email = ?",
                [cleanUsername, cleanEmail],
                (err, row) => {
                    if (err) reject(err);
                    else resolve(row);
                }
            );
        });

        if (existingUser) {
            return res.status(409).json({
                success: false,
                message: "Username or email already exists."
            });
        }

        const hashedPassword = await bcrypt.hash(password, 12);

        const userId = await new Promise((resolve, reject) => {
            db.run(
                "INSERT INTO users (username, email, password) VALUES (?, ?, ?)",
                [cleanUsername, cleanEmail, hashedPassword],
                function (err) {
                    if (err) reject(err);
                    else resolve(this.lastID);
                }
            );
        });

        req.session.userId = userId;

        return res.status(201).json({
            success: true,
            message: "Account created successfully!",
            user: {
                id: userId,
                username: cleanUsername,
                email: cleanEmail
            }
        });

    } catch (error) {
        console.error("Registration error:", error.message);

        res.status(500).json({
            success: false,
            message: "Registration failed."
        });
    }
});


// Login existing user
app.post("/api/login", async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: "Email and password are required."
            });
        }

        const user = await new Promise((resolve, reject) => {
            db.get(
                "SELECT * FROM users WHERE email = ?",
                [email.trim().toLowerCase()],
                (err, row) => {
                    if (err) reject(err);
                    else resolve(row);
                }
            );
        });

        if (!user || !(await bcrypt.compare(password, user.password))) {
            return res.status(401).json({
                success: false,
                message: "Invalid email or password."
            });
        }

        req.session.regenerate((err) => {
            if (err) {
                return res.status(500).json({
                    success: false,
                    message: "Could not create session."
                });
            }

            req.session.userId = user.id;

            res.json({
                success: true,
                message: "Login successful!",
                user: {
                    id: user.id,
                    username: user.username,
                    email: user.email
                }
            });
        });

    } catch (error) {
        console.error("Login error:", error.message);

        res.status(500).json({
            success: false,
            message: "Login failed."
        });
    }
});


// Get logged-in user
app.get("/api/me", (req, res) => {
    if (!req.session.userId) {
        return res.status(401).json({
            success: false,
            message: "Please log in first."
        });
    }

    db.get(
        "SELECT id, username, email, bio, profile_pic FROM users WHERE id = ?",
        [req.session.userId],
        (err, user) => {
            if (err) {
                return res.status(500).json({
                    success: false,
                    message: "Could not fetch profile."
                });
            }

            if (!user) {
                return res.status(404).json({
                    success: false,
                    message: "User not found."
                });
            }

            res.json({
                success: true,
                user
            });
        }
    );
});



// ==================================
// UPDATE USER PROFILE
// ==================================

app.put("/api/me", requireAuth, (req, res) => {
    const { username, bio } = req.body;
    const userId = req.session.userId;

    if (!username || !username.trim()) {
        return res.status(400).json({
            success: false,
            message: "Username is required."
        });
    }

    const cleanUsername = username.trim();
    const cleanBio = (bio || "").trim();

    if (!/^[a-zA-Z0-9_]{3,20}$/.test(cleanUsername)) {
        return res.status(400).json({
            success: false,
            message: "Username must be 3-20 characters."
        });
    }

    if (cleanBio.length > 160) {
        return res.status(400).json({
            success: false,
            message: "Bio cannot exceed 160 characters."
        });
    }

    db.get(
        "SELECT id FROM users WHERE username = ? AND id != ?",
        [cleanUsername, userId],
        (err, existingUser) => {
            if (err) {
                return res.status(500).json({
                    success: false,
                    message: "Database error."
                });
            }

            if (existingUser) {
                return res.status(409).json({
                    success: false,
                    message: "Username is already taken."
                });
            }

            db.run(
                `UPDATE users
                 SET username = ?, bio = ?
                 WHERE id = ?`,
                [cleanUsername, cleanBio, userId],
                function(err) {
                    if (err) {
                        return res.status(500).json({
                            success: false,
                            message: "Could not update profile."
                        });
                    }

                    db.get(
                        `SELECT id, username, email, bio, profile_pic
                         FROM users WHERE id = ?`,
                        [userId],
                        (err, user) => {
                            if (err) {
                                return res.status(500).json({
                                    success: false,
                                    message: "Could not fetch updated profile."
                                });
                            }

                            res.json({
                                success: true,
                                message: "Profile updated successfully!",
                                user
                            });
                        }
                    );
                }
            );
        }
    );
});


// Logout
app.post("/api/logout", (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return res.status(500).json({
                success: false,
                message: "Logout failed."
            });
        }

        res.clearCookie("connect.sid");

        res.json({
            success: true,
            message: "Logged out successfully!"
        });
    });
});



// ===============================
// AUTHENTICATION MIDDLEWARE
// ===============================

function requireAuth(req, res, next) {
    if (!req.session.userId) {
        return res.status(401).json({
            success: false,
            message: "Please log in first."
        });
    }

    next();
}

// ==================================
// NOTIFICATION APIs
// ==================================


// ==================================
// CREATE AND SEND NOTIFICATION
// ==================================

function createNotification(
    recipientId,
    actorId,
    type,
    message,
    entityType = null,
    entityId = null
) {
    if (!recipientId || !actorId || recipientId === actorId) {
        return;
    }

    db.run(
        `INSERT INTO notifications
         (recipient_id, actor_id, type, message, entity_type, entity_id)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [recipientId, actorId, type, message, entityType, entityId],
        function(err) {
            if (err) {
                console.error("Create notification error:", err.message);
                return;
            }

            const notificationId = this.lastID;

            db.get(
                `SELECT
                    notifications.id,
                    notifications.type,
                    notifications.message,
                    notifications.entity_type,
                    notifications.entity_id,
                    notifications.is_read,
                    notifications.created_at,
                    users.id AS actor_id,
                    users.username AS actor_username,
                    users.profile_pic AS actor_profile_pic
                 FROM notifications
                 JOIN users ON users.id = notifications.actor_id
                 WHERE notifications.id = ?`,
                [notificationId],
                (fetchError, notification) => {
                    if (fetchError || !notification) {
                        console.error("Could not fetch new notification.");
                        return;
                    }

                    io.to(`user-${recipientId}`).emit(
                        "new_notification",
                        notification
                    );
                }
            );
        }
    );
}



// GET NOTIFICATIONS
app.get("/api/notifications", requireAuth, (req, res) => {
    const userId = req.session.userId;

    db.all(
        `SELECT
            notifications.id,
            notifications.type,
            notifications.message,
            notifications.entity_type,
            notifications.entity_id,
            notifications.is_read,
            notifications.created_at,
            users.id AS actor_id,
            users.username AS actor_username,
            users.profile_pic AS actor_profile_pic
         FROM notifications
         JOIN users ON users.id = notifications.actor_id
         WHERE notifications.recipient_id = ?
         ORDER BY notifications.created_at DESC, notifications.id DESC
         LIMIT 50`,
        [userId],
        (err, notifications) => {
            if (err) {
                console.error("Notifications error:", err.message);

                return res.status(500).json({
                    success: false,
                    message: "Could not load notifications."
                });
            }

            db.get(
                `SELECT COUNT(*) AS unread_count
                 FROM notifications
                 WHERE recipient_id = ?
                 AND is_read = 0`,
                [userId],
                (countError, result) => {
                    if (countError) {
                        return res.status(500).json({
                            success: false,
                            message: "Could not load unread count."
                        });
                    }

                    res.json({
                        success: true,
                        notifications,
                        unreadCount: result.unread_count
                    });
                }
            );
        }
    );
});


// MARK ONE NOTIFICATION AS READ
app.patch("/api/notifications/:id/read", requireAuth, (req, res) => {
    const notificationId = Number(req.params.id);
    const userId = req.session.userId;

    if (!Number.isSafeInteger(notificationId) || notificationId <= 0) {
        return res.status(400).json({
            success: false,
            message: "Invalid notification ID."
        });
    }

    db.run(
        `UPDATE notifications
         SET is_read = 1
         WHERE id = ? AND recipient_id = ?`,
        [notificationId, userId],
        function(err) {
            if (err) {
                return res.status(500).json({
                    success: false,
                    message: "Could not update notification."
                });
            }

            res.json({
                success: true,
                message: "Notification marked as read."
            });
        }
    );
});


// MARK ALL NOTIFICATIONS AS READ
app.patch("/api/notifications/read-all", requireAuth, (req, res) => {
    const userId = req.session.userId;

    db.run(
        `UPDATE notifications
         SET is_read = 1
         WHERE recipient_id = ? AND is_read = 0`,
        [userId],
        function(err) {
            if (err) {
                return res.status(500).json({
                    success: false,
                    message: "Could not mark notifications as read."
                });
            }

            res.json({
                success: true,
                message: "All notifications marked as read."
            });
        }
    );
});


// ===============================
// PROFILE PICTURE UPLOAD
// ===============================

const uploadDirectory = path.join(__dirname, "public", "uploads");

// Remove expired stories and their uploaded images
function cleanupExpiredStories() {
    db.all(
        "SELECT id, image FROM stories WHERE expires_at <= CURRENT_TIMESTAMP",
        [],
        (err, stories) => {
            if (err) {
                console.error("Story cleanup error:", err.message);
                return;
            }

            stories.forEach((story) => {
                db.run(
                    "DELETE FROM stories WHERE id = ?",
                    [story.id],
                    (deleteError) => {
                        if (deleteError) {
                            console.error("Could not delete expired story:", deleteError.message);
                            return;
                        }

                        if (story.image && story.image.startsWith("/uploads/")) {
                            const filename = path.basename(story.image);
                            const imagePath = path.join(uploadDirectory, filename);

                            fs.unlink(imagePath, (fileError) => {
                                if (fileError && fileError.code !== "ENOENT") {
                                    console.error("Could not delete story image:", fileError.message);
                                }
                            });
                        }
                    }
                );
            });
        }
    );
}

if (!fs.existsSync(uploadDirectory)) {
    fs.mkdirSync(uploadDirectory, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDirectory);
    },

    filename: (req, file, cb) => {
        const extension = path.extname(file.originalname).toLowerCase();
        cb(null, `profile-${req.session.userId}-${crypto.randomUUID()}${extension}`);
    }
});

const upload = multer({
    storage,
    limits: {
        fileSize: 2 * 1024 * 1024
    },
    fileFilter: (req, file, cb) => {
        const allowedTypes = ["image/jpeg", "image/png", "image/webp"];

        if (!allowedTypes.includes(file.mimetype)) {
            return cb(new Error("Only JPG, PNG and WEBP images are allowed."));
        }

        cb(null, true);
    }
});

// ==================================
// POST IMAGE UPLOAD CONFIGURATION
// ==================================

const postImageStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDirectory);
    },

    filename: (req, file, cb) => {
        const extension = path.extname(file.originalname).toLowerCase();

        cb(
            null,
            `post-${req.session.userId}-${crypto.randomUUID()}${extension}`
        );
    }
});

const postImageUpload = multer({
    storage: postImageStorage,

    limits: {
        fileSize: 5 * 1024 * 1024
    },

    fileFilter: (req, file, cb) => {
        const allowedTypes = [
            "image/jpeg",
            "image/png",
            "image/webp"
        ];

        if (!allowedTypes.includes(file.mimetype)) {
            return cb(
                new Error("Only JPG, PNG and WEBP images are allowed.")
            );
        }

        cb(null, true);
    }
});


// ==================================
// STORY IMAGE UPLOAD CONFIGURATION
// ==================================

const storyImageStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDirectory);
    },

    filename: (req, file, cb) => {
        const extension = path.extname(file.originalname).toLowerCase();

        cb(
            null,
            `story-${req.session.userId}-${crypto.randomUUID()}${extension}`
        );
    }
});

const storyImageUpload = multer({
    storage: storyImageStorage,

    limits: {
        fileSize: 5 * 1024 * 1024
    },

    fileFilter: (req, file, cb) => {
        const allowedTypes = [
            "image/jpeg",
            "image/png",
            "image/webp"
        ];

        if (!allowedTypes.includes(file.mimetype)) {
            return cb(
                new Error("Only JPG, PNG and WEBP images are allowed.")
            );
        }

        cb(null, true);
    }
});


// ==================================
// CREATE A NEW STORY
// ==================================

app.post("/api/stories", requireAuth, (req, res) => {
    storyImageUpload.single("storyImage")(req, res, (uploadError) => {

        if (uploadError) {
            return res.status(400).json({
                success: false,
                message: uploadError.code === "LIMIT_FILE_SIZE"
                    ? "Story image must be smaller than 5 MB."
                    : uploadError.message
            });
        }

        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: "Please select an image for your story."
            });
        }

        const caption = (req.body.caption || "").trim();

        if (caption.length > 150) {
            fs.unlink(req.file.path, () => {});

            return res.status(400).json({
                success: false,
                message: "Story caption cannot exceed 150 characters."
            });
        }

        const imagePath = `/uploads/${req.file.filename}`;

        db.run(
            `INSERT INTO stories (user_id, image, caption, expires_at)
             VALUES (?, ?, ?, datetime('now', '+24 hours'))`,
            [req.session.userId, imagePath, caption],
            function (dbError) {

                if (dbError) {
                    fs.unlink(req.file.path, () => {});

                    console.error("Create story error:", dbError.message);

                    return res.status(500).json({
                        success: false,
                        message: "Could not publish story."
                    });
                }

                res.status(201).json({
                    success: true,
                    message: "Story published successfully!",
                    storyId: this.lastID,
                    image: imagePath
                });
            }
        );
    });
});

// ==================================
// GET ALL ACTIVE STORIES
// ==================================

app.get("/api/stories", requireAuth, (req, res) => {
    const currentUserId = req.session.userId;

    db.all(
        `SELECT
            stories.id,
            stories.user_id,
            stories.image,
            stories.caption,
            stories.created_at,
            stories.expires_at,
            (
    SELECT COUNT(*)
    FROM story_views
    WHERE story_views.story_id = stories.id
) AS view_count,
            users.username,
            users.profile_pic
         FROM stories
         JOIN users ON users.id = stories.user_id
         WHERE stories.expires_at > CURRENT_TIMESTAMP
         ORDER BY stories.created_at DESC`,
        [],
        (err, stories) => {
            if (err) {
                console.error("Fetch stories error:", err.message);

                return res.status(500).json({
                    success: false,
                    message: "Could not load stories."
                });
            }

            res.json({
                success: true,
                stories
            });
        }
    );
});


// ==================================
// RECORD A STORY VIEW
// ==================================

app.post("/api/stories/:id/view", requireAuth, (req, res) => {
    const storyId = Number(req.params.id);
    const viewerId = Number(req.session.userId);

    if (!Number.isSafeInteger(storyId) || storyId <= 0) {
        return res.status(400).json({
            success: false,
            message: "Invalid story ID."
        });
    }

    db.get(
        `SELECT id, user_id
         FROM stories
         WHERE id = ?
         AND expires_at > CURRENT_TIMESTAMP`,
        [storyId],
        (err, story) => {
            if (err) {
                console.error("Story view lookup error:", err.message);

                return res.status(500).json({
                    success: false,
                    message: "Could not record story view."
                });
            }

            if (!story) {
                return res.status(404).json({
                    success: false,
                    message: "Story not found or expired."
                });
            }

            // Do not count the story owner's own view
            if (Number(story.user_id) === viewerId) {
                return res.json({
                    success: true,
                    recorded: false,
                    message: "Your own view is not counted."
                });
            }

            db.run(
                `INSERT OR IGNORE INTO story_views
                 (story_id, viewer_id)
                 VALUES (?, ?)`,
                [storyId, viewerId],
                function (insertError) {
                    if (insertError) {
                        console.error(
                            "Story view insert error:",
                            insertError.message
                        );

                        return res.status(500).json({
                            success: false,
                            message: "Could not save story view."
                        });
                    }

                   
const recorded = this.changes > 0;

db.get(
    `SELECT COUNT(*) AS totalViews
     FROM story_views
     WHERE story_id = ?`,
    [storyId],
    (countError, row) => {
        if (countError) {
            console.error("Story view count error:", countError.message);
        }

        const totalViews = row ? row.totalViews : 0;

        // Notify the story owner only when a new unique view is recorded
        if (recorded) {
            io.to(`story-owner-${Number(story.user_id)}`).emit(
                "story_view_updated",
                {
                    storyId,
                    totalViews
                }
            );
        }

        res.json({
            success: true,
            recorded,
            totalViews,
            message: "Story view recorded."
        });
    }
);

                }
            );
        }
    );
});



// ==================================
// GET STORY VIEWERS (OWNER ONLY)
// ==================================

app.get("/api/stories/:id/views", requireAuth, (req, res) => {
    const storyId = Number(req.params.id);
    const currentUserId = Number(req.session.userId);

    if (!Number.isSafeInteger(storyId) || storyId <= 0) {
        return res.status(400).json({
            success: false,
            message: "Invalid story ID."
        });
    }

    db.get(
        `SELECT id, user_id
         FROM stories
         WHERE id = ?`,
        [storyId],
        (err, story) => {
            if (err) {
                console.error("Story lookup error:", err.message);

                return res.status(500).json({
                    success: false,
                    message: "Could not fetch story."
                });
            }

            if (!story) {
                return res.status(404).json({
                    success: false,
                    message: "Story not found."
                });
            }

            // Only the story owner can see its viewers
            if (Number(story.user_id) !== currentUserId) {
                return res.status(403).json({
                    success: false,
                    message: "You cannot view this story's viewers."
                });
            }

            db.all(
                `SELECT
                    users.id,
                    users.username,
                    users.profile_pic,
                    story_views.viewed_at
                 FROM story_views
                 JOIN users ON users.id = story_views.viewer_id
                 WHERE story_views.story_id = ?
                 ORDER BY story_views.viewed_at DESC`,
                [storyId],
                (viewError, viewers) => {
                    if (viewError) {
                        console.error(
                            "Fetch story viewers error:",
                            viewError.message
                        );

                        return res.status(500).json({
                            success: false,
                            message: "Could not fetch story viewers."
                        });
                    }

                    res.json({
                        success: true,
                        totalViews: viewers.length,
                        viewers
                    });
                }
            );
        }
    );
});



 // ==================================
 // REPLY TO A STORY
 // ==================================

app.post("/api/stories/:id/replies", requireAuth, (req, res) => {
    const storyId = Number(req.params.id);
    const userId = Number(req.session.userId);
    const content = (req.body.content || "").trim();

    if (!Number.isSafeInteger(storyId) || storyId <= 0) {
        return res.status(400).json({
            success: false,
            message: "Invalid story ID."
        });
    }

    if (!content || content.length > 500) {
        return res.status(400).json({
            success: false,
            message: "Reply must contain 1-500 characters."
        });
    }

    db.get(
        `SELECT id, user_id
         FROM stories
         WHERE id = ?
         AND expires_at > CURRENT_TIMESTAMP`,
        [storyId],
        (storyError, story) => {
            if (storyError) {
                return res.status(500).json({
                    success: false,
                    message: "Could not find story."
                });
            }

            if (!story) {
                return res.status(404).json({
                    success: false,
                    message: "Story not found or expired."
                });
            }

            if (Number(story.user_id) === userId) {
                return res.status(400).json({
                    success: false,
                    message: "You cannot reply to your own story."
                });
            }

            db.run(
                `INSERT INTO story_replies
                 (story_id, user_id, content)
                 VALUES (?, ?, ?)`,
                [storyId, userId, content],
                function (insertError) {
                    if (insertError) {
                        console.error(
                            "Story reply error:",
                            insertError.message
                        );

                        return res.status(500).json({
                            success: false,
                            message: "Could not send story reply."
                        });
                    }

                    createNotification(
                        Number(story.user_id),
                        userId,
                        "story_reply",
                        "replied to your story",
                        "story",
                        storyId
                    );

                    res.status(201).json({
                        success: true,
                        message: "Story reply sent!",
                        replyId: this.lastID
                    });
                }
            );
        }
    );
});



// ==================================
// GET REPLIES FOR YOUR OWN STORY
// ==================================

app.get("/api/stories/:id/replies", requireAuth, (req, res) => {
    const storyId = Number(req.params.id);
    const userId = Number(req.session.userId);

    if (!Number.isSafeInteger(storyId) || storyId <= 0) {
        return res.status(400).json({
            success: false,
            message: "Invalid story ID."
        });
    }

    db.get(
        `SELECT id, user_id
         FROM stories
         WHERE id = ?`,
        [storyId],
        (storyError, story) => {
            if (storyError) {
                return res.status(500).json({
                    success: false,
                    message: "Could not find story."
                });
            }

            if (!story) {
                return res.status(404).json({
                    success: false,
                    message: "Story not found."
                });
            }

            if (Number(story.user_id) !== userId) {
                return res.status(403).json({
                    success: false,
                    message: "Only the story owner can view replies."
                });
            }

            db.all(
                `SELECT
                    story_replies.id,
                    story_replies.content,
                    story_replies.created_at,
                    users.id AS user_id,
                    users.username,
                    users.profile_pic
                 FROM story_replies
                 JOIN users
                    ON users.id = story_replies.user_id
                 WHERE story_replies.story_id = ?
                 ORDER BY story_replies.created_at DESC`,
                [storyId],
                (replyError, replies) => {
                    if (replyError) {
                        return res.status(500).json({
                            success: false,
                            message: "Could not load story replies."
                        });
                    }

                    res.json({
                        success: true,
                        replies
                    });
                }
            );
        }
    );
});



app.post(
    "/api/me/profile-picture",
    requireAuth,
    (req, res) => {
        upload.single("profilePicture")(req, res, (err) => {
            if (err) {
                return res.status(400).json({
                    success: false,
                    message: err.code === "LIMIT_FILE_SIZE"
                        ? "Image must be smaller than 2 MB."
                        : err.message
                });
            }

            if (!req.file) {
                return res.status(400).json({
                    success: false,
                    message: "Please select an image."
                });
            }

            const imagePath = `/uploads/${req.file.filename}`;

            db.run(
                "UPDATE users SET profile_pic = ? WHERE id = ?",
                [imagePath, req.session.userId],
                function (dbError) {
                    if (dbError) {
                        fs.unlink(req.file.path, () => {});

                        return res.status(500).json({
                            success: false,
                            message: "Could not save profile picture."
                        });
                    }

                    res.json({
                        success: true,
                        message: "Profile picture updated successfully!",
                        profile_pic: imagePath
                    });
                }
            );
        });
    }
);



// ==================================
// CREATE TEXT OR IMAGE POST
// ==================================

app.post("/api/posts", requireAuth, (req, res) => {

    postImageUpload.single("postImage")(req, res, (uploadError) => {

        if (uploadError) {
            return res.status(400).json({
                success: false,
                message: uploadError.code === "LIMIT_FILE_SIZE"
                    ? "Image must be smaller than 5 MB."
                    : uploadError.message
            });
        }

        const content = (req.body.content || "").trim();

        const imagePath = req.file
            ? `/uploads/${req.file.filename}`
            : "";

        if (!content && !imagePath) {
            return res.status(400).json({
                success: false,
                message: "Write something or select an image."
            });
        }

        if (content.length > 2000) {
            if (req.file) {
                fs.unlink(req.file.path, () => {});
            }

            return res.status(400).json({
                success: false,
                message: "Post cannot exceed 2000 characters."
            });
        }

        db.run(
            `INSERT INTO posts (user_id, content, image)
             VALUES (?, ?, ?)`,

            [req.session.userId, content, imagePath],

            function (err) {

                if (err) {
                    if (req.file) {
                        fs.unlink(req.file.path, () => {});
                    }

                    console.error("Create post error:", err.message);

                    return res.status(500).json({
                        success: false,
                        message: "Could not create post."
                    });
                }

                res.status(201).json({
                    success: true,
                    message: "Post published successfully!",
                    postId: this.lastID,
                    image: imagePath
                });
            }
        );
    });
});

// ===============================
// GET ALL POSTS
// ===============================

app.get("/api/posts", requireAuth, (req, res) => {
    const currentUserId = req.session.userId;

    const sql = `
        SELECT
            posts.id,
            posts.content,
            posts.image,
            posts.created_at,
            users.id AS user_id,
            users.username,
            users.profile_pic,
            (SELECT COUNT(*) FROM likes
                WHERE likes.post_id = posts.id) AS like_count,
            (SELECT COUNT(*) FROM comments
                WHERE comments.post_id = posts.id) AS comment_count,
            EXISTS(
                SELECT 1 FROM likes
                WHERE likes.post_id = posts.id
                AND likes.user_id = ?
            ) AS liked_by_me,
EXISTS(
    SELECT 1 FROM saved_posts
    WHERE saved_posts.post_id = posts.id
    AND saved_posts.user_id = ?
) AS saved_by_me
        FROM posts
        JOIN users ON posts.user_id = users.id
        ORDER BY posts.created_at DESC
    `;

    db.all(sql, [currentUserId, currentUserId], (err, posts) => {
        if (err) {
            return res.status(500).json({
                success: false,
                message: "Could not load posts."
            });
        }

        res.json({
            success: true,
            posts
        });
    });
});




// ==================================
// EDIT AND DELETE POSTS
// ==================================

// Safely remove only uploaded post images.
// This does not delete profile pictures or unrelated files.
function removePostImageFile(imagePath) {
    if (!imagePath || !imagePath.startsWith("/uploads/")) {
        return;
    }

    const filename = path.basename(imagePath);

    if (!filename.startsWith("post-")) {
        return;
    }

    const imageFilePath = path.join(uploadDirectory, filename);

    fs.unlink(imageFilePath, (err) => {
        if (err && err.code !== "ENOENT") {
            console.error("Could not remove post image:", err.message);
        }
    });
}


// EDIT AN EXISTING POST
app.put("/api/posts/:id", requireAuth, (req, res) => {

    const postId = Number(req.params.id);
    const userId = req.session.userId;

    if (!Number.isSafeInteger(postId) || postId <= 0) {
        return res.status(400).json({
            success: false,
            message: "Invalid post ID."
        });
    }

    postImageUpload.single("postImage")(req, res, (uploadError) => {

        if (uploadError) {
            return res.status(400).json({
                success: false,
                message: uploadError.code === "LIMIT_FILE_SIZE"
                    ? "Image must be smaller than 5 MB."
                    : uploadError.message
            });
        }

        const content = (req.body.content || "").trim();
        const removeImage = req.body.removeImage === "true";

      

        const discardNewImage = () => {
            if (req.file) {
                fs.unlink(req.file.path, () => {});
            }
        };

        if (content.length > 2000) {
            discardNewImage();

            return res.status(400).json({
                success: false,
                message: "Post cannot exceed 2000 characters."
            });
        }

        db.get(
            "SELECT id, user_id, image FROM posts WHERE id = ?",
            [postId],
            (err, post) => {

                if (err) {
                    discardNewImage();

                    return res.status(500).json({
                        success: false,
                        message: "Could not find post."
                    });
                }

                if (!post) {
                    discardNewImage();

                    return res.status(404).json({
                        success: false,
                        message: "Post not found."
                    });
                }

                if (post.user_id !== userId) {
                    discardNewImage();

                    return res.status(403).json({
                        success: false,
                        message: "You can only edit your own posts."
                    });
                }

                const newImagePath = req.file
                    ? `/uploads/${req.file.filename}`
                    : removeImage
                        ? ""
                        : post.image;

                if (!content && !newImagePath) {
                    discardNewImage();

                    return res.status(400).json({
                        success: false,
                        message: "A post must contain text or an image."
                    });
                }

                db.run(
                    `UPDATE posts
                     SET content = ?, image = ?
                     WHERE id = ? AND user_id = ?`,
                    [content, newImagePath, postId, userId],
                    function (updateError) {

                        if (updateError) {
                            discardNewImage();

                            return res.status(500).json({
                                success: false,
                                message: "Could not update post."
                            });
                        }

                        // Remove the old image only after the update succeeds.
                        if (req.file || removeImage) {
                            removePostImageFile(post.image);
                        }

                        res.json({
                            success: true,
                            message: "Post updated successfully!",
                            post: {
                                id: postId,
                                content,
                                image: newImagePath
                            }
                        });
                    }
                );
            }
        );
    });
});


// DELETE AN EXISTING POST
app.delete("/api/posts/:id", requireAuth, (req, res) => {

    const postId = Number(req.params.id);
    const userId = req.session.userId;

    if (!Number.isSafeInteger(postId) || postId <= 0) {
        return res.status(400).json({
            success: false,
            message: "Invalid post ID."
        });
    }

    db.get(
        "SELECT id, user_id, image FROM posts WHERE id = ?",
        [postId],
        (err, post) => {

            if (err) {
                return res.status(500).json({
                    success: false,
                    message: "Could not find post."
                });
            }

            if (!post) {
                return res.status(404).json({
                    success: false,
                    message: "Post not found."
                });
            }

            if (post.user_id !== userId) {
                return res.status(403).json({
                    success: false,
                    message: "You can only delete your own posts."
                });
            }

            db.run(
                "DELETE FROM posts WHERE id = ? AND user_id = ?",
                [postId, userId],
                function (deleteError) {

                    if (deleteError) {
                        return res.status(500).json({
                            success: false,
                            message: "Could not delete post."
                        });
                    }

                    if (this.changes === 0) {
                        return res.status(404).json({
                            success: false,
                            message: "Post not found."
                        });
                    }

                    // The database cascades deletion of likes and comments.
                    // Remove the associated uploaded image as well.
                    removePostImageFile(post.image);

                    res.json({
                        success: true,
                        message: "Post deleted successfully!"
                    });
                }
            );
        }
    );
});


// SAVE A POST
app.post("/api/posts/:id/save", requireAuth, (req, res) => {
    const postId = Number(req.params.id);
    const userId = req.session.userId;

    if (!Number.isInteger(postId) || postId <= 0) {
        return res.status(400).json({
            success: false,
            message: "Invalid post ID"
        });
    }

    db.get(
        "SELECT id FROM posts WHERE id = ?",
        [postId],
        (err, post) => {
            if (err) {
                return res.status(500).json({
                    success: false,
                    message: "Database error"
                });
            }

            if (!post) {
                return res.status(404).json({
                    success: false,
                    message: "Post not found"
                });
            }

            db.run(
                `INSERT OR IGNORE INTO saved_posts (post_id, user_id)
                 VALUES (?, ?)`,
                [postId, userId],
                function (err) {
                    if (err) {
                        return res.status(500).json({
                            success: false,
                            message: "Could not save post"
                        });
                    }

                    res.json({
                        success: true,
                        saved: true,
                        message: "Post saved successfully"
                    });
                }
            );
        }
    );
});


// UNSAVE A POST
app.delete("/api/posts/:id/save", requireAuth, (req, res) => {
    const postId = Number(req.params.id);
    const userId = req.session.userId;

    if (!Number.isInteger(postId) || postId <= 0) {
        return res.status(400).json({
            success: false,
            message: "Invalid post ID"
        });
    }

    db.run(
        "DELETE FROM saved_posts WHERE post_id = ? AND user_id = ?",
        [postId, userId],
        function (err) {
            if (err) {
                return res.status(500).json({
                    success: false,
                    message: "Could not unsave post"
                });
            }

            res.json({
                success: true,
                saved: false,
                message: "Post removed from saved posts"
            });
        }
    );
});


 // GET SAVED POSTS
app.get("/api/saved-posts", requireAuth, (req, res) => {
    const currentUserId = req.session.userId;

    const sql = `
        SELECT
            posts.id,
            posts.content,
            posts.image,
            posts.created_at,
            users.id AS user_id,
            users.username,
            users.profile_pic,
            (SELECT COUNT(*) FROM likes
                WHERE likes.post_id = posts.id) AS like_count,
            (SELECT COUNT(*) FROM comments
                WHERE comments.post_id = posts.id) AS comment_count,
            EXISTS(
                SELECT 1 FROM likes
                WHERE likes.post_id = posts.id
                AND likes.user_id = ?
            ) AS liked_by_me,
            1 AS saved_by_me
        FROM saved_posts
        JOIN posts ON saved_posts.post_id = posts.id
        JOIN users ON posts.user_id = users.id
        WHERE saved_posts.user_id = ?
        ORDER BY saved_posts.saved_at DESC
    `;

    db.all(sql, [currentUserId, currentUserId], (err, posts) => {
        if (err) {
            console.error("Saved posts error:", err);
            return res.status(500).json({
                success: false,
                message: "Could not load saved posts"
            });
        }

        res.json({
            success: true,
            posts
        });
    });
});


// ===============================
// LIKE / UNLIKE POSTS
// ===============================

app.post("/api/posts/:id/like", requireAuth, (req, res) => {
    const postId = Number(req.params.id);
    const userId = req.session.userId;

    if (!Number.isSafeInteger(postId) || postId <= 0) {
        return res.status(400).json({
            success: false,
            message: "Invalid post ID."
        });
    }

    db.get(
        "SELECT id, user_id FROM posts WHERE id = ?",
        [postId],
        (err, post) => {
            if (err) {
                return res.status(500).json({
                    success: false,
                    message: "Database error."
                });
            }

            if (!post) {
                return res.status(404).json({
                    success: false,
                    message: "Post not found."
                });
            }

            db.get(
                "SELECT id FROM likes WHERE post_id = ? AND user_id = ?",
                [postId, userId],
                (err, existingLike) => {
                    if (err) {
                        return res.status(500).json({
                            success: false,
                            message: "Could not check like."
                        });
                    }

                    if (existingLike) {
                        db.run(
                            "DELETE FROM likes WHERE post_id = ? AND user_id = ?",
                            [postId, userId],
                            (err) => {
                                if (err) {
                                    return res.status(500).json({
                                        success: false,
                                        message: "Could not unlike post."
                                    });
                                }

                                res.json({
                                    success: true,
                                    liked: false,
                                    message: "Post unliked."
                                });
                            }
                        );
                    } else {
                        db.run(
                            "INSERT INTO likes (post_id, user_id) VALUES (?, ?)",
                            [postId, userId],
                            (err) => {
                                if (err) {
                                    return res.status(500).json({
                                        success: false,
                                        message: "Could not like post."
                                    });
                                }

                                                               // Notify the owner of the liked post
                                createNotification(
                                    post.user_id,
                                    userId,
                                    "like",
                                    "liked your post",
                                    "post",
                                    postId
                                );

                                res.json({
                                    success: true,
                                    liked: true,
                                    message: "Post liked!"
                                });
                            }
                        );
                    }
                }
            );
        }
    );
});



// ===============================
// ADD COMMENT
// ===============================

app.post("/api/posts/:id/comments", requireAuth, (req, res) => {
    const postId = Number(req.params.id);
    const userId = req.session.userId;
    const { content } = req.body;

    if (!Number.isSafeInteger(postId) || postId <= 0) {
        return res.status(400).json({
            success: false,
            message: "Invalid post ID."
        });
    }

    if (!content || !content.trim() || content.trim().length > 500) {
        return res.status(400).json({
            success: false,
            message: "Comment must contain 1-500 characters."
        });
    }

    db.run(
        `INSERT INTO comments (post_id, user_id, content)
         SELECT ?, ?, ?
         WHERE EXISTS (SELECT 1 FROM posts WHERE id = ?)`,
        [postId, userId, content.trim(), postId],
        function(err) {
            if (err) {
                return res.status(500).json({
                    success: false,
                    message: "Could not add comment."
                });
            }

            if (this.changes === 0) {
                return res.status(404).json({
                    success: false,
                    message: "Post not found."
                });
            }

                       const commentId = this.lastID;

            // Find the owner of the post
            db.get(
                "SELECT user_id FROM posts WHERE id = ?",
                [postId],
                (postError, post) => {
                    if (postError) {
                        console.error(
                            "Comment notification lookup error:",
                            postError.message
                        );
                    } else if (post) {
                        createNotification(
                            post.user_id,
                            userId,
                            "comment",
                            "commented on your post",
                            "post",
                            postId
                        );
                    }

                    res.status(201).json({
                        success: true,
                        message: "Comment added successfully!",
                        commentId
                    });
                }
            );
        }
    );
});


// ===============================
// GET COMMENTS
// ===============================

app.get("/api/posts/:id/comments", requireAuth, (req, res) => {
    const postId = Number(req.params.id);

    if (!Number.isSafeInteger(postId) || postId <= 0) {
        return res.status(400).json({
            success: false,
            message: "Invalid post ID."
        });
    }

    db.all(
        `SELECT
            comments.id,
            comments.content,
            comments.created_at,
            users.id AS user_id,
            users.username,
            users.profile_pic
         FROM comments
         JOIN users ON comments.user_id = users.id
         WHERE comments.post_id = ?
         ORDER BY comments.created_at ASC`,
        [postId],
        (err, comments) => {
            if (err) {
                return res.status(500).json({
                    success: false,
                    message: "Could not load comments."
                });
            }

            res.json({
                success: true,
                comments
            });
        }
    );
});



// ==================================
// CHAT CONVERSATIONS API
// ==================================

// GET ALL CONVERSATIONS FOR LOGGED-IN USER
app.get("/api/conversations", requireAuth, (req, res) => {
    const currentUserId = req.session.userId;

    const sql = `
        SELECT
            conversations.id,
            other_user.id AS other_user_id,
            other_user.username AS other_username,
            other_user.profile_pic AS other_profile_pic,
            other_user.last_seen AS other_last_seen,
                        (
                SELECT COUNT(*)
                FROM messages
                WHERE messages.conversation_id = conversations.id
                AND messages.sender_id != ?
                AND messages.read_at IS NULL
            ) AS unread_count,
            (
                SELECT content
                FROM messages
                WHERE conversation_id = conversations.id
                ORDER BY created_at DESC, id DESC
                LIMIT 1
            ) AS last_message,
            (
                SELECT created_at
                FROM messages
                WHERE conversation_id = conversations.id
                ORDER BY created_at DESC, id DESC
                LIMIT 1
            ) AS last_message_at
        FROM conversations
        JOIN users AS other_user
            ON other_user.id = CASE
                WHEN conversations.user1_id = ?
                THEN conversations.user2_id
                ELSE conversations.user1_id
            END
        WHERE conversations.user1_id = ?
           OR conversations.user2_id = ?
        ORDER BY COALESCE(
            last_message_at,
            conversations.created_at
        ) DESC
    `;

    db.all(
        sql,
        [currentUserId, currentUserId, currentUserId, currentUserId],
        (err, conversations) => {
            if (err) {
                console.error("Conversations error:", err.message);

                return res.status(500).json({
                    success: false,
                    message: "Could not load conversations."
                });
            }

            res.json({
                success: true,
                conversations
            });
        }
    );
});




// ==================================
// GET CHAT MESSAGE HISTORY
// ==================================

app.get(
    "/api/conversations/:id/messages",
    requireAuth,
    (req, res) => {
        const conversationId = Number(req.params.id);
        const currentUserId = req.session.userId;

        if (!Number.isSafeInteger(conversationId) || conversationId <= 0) {
            return res.status(400).json({
                success: false,
                message: "Invalid conversation ID."
            });
        }

        db.get(
            `SELECT id FROM conversations
             WHERE id = ?
             AND (user1_id = ? OR user2_id = ?)`,
            [conversationId, currentUserId, currentUserId],
            (err, conversation) => {
                if (err) {
                    return res.status(500).json({
                        success: false,
                        message: "Could not verify conversation."
                    });
                }

                if (!conversation) {
                    return res.status(404).json({
                        success: false,
                        message: "Conversation not found."
                    });
                }

                db.all(
                    `SELECT
                        messages.id,
                        messages.content,
                        messages.sender_id,
                        messages.created_at,
                        messages.read_at,
                        messages.delivered_at,
                        users.username,
                        users.profile_pic
                     FROM messages
                     JOIN users ON users.id = messages.sender_id
                     WHERE messages.conversation_id = ?
                     ORDER BY messages.created_at ASC, messages.id ASC`,
                    [conversationId],
                    (messageError, messages) => {
                        if (messageError) {
                            return res.status(500).json({
                                success: false,
                                message: "Could not load messages."
                            });
                        }

                        res.json({
                            success: true,
                            messages
                        });
                    }
                );
            }
        );
    }
);



// CREATE OR OPEN A CONVERSATION
app.post("/api/conversations", requireAuth, (req, res) => {
    const currentUserId = req.session.userId;
    const otherUserId = Number(req.body.userId);

    if (!Number.isSafeInteger(otherUserId) || otherUserId <= 0) {
        return res.status(400).json({
            success: false,
            message: "Invalid user ID."
        });
    }

    if (otherUserId === currentUserId) {
        return res.status(400).json({
            success: false,
            message: "You cannot chat with yourself."
        });
    }

    const user1Id = Math.min(currentUserId, otherUserId);
    const user2Id = Math.max(currentUserId, otherUserId);

    db.get(
        "SELECT id FROM users WHERE id = ?",
        [otherUserId],
        (err, user) => {
            if (err) {
                return res.status(500).json({
                    success: false,
                    message: "Database error."
                });
            }

            if (!user) {
                return res.status(404).json({
                    success: false,
                    message: "User not found."
                });
            }

            db.run(
                `INSERT OR IGNORE INTO conversations
                 (user1_id, user2_id)
                 VALUES (?, ?)`,
                [user1Id, user2Id],
                (insertError) => {
                    if (insertError) {
                        return res.status(500).json({
                            success: false,
                            message: "Could not create conversation."
                        });
                    }

                    db.get(
                        `SELECT id FROM conversations
                         WHERE user1_id = ? AND user2_id = ?`,
                        [user1Id, user2Id],
                        (findError, conversation) => {
                            if (findError || !conversation) {
                                return res.status(500).json({
                                    success: false,
                                    message: "Could not open conversation."
                                });
                            }

                            res.json({
                                success: true,
                                conversation
                            });
                        }
                    );
                }
            );
        }
    );
});



// ==================================
// FOLLOW / UNFOLLOW SYSTEM
// ==================================

// Get other users
app.get("/api/users", requireAuth, (req, res) => {
    const currentUserId = req.session.userId;
    const search = (req.query.search || "").trim();

    const sql = `
        SELECT
            users.id,
            users.username,
            users.bio,
            users.profile_pic,
            (SELECT COUNT(*) FROM followers
                WHERE following_id = users.id) AS follower_count,
            (SELECT COUNT(*) FROM followers
                WHERE follower_id = users.id) AS following_count,
            EXISTS(
                SELECT 1 FROM followers
                WHERE follower_id = ?
                AND following_id = users.id
            ) AS is_following
        FROM users
        WHERE users.id != ?
        AND users.username LIKE ?
        ORDER BY follower_count DESC, users.username ASC
        LIMIT 20
    `;

    db.all(
        sql,
        [currentUserId, currentUserId, `%${search}%`],
        (err, users) => {
            if (err) {
                return res.status(500).json({
                    success: false,
                    message: "Could not load users."
                });
            }

            res.json({
                success: true,
                users
            });
        }
    );
});


// Follow a user
app.post("/api/users/:id/follow", requireAuth, (req, res) => {
    const targetId = Number(req.params.id);
    const currentUserId = req.session.userId;

    if (!Number.isSafeInteger(targetId) || targetId <= 0) {
        return res.status(400).json({
            success: false,
            message: "Invalid user ID."
        });
    }

    if (targetId === currentUserId) {
        return res.status(400).json({
            success: false,
            message: "You cannot follow yourself."
        });
    }

    db.get(
        "SELECT id FROM users WHERE id = ?",
        [targetId],
        (err, user) => {
            if (err) {
                return res.status(500).json({
                    success: false,
                    message: "Database error."
                });
            }

            if (!user) {
                return res.status(404).json({
                    success: false,
                    message: "User not found."
                });
            }

            db.run(
                `INSERT OR IGNORE INTO followers
                 (follower_id, following_id) VALUES (?, ?)`,
                [currentUserId, targetId],
                function(err) {
                    if (err) {
                        return res.status(500).json({
                            success: false,
                            message: "Could not follow user."
                        });
                    }

                                        // Notify the user only when a new follow is created
                    if (this.changes > 0) {
                        createNotification(
                            targetId,
                            currentUserId,
                            "follow",
                            "started following you",
                            "user",
                            currentUserId
                        );
                    }

                    res.json({
                        success: true,
                        following: true,
                        message: this.changes
                            ? "You are now following this user!"
                            : "You already follow this user."
                    });
                }
            );
        }
    );
});


// Unfollow a user
app.delete("/api/users/:id/follow", requireAuth, (req, res) => {
    const targetId = Number(req.params.id);
    const currentUserId = req.session.userId;

    if (!Number.isSafeInteger(targetId) || targetId <= 0) {
        return res.status(400).json({
            success: false,
            message: "Invalid user ID."
        });
    }

    db.run(
        `DELETE FROM followers
         WHERE follower_id = ? AND following_id = ?`,
        [currentUserId, targetId],
        function(err) {
            if (err) {
                return res.status(500).json({
                    success: false,
                    message: "Could not unfollow user."
                });
            }

            res.json({
                success: true,
                following: false,
                message: this.changes
                    ? "You unfollowed this user."
                    : "You were not following this user."
            });
        }
    );
});


// Get current user's follower statistics
app.get("/api/follow-stats", requireAuth, (req, res) => {
    const userId = req.session.userId;

    db.get(
        `SELECT
            (SELECT COUNT(*) FROM followers
             WHERE following_id = ?) AS followers,
            (SELECT COUNT(*) FROM followers
             WHERE follower_id = ?) AS following`,
        [userId, userId],
        (err, stats) => {
            if (err) {
                return res.status(500).json({
                    success: false,
                    message: "Could not load follow statistics."
                });
            }

            res.json({
                success: true,
                stats
            });
        }
    );
});


/* =========================================
   GET PUBLIC USER PROFILE AND THEIR POSTS
========================================= */

app.get("/api/users/:id/profile", requireAuth, (req, res) => {
    const profileUserId = Number(req.params.id);
    const currentUserId = req.session.userId;

    if (!Number.isSafeInteger(profileUserId) || profileUserId <= 0) {
        return res.status(400).json({
            success: false,
            message: "Invalid user ID."
        });
    }

    // Fetch public profile information and statistics
    const profileSql = `
        SELECT
            users.id,
            users.username,
            users.bio,
            users.profile_pic,
            users.created_at,

            (SELECT COUNT(*)
             FROM posts
             WHERE posts.user_id = users.id) AS post_count,

            (SELECT COUNT(*)
             FROM followers
             WHERE followers.following_id = users.id) AS follower_count,

            (SELECT COUNT(*)
             FROM followers
             WHERE followers.follower_id = users.id) AS following_count,

            EXISTS(
                SELECT 1
                FROM followers
                WHERE followers.follower_id = ?
                AND followers.following_id = users.id
            ) AS is_following

        FROM users
        WHERE users.id = ?
    `;

    db.get(
        profileSql,
        [currentUserId, profileUserId],
        (err, user) => {
            if (err) {
                console.error("Profile fetch error:", err.message);

                return res.status(500).json({
                    success: false,
                    message: "Could not load user profile."
                });
            }

            if (!user) {
                return res.status(404).json({
                    success: false,
                    message: "User profile not found."
                });
            }

            // Fetch all posts published by this user
            const postsSql = `
                SELECT
                    posts.id,
                    posts.content,
                    posts.image,
                    posts.created_at,
                    users.id AS user_id,
                    users.username,
                    users.profile_pic,

                    (SELECT COUNT(*)
                     FROM likes
                     WHERE likes.post_id = posts.id) AS like_count,

                    (SELECT COUNT(*)
                     FROM comments
                     WHERE comments.post_id = posts.id) AS comment_count,

                    EXISTS(
                        SELECT 1
                        FROM likes
                        WHERE likes.post_id = posts.id
                        AND likes.user_id = ?
                    ) AS liked_by_me

                FROM posts
                JOIN users ON posts.user_id = users.id
                WHERE posts.user_id = ?
                ORDER BY posts.created_at DESC
            `;

            db.all(
                postsSql,
                [currentUserId, profileUserId],
                (postError, posts) => {
                    if (postError) {
                        console.error("Profile posts error:", postError.message);

                        return res.status(500).json({
                            success: false,
                            message: "Could not load user posts."
                        });
                    }

                    res.json({
                        success: true,
                        user,
                        posts
                    });
                }
            );
        }
    );
});



/* =========================================
   GET USER FOLLOWERS
========================================= */

app.get("/api/users/:id/followers", requireAuth, (req, res) => {
    const profileUserId = Number(req.params.id);
    const currentUserId = req.session.userId;

    if (!Number.isSafeInteger(profileUserId) || profileUserId <= 0) {
        return res.status(400).json({
            success: false,
            message: "Invalid user ID."
        });
    }

    const sql = `
        SELECT
            users.id,
            users.username,
            users.bio,
            users.profile_pic,

            EXISTS (
                SELECT 1
                FROM followers AS f2
                WHERE f2.follower_id = ?
                AND f2.following_id = users.id
            ) AS is_following

        FROM followers
        JOIN users
            ON users.id = followers.follower_id

        WHERE followers.following_id = ?

        ORDER BY users.username ASC
    `;

    db.all(sql, [currentUserId, profileUserId], (err, users) => {
        if (err) {
            console.error("Followers API error:", err.message);

            return res.status(500).json({
                success: false,
                message: "Could not load followers."
            });
        }

        res.json({
            success: true,
            users
        });
    });
});


/* =========================================
   GET USERS FOLLOWED BY A USER
========================================= */

app.get("/api/users/:id/following", requireAuth, (req, res) => {
    const profileUserId = Number(req.params.id);
    const currentUserId = req.session.userId;

    if (!Number.isSafeInteger(profileUserId) || profileUserId <= 0) {
        return res.status(400).json({
            success: false,
            message: "Invalid user ID."
        });
    }

    const sql = `
        SELECT
            users.id,
            users.username,
            users.bio,
            users.profile_pic,

            EXISTS (
                SELECT 1
                FROM followers AS f2
                WHERE f2.follower_id = ?
                AND f2.following_id = users.id
            ) AS is_following

        FROM followers
        JOIN users
            ON users.id = followers.following_id

        WHERE followers.follower_id = ?

        ORDER BY users.username ASC
    `;

    db.all(sql, [currentUserId, profileUserId], (err, users) => {
        if (err) {
            console.error("Following API error:", err.message);

            return res.status(500).json({
                success: false,
                message: "Could not load following list."
            });
        }

        res.json({
            success: true,
            users
        });
    });
});
