// Neumorphism Login Form JavaScript
class NeumorphismLoginForm {
  constructor() {
    this.form = document.getElementById("loginForm");
    this.emailInput = document.getElementById("email");
    this.passwordInput = document.getElementById("password");
    this.passwordToggle = document.getElementById("passwordToggle");
    this.submitButton = this.form.querySelector(".login-btn");
    this.successMessage = document.getElementById("successMessage");
    this.socialButtons = document.querySelectorAll(".neu-social");

    // Guest Keypad Elements
    this.loginCard = document.querySelector(".login-card");
    this.keypadContainer = document.getElementById("keypadContainer");
    this.pinDisplay = document.getElementById("pinDisplay");
    this.pinSlots = document.querySelectorAll(".pin-slot");
    this.keypadGrid = document.getElementById("keypadGrid");
    this.pinError = document.getElementById("pinError");
    this.pinSuccess = document.getElementById("pinSuccess");
    this.closeGuestModal = document.getElementById("closeGuestModal");
    this.guestTrigger = document.getElementById("guestTrigger");

    // PIN State
    this.currentPin = "";
    this.validPins = []; // Will be validated via Supabase RPC

    // Supabase
    this.supabase = null;

    this.init();
  }

  init() {
    this.bindEvents();
    this.setupPasswordToggle();
    this.setupSocialButtons();
    this.setupNeumorphicEffects();
    this.initGuestMode();
    this.initSupabase();
    this.checkInitialSession();
  }

  bindEvents() {
    this.form.addEventListener("submit", (e) => this.handleSubmit(e));
    this.emailInput.addEventListener("blur", () => this.validateEmail());
    this.passwordInput.addEventListener("blur", () => this.validatePassword());
    this.emailInput.addEventListener("input", () => this.clearError("email"));
    this.passwordInput.addEventListener("input", () =>
      this.clearError("password")
    );

    // Add soft press effects to inputs
    [this.emailInput, this.passwordInput].forEach((input) => {
      input.addEventListener("focus", (e) => this.addSoftPress(e));
      input.addEventListener("blur", (e) => this.removeSoftPress(e));
    });
  }

  setupPasswordToggle() {
    this.passwordToggle.addEventListener("click", () => {
      const type = this.passwordInput.type === "password" ? "text" : "password";
      this.passwordInput.type = type;

      this.passwordToggle.classList.toggle("show-password", type === "text");

      // Add soft click animation
      this.animateSoftPress(this.passwordToggle);
    });
  }

  setupSocialButtons() {
    this.socialButtons.forEach((button) => {
      button.addEventListener("click", (e) => {
        this.animateSoftPress(button);

        // Determine which social platform based on SVG content
        const svgPath = button.querySelector("svg path").getAttribute("d");
        let provider = "Social";
        if (svgPath.includes("22.56")) provider = "Google";
        else if (svgPath.includes("github")) provider = "GitHub";
        else if (svgPath.includes("23.953")) provider = "Twitter";

        this.handleSocialLogin(provider, button);
      });
    });
  }

  setupNeumorphicEffects() {
    // Add hover effects to all neumorphic elements
    const neuElements = document.querySelectorAll(
      ".neu-icon, .neu-checkbox, .neu-social"
    );
    neuElements.forEach((element) => {
      element.addEventListener("mouseenter", () => {
        element.style.transform = "scale(1.05)";
      });

      element.addEventListener("mouseleave", () => {
        element.style.transform = "scale(1)";
      });
    });

    // Add ambient light effect on mouse move
    document.addEventListener("mousemove", (e) => {
      this.updateAmbientLight(e);
    });
  }

  updateAmbientLight(e) {
    const card = document.querySelector(".login-card");
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const angleX = (x - centerX) / centerX;
    const angleY = (y - centerY) / centerY;

    const shadowX = angleX * 30;
    const shadowY = angleY * 30;

    card.style.boxShadow = `
            ${shadowX}px ${shadowY}px 60px #bec3cf,
            ${-shadowX}px ${-shadowY}px 60px #ffffff
        `;
  }

  addSoftPress(e) {
    const inputGroup = e.target.closest(".neu-input");
    inputGroup.style.transform = "scale(0.98)";
  }

  removeSoftPress(e) {
    const inputGroup = e.target.closest(".neu-input");
    inputGroup.style.transform = "scale(1)";
  }

  animateSoftPress(element) {
    element.style.transform = "scale(0.95)";
    setTimeout(() => {
      element.style.transform = "scale(1)";
    }, 150);
  }

  validateEmail() {
    const email = this.emailInput.value.trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!email) {
      this.showError("email", "Email is required");
      return false;
    }

    if (!emailRegex.test(email)) {
      this.showError("email", "Please enter a valid email");
      return false;
    }

    this.clearError("email");
    return true;
  }

  validatePassword() {
    const password = this.passwordInput.value;

    if (!password) {
      this.showError("password", "Password is required");
      return false;
    }

    if (password.length < 6) {
      this.showError("password", "Password must be at least 6 characters");
      return false;
    }

    this.clearError("password");
    return true;
  }

  showError(field, message) {
    const formGroup = document.getElementById(field).closest(".form-group");
    const errorElement = document.getElementById(`${field}Error`);

    formGroup.classList.add("error");
    errorElement.textContent = message;
    errorElement.classList.add("show");

    // Add gentle shake animation
    const input = document.getElementById(field);
    input.style.animation = "gentleShake 0.5s ease-in-out";
    setTimeout(() => {
      input.style.animation = "";
    }, 500);
  }

  clearError(field) {
    const formGroup = document.getElementById(field).closest(".form-group");
    const errorElement = document.getElementById(`${field}Error`);

    formGroup.classList.remove("error");
    errorElement.classList.remove("show");
    setTimeout(() => {
      errorElement.textContent = "";
    }, 300);
  }

  async handleSubmit(e) {
    e.preventDefault();

    const isEmailValid = this.validateEmail();
    const isPasswordValid = this.validatePassword();

    if (!isEmailValid || !isPasswordValid) {
      this.animateSoftPress(this.submitButton);
      return;
    }

    this.setLoading(true);

    try {
      if (!this.supabase) throw new Error("Supabase not initialized");

      // For demo, simulate email/password login; in production, use supabase.auth.signInWithPassword
      // Assuming a users table exists with email/password
      const { data, error } = await this.supabase.auth.signInWithPassword({
        email: this.emailInput.value,
        password: this.passwordInput.value
      });

      if (error) throw error;

      console.log("Login success:", data);
      this.showNeumorphicSuccess();
    } catch (error) {
      console.error("Login error:", error);
      this.showError("password", "Login failed. Please try again.");
    } finally {
      this.setLoading(false);
    }
  }

  async handleSocialLogin(provider, button) {
    console.log(`Initiating ${provider} login...`);

    // Add loading state to button
    button.style.pointerEvents = "none";
    button.style.opacity = "0.7";

    try {
      await new Promise((resolve) => setTimeout(resolve, 1500));
      console.log(`Redirecting to ${provider} authentication...`);
      // window.location.href = `/auth/${provider.toLowerCase()}`;
    } catch (error) {
      console.error(`${provider} authentication failed: ${error.message}`);
    } finally {
      button.style.pointerEvents = "auto";
      button.style.opacity = "1";
    }
  }

  setLoading(loading) {
    this.submitButton.classList.toggle("loading", loading);
    this.submitButton.disabled = loading;

    // Disable social buttons during login
    this.socialButtons.forEach((button) => {
      button.style.pointerEvents = loading ? "none" : "auto";
      button.style.opacity = loading ? "0.6" : "1";
    });
  }

  showNeumorphicSuccess() {
    // Soft fade out form
    this.form.style.transform = "scale(0.95)";
    this.form.style.opacity = "0";

    setTimeout(() => {
      this.form.style.display = "none";
      document.querySelector(".social-login").style.display = "none";
      document.querySelector(".signup-link").style.display = "none";

      // Show success with soft animation
      this.successMessage.classList.add("show");

      // Animate success icon
      const successIcon = this.successMessage.querySelector(".neu-icon");
      successIcon.style.animation = "successPulse 0.6s ease-out";
    }, 300);

    // Simulate redirect
    setTimeout(() => {
      console.log("Redirecting to dashboard...");
      // window.location.href = '/dashboard';
    }, 2500);
  }

  // Guest Keypad Methods
  initGuestMode() {
    if (!this.guestTrigger) return;

    this.guestTrigger.addEventListener("click", (e) => {
      e.preventDefault();
      this.showKeypadInterface();
    });

    this.closeGuestModal.addEventListener("click", () => {
      this.hideKeypadInterface();
    });

    // Keypad buttons
    this.keypadGrid.addEventListener("click", (e) => {
      const btn = e.target.closest(".neu-keypad-btn");
      if (!btn) return;

      const digit = btn.dataset.digit;
      const action = btn.dataset.action;
      const oauth = btn.dataset.oauth;

      if (digit !== undefined) {
        this.handleDigit(digit);
      } else if (action === "backspace") {
        this.handleBackspace();
      } else if (action === "clear") {
        this.handleClear();
      } else if (oauth) {
        this.handleOAuth(oauth, btn);
      }

      this.animateSoftPress(btn);
    });
  }

  initSupabase() {
    // Supabase credentials
    const SUPABASE_URL = "https://uxcxnidgebtrgggmvyph.supabase.co";
    const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV4Y3huaWRnZWJ0cmdnZ212eXBoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk5MTgzNjgsImV4cCI6MjA3NTQ5NDM2OH0.SsIPnNO1Nj-38Qb6_ZRKTrjGi5f6v8hVdoI0YUxFxqw";

    if (SUPABASE_ANON_KEY === "your-anon-public-key") {
      console.warn("Supabase anon key not set. OAuth buttons will simulate login instead of authenticating.");
      return;
    }

    const { createClient } = supabase;
    this.supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    this.supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session) {
        console.log("Auth success:", session);
        // Unified success handling for both OAuth and PIN/guest
        if (this.keypadContainer.style.display !== "none") {
          this.showPinSuccess();
        } else {
          this.showNeumorphicSuccess();
        }
        this.scheduleRedirect();
      } else if (event === "SIGNED_OUT") {
        console.log("User signed out");
      }
    });
  }

  showKeypadInterface() {
    if (this.loginCard && this.keypadContainer) {
      this.loginCard.style.display = "none";
      this.keypadContainer.style.display = "block";
    }
    this.currentPin = "";
    this.updateDisplay();
    this.clearPinError();
  }

  hideKeypadInterface() {
    if (this.loginCard && this.keypadContainer) {
      this.keypadContainer.style.display = "none";
      this.loginCard.style.display = "block";
    }
  }

  handleDigit(digit) {
    if (this.currentPin.length < 5) {
      this.currentPin += digit;
      this.updateDisplay();
      if (this.currentPin.length === 5) {
        this.validatePin();
      }
    }
  }

  handleBackspace() {
    this.currentPin = this.currentPin.slice(0, -1);
    this.updateDisplay();
  }

  handleClear() {
    this.currentPin = "";
    this.updateDisplay();
  }

  updateDisplay() {
    this.pinSlots.forEach((slot, index) => {
      if (index < this.currentPin.length) {
        slot.classList.add("filled");
      } else {
        slot.classList.remove("filled");
      }
    });
  }

  async validatePin() {
    if (!this.supabase) {
      console.error("Supabase not initialized");
      this.showPinError();
      return;
    }

    try {
      const { data, error } = await this.supabase.rpc('validate_pin', {
        pin_input: this.currentPin
      });

      if (error) throw error;

      if (data && data.valid) {
        // Sign in anonymously for guest session
        const { data: sessionData, error: sessionError } = await this.supabase.auth.signInAnonymously();
        if (sessionError) throw sessionError;

        console.log("Guest session created:", sessionData);
        this.showPinSuccess();
        this.scheduleRedirect();
      } else {
        this.showPinError();
        this.currentPin = "";
        this.updateDisplay();
      }
    } catch (error) {
      console.error("PIN validation error:", error);
      this.showPinError();
      this.currentPin = "";
      this.updateDisplay();
    }
  }

  showPinError() {
    this.pinError.textContent = "Invalid PIN. Try again.";
    this.pinError.classList.add("show");

    // Shake animation on keypad
    this.keypadGrid.style.animation = "gentleShake 0.5s ease-in-out";
    setTimeout(() => {
      this.keypadGrid.style.animation = "";
    }, 500);

    setTimeout(() => {
      this.clearPinError();
    }, 2000);
  }

  clearPinError() {
    this.pinError.classList.remove("show");
    this.pinError.textContent = "";
  }

  showPinSuccess() {
    this.pinSuccess.classList.add("show");
    this.keypadGrid.style.opacity = "0.5";
    this.keypadGrid.style.pointerEvents = "none";
  }

  async checkInitialSession() {
    if (!this.supabase) return;

    try {
      const { data: { session } } = await this.supabase.auth.getSession();
      if (session) {
        console.log("Existing session detected, redirecting...");
        this.scheduleRedirect();
      }
    } catch (error) {
      console.error("Error checking initial session:", error);
    }
  }

  scheduleRedirect() {
    setTimeout(() => {
      window.location.href = "wsp-assets/main.html";
    }, 2000);
  }

  handleOAuth(provider, button) {
    if (!this.supabase) {
      console.log(`Simulating ${provider} OAuth login...`);
      this.showPinSuccess();
      this.scheduleRedirect();
      return;
    }

    button.style.pointerEvents = "none";
    button.style.opacity = "0.7";

    this.supabase.auth.signInWithOAuth({
      provider: provider,
      options: {
        redirectTo: window.location.origin // Redirect back to current page after auth
      }
    }).then(() => {
      // On success, the onAuthStateChange will handle
    }).catch((error) => {
      console.error(`${provider} OAuth error:`, error);
      this.showPinError(); // Show error if fails
      button.style.pointerEvents = "auto";
      button.style.opacity = "1";
    });
  }
}

// Add custom animations
if (!document.querySelector("#neu-keyframes")) {
  const style = document.createElement("style");
  style.id = "neu-keyframes";
  style.textContent = `
        @keyframes gentleShake {
            0%, 100% { transform: translateX(0); }
            25% { transform: translateX(-3px); }
            75% { transform: translateX(3px); }
        }
        
        @keyframes successPulse {
            0% { transform: scale(0.8); opacity: 0; }
            50% { transform: scale(1.1); }
            100% { transform: scale(1); opacity: 1; }
        }
    `;
  document.head.appendChild(style);
}

// Initialize the form when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  new NeumorphismLoginForm();
});
