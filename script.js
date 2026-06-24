// Section navigation
const navButtons = document.querySelectorAll('.nav-btn');
const sections = document.querySelectorAll('.section');
const heroButtons = document.querySelectorAll('.primary-btn, .secondary-btn');

function showSection(id) {
    sections.forEach(sec => {
        sec.classList.toggle('active', sec.id === id);
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

navButtons.forEach(btn => {
    btn.addEventListener('click', () => {
        const target = btn.getAttribute('data-target');
        showSection(target);
    });
});

heroButtons.forEach(btn => {
    btn.addEventListener('click', () => {
        const target = btn.getAttribute('data-target');
        if (target) showSection(target);
    });
});

// Login modal
const loginBtn = document.getElementById('loginBtn');
const loginModal = document.getElementById('loginModal');
const closeLogin = document.getElementById('closeLogin');
const submitLogin = document.getElementById('submitLogin');
const loginMessage = document.getElementById('loginMessage');

loginBtn.addEventListener('click', () => {
    loginModal.classList.remove('hidden');
    loginMessage.textContent = '';
});

closeLogin.addEventListener('click', () => {
    loginModal.classList.add('hidden');
});

submitLogin.addEventListener('click', () => {
    const user = document.getElementById('username').value.trim();
    const pass = document.getElementById('password').value.trim();

    // Placeholder logic – swap with real auth later
    if (user && pass) {
        loginMessage.textContent = `Access granted, ${user}.`;
        showSection('dashboard');
        setTimeout(() => loginModal.classList.add('hidden'), 800);
    } else {
        loginMessage.textContent = 'Enter both username and password.';
    }
});

// Bot API ping (placeholder)
const pingBotBtn = document.getElementById('pingBotBtn');
const botStatus = document.getElementById('botStatus');

pingBotBtn.addEventListener('click', async () => {
    botStatus.textContent = 'Pinging...';

    try {
        // Replace with your real bot API endpoint when ready:
        // const res = await fetch('https://your-bot-api.example.com/status');
        // const data = await res.json();
        // botStatus.textContent = data.online ? 'Online' : 'Offline';

        // Simulated response for now:
        setTimeout(() => {
            botStatus.textContent = 'Online (simulated)';
        }, 700);
    } catch (e) {
        botStatus.textContent = 'Error contacting bot.';
    }
});
