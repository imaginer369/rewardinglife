document.addEventListener('DOMContentLoaded', () => {
    // --- CONFIGURATION ---
    const APP_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwwm4eiWDbmMxGADofaJCkjV0V7F3KgL3PfE-QeYwhaEexl9G_5uQhIu63R_FrXUZmIZA/exec';

    // --- DOM ELEMENTS ---
    const passwordContainer = document.getElementById('password-container');
    const dashboardContainer = document.getElementById('dashboard-container');
    const passwordInput = document.getElementById('password-input');
    const submitButton = document.getElementById('submit-password');
    const logoutButton = document.getElementById('logout-button');
    const errorMessage = document.getElementById('error-message');
    const userCardsContainer = document.getElementById('user-cards-container');
    const loadingAnimation = document.getElementById('loading-animation');

    // --- MODAL ELEMENTS ---
    const addModal = document.getElementById('add-points-modal');
    const redeemModal = document.getElementById('redeem-points-modal');
    // ... (other modal elements are assumed to be fetched as needed)

    // --- APP STATE ---
    let loggedInUser = null;
    let currentPassword = null;
    let usersData = null;

    // --- UI STATE MACHINE ---
    function setUIState(state, data = null) {
        // Default to hiding all primary components
        passwordContainer.classList.add('hidden');
        dashboardContainer.classList.add('hidden');
        loadingAnimation.classList.add('hidden');
        errorMessage.textContent = '';
        submitButton.disabled = false;

        switch (state) {
            case 'login':
                passwordContainer.classList.remove('hidden');
                passwordInput.value = '';
                break;
            
            case 'loading':
                dashboardContainer.classList.remove('hidden');
                logoutButton.classList.remove('hidden');
                loadingAnimation.classList.remove('hidden');
                userCardsContainer.innerHTML = ''; // Clear old cards
                if (passwordContainer.contains(submitButton)) {
                     submitButton.disabled = true;
                }
                break;

            case 'dashboard':
                dashboardContainer.classList.remove('hidden');
                logoutButton.classList.remove('hidden');
                displayUsers(data);
                break;

            case 'error':
                passwordContainer.classList.remove('hidden');
                errorMessage.textContent = data;
                break;
        }
    }

    // --- INITIALIZATION ---
    function init() {
        const session = getSession();
        if (session) {
            currentPassword = session.password; // Needed for subsequent fetches
            loggedInUser = session.loggedInUser;
            setUIState('loading');
            fetchData()
                .then(data => {
                    usersData = data;
                    saveSession();
                    setUIState('dashboard', usersData);
                })
                .catch(error => {
                    console.error('Error fetching latest data:', error);
                    setUIState('error', 'Could not load latest data. Please try logging in again.');
                });
        } else {
            setUIState('login');
        }
    }

    // --- DATA & SESSION MANAGEMENT ---
    function fetchData() {
        return fetch(APP_SCRIPT_URL)
            .then(response => {
                if (!response.ok) throw new Error('Network response was not ok.');
                return response.json();
            })
            .then(data => {
                if (data.error) throw new Error(data.error);
                return data;
            });
    }

    function getSession() {
        const sessionJSON = localStorage.getItem('rewardingLifeSession');
        try {
            return JSON.parse(sessionJSON);
        } catch (e) {
            return null;
        }
    }

    function saveSession() {
        const session = {
            password: currentPassword,
            loggedInUser: loggedInUser,
            usersData: usersData,
            timestamp: Date.now()
        };
        localStorage.setItem('rewardingLifeSession', JSON.stringify(session));
    }

    function clearSession() {
        localStorage.removeItem('rewardingLifeSession');
        loggedInUser = null;
        currentPassword = null;
        usersData = null;
    }

    // --- EVENT LISTENERS ---
    submitButton.addEventListener('click', () => {
        const password = passwordInput.value;
        if (!password) {
            errorMessage.textContent = 'Please enter the password.';
            return;
        }
        
        loggedInUser = 'rose'; // Default user
        currentPassword = password;
        
        setUIState('loading');
        
        fetchData()
            .then(data => {
                usersData = data;
                saveSession();
                setUIState('dashboard', usersData);
            })
            .catch(error => {
                console.error('Error fetching initial data:', error);
                setUIState('error', 'Login failed. Check the password and script URL.');
            });
    });

    logoutButton.addEventListener('click', () => {
        clearSession();
        setUIState('login');
    });

    // --- UI RENDERING ---
    function displayUsers(users) {
        userCardsContainer.innerHTML = '';
        if (!users) return;
        users.forEach(user => {
            const card = document.createElement('div');
            card.className = 'user-card';
            card.dataset.username = user.username;

            const totalPoints = (user.current_local_points || 0) + (user.current_global_points || 0);
            const iconFilename = user.username.toLowerCase() + '.png';

            card.innerHTML = `
                <img src="icons/${iconFilename}" alt="${user.username} icon" class="user-icon">
                <div class="user-info">
                    <h3>${user.username}</h3>
                    <p>Local: ${user.current_local_points || 0}, Global: ${user.current_global_points || 0}</p>
                    <p><strong>Total: ${totalPoints}</strong></p>
                </div>
                <div class="button-group">
                    <button class="add-points-button">Add</button>
                    <button class="redeem-points-button">Redeem</button>
                </div>
            `;
            userCardsContainer.appendChild(card);
        });
    }

    // --- START THE APP ---
    init();

    // Note: Modal and point update logic remains unchanged and would follow here.
    // This refactoring focuses on the core loading and UI state management.
});
