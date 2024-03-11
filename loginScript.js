const signInBtn = document.getElementById("signInBtn");
const signUpBtn = document.getElementById("signUpBtn");
const signInForm = document.getElementById("signInForm");
const signUpForm = document.getElementById("signUpForm");


const date = new Date();

let day = date.getDate();
let month = date.getMonth() + 1;
let year = date.getFullYear();

// This arrangement can be altered based on how we want the date's format to appear.
let currentDate = `${day}-${month}-${year}`;
// console.log(currentDate)

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

      // alert(data["placeholder"])
      showPopup(data["placeholder"].length / 13, data["placeholder"]);
    },
    () => {},
    true
  );
}

document.getElementById("conversationBtn").onclick = () => {
  conversationStart();
  showPopup(1, "Response Sent!");
};

signInForm.addEventListener("submit", (event) => {
  event.preventDefault();
  // Handle sign in logic here
  if (document.getElementById("token").value == currentDate) {
    try {
      ds = DaveService.login(
        "https://test.iamdave.ai",
        "student_test",
        document.getElementById("username").value,
        document.getElementById("password").value,
        { signup_apikey: "c3R1ZGVudF90ZXN0MTY4NjY0MjA3OC40Mw__" }
      );
      
    } catch {
      console.log("login error");
    }
    loadGame();
    }
    else {
      alert("Invalid Token");
    }
  
  
});

signUpForm.addEventListener("submit", (event) => {
  event.preventDefault();
  // Handle sign up logic here
  if (document.getElementById("newToken").value == currentDate) {
    
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
  }
  else {
    alert("Invalid Token");
  }
});

if (Utills.getCookie("authentication")) {
  loadGame();
}
