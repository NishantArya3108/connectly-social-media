
const postsContainer = document.getElementById("posts-container");
const postInput = document.getElementById("post-content");
const publishButton = document.getElementById("publish-btn");
const postMessage = document.getElementById("post-message");
const postImageInput = document.getElementById("post-image-input");

const postImagePreview = document.getElementById("post-image-preview");
const postImagePreviewContainer = document.getElementById("post-image-preview-container");
const postImageName = document.getElementById("post-image-name");
const removePostImageButton = document.getElementById("remove-post-image");

let selectedPostImage = null;
let postPreviewUrl = null;

let currentUser = null;

// ==================================
// LIVE STORY VIEW UPDATES
// ==================================

const storySocket = io();

storySocket.on("story_view_updated", (data) => {
    const storyItem = document.querySelector(
        `.story-item[data-story-id="${data.storyId}"]`
    );

    if (!storyItem) return;

    const viewCount = storyItem.querySelector(
        ".story-view-count"
    );

    if (viewCount) {
        viewCount.textContent = `👁 ${data.totalViews} views`;
    }
});

// ==================================
// API HELPER
// ==================================

async function apiRequest(url, options = {}) {
    const response = await fetch(url, {
        ...options,
        headers: {
            "Content-Type": "application/json",
            ...options.headers
        }
    });

    const result = await response.json();

    if (response.status === 401) {
        window.location.href = "/";
        throw new Error("Please log in again.");
    }

    if (!response.ok) {
        throw new Error(result.message || "Request failed.");
    }

    return result;
}

// ==================================
// LOAD USER PROFILE
// ==================================

async function loadProfile() {
    const result = await apiRequest("/api/me");
    currentUser = result.user;

    const myProfileLink = document.getElementById("my-profile-link");

if (myProfileLink) {
    myProfileLink.href = `profile.html?id=${currentUser.id}`;
}

    document.getElementById("header-username").textContent =
        currentUser.username;

    document.getElementById("welcome-username").textContent =
        currentUser.username;

    document.getElementById("profile-username").textContent =
        currentUser.username;

    document.getElementById("profile-email").textContent =
        currentUser.email;

    document.getElementById("profile-bio").textContent =
        currentUser.bio || "Add a short bio...";

    
const avatarInitial = document.getElementById("profile-avatar-initial");
const avatarImage = document.getElementById("profile-avatar-image");

avatarInitial.textContent =
    currentUser.username.charAt(0).toUpperCase();

if (currentUser.profile_pic) {
    avatarImage.src = currentUser.profile_pic + "?t=" + Date.now();
    avatarImage.hidden = false;
    avatarInitial.hidden = true;
} else {
    avatarImage.hidden = true;
    avatarImage.removeAttribute("src");
    avatarInitial.hidden = false;
}

}

// ==================================
// SAFE ELEMENT CREATION
// ==================================

function createElement(tag, className, text) {
    const element = document.createElement(tag);
    element.className = className;
    element.textContent = text;
    return element;
}

// ==================================
// LOAD POSTS
// ==================================

async function loadPosts() {
    postsContainer.replaceChildren(
        createElement("div", "card loading", "Loading posts...")
    );

    try {
        const result = await apiRequest("/api/posts");

        postsContainer.replaceChildren();

        document.getElementById("post-total").textContent =
            result.posts.filter(
                post => post.user_id === currentUser.id
            ).length;

        if (result.posts.length === 0) {
            postsContainer.appendChild(
                createElement(
                    "div",
                    "card empty-feed",
                    "No posts yet. Be the first to share something!"
                )
            );
            return;
        }

        result.posts.forEach(post => {
            postsContainer.appendChild(createPostCard(post));
        });

        // Open the exact post when arriving from a notification
if (window.location.hash.startsWith("#post-")) {
    const targetPost = document.getElementById(
        window.location.hash.substring(1)
    );

    if (targetPost) {
        targetPost.scrollIntoView({
            behavior: "smooth",
            block: "center"
        });
    }
}

    } catch (error) {
        postsContainer.replaceChildren(
            createElement("div", "card empty-feed", error.message)
        );
    }
}




// ==================================
// LOAD SAVED POSTS
// ==================================

async function loadSavedPosts() {
    const savedPostsContainer =
        document.getElementById("saved-posts-container");

    savedPostsContainer.replaceChildren(
        createElement("div", "card loading", "Loading saved posts...")
    );

    try {
        const result = await apiRequest("/api/saved-posts");

        savedPostsContainer.replaceChildren();

        if (result.posts.length === 0) {
            savedPostsContainer.appendChild(
                createElement(
                    "div",
                    "card empty-feed",
                    "You haven't saved any posts yet. Bookmark posts to see them here!"
                )
            );
            return;
        }

        result.posts.forEach(post => {
            savedPostsContainer.appendChild(createPostCard(post));
        });

    } catch (error) {
        savedPostsContainer.replaceChildren(
            createElement("div", "card empty-feed", error.message)
        );
    }
}





/* =================================
   LOAD FOLLOWER STATISTICS
================================= */

async function loadFollowStats() {
    try {
        const result = await apiRequest("/api/follow-stats");

        document.getElementById("follower-total").textContent =
            result.stats.followers;

        document.getElementById("following-total").textContent =
            result.stats.following;

    } catch (error) {
        console.error("Could not load follow statistics:", error);
    }
}


// ==================================
// CREATE POST CARD
// ==================================

function createPostCard(post) {
    const card = document.createElement("article");
    card.className = "card";
    card.id = `post-${post.id}`;

    const header = document.createElement("div");
    header.className = "post-header";

    const avatar = createElement(
        "div",
        "post-avatar",
        post.username.charAt(0).toUpperCase()
    );

    const authorDetails = document.createElement("div");

    authorDetails.appendChild(
        createElement("div", "post-author", post.username)
    );

    authorDetails.appendChild(
        createElement(
            "div",
            "post-date",
            new Date(post.created_at + "Z").toLocaleString()
        )
    );

    header.append(avatar, authorDetails);


// Make post author's avatar clickable
avatar.style.cursor = "pointer";

avatar.addEventListener("click", () => {
    if (post.user_id) {
        window.location.href = `profile.html?id=${post.user_id}`;
    }
});

// Make post author's username clickable
authorDetails.style.cursor = "pointer";

authorDetails.addEventListener("click", () => {
    if (post.user_id) {
        window.location.href = `profile.html?id=${post.user_id}`;
    }
});


    const content = createElement(
        "p",
        "post-content",
        post.content
    );

    // Display post image when available
let postImageElement = null;

if (post.image) {
    postImageElement = document.createElement("img");

    postImageElement.className = "post-image";
    postImageElement.src = post.image;
    postImageElement.alt = "Post image";
    postImageElement.loading = "lazy";

    postImageElement.onerror = () => {
        postImageElement.remove();
    };
}

    const actions = document.createElement("div");
    actions.className = "post-actions";

    const likeButton = createElement(
        "button",
        post.liked_by_me ? "action-btn liked" : "action-btn",
        `${post.liked_by_me ? "♥" : "♡"} Like (${post.like_count})`
    );

    likeButton.addEventListener("click", async () => {
        likeButton.disabled = true;

        try {
            await apiRequest(`/api/posts/${post.id}/like`, {
                method: "POST"
            });

            await loadPosts();

        } catch (error) {
            alert(error.message);
        } finally {
            likeButton.disabled = false;
        }
    });

    const commentButton = createElement(
        "button",
        "action-btn",
        `💬 Comments (${post.comment_count})`
    );

    const commentsArea = document.createElement("div");
    commentsArea.className = "comments-area";

    // Edit and Delete controls for the post owner
const editArea = document.createElement("div");
editArea.className = "post-edit-area";
editArea.style.display = "none";

if (currentUser && String(post.user_id) === String(currentUser.id)) {

    const editButton = document.createElement("button");
    editButton.type = "button";
    editButton.className = "action-btn";
    editButton.textContent = "✏️ Edit";

    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.className = "action-btn";
    deleteButton.textContent = "🗑️ Delete";

    // EDIT POST
    editButton.addEventListener("click", () => {
        editArea.style.display =
            editArea.style.display === "none" ? "block" : "none";
    });

    // DELETE POST
    deleteButton.addEventListener("click", async () => {
        const confirmed = confirm(
            "Are you sure you want to delete this post?"
        );

        if (!confirmed) return;

        deleteButton.disabled = true;

        try {
            await apiRequest(`/api/posts/${post.id}`, {
                method: "DELETE"
            });

            alert("Post deleted successfully!");
            await loadPosts();

        } catch (error) {
            alert(error.message);
            deleteButton.disabled = false;
        }
    });

    // EDITOR TEXT AREA
    const editContent = document.createElement("textarea");
    editContent.className = "edit-post-content";
    editContent.maxLength = 2000;
    editContent.value = post.content || "";
    editContent.placeholder = "Edit your post...";

    // IMAGE INPUT
    const editImageInput = document.createElement("input");
    editImageInput.type = "file";
    editImageInput.accept = "image/jpeg,image/png,image/webp";

    // REMOVE CURRENT IMAGE
    const removeImageLabel = document.createElement("label");
    const removeImageCheckbox = document.createElement("input");
    removeImageCheckbox.type = "checkbox";

    removeImageLabel.append(
        removeImageCheckbox,
        document.createTextNode(" Remove current image")
    );

    // SAVE BUTTON
    const saveEditButton = document.createElement("button");
    saveEditButton.type = "button";
    saveEditButton.className = "action-btn";
    saveEditButton.textContent = "Save Changes";

    // CANCEL BUTTON
    const cancelEditButton = document.createElement("button");
    cancelEditButton.type = "button";
    cancelEditButton.className = "action-btn";
    cancelEditButton.textContent = "Cancel";

    cancelEditButton.addEventListener("click", () => {
        editArea.style.display = "none";
    });

    // SAVE EDITED POST
    saveEditButton.addEventListener("click", async () => {

        const formData = new FormData();

        formData.append("content", editContent.value.trim());

        if (editImageInput.files.length > 0) {
            formData.append("postImage", editImageInput.files[0]);
        } else {
            formData.append(
                "removeImage",
                removeImageCheckbox.checked ? "true" : "false"
            );
        }

        saveEditButton.disabled = true;

        try {
            const response = await fetch(`/api/posts/${post.id}`, {
                method: "PUT",
                body: formData
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.message || "Could not update post.");
            }

            alert("Post updated successfully!");
            await loadPosts();

        } catch (error) {
            alert(error.message);
            saveEditButton.disabled = false;
        }
    });

    editArea.append(
        editContent,
        editImageInput,
        removeImageLabel,
        saveEditButton,
        cancelEditButton
    );

    actions.append(editButton, deleteButton);
}

    let commentsLoaded = false;

    commentButton.addEventListener("click", async () => {
        commentsArea.classList.toggle("open");

        if (commentsArea.classList.contains("open")) {
            await loadComments(post.id, commentsArea);
            commentsLoaded = true;
        }
    });


    // SAVE / UNSAVE POST
    const saveButton = createElement(
        "button",
        post.saved_by_me ? "action-btn saved" : "action-btn",
        post.saved_by_me ? "🔖 Saved" : "🔖 Save"
    );

    saveButton.addEventListener("click", async () => {
        saveButton.disabled = true;

        try {
            await apiRequest(`/api/posts/${post.id}/save`, {
                method: post.saved_by_me ? "DELETE" : "POST"
            });

            await loadPosts();

if (!savedPostsSection.hidden) {
    await loadSavedPosts();
}

        } catch (error) {
            alert(error.message);
        } finally {
            saveButton.disabled = false;
        }
    });



    actions.prepend(likeButton, commentButton, saveButton);
    card.appendChild(header);

if (post.content) {
    card.appendChild(content);
}

if (postImageElement) {
    card.appendChild(postImageElement);
}

card.append(actions, commentsArea);

if (editArea.children.length > 0) {
    card.appendChild(editArea);
}

    return card;
}

// ==================================
// LOAD COMMENTS
// ==================================

async function loadComments(postId, area) {
    area.replaceChildren(
        createElement("p", "loading", "Loading comments...")
    );

    try {
        const result = await apiRequest(
            `/api/posts/${postId}/comments`
        );

        area.replaceChildren();

        if (result.comments.length === 0) {
            area.appendChild(
                createElement("p", "post-date", "No comments yet.")
            );
        }

        result.comments.forEach(comment => {
            const item = document.createElement("div");
            item.className = "comment-item";

            item.appendChild(
                createElement("strong", "", comment.username)
            );

            item.appendChild(
                createElement("p", "", comment.content)
            );

            area.appendChild(item);
        });

        const form = document.createElement("form");
        form.className = "comment-form";

        const input = document.createElement("input");
        input.placeholder = "Write a comment...";
        input.maxLength = 500;
        input.required = true;

        const button = document.createElement("button");
        button.type = "submit";
        button.textContent = "Send";

        form.append(input, button);

        form.addEventListener("submit", async event => {
            event.preventDefault();
            button.disabled = true;

            try {
                await apiRequest(`/api/posts/${postId}/comments`, {
                    method: "POST",
                    body: JSON.stringify({
                        content: input.value
                    })
                });

                await loadComments(postId, area);

            } catch (error) {
                alert(error.message);
            } finally {
                button.disabled = false;
            }
        });

        area.appendChild(form);

    } catch (error) {
        area.replaceChildren(
            createElement("p", "post-date", error.message)
        );
    }
}

// ==================================
// PUBLISH POST
// ==================================

// ==================================
// PUBLISH TEXT OR IMAGE POST
// ==================================

publishButton.addEventListener("click", async () => {

    const content = postInput.value.trim();

    if (!content && !selectedPostImage) {
        postMessage.textContent =
            "Write something or select an image first.";

        postMessage.className = "status-message error";
        return;
    }

    const formData = new FormData();

    formData.append("content", content);

    if (selectedPostImage) {
        formData.append("postImage", selectedPostImage);
    }

    publishButton.disabled = true;
    publishButton.textContent = "Publishing...";

    try {

        const response = await fetch("/api/posts", {
            method: "POST",
            body: formData
        });

        const result = await response.json();

        if (response.status === 401) {
            window.location.href = "/";
            return;
        }

        if (!response.ok) {
            throw new Error(
                result.message || "Could not publish post."
            );
        }

        postInput.value = "";
        document.getElementById("character-count").textContent =
            "0 / 2000";

        selectedPostImage = null;
        postImageInput.value = "";

        if (postPreviewUrl) {
            URL.revokeObjectURL(postPreviewUrl);
            postPreviewUrl = null;
        }

        postImagePreview.removeAttribute("src");
        postImagePreviewContainer.hidden = true;
        postImageName.textContent = "No image selected";

        postMessage.textContent = result.message;
        postMessage.className = "status-message";

        await loadPosts();

    } catch (error) {

        postMessage.textContent = error.message;
        postMessage.className = "status-message error";

    } finally {

        publishButton.disabled = false;
        publishButton.textContent = "Publish Post →";
    }
});

// ==================================
// CHARACTER COUNTER
// ==================================

postInput.addEventListener("input", () => {
    document.getElementById("character-count").textContent =
        `${postInput.value.length} / 2000`;
});

// ==================================
// POST IMAGE PREVIEW AND SELECTION
// ==================================



postImageInput.addEventListener("change", () => {
    const file = postImageInput.files[0];

    if (!file) return;

    const allowedTypes = [
        "image/jpeg",
        "image/png",
        "image/webp"
    ];

    if (!allowedTypes.includes(file.type)) {
        alert("Please select a JPG, PNG or WEBP image.");
        postImageInput.value = "";
        selectedPostImage = null;
        return;
    }

    if (file.size > 5 * 1024 * 1024) {
        alert("Image must be smaller than 5 MB.");
        postImageInput.value = "";
        selectedPostImage = null;
        return;
    }

    selectedPostImage = file;

    const reader = new FileReader();

    reader.onload = () => {
        postImagePreview.src = reader.result;
        postImagePreviewContainer.hidden = false;
        postImageName.textContent = file.name;
    };

    reader.onerror = () => {
        alert("Could not preview this image. Please select another.");
        selectedPostImage = null;
        postImageInput.value = "";
    };

    reader.readAsDataURL(file);
});


removePostImageButton.addEventListener("click", () => {

    selectedPostImage = null;
    postImageInput.value = "";

    if (postPreviewUrl) {
        URL.revokeObjectURL(postPreviewUrl);
        postPreviewUrl = null;
    }

    postImagePreview.removeAttribute("src");
    postImagePreviewContainer.hidden = true;
    postImageName.textContent = "No image selected";
});



// ==================================
// SAVED POSTS NAVIGATION
// ==================================

const savedPostsLink =
    document.getElementById("saved-posts-link");

const feedLink =
    document.querySelector('a[href="#feed"]');

const feedSection =
    document.getElementById("feed");

const savedPostsSection =
    document.getElementById("saved-posts-section");

savedPostsLink.addEventListener("click", async event => {
    event.preventDefault();

    feedSection.hidden = true;
    savedPostsSection.hidden = false;

    savedPostsLink.classList.add("active");
    feedLink.classList.remove("active");

    await loadSavedPosts();
});

feedLink.addEventListener("click", () => {
    feedSection.hidden = false;
    savedPostsSection.hidden = true;

    feedLink.classList.add("active");
    savedPostsLink.classList.remove("active");
});

// Refresh saved posts
document.getElementById("refresh-saved-btn").addEventListener(
    "click",
    loadSavedPosts
);



// ==================================
// REFRESH FEED
// ==================================

document.getElementById("refresh-btn").addEventListener(
    "click",
    loadPosts
);

// ==================================
// LOGOUT
// ==================================

document.getElementById("logout-btn").addEventListener(
    "click",
    async () => {
        try {
            await apiRequest("/api/logout", {
                method: "POST"
            });

            window.location.href = "/";

        } catch (error) {
            alert(error.message);
        }
    }
);

// ==================================
// LOAD SUGGESTED USERS
// ==================================

async function loadSuggestedUsers(search = "") {
    const peopleList = document.getElementById("people-list");

    peopleList.replaceChildren(
        createElement("p", "loading", "Loading members...")
    );

    try {
        const result = await apiRequest(
            `/api/users?search=${encodeURIComponent(search)}`
        );

        peopleList.replaceChildren();

        if (result.users.length === 0) {
            peopleList.appendChild(
                createElement(
                    "p",
                    "loading",
                    "No other members found. Register another account to test!"
                )
            );
            return;
        }

        result.users.forEach(user => {
            const item = document.createElement("div");
            item.className = "person-item";

            

const avatar = document.createElement("div");
avatar.className = "post-avatar";

if (user.profile_pic) {
    const profileImage = document.createElement("img");

    profileImage.src = user.profile_pic;
    profileImage.alt = user.username + "'s profile picture";

    avatar.appendChild(profileImage);
} else {
    avatar.textContent = user.username.charAt(0).toUpperCase();
}


            const details = document.createElement("div");
            details.className = "person-details";

            details.appendChild(
                createElement("strong", "", user.username)
            );

            // Open selected member's profile
avatar.style.cursor = "pointer";
details.style.cursor = "pointer";

avatar.addEventListener("click", () => {
    window.location.href = `profile.html?id=${user.id}`;
});

details.addEventListener("click", () => {
    window.location.href = `profile.html?id=${user.id}`;
});

            details.appendChild(
                createElement(
                    "span",
                    "",
                    `${user.follower_count} followers`
                )
            );

            const button = createElement(
                "button",
                user.is_following
                    ? "follow-btn following"
                    : "follow-btn",
                user.is_following ? "Following" : "Follow"
            );

            button.addEventListener("click", async () => {
                button.disabled = true;

                try {
                    await apiRequest(
                        `/api/users/${user.id}/follow`,
                        {
                            method: user.is_following
                                ? "DELETE"
                                : "POST"
                        }
                    );

                    await loadSuggestedUsers(
                        document.getElementById("user-search").value
                    );
                    await loadFollowStats();

                } catch (error) {
                    alert(error.message);
                    button.disabled = false;
                }
            });

            item.append(avatar, details, button);
            peopleList.appendChild(item);
        });

    } catch (error) {
        peopleList.replaceChildren(
            createElement("p", "loading", error.message)
        );
    }
}

// ==================================
// SEARCH USERS
// ==================================

document.getElementById("user-search").addEventListener(
    "input",
    event => {
        loadSuggestedUsers(event.target.value.trim());
    }
);

// ==================================
// EDIT PROFILE
// ==================================

const editProfileBtn =
    document.getElementById("edit-profile-btn");

const profileEditForm =
    document.getElementById("profile-edit-form");

const cancelProfileEdit =
    document.getElementById("cancel-profile-edit");

const profileEditMessage =
    document.getElementById("profile-edit-message");

// Open profile editor
editProfileBtn.addEventListener("click", () => {
    document.getElementById("edit-username").value =
        currentUser.username;

    document.getElementById("edit-bio").value =
        currentUser.bio || "";

    profileEditMessage.textContent = "";
    profileEditMessage.style.color = "#238653";

    profileEditForm.hidden = false;
    editProfileBtn.hidden = true;
});

// Cancel editing
cancelProfileEdit.addEventListener("click", () => {
    profileEditForm.hidden = true;
    editProfileBtn.hidden = false;

    profileEditMessage.textContent = "";
});

// Save profile changes
profileEditForm.addEventListener("submit", async event => {
    event.preventDefault();

    const username =
        document.getElementById("edit-username").value.trim();

    const bio =
        document.getElementById("edit-bio").value.trim();

    const saveButton =
        profileEditForm.querySelector('button[type="submit"]');

    saveButton.disabled = true;
    saveButton.textContent = "Saving...";

    profileEditMessage.textContent = "";

    try {
        const result = await apiRequest("/api/me", {
            method: "PUT",
            body: JSON.stringify({
                username,
                bio
            })
        });

        currentUser = result.user;

        // Update all visible profile information
        document.getElementById("header-username").textContent =
            currentUser.username;

        document.getElementById("welcome-username").textContent =
            currentUser.username;

        document.getElementById("profile-username").textContent =
            currentUser.username;

        document.getElementById("profile-email").textContent =
            currentUser.email;

        document.getElementById("profile-bio").textContent =
            currentUser.bio || "Add a short bio...";

        document.getElementById("profile-avatar").textContent =
            currentUser.username.charAt(0).toUpperCase();

        // Refresh suggested users after username change
        await loadSuggestedUsers(
            document.getElementById("user-search").value
        );

        profileEditForm.hidden = true;
        editProfileBtn.hidden = false;

        profileEditMessage.textContent =
            "Profile updated successfully!";

    } catch (error) {
        profileEditMessage.textContent = error.message;
        profileEditMessage.style.color = "#dc3545";

    } finally {
        saveButton.disabled = false;
        saveButton.textContent = "Save Changes";
    }
});


// ==================================
// ADD STORY MODAL CONTROLS
// ==================================

const addStoryBtn = document.getElementById("add-story-btn");
const storyModal = document.getElementById("story-modal");
const closeStoryModal = document.getElementById("close-story-modal");
const storyForm = document.getElementById("story-form");
const storyImageInput = document.getElementById("story-image-input");
const storyPreview = document.getElementById("story-preview");
const storyPreviewContainer = document.getElementById("story-preview-container");
const storyCaption = document.getElementById("story-caption");
const storyCaptionCount = document.getElementById("story-caption-count");
const storyUploadMessage = document.getElementById("story-upload-message");
const publishStoryBtn = document.getElementById("publish-story-btn");

let selectedStoryImage = null;
let storyPreviewUrl = null;

// Open story popup
addStoryBtn.addEventListener("click", () => {
    storyModal.hidden = false;
});

// Close story popup
closeStoryModal.addEventListener("click", () => {
    storyModal.hidden = true;
});

// Close popup when clicking outside
storyModal.addEventListener("click", (event) => {
    if (event.target === storyModal) {
        storyModal.hidden = true;
    }
});

// Select and preview story image
storyImageInput.addEventListener("change", () => {
    const file = storyImageInput.files[0];

    storyUploadMessage.textContent = "";
    selectedStoryImage = null;

    if (storyPreviewUrl) {
        URL.revokeObjectURL(storyPreviewUrl);
        storyPreviewUrl = null;
    }

    if (!file) {
        storyPreviewContainer.hidden = true;
        return;
    }

    const allowedTypes = [
        "image/jpeg",
        "image/png",
        "image/webp"
    ];

    if (!allowedTypes.includes(file.type)) {
        storyUploadMessage.textContent =
            "Choose a JPG, PNG or WEBP image.";

        storyImageInput.value = "";
        storyPreviewContainer.hidden = true;
        return;
    }

    if (file.size > 5 * 1024 * 1024) {
        storyUploadMessage.textContent =
            "Story image must be smaller than 5 MB.";

        storyImageInput.value = "";
        storyPreviewContainer.hidden = true;
        return;
    }

    selectedStoryImage = file;

const reader = new FileReader();

reader.onload = () => {
    storyPreview.src = reader.result;
    storyPreviewContainer.hidden = false;
};

reader.onerror = () => {
    storyUploadMessage.textContent =
        "Could not preview this image. Please select another.";

    selectedStoryImage = null;
    storyImageInput.value = "";
    storyPreviewContainer.hidden = true;
};

reader.readAsDataURL(file);

});

// Story caption character counter
storyCaption.addEventListener("input", () => {
    storyCaptionCount.textContent =
        `${storyCaption.value.length} / 150`;
});

// Publish story
storyForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (!selectedStoryImage) {
        storyUploadMessage.textContent =
            "Please select a story image first.";
        return;
    }

    const formData = new FormData();

    formData.append("storyImage", selectedStoryImage);
    formData.append("caption", storyCaption.value.trim());

    publishStoryBtn.disabled = true;
    publishStoryBtn.textContent = "Publishing...";

    storyUploadMessage.textContent = "";

    try {
        const response = await fetch("/api/stories", {
            method: "POST",
            body: formData
        });

        const result = await response.json();

        if (response.status === 401) {
            window.location.href = "/";
            return;
        }

        if (!response.ok) {
            throw new Error(
                result.message || "Could not publish story."
            );
        }

        storyForm.reset();

        if (storyPreviewUrl) {
            URL.revokeObjectURL(storyPreviewUrl);
            storyPreviewUrl = null;
        }

        selectedStoryImage = null;
        storyPreview.removeAttribute("src");
        storyPreviewContainer.hidden = true;
        storyCaptionCount.textContent = "0 / 150";

        storyModal.hidden = true;

        await loadStories();

        alert("Story published successfully!");

    } catch (error) {
        storyUploadMessage.textContent = error.message;

    } finally {
        publishStoryBtn.disabled = false;
        publishStoryBtn.textContent = "Publish Story";
    }
});

// ==================================
// STORY VIEWER STATE
// ==================================

let allStories = [];
let currentStoryIndex = 0;


// ==================================
// LOAD ACTIVE STORIES
// ==================================

async function loadStories() {
    const storiesContainer =
        document.getElementById("stories-container");

    if (!storiesContainer) return;

    try {
        const result = await apiRequest("/api/stories");
        allStories = result.stories || [];

        storiesContainer.replaceChildren();

        if (!result.stories || result.stories.length === 0) {
            storiesContainer.appendChild(
                createElement(
                    "div",
                    "story-loading",
                    "No stories yet. Be the first to share!"
                )
            );
            return;
        }

        // Keep only the latest story for each user in the Stories bar
        const latestStories = new Map();

        result.stories.forEach(story => {
            if (!latestStories.has(story.user_id)) {
                latestStories.set(story.user_id, story);
            }
        });

        latestStories.forEach(story => {
            const item = document.createElement("div");
            item.className = "story-item";
            item.dataset.storyId = String(story.id);

            const ring = document.createElement("div");
            ring.className = "story-avatar-ring unseen";

            const avatar = document.createElement("img");
            avatar.className = "story-avatar";
            avatar.alt = story.username + "'s story";

            if (story.profile_pic) {
                avatar.src = story.profile_pic;
            } else {
                avatar.src =
                    "https://placehold.co/100x100?text=" +
                    encodeURIComponent(
                        story.username.charAt(0).toUpperCase()
                    );
            }

            const username = createElement(
                "span",
                "story-username",
                story.user_id === currentUser.id
                    ? "Your Story"
                    : story.username
            );

            ring.appendChild(avatar);
            item.append(ring, username);

            // Show view count on your own stories
if (String(story.user_id) === String(currentUser.id)) {
    const viewCount = createElement(
        "span",
        "story-view-count",
        `👁 ${story.view_count || 0} views`
    );

    item.appendChild(viewCount);

    viewCount.addEventListener("click", (event) => {
        event.stopPropagation();

        openStoryViewers(story.id);
    });
}

            // Open this user's latest story
item.addEventListener("click", () => {
    const firstStoryIndex = allStories.findIndex(
        s => s.user_id === story.user_id
    );

    if (firstStoryIndex !== -1) {
        showStory(firstStoryIndex);
    }
});
            storiesContainer.appendChild(item);
        });

    } catch (error) {
        storiesContainer.replaceChildren(
            createElement(
                "div",
                "story-loading",
                error.message
            )
        );
    }
}


// ==================================
// STORY VIEWER FUNCTIONS
// ==================================

const storyViewer = document.getElementById("story-viewer");
const viewerUsername = document.getElementById("viewer-username");
const viewerTime = document.getElementById("viewer-time");
const viewerImage = document.getElementById("viewer-story-image");
const viewerCaption = document.getElementById("viewer-story-caption");

// ==================================
// STORY REPLY ELEMENTS
// ==================================

const storyReplyForm = document.getElementById("story-reply-form");
const storyReplyInput = document.getElementById("story-reply-input");
const storyReplyMessage = document.getElementById("story-reply-message");
const sendStoryReplyButton = document.getElementById("send-story-reply");


// ==================================
// STORY REPLIES DISPLAY ELEMENTS
// ==================================

const viewStoryRepliesButton =
    document.getElementById("view-story-replies");

const storyRepliesContainer =
    document.getElementById("story-replies-container");


// ==================================
// OPEN STORY VIEWERS POPUP
// ==================================

async function openStoryViewers(storyId) {
    try {
        const response = await fetch(
            `/api/stories/${storyId}/views`
        );

        const result = await response.json();

        if (!response.ok) {
            throw new Error(
                result.message || "Could not load story viewers."
            );
        }

        // Remove an already-open viewers popup
        document.querySelector(".story-viewers-modal")?.remove();

        const modal = document.createElement("div");
        modal.className = "story-viewers-modal";

        const content = document.createElement("div");
        content.className = "story-viewers-content";

        const header = document.createElement("div");
        header.className = "story-viewers-header";

        const heading = document.createElement("h3");
        heading.textContent = `Story Views (${result.totalViews})`;

        const closeButton = document.createElement("button");
        closeButton.type = "button";
        closeButton.textContent = "×";

        closeButton.addEventListener("click", () => {
            modal.remove();
        });

        header.append(heading, closeButton);

        const list = document.createElement("div");
        list.className = "story-viewers-list";

        if (result.viewers.length === 0) {
            const emptyMessage = document.createElement("p");
            emptyMessage.textContent = "No views yet.";
            list.appendChild(emptyMessage);
        }

        result.viewers.forEach(viewer => {
            const row = document.createElement("div");
            row.className = "story-viewer-row";

            const avatar = document.createElement("img");
            avatar.className = "story-viewer-avatar";
            avatar.alt = viewer.username;

            avatar.src = viewer.profile_pic ||
                "https://placehold.co/100x100?text=U";

            const details = document.createElement("div");
            details.className = "story-viewer-details";

            const username = document.createElement("strong");
            username.textContent = viewer.username;

            const time = document.createElement("small");
            time.textContent = new Date(
                viewer.viewed_at + "Z"
            ).toLocaleString();

            details.append(username, time);
            row.append(avatar, details);
            list.appendChild(row);
        });

        content.append(header, list);
        modal.appendChild(content);
        document.body.appendChild(modal);

        modal.addEventListener("click", event => {
            if (event.target === modal) {
                modal.remove();
            }
        });

    } catch (error) {
        alert(error.message);
        console.error("Story viewers error:", error);
    }
}


// ==================================
// STORY VIEWER AUTO-PLAY SYSTEM
// ==================================

const STORY_DURATION = 6000;

let storyTimer = null;
let storyStartedAt = 0;
let storyRemaining = STORY_DURATION;
let storyPaused = false;

// Create the progress bar
const storyProgressTrack = document.createElement("div");
storyProgressTrack.className = "story-progress-track";

const storyProgressFill = document.createElement("div");
storyProgressFill.className = "story-progress-fill";

storyProgressTrack.appendChild(storyProgressFill);
storyViewer.appendChild(storyProgressTrack);


// Start or resume the story timer
function startStoryTimer() {
    clearTimeout(storyTimer);

    storyPaused = false;
    storyViewer.classList.remove("story-paused");

    storyStartedAt = Date.now();

    storyTimer = setTimeout(() => {
        if (currentStoryIndex < allStories.length - 1) {
            showStory(currentStoryIndex + 1);
        } else {
            closeStoryViewer();
        }
    }, storyRemaining);
}


// Pause story playback
function pauseStory() {
    if (storyViewer.hidden || storyPaused) return;

    storyPaused = true;

    clearTimeout(storyTimer);

    storyRemaining -= Date.now() - storyStartedAt;
    storyRemaining = Math.max(0, storyRemaining);

    storyViewer.classList.add("story-paused");
}


// Resume story playback
function resumeStory() {
    if (storyViewer.hidden || !storyPaused) return;

    if (storyRemaining <= 0) {
        if (currentStoryIndex < allStories.length - 1) {
            showStory(currentStoryIndex + 1);
        } else {
            closeStoryViewer();
        }
        return;
    }

    startStoryTimer();
}


// Close the story viewer
function closeStoryViewer() {
    clearTimeout(storyTimer);

    storyTimer = null;
    storyPaused = false;
    storyRemaining = STORY_DURATION;

    storyViewer.classList.remove("story-paused");
    storyViewer.hidden = true;

    viewerImage.removeAttribute("src");

    storyProgressFill.style.animation = "none";
}


// ==================================
// SHOW STORY
// ==================================

function showStory(index) {
    if (index < 0 || index >= allStories.length) return;

    clearTimeout(storyTimer);

    currentStoryIndex = index;
    storyRemaining = STORY_DURATION;
    storyPaused = false;

    const story = allStories[currentStoryIndex];

    // Show reply box only on other users' stories
const isOwnStory =
    String(story.user_id) === String(currentUser.id);

storyReplyForm.hidden = isOwnStory;
storyReplyInput.value = "";
storyReplyMessage.textContent = "";
storyReplyMessage.style.color = "";

// Show replies button only on your own story
viewStoryRepliesButton.hidden = !isOwnStory;
storyRepliesContainer.hidden = true;
storyRepliesContainer.replaceChildren();

    viewerUsername.textContent = story.username;
    viewerImage.src = story.image;
    viewerCaption.textContent = story.caption || "";

    viewerTime.textContent =
        new Date(story.created_at + "Z").toLocaleString();

    storyViewer.hidden = false;
    storyViewer.classList.remove("story-paused");

    // Restart progress bar animation
    storyProgressFill.style.animation = "none";
    void storyProgressFill.offsetWidth;

    storyProgressFill.style.animation =
        `story-progress ${STORY_DURATION}ms linear forwards`;

    // Start automatic playback
    startStoryTimer();

    // Record this story view
    fetch(`/api/stories/${story.id}/view`, {
        method: "POST"
    })
    .then(response => response.json())
    .then(result => {
        if (!result.success) {
            console.error("Could not record story view:", result.message);
        }
    })
    .catch(error => {
        console.error("Story view error:", error);
    });
}



// ==================================
// LOAD AND DISPLAY STORY REPLIES
// ==================================

viewStoryRepliesButton.addEventListener("click", async () => {
    const story = allStories[currentStoryIndex];

    if (!story) return;

    const isOpening = storyRepliesContainer.hidden;

    if (!isOpening) {
        storyRepliesContainer.hidden = true;
        viewStoryRepliesButton.textContent = "💬 View Replies";
        return;
    }

    viewStoryRepliesButton.disabled = true;
    viewStoryRepliesButton.textContent = "Loading...";

    storyRepliesContainer.hidden = false;
    storyRepliesContainer.replaceChildren(
        createElement("p", "loading", "Loading replies...")
    );

    try {
        const result = await apiRequest(
            `/api/stories/${story.id}/replies`
        );

        storyRepliesContainer.replaceChildren();

        const heading = createElement(
            "h3",
            "story-replies-heading",
            `Story Replies (${result.replies.length})`
        );

        storyRepliesContainer.appendChild(heading);

        if (result.replies.length === 0) {
            storyRepliesContainer.appendChild(
                createElement(
                    "p",
                    "story-replies-empty",
                    "No replies to this story yet."
                )
            );
        }

        result.replies.forEach(reply => {
            const row = document.createElement("div");
            row.className = "story-reply-item";

            const avatar = document.createElement("div");
avatar.className = "story-reply-avatar-fallback";

const initial = (reply.username || "?").charAt(0).toUpperCase();

avatar.textContent = initial;

avatar.style.width = "40px";
avatar.style.height = "40px";
avatar.style.minWidth = "40px";
avatar.style.borderRadius = "50%";
avatar.style.background = "#303b59";
avatar.style.color = "#ffffff";
avatar.style.display = "flex";
avatar.style.alignItems = "center";
avatar.style.justifyContent = "center";
avatar.style.fontWeight = "bold";
avatar.style.overflow = "hidden";

if (reply.profile_pic) {
    const profileImage = document.createElement("img");

    profileImage.src = reply.profile_pic;
    profileImage.alt = reply.username + "'s profile picture";
    profileImage.style.width = "100%";
    profileImage.style.height = "100%";
    profileImage.style.objectFit = "cover";

    profileImage.onerror = () => {
        profileImage.remove();
    };

    avatar.textContent = "";
    avatar.appendChild(profileImage);
}

            const details = document.createElement("div");
            details.className = "story-reply-details";

            const username = createElement(
                "strong",
                "",
                reply.username
            );

            const message = createElement(
                "p",
                "",
                reply.content
            );

            const time = createElement(
                "small",
                "",
                new Date(reply.created_at + "Z").toLocaleString()
            );

            details.append(username, message, time);
            row.append(avatar, details);

            storyRepliesContainer.appendChild(row);
        });

        viewStoryRepliesButton.textContent = "✕ Hide Replies";

    } catch (error) {
        storyRepliesContainer.replaceChildren(
            createElement("p", "story-replies-error", error.message)
        );
    } finally {
        viewStoryRepliesButton.disabled = false;
    }
});



// ==================================
// CLOSE BUTTON
// ==================================

document.getElementById("close-story-viewer")
    .addEventListener("click", closeStoryViewer);


// ==================================
// NEXT STORY
// ==================================

document.getElementById("next-story")
    .addEventListener("click", () => {
        if (currentStoryIndex < allStories.length - 1) {
            showStory(currentStoryIndex + 1);
        }
    });


// ==================================
// PREVIOUS STORY
// ==================================

document.getElementById("previous-story")
    .addEventListener("click", () => {
        if (currentStoryIndex > 0) {
            showStory(currentStoryIndex - 1);
        }
    });


// ==================================
// HOLD IMAGE TO PAUSE
// ==================================

viewerImage.addEventListener("pointerdown", (event) => {
    if (event.button !== 0) return;
    pauseStory();
});

document.addEventListener("pointerup", resumeStory);
document.addEventListener("pointercancel", resumeStory);



// ==================================
// SEND STORY REPLY
// ==================================

storyReplyForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const content = storyReplyInput.value.trim();

    if (!content) return;

    const story = allStories[currentStoryIndex];

    if (!story) return;

    sendStoryReplyButton.disabled = true;
    sendStoryReplyButton.textContent = "Sending...";

    storyReplyMessage.textContent = "";

    try {
        const result = await apiRequest(
            `/api/stories/${story.id}/replies`,
            {
                method: "POST",
                body: JSON.stringify({ content })
            }
        );

        storyReplyInput.value = "";

        storyReplyMessage.textContent = "Reply sent successfully!";
        storyReplyMessage.style.color = "#28a36a";

    } catch (error) {
        storyReplyMessage.textContent = error.message;
        storyReplyMessage.style.color = "#dc3545";

    } finally {
        sendStoryReplyButton.disabled = false;
        sendStoryReplyButton.textContent = "Send";
    }
});


// ==================================
// INITIALIZE DASHBOARD
// ==================================

async function initializeDashboard() {
    try {
        await loadProfile();
        await loadStories();
        await loadPosts();
        await loadSuggestedUsers();
        await loadFollowStats();

    } catch (error) {
        console.error(
            "Dashboard initialization failed:",
            error
        );
    }
}

initializeDashboard();



/* =================================
   PROFILE PICTURE UPLOAD
================================= */

const pictureInput = document.getElementById("profile-picture-input");
const choosePictureBtn = document.getElementById("choose-picture-btn");
const uploadPictureBtn = document.getElementById("upload-picture-btn");
const pictureMessage = document.getElementById("picture-upload-message");

let selectedProfilePicture = null;

// Open file selector
choosePictureBtn.addEventListener("click", () => {
    pictureInput.click();
});

// Select and preview profile picture
pictureInput.addEventListener("change", () => {
    const file = pictureInput.files[0];

    pictureMessage.textContent = "";
    pictureMessage.className = "";

    if (!file) {
        selectedProfilePicture = null;
        uploadPictureBtn.disabled = true;
        return;
    }

    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];

    if (!allowedTypes.includes(file.type)) {
        pictureMessage.textContent =
            "Choose a JPG, PNG or WEBP image.";

        pictureMessage.className = "error";
        pictureInput.value = "";
        selectedProfilePicture = null;
        uploadPictureBtn.disabled = true;
        return;
    }

    if (file.size > 2 * 1024 * 1024) {
        pictureMessage.textContent =
            "Image must be smaller than 2 MB.";

        pictureMessage.className = "error";
        pictureInput.value = "";
        selectedProfilePicture = null;
        uploadPictureBtn.disabled = true;
        return;
    }

    selectedProfilePicture = file;

    // Show image preview
    const previewUrl = URL.createObjectURL(file);

    const avatarImage =
        document.getElementById("profile-avatar-image");

    const avatarInitial =
        document.getElementById("profile-avatar-initial");

    avatarImage.src = previewUrl;
    avatarImage.hidden = false;
    avatarInitial.hidden = true;

    uploadPictureBtn.disabled = false;

    pictureMessage.textContent =
        "Image selected. Click Upload Photo.";
});

// Upload selected image to server
uploadPictureBtn.addEventListener("click", async () => {

    if (!selectedProfilePicture) {
        return;
    }

    const formData = new FormData();

    formData.append(
        "profilePicture",
        selectedProfilePicture
    );

    uploadPictureBtn.disabled = true;
    uploadPictureBtn.textContent = "Uploading...";

    try {
        const response = await fetch(
            "/api/me/profile-picture",
            {
                method: "POST",
                body: formData
            }
        );

        const result = await response.json();

        if (response.status === 401) {
            window.location.href = "/";
            return;
        }

        if (!response.ok) {
            throw new Error(
                result.message || "Upload failed."
            );
        }

        pictureMessage.textContent = result.message;
        pictureMessage.className = "";

        selectedProfilePicture = null;
        pictureInput.value = "";

        // Reload profile with saved image
        await loadProfile();

    } catch (error) {
        pictureMessage.textContent = error.message;
        pictureMessage.className = "error";

    } finally {
        uploadPictureBtn.disabled = true;
        uploadPictureBtn.textContent = "Upload Photo";
    }
});
 



// ==================================
// CONNECTLY NOTIFICATION CENTER
// ==================================

const notificationBell = document.getElementById("notification-bell");
const notificationBadge = document.getElementById("notification-badge");
const notificationPanel = document.getElementById("notification-panel");
const notificationList = document.getElementById("notification-list");
const markAllReadButton = document.getElementById("mark-all-read");

let notificationItems = [];

// Update unread notification badge
function updateNotificationBadge(count) {
    const unreadCount = Number(count) || 0;

    notificationBadge.textContent =
        unreadCount > 99 ? "99+" : unreadCount;

    notificationBadge.hidden = unreadCount === 0;
}

// Format notification time as "2 minutes ago"
function formatNotificationTime(dateValue) {
    const date = new Date(dateValue.replace(" ", "T") + "Z");

    if (isNaN(date.getTime())) return "";

    const seconds = Math.max(0, Math.floor(
        (Date.now() - date.getTime()) / 1000
    ));

    if (seconds < 60) return "Just now";

    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;

    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;

    const days = Math.floor(hours / 24);
    if (days < 7) return `${days} day${days === 1 ? "" : "s"} ago`;

    return date.toLocaleDateString();
}


// Display notifications
function renderNotifications() {
    notificationList.replaceChildren();

    if (notificationItems.length === 0) {
        const emptyMessage = document.createElement("p");
        emptyMessage.className = "notification-empty";
        emptyMessage.textContent = "You're all caught up! 🎉";
        notificationList.appendChild(emptyMessage);
        return;
    }

    notificationItems.forEach(notification => {
        const item = document.createElement("div");
        item.className = "notification-item";

        if (!notification.is_read) {
            item.classList.add("unread");
        }

        const avatar = document.createElement("div");
        avatar.className = "notification-avatar";

        if (notification.actor_profile_pic) {
            const image = document.createElement("img");
            image.src = notification.actor_profile_pic;
image.alt = notification.actor_username + "'s profile picture";

image.onerror = () => {
    avatar.textContent =
        (notification.actor_username || "?").charAt(0).toUpperCase();
};

avatar.appendChild(image);
        } else {
            avatar.textContent =
                (notification.actor_username || "?")
                    .charAt(0).toUpperCase();
        }

        const details = document.createElement("div");
        details.className = "notification-details";

        const message = document.createElement("p");

        const username = document.createElement("strong");
        username.textContent = notification.actor_username || "Someone";

        message.append(
            username,
            document.createTextNode(" " + notification.message)
        );

        const time = document.createElement("span");
        time.className = "notification-time";

        time.textContent = formatNotificationTime(
    notification.created_at
);

        details.append(message, time);
        item.append(avatar, details);

        item.addEventListener("click", async () => {
            try {
                if (!notification.is_read) {
                    await apiRequest(
                        `/api/notifications/${notification.id}/read`,
                        { method: "PATCH" }
                    );

                    notification.is_read = 1;

                    const unreadCount = notificationItems.filter(
                        n => !n.is_read
                    ).length;

                    updateNotificationBadge(unreadCount);
                    renderNotifications();
                }

                notificationPanel.hidden = true;
                notificationBell.setAttribute("aria-expanded", "false");

                if (notification.entity_type === "user") {
                    window.location.href =
                        `profile.html?id=${notification.entity_id}`;
                } else if (notification.entity_type === "post") {
                    window.location.href =
    `dashboard.html#post-${notification.entity_id}`;
                } else if (notification.entity_type === "conversation") {
                    window.location.href = "messages.html";
                }
            } catch (error) {
                console.error("Could not open notification:", error);
            }
        });

        notificationList.appendChild(item);
    });
}

// Load notifications from server
async function loadNotifications() {
    try {
        const result = await apiRequest("/api/notifications");

        notificationItems = result.notifications || [];

        updateNotificationBadge(result.unreadCount);
        renderNotifications();

    } catch (error) {
        console.error("Could not load notifications:", error.message);
    }
}

// Toggle notification panel
notificationBell.addEventListener("click", async () => {
    const opening = notificationPanel.hidden;

    notificationPanel.hidden = !opening;

    notificationBell.setAttribute(
        "aria-expanded",
        String(opening)
    );

    if (opening) {
        await loadNotifications();
    }
});

// Close panel when clicking outside
document.addEventListener("click", event => {
    if (
        !notificationPanel.contains(event.target) &&
        !notificationBell.contains(event.target)
    ) {
        notificationPanel.hidden = true;
        notificationBell.setAttribute("aria-expanded", "false");
    }
});

// Mark all notifications as read
markAllReadButton.addEventListener("click", async () => {
    try {
        await apiRequest("/api/notifications/read-all", {
            method: "PATCH"
        });

        notificationItems.forEach(notification => {
            notification.is_read = 1;
        });

        updateNotificationBadge(0);
        renderNotifications();

    } catch (error) {
        alert(error.message);
    }
});

// Receive new notifications instantly through existing Socket.IO connection
storySocket.on("new_notification", notification => {
    notificationItems.unshift(notification);

    notificationItems = notificationItems.slice(0, 50);

    const unreadCount = notificationItems.filter(
        n => !n.is_read
    ).length;

    updateNotificationBadge(unreadCount);
    renderNotifications();
});

// Load notifications when dashboard opens
loadNotifications();
