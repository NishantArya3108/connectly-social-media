
const signupForm = document.getElementById("signup-form");
const loginForm = document.getElementById("login-form");

const signupTab = document.getElementById("signup-tab");
const loginTab = document.getElementById("login-tab");

const formTitle = document.getElementById("form-title");
const formSubtitle = document.getElementById("form-subtitle");
const switchText = document.getElementById("switch-text");
const message = document.getElementById("message");

function showMessage(text, isError = false) {
    message.textContent = text;
    message.className = isError ? "message error" : "message";
}

function showSignup() {
    signupForm.classList.remove("hidden");
    loginForm.classList.add("hidden");

    signupTab.classList.add("active");
    loginTab.classList.remove("active");

    formTitle.textContent = "Create your account";
    formSubtitle.textContent =
        "Join the community and start connecting.";

    switchText.innerHTML =
        'Already have an account? <button type="button" id="switch-login">Log in</button>';

    document.getElementById("switch-login").addEventListener("click", showLogin);
    showMessage("");
}

function showLogin() {
    loginForm.classList.remove("hidden");
    signupForm.classList.add("hidden");

    loginTab.classList.add("active");
    signupTab.classList.remove("active");

    formTitle.textContent = "Welcome back!";
    formSubtitle.textContent =
        "Log in to continue connecting with your people.";

    switchText.innerHTML =
        'New to Connectly? <button type="button" id="switch-signup">Sign up</button>';

    document.getElementById("switch-signup").addEventListener("click", showSignup);
    showMessage("");
}

signupTab.addEventListener("click", showSignup);
loginTab.addEventListener("click", showLogin);

// Password visibility
document.querySelectorAll(".toggle-password").forEach(button => {
    button.addEventListener("click", () => {
        const input = document.getElementById(button.dataset.target);

        if (input.type === "password") {
            input.type = "text";
            button.textContent = "Hide";
        } else {
            input.type = "password";
            button.textContent = "Show";
        }
    });
});

// Registration
signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const button = signupForm.querySelector(".primary-btn");
    button.disabled = true;
    button.textContent = "Creating account...";

    const data = {
        username: document.getElementById("signup-username").value,
        email: document.getElementById("signup-email").value,
        password: document.getElementById("signup-password").value
    };

    try {
        const response = await fetch("/api/register", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data)
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.message);
        }

        showMessage("Account created successfully! Welcome to Connectly.");

        signupForm.reset();

        setTimeout(showLogin, 1500);

    } catch (error) {
        showMessage(error.message || "Something went wrong.", true);
    } finally {
        button.disabled = false;
        button.innerHTML = 'Create Account <span>→</span>';
    }
});

// Login
loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const button = loginForm.querySelector(".primary-btn");
    button.disabled = true;
    button.textContent = "Logging in...";

    const data = {
        email: document.getElementById("login-email").value,
        password: document.getElementById("login-password").value
    };

    try {
        const response = await fetch("/api/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data)
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.message);
        }

        showMessage("Login successful! Redirecting...");

setTimeout(() => {
    window.location.href = "/dashboard.html";
}, 1000);

    } catch (error) {
        showMessage(error.message || "Login failed.", true);
    } finally {
        button.disabled = false;
        button.innerHTML = 'Log In <span>→</span>';
    }
});

// Show signup page by default
showSignup();
