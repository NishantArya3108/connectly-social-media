
/* =================================
   CONNECTLY PROFILE PAGE
================================= */

// Get user ID from URL
const urlParams = new URLSearchParams(window.location.search);
const profileUserId = Number(urlParams.get("id"));

const profileLoading = document.getElementById("profile-loading");
const profileError = document.getElementById("profile-error");
const profileContent = document.getElementById("profile-content");

const followButton = document.getElementById("follow-btn");
const messageButton = document.getElementById("message-btn");

let viewingUser = null;

// API helper
async function profileApi(url, options = {}) {
    const response = await fetch(url, {
        ...options,
        headers: {
            ...(options.headers || {}),
            ...(options.body instanceof FormData
                ? {}
                : { "Content-Type": "application/json" })
        }
    });

    const result = await response.json();

    if (response.status === 401) {
        window.location.href = "/";
        throw new Error("Please log in first.");
    }

    if (!response.ok) {
        throw new Error(result.message || "Something went wrong.");
    }

    return result;
}

// Load profile
async function loadUserProfile() {
    try {
        if (!Number.isSafeInteger(profileUserId) || profileUserId <= 0) {
            throw new Error("Invalid profile link.");
        }

        const result = await profileApi(
            `/api/users/${profileUserId}/profile`
        );

        viewingUser = result.user;

        displayProfile(result.user);
        displayUserPosts(result.posts);

        profileLoading.hidden = true;
        profileContent.hidden = false;

    } catch (error) {
        profileLoading.hidden = true;
        profileError.textContent = error.message;
        profileError.hidden = false;
    }
}

// Display user information
function displayProfile(user) {
    document.title = `${user.username} | Connectly`;

    document.getElementById("profile-username").textContent =
        user.username;

    document.getElementById("profile-bio").textContent =
        user.bio || "No bio added yet.";

    
const profileInitial = document.getElementById("profile-initial");

const profilePicture =
    document.getElementById("profile-picture");

profileInitial.textContent =
    user.username.charAt(0).toUpperCase();

if (user.profile_pic) {
    profilePicture.src = user.profile_pic;
    profilePicture.hidden = false;
    profileInitial.hidden = true;
} else {
    profilePicture.hidden = true;
    profilePicture.removeAttribute("src");
    profileInitial.hidden = false;
}


    document.getElementById("profile-post-count").textContent =
        user.post_count;

    document.getElementById("profile-follower-count").textContent =
        user.follower_count;

    document.getElementById("profile-following-count").textContent =
        user.following_count;

    const joinedDate = new Date(user.created_at);

    document.getElementById("profile-joined").textContent =
        `Joined ${joinedDate.toLocaleDateString()}`;

    const isOwnProfile =
        Number(user.id) === Number(getCurrentUserIdFromSession());

    // Show Follow and Message buttons only for other users
    followButton.hidden = isOwnProfile;
    messageButton.hidden = isOwnProfile;

    document.getElementById("own-profile-label").hidden =
        !isOwnProfile;

    if (!isOwnProfile) {
        followButton.textContent =
            user.is_following ? "Following" : "Follow";
    }
}

// Obtain logged-in user's ID
let currentLoggedInUserId = null;

async function getCurrentUser() {
    const result = await profileApi("/api/me");
    currentLoggedInUserId = result.user.id;
    return currentLoggedInUserId;
}

function getCurrentUserIdFromSession() {
    return currentLoggedInUserId;
}

// Display user's posts
function displayUserPosts(posts) {
    const postsContainer =
        document.getElementById("user-posts");

    const noPosts =
        document.getElementById("no-posts");

    postsContainer.innerHTML = "";

    if (!posts || posts.length === 0) {
        noPosts.hidden = false;
        return;
    }

    noPosts.hidden = true;

    posts.forEach(post => {
        const card = document.createElement("article");
        card.className = "post-card";

        const content = document.createElement("p");
        content.textContent = post.content;
        card.appendChild(content);

        if (post.image) {
            const image = document.createElement("img");
            image.className = "post-image";
            image.src = post.image;
            image.alt = "Post image";
            image.loading = "lazy";
            card.appendChild(image);
        }

        const date = document.createElement("span");
        date.className = "post-date";
        date.textContent = new Date(post.created_at).toLocaleString();

        card.appendChild(date);

        const meta = document.createElement("div");
        meta.className = "post-meta";
        meta.textContent =
            `♥ ${post.like_count} Likes  ·  ${post.comment_count} Comments`;

        card.appendChild(meta);

        postsContainer.appendChild(card);
    });
}

// Follow / Unfollow
followButton.addEventListener("click", async () => {
    if (!viewingUser) return;

    const wasFollowing = Boolean(viewingUser.is_following);

    followButton.disabled = true;

    try {
        await profileApi(
            `/api/users/${viewingUser.id}/follow`,
            {
                method: wasFollowing ? "DELETE" : "POST"
            }
        );

        await loadUserProfile();

    } catch (error) {
        alert(error.message);

    } finally {
        followButton.disabled = false;
    }
});



// ==========================================
// START PRIVATE CONVERSATION
// ==========================================

messageButton.addEventListener("click", async () => {
    if (!viewingUser || messageButton.disabled) return;

    messageButton.disabled = true;
    messageButton.textContent = "Opening...";

    try {
        const result = await profileApi("/api/conversations", {
            method: "POST",
            body: JSON.stringify({
                userId: viewingUser.id
            })
        });

        if (!result.success || !result.conversation) {
            throw new Error("Could not open conversation.");
        }

        // Open the Messages page
        window.location.href =
    `messages.html?conversationId=${result.conversation.id}`;

    } catch (error) {
        alert(error.message);

        messageButton.disabled = false;
        messageButton.textContent = "💬 Message";
    }
});


// Logout
document.getElementById("logout-btn").addEventListener("click", async () => {
    try {
        await profileApi("/api/logout", {
            method: "POST"
        });

        window.location.href = "/";

    } catch (error) {
        alert(error.message);
    }
});




/* =========================================
   FOLLOWERS AND FOLLOWING LISTS
========================================= */

const followListModal =
    document.getElementById("follow-list-modal");

const followListTitle =
    document.getElementById("follow-list-title");

const followListItems =
    document.getElementById("follow-list-items");

const closeFollowList =
    document.getElementById("close-follow-list");

const showFollowersBtn =
    document.getElementById("show-followers-btn");

const showFollowingBtn =
    document.getElementById("show-following-btn");

const followListSearch =
    document.getElementById("follow-list-search");

// Get the profile ID from the page URL
const followListProfileId =
    new URLSearchParams(window.location.search).get("id");

// Open followers or following list
async function openFollowList(type) {
    if (!followListProfileId) {
        alert("Profile ID not found.");
        return;
    }

    followListTitle.textContent =
        type === "followers" ? "Followers" : "Following";

    followListItems.innerHTML = "<p>Loading users...</p>";
    followListSearch.value = "";
    followListModal.hidden = false;

    try {
        const result = await profileApi(
            `/api/users/${followListProfileId}/${type}`
        );

        if (!result.success) {
            throw new Error(result.message || "Could not load users.");
        }

        followListItems.innerHTML = "";

        if (!result.users || result.users.length === 0) {
            followListItems.innerHTML = "<p>No users found.</p>";
            return;
        }

        result.users.forEach(user => {
            const userItem = document.createElement("div");
            userItem.className = "follow-list-user";

            // Avatar
            let avatar;

            if (user.profile_pic) {
                avatar = document.createElement("img");
                avatar.src = user.profile_pic;
                avatar.alt = user.username;
            } else {
                avatar = document.createElement("div");
                avatar.textContent =
                    user.username.charAt(0).toUpperCase();
            }

            avatar.classList.add("follow-list-avatar");

            // Username
            const username = document.createElement("strong");
            username.textContent = user.username;

            userItem.dataset.username =
                user.username.toLowerCase();

            // User information
            const userInfo = document.createElement("div");
            userInfo.className = "follow-list-user-info";
            userInfo.append(avatar, username);

            // Follow / Unfollow button
            const followButton = document.createElement("button");
            followButton.type = "button";
            followButton.className = "follow-list-action";

            let isFollowing = Boolean(Number(user.is_following));

            function updateFollowButton() {
                followButton.textContent =
                    isFollowing ? "Unfollow" : "Follow";

                followButton.classList.toggle(
                    "following",
                    isFollowing
                );
            }

            updateFollowButton();

            // Follow / Unfollow action
            followButton.addEventListener("click", async (event) => {
                event.stopPropagation();

                if (followButton.disabled) return;

                followButton.disabled = true;

                try {
                    const response = await profileApi(
                        `/api/users/${user.id}/follow`,
                        {
                            method: isFollowing ? "DELETE" : "POST"
                        }
                    );

                    if (!response.success) {
                        throw new Error(
                            response.message || "Action failed."
                        );
                    }
                    isFollowing = !isFollowing;
user.is_following = isFollowing ? 1 : 0;

updateFollowButton();

// Refresh profile information and follower/following counts
await loadUserProfile();

                } catch (error) {
                    alert(error.message);
                } finally {
                    followButton.disabled = false;
                }
            });

            // Open selected user's profile
            userItem.addEventListener("click", () => {
                window.location.href =
                    `profile.html?id=${user.id}`;
            });

            userItem.append(userInfo, followButton);
            followListItems.appendChild(userItem);
        });

    } catch (error) {
        console.error("Follow list error:", error);

        followListItems.innerHTML =
            "<p>Could not load users. Please try again.</p>";
    }
}


// Followers button
if (showFollowersBtn) {
    showFollowersBtn.addEventListener("click", () => {
        openFollowList("followers");
    });
}

// Following button
if (showFollowingBtn) {
    showFollowingBtn.addEventListener("click", () => {
        openFollowList("following");
    });
}

// Close popup
if (closeFollowList) {
    closeFollowList.addEventListener("click", () => {
        followListModal.hidden = true;
    });
}


// Search users in the current followers/following list
if (followListSearch) {
    followListSearch.addEventListener("input", () => {
        const searchText = followListSearch.value
            .trim()
            .toLowerCase();

        const userItems = followListItems.querySelectorAll(
            ".follow-list-user"
        );

        userItems.forEach(item => {
            const username = item.dataset.username || "";

            item.style.display = username.includes(searchText)
                ? "flex"
                : "none";
        });
    });
}



// Close popup when clicking outside
if (followListModal) {
    followListModal.addEventListener("click", event => {
        if (event.target === followListModal) {
            followListModal.hidden = true;
        }
    });
}


// Initialize
async function initializeProfilePage() {
    try {
        await getCurrentUser();
        await loadUserProfile();
    } catch (error) {
        profileLoading.hidden = true;
        profileError.textContent = error.message;
        profileError.hidden = false;
    }
}

initializeProfilePage();
