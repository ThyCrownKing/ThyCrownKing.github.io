// Read token from URL fragment after OAuth login
(function () {
  const hash = window.location.hash;
  if (hash.includes("token=")) {
    const token = hash.split("token=")[1];
    localStorage.setItem("admin_jwt", token);

    // Clean URL and redirect to admin panel
    window.location.href = "admin.html";
  }
})();
