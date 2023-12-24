const signInBtn = document.getElementById("signInBtn");
const signUpBtn = document.getElementById("signUpBtn");
const signInForm = document.getElementById("signInForm");
const signUpForm = document.getElementById("signUpForm");

signInBtn.addEventListener("click", () => {
  signInForm.classList.add("active");
  signUpForm.classList.remove("active");
});

signUpBtn.addEventListener("click", () => {
  signUpForm.classList.add("active");
  signInForm.classList.remove("active");
});
function conversationStart(data) {
  var textInput = document.getElementById("customer_response").value;

  ds.postRaw(
    "/conversation/deployment_queuess/" + ds.user_id,
    {
      engagement_id: eng_id,
      customer_response: textInput,
      system_response: "sr_init",
      _debug_mode: true,
      refresh_cache: true,
    },
    (data) => {
      console.log(data.response_channels);
      myUnityInstance.SendMessage(
        "Assistantcode",
        "spawnDave",
        JSON.stringify(data.response_channels)
      );

      alert(data["placeholder"])
    },
    () => {},
    true
  );
}

document.getElementById("conversationBtn").onclick = () => {
  conversationStart();
};

signInForm.addEventListener("submit", (event) => {
  event.preventDefault();
  // Handle sign in logic here
  try {
    ds = DaveService.login(
      "https://test.iamdave.ai",
      "student_test",
      document.getElementById("username").value,
      document.getElementById("password").value,
      { signup_apikey: "c3R1ZGVudF90ZXN0MTY4NjY0MjA3OC40Mw__" }
    );
    loadGame();
  } catch {
    console.log("login error");
  }
});

signUpForm.addEventListener("submit", (event) => {
  event.preventDefault();
  // Handle sign up logic here
  ds.signup(
    {
      user_id: document.getElementById("newUsername").value,
      person_type: "visitor",
      source: "web-avatar",
      origin: window.origin.location,
      validated: true,
      referrer: document.referrer,
      application: "brands",
      password: document.getElementById("newPassword").value,
    },
    (data) => {
      console.log(data);
    },
    (data) => {
      console.log(data);
    }
  ).then(loadGame);
});

if (Utills.getCookie("authentication")) {
  loadGame();
}
