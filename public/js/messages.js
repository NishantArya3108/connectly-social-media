
// ==========================================
// CONNECTLY - REAL-TIME MESSAGING
// ==========================================

// DOM ELEMENTS
const conversationList = document.getElementById("conversationList");
const conversationSearch = document.getElementById("conversationSearch");

const chatPlaceholder = document.getElementById("chatPlaceholder");
const activeChat = document.getElementById("activeChat");

let chatUserAvatar = document.getElementById("chatUserAvatar");
const chatUsername = document.getElementById("chatUsername");

// Typing indicator element
const typingIndicator = document.createElement("p");
typingIndicator.id = "typingIndicator";
typingIndicator.className = "typing-indicator";
typingIndicator.textContent = "";
typingIndicator.hidden = true;

chatUsername.insertAdjacentElement("afterend", typingIndicator);


const messageList = document.getElementById("messageList");
const messageForm = document.getElementById("messageForm");
const messageInput = document.getElementById("messageInput");

// STATE
let conversations = [];
let activeConversationId = null;
let activeConversation = null;

// SOCKET.IO CONNECTION
const socket = io();

// ==================================
// LIVE STORY VIEW UPDATES
// ==================================

socket.on("story_view_updated", (data) => {
    const storyItems = document.querySelectorAll(".story-item");

    storyItems.forEach((item) => {
        const countElement = item.querySelector(".story-view-count");

        if (
            countElement &&
            item.dataset.storyId === String(data.storyId)
        ) {
            countElement.textContent = `👁 ${data.totalViews} views`;
        }
    });
});

// Store currently online users
let onlineUserIds = new Set();

// Receive the current online users
socket.on("online_users", (data) => {
    onlineUserIds = new Set(
        (data.userIds || []).map(Number)
    );

    renderConversations(conversations);
});

// Receive live online/offline updates
socket.on("user_status", (data) => {
    const userId = Number(data.userId);

    if (data.isOnline) {
        onlineUserIds.add(userId);
    } else {
        onlineUserIds.delete(userId);
    }

    renderConversations(conversations);
});

// ==========================================
// HELPER: PROFILE IMAGE URL
// ==========================================


function createAvatar(username, imagePath, className) {
    const avatar = document.createElement("div");
    avatar.className = className;

    avatar.textContent = username
        ? username.charAt(0).toUpperCase()
        : "U";

    if (imagePath) {
        const image = document.createElement("img");

        image.src = (
            imagePath.startsWith("http://") ||
            imagePath.startsWith("https://") ||
            imagePath.startsWith("/")
        ) ? imagePath : `/${imagePath}`;

        image.alt = username || "User";
        image.className = "avatar-photo";

        image.addEventListener("error", () => {
            image.remove();
        }, { once: true });

        avatar.appendChild(image);
    }

    return avatar;
}

// ==========================================
// FORMAT LAST SEEN TIME
// ==========================================

function formatLastSeen(dateValue) {
    if (!dateValue) {
        return "Last seen recently";
    }

    const date = new Date(
        dateValue.includes(" ")
            ? dateValue.replace(" ", "T") + "Z"
            : dateValue
    );

    if (Number.isNaN(date.getTime())) {
        return "Last seen recently";
    }

    return `Last seen ${date.toLocaleString([], {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit"
    })}`;
}

// Update the active chat's Online / Last Seen text
function updateChatLastSeen(conversation) {
    const statusElement = document.getElementById("chatLastSeen");

    if (!statusElement) return;

    const isOnline = onlineUserIds.has(
        Number(conversation.other_user_id)
    );

    statusElement.textContent = isOnline
        ? "Online"
        : formatLastSeen(conversation.other_last_seen);

    statusElement.classList.toggle("online", isOnline);
}


// ==========================================
// HELPER: CREATE ELEMENT
// ==========================================

function createElement(tag, className, text) {
    const element = document.createElement(tag);

    if (className) {
        element.className = className;
    }

    if (text !== undefined) {
        element.textContent = text;
    }

    return element;
}

// ==========================================
// LOAD ALL CONVERSATIONS
// ==========================================

async function loadConversations() {
    conversationList.replaceChildren(
        createElement("p", "empty-conversations", "Loading conversations...")
    );

    try {
        const response = await fetch("/api/conversations");

        const data = await response.json();

        if (!response.ok || !data.success) {
            throw new Error(data.message || "Could not load conversations.");
        }

        conversations = data.conversations || [];

        renderConversations(conversations);

    } catch (error) {
        console.error("Conversation loading error:", error);

        conversationList.replaceChildren(
            createElement(
                "p",
                "empty-conversations",
                error.message || "Unable to load conversations."
            )
        );
    }
}

// ==========================================
// RENDER CONVERSATION LIST
// ==========================================

function renderConversations(list) {
    conversationList.replaceChildren();

    if (!list.length) {
        conversationList.appendChild(
            createElement(
                "p",
                "empty-conversations",
                "No conversations yet. Visit someone's profile to start chatting."
            )
        );

        return;
    }

    list.forEach((conversation) => {
        const item = createElement("div", "conversation-item");

        if (conversation.id === activeConversationId) {
            item.classList.add("selected");
        }

        const avatar = createAvatar(
    conversation.other_username,
    conversation.other_profile_pic,
    "conversation-avatar"
);


const avatarWrapper = createElement(
    "div",
    "conversation-avatar-wrapper"
);

avatarWrapper.appendChild(avatar);

if (onlineUserIds.has(Number(conversation.other_user_id))) {
    const onlineDot = createElement("span", "online-status-dot");
    avatarWrapper.appendChild(onlineDot);
}



        const details = createElement("div", "conversation-details");

        const username = createElement(
            "h4",
            "conversation-username",
            conversation.other_username
        );

        const lastMessage = createElement(
            "p",
            "conversation-last-message",
            conversation.last_message || "Start a conversation"
        );

        
details.append(username, lastMessage);

// Display unread message count
const unreadCount = Number(conversation.unread_count) || 0;

if (unreadCount > 0) {
    item.classList.add("has-unread");

    const unreadBadge = createElement(
        "span",
        "unread-count",
        unreadCount > 99 ? "99+" : String(unreadCount)
    );

    item.append(avatarWrapper, details, unreadBadge);
} else {
    item.append(avatarWrapper, details);
}


        item.addEventListener("click", () => {
            openConversation(conversation);
        });

        conversationList.appendChild(item);
    });
}

// ==========================================
// OPEN A CONVERSATION
// ==========================================

async function openConversation(conversation) {
    activeConversationId = conversation.id;
    activeConversation = conversation;

    chatPlaceholder.classList.add("hidden");
    activeChat.classList.remove("hidden");

    chatUsername.textContent = conversation.other_username;

    // Display the other user's last seen time
let lastSeenElement = document.getElementById("chatLastSeen");

if (!lastSeenElement) {
    lastSeenElement = createElement("span", "chat-last-seen");
    lastSeenElement.id = "chatLastSeen";
    chatUsername.insertAdjacentElement("afterend", lastSeenElement);
}

lastSeenElement.textContent = formatLastSeen(
    conversation.other_last_seen
);

updateChatLastSeen(conversation);

    const newAvatar = createAvatar(
    conversation.other_username,
    conversation.other_profile_pic,
    "chat-user-avatar"
);

chatUserAvatar.replaceWith(newAvatar);
chatUserAvatar = newAvatar;

    messageList.replaceChildren(
        createElement("p", "empty-messages", "Loading messages...")
    );

    renderConversations(conversations);

    try {
        const response = await fetch(
            `/api/conversations/${conversation.id}/messages`
        );

        const data = await response.json();

        if (!response.ok || !data.success) {
            throw new Error(data.message || "Could not load messages.");
        }

        // Ignore an older request if another conversation was selected
        if (activeConversationId !== conversation.id) {
            return;
        }

        messageList.replaceChildren();

        if (!data.messages.length) {
            messageList.appendChild(
                createElement(
                    "p",
                    "empty-messages",
                    "No messages yet. Say hello!"
                )
            );
        } else {
            data.messages.forEach((message) => {
                renderMessage(message);
            });
        }

        scrollMessagesToBottom();

        // Join the real-time conversation room
        socket.emit("join_conversation", {
            conversationId: conversation.id
        });

    } catch (error) {
        console.error("Message history error:", error);

        if (activeConversationId === conversation.id) {
            messageList.replaceChildren(
                createElement(
                    "p",
                    "empty-messages",
                    error.message || "Unable to load messages."
                )
            );
        }
    }
}

// ==========================================
// RENDER A MESSAGE
// ==========================================

function renderMessage(message) {
    const emptyMessage = messageList.querySelector(".empty-messages");

    if (emptyMessage) {
        emptyMessage.remove();
    }

    const isOwnMessage =
        Number(message.sender_id) > 0 &&
        Number(message.sender_id) === Number(window.currentUserId);

    const messageWrapper = createElement(
        "div",
        isOwnMessage
            ? "message-wrapper own-message"
            : "message-wrapper other-message"
    );

    const bubble = createElement(
        "div",
        "message-bubble",
        message.content
    );

    const timestamp = createElement(
        "span",
        "message-timestamp",
        formatMessageTime(message.created_at)
    );

    messageWrapper.appendChild(bubble);

    if (isOwnMessage) {
        const status = createElement("span", "message-status");

        status.dataset.messageId = message.id;

        if (message.read_at) {
            status.textContent = "✓✓ Seen";
            status.classList.add("seen");
        } else if (message.delivered_at) {
            status.textContent = "✓✓ Delivered";
            status.classList.add("delivered");
        } else {
            status.textContent = "✓ Sent";
            status.classList.add("sent");
        }

        messageWrapper.append(timestamp, status);
    } else {
        messageWrapper.appendChild(timestamp);
    }

    messageList.appendChild(messageWrapper);

    scrollMessagesToBottom();
}

// ==========================================
// FORMAT MESSAGE TIME
// ==========================================

function formatMessageTime(dateValue) {
    if (!dateValue) {
        return "";
    }

    const date = new Date(
        dateValue.includes(" ") 
            ? dateValue.replace(" ", "T") + "Z"
            : dateValue
    );

    if (Number.isNaN(date.getTime())) {
        return "";
    }

    return date.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit"
    });
}

// ==========================================
// SCROLL TO LATEST MESSAGE
// ==========================================

function scrollMessagesToBottom() {
    messageList.scrollTop = messageList.scrollHeight;
}



// ==========================================
// SEND TYPING STATUS
// ==========================================

let typingTimeout = null;
let typingActive = false;

messageInput.addEventListener("input", () => {
    if (!activeConversationId || !socket.connected) {
        return;
    }

    // Notify the other person when typing starts
    if (!typingActive) {
        socket.emit("typing", {
            conversationId: activeConversationId,
            isTyping: true
        });

        typingActive = true;
    }

    // Stop the typing status after 1.2 seconds of inactivity
    clearTimeout(typingTimeout);

    typingTimeout = setTimeout(() => {
        socket.emit("typing", {
            conversationId: activeConversationId,
            isTyping: false
        });

        typingActive = false;
    }, 1200);
});



// ==========================================
// SEND MESSAGE
// ==========================================

messageForm.addEventListener("submit", (event) => {
    event.preventDefault();

    const content = messageInput.value.trim();

    if (!content || !activeConversationId) {
        return;
    }

    if (!socket.connected) {
        alert("Connection lost. Please wait and try again.");
        return;
    }

    // Stop typing indicator when sending a message
clearTimeout(typingTimeout);

if (typingActive) {
    socket.emit("typing", {
        conversationId: activeConversationId,
        isTyping: false
    });

    typingActive = false;
}

    socket.emit("send_message", {
        conversationId: activeConversationId,
        content: content
    });

    messageInput.value = "";
    messageInput.focus();
});



// ==========================================
// RECEIVE TYPING STATUS
// ==========================================

socket.on("typing_status", (data) => {
    if (
        Number(data.conversationId) !== Number(activeConversationId)
    ) {
        return;
    }

    if (data.isTyping) {
        typingIndicator.textContent =
            `${activeConversation.other_username} is typing...`;

        typingIndicator.hidden = false;
    } else {
        typingIndicator.hidden = true;
        typingIndicator.textContent = "";
    }
});



// ==========================================
// RECEIVE NEW MESSAGES
// ==========================================


socket.on("new_message", (message) => {
    if (
        activeConversationId &&
        Number(message.conversation_id) === Number(activeConversationId)
    ) {
        renderMessage(message);

        // Confirm delivery when an incoming message reaches the active chat
if (Number(message.sender_id) !== Number(window.currentUserId)) {
    socket.emit("message_delivered", {
        messageId: message.id
    });
}

        // Mark newly received messages as read
        socket.emit("join_conversation", {
            conversationId: activeConversationId
        });
    }

    // Refresh conversation previews and ordering
    loadConversations();
});


// ==========================================
// RECEIVE DELIVERY STATUS UPDATES
// ==========================================

socket.on("message_status_update", (data) => {
    const statusElement = messageList.querySelector(
        `.message-status[data-message-id="${data.messageId}"]`
    );

    if (!statusElement) {
        return;
    }

    statusElement.textContent = "✓✓ Delivered";
    statusElement.classList.remove("sent", "seen");
    statusElement.classList.add("delivered");
});

// ==========================================
// RECEIVE SEEN STATUS UPDATES
// ==========================================

socket.on("messages_read", (data) => {
    if (
        Number(data.conversationId) !== Number(activeConversationId)
    ) {
        return;
    }

    const ownStatuses = messageList.querySelectorAll(
        ".message-status"
    );

    ownStatuses.forEach((statusElement) => {
        statusElement.textContent = "✓✓ Seen";
        statusElement.classList.remove("sent", "delivered");
        statusElement.classList.add("seen");
    });
});


// Refresh unread counts after messages are marked as read
socket.on("conversation_joined", (data) => {
    if (
        Number(data.conversationId) === Number(activeConversationId)
    ) {
        loadConversations();
    }
});

// ==========================================
// SOCKET ERROR HANDLING
// ==========================================

socket.on("chat_error", (error) => {
    console.error("Chat error:", error.message);
    alert(error.message || "Something went wrong with chat.");
});

socket.on("connect", () => {
    console.log("Connected to Connectly chat server.");
});

socket.on("connect_error", (error) => {
    console.error("Socket connection error:", error.message);
});

// ==========================================
// CONVERSATION SEARCH
// ==========================================

conversationSearch.addEventListener("input", () => {
    const searchText = conversationSearch.value
        .trim()
        .toLowerCase();

    const filteredConversations = conversations.filter((conversation) =>
        conversation.other_username
            .toLowerCase()
            .includes(searchText)
    );

    renderConversations(filteredConversations);
});


// ==========================================
// INITIALIZE CHAT
// ==========================================


async function initializeChat() {
    try {
        const response = await fetch("/api/me");
        const data = await response.json();

        if (!response.ok || !data.success || !data.user) {
            throw new Error("Please log in to access messages.");
        }

        window.currentUserId = Number(data.user.id);

        // Load all conversations
        await loadConversations();

        // Check whether a conversation was selected from a profile
        const urlParams = new URLSearchParams(window.location.search);
        const requestedConversationId = Number(
            urlParams.get("conversationId")
        );

        if (requestedConversationId > 0) {
            const selectedConversation = conversations.find(
                conversation =>
                    Number(conversation.id) === requestedConversationId
            );

            if (selectedConversation) {
                await openConversation(selectedConversation);
            } else {
                console.warn("Requested conversation was not found.");
            }
        }

    } catch (error) {
        console.error("Chat initialization error:", error);

        conversationList.replaceChildren(
            createElement(
                "p",
                "empty-conversations",
                error.message
            )
        );
    }
}

initializeChat();
