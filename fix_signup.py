import re

file_path = '/home/ahror/Documents/IELTSPRACTICE2/signup.html'
with open(file_path, 'r') as f:
    html = f.read()

# 1. Terms & Policy links
html = html.replace('href="#" class="text-[#8B5CF6] font-black hover:underline">Terms of Service', 'href="./termsconditions.html" class="text-[#8B5CF6] font-black hover:underline">Terms of Service')
html = html.replace('href="#" class="text-[#8B5CF6] font-black hover:underline">Privacy Policy', 'href="./privacypolicy.html" class="text-[#8B5CF6] font-black hover:underline">Privacy Policy')

# 2. Form HTML replacements for IDs and Errors
old_form = """                        <form id="signup-form-main" class="space-y-5">
                            <!-- Full Name -->
                            <div class="space-y-1.5">
                                <label class="text-xs font-black text-gray-600 ml-2 uppercase tracking-widest">Full Name</label>
                                <div class="relative">
                                    <span class="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400">
                                        <iconify-icon icon="ph:user-bold" class="text-xl"></iconify-icon>
                                    </span>
                                    <input type="text" placeholder="John Doe" class="w-full bg-[#F9F5FF] border-2 border-transparent focus:border-[#8B5CF6] focus:bg-white rounded-2xl px-14 py-4 font-medium transition-all duration-300 outline-none">
                                </div>
                            </div>

                            <!-- Username -->
                            <div class="space-y-1.5">
                                <label class="text-xs font-black text-gray-600 ml-2 uppercase tracking-widest">Username</label>
                                <div class="relative">
                                    <span class="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400">
                                        <iconify-icon icon="ph:at-bold" class="text-xl"></iconify-icon>
                                    </span>
                                    <input type="text" placeholder="choose_your_username" class="w-full bg-[#F9F5FF] border-2 border-transparent focus:border-[#8B5CF6] focus:bg-white rounded-2xl px-14 py-4 font-medium transition-all duration-300 outline-none">
                                </div>
                            </div>

                            <!-- Email -->
                            <div class="space-y-1.5">
                                <label class="text-xs font-black text-gray-600 ml-2 uppercase tracking-widest">Email Address</label>
                                <div class="relative">
                                    <span class="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400">
                                        <iconify-icon icon="ph:envelope-bold" class="text-xl"></iconify-icon>
                                    </span>
                                    <input type="email" placeholder="you@example.com" class="w-full bg-[#F9F5FF] border-2 border-transparent focus:border-[#8B5CF6] focus:bg-white rounded-2xl px-14 py-4 font-medium transition-all duration-300 outline-none">
                                </div>
                            </div>"""

new_form = """                        <form id="signup-form-main" class="space-y-5">
                            <!-- Full Name -->
                            <div class="space-y-1.5">
                                <label class="text-xs font-black text-gray-600 ml-2 uppercase tracking-widest">Full Name</label>
                                <div class="relative">
                                    <span class="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400">
                                        <iconify-icon icon="ph:user-bold" class="text-xl"></iconify-icon>
                                    </span>
                                    <input type="text" id="fullname-input" placeholder="John Doe" class="w-full bg-[#F9F5FF] border-2 border-transparent focus:border-[#8B5CF6] focus:bg-white rounded-2xl px-14 py-4 font-medium transition-all duration-300 outline-none">
                                </div>
                                <div id="fullname-error" class="hidden text-red-500 text-xs font-bold mt-1 ml-2">Please enter your full name</div>
                            </div>

                            <!-- Username -->
                            <div class="space-y-1.5">
                                <label class="text-xs font-black text-gray-600 ml-2 uppercase tracking-widest">Username</label>
                                <div class="relative">
                                    <span class="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400">
                                        <iconify-icon icon="ph:at-bold" class="text-xl"></iconify-icon>
                                    </span>
                                    <input type="text" id="username-input" placeholder="choose_your_username" class="w-full bg-[#F9F5FF] border-2 border-transparent focus:border-[#8B5CF6] focus:bg-white rounded-2xl px-14 py-4 font-medium transition-all duration-300 outline-none">
                                </div>
                                <div id="username-error" class="hidden text-red-500 text-xs font-bold mt-1 ml-2">Username required</div>
                            </div>

                            <!-- Email -->
                            <div class="space-y-1.5">
                                <label class="text-xs font-black text-gray-600 ml-2 uppercase tracking-widest">Email Address</label>
                                <div class="relative">
                                    <span class="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400">
                                        <iconify-icon icon="ph:envelope-bold" class="text-xl"></iconify-icon>
                                    </span>
                                    <input type="email" id="email-input" placeholder="you@example.com" class="w-full bg-[#F9F5FF] border-2 border-transparent focus:border-[#8B5CF6] focus:bg-white rounded-2xl px-14 py-4 font-medium transition-all duration-300 outline-none">
                                </div>
                                <div id="email-error" class="hidden text-red-500 text-xs font-bold mt-1 ml-2">Valid email required</div>
                            </div>"""

html = html.replace(old_form, new_form)

# Add errors to Country
html = html.replace('<input type="text" id="country-input"', '<input type="text" id="country-input" name="country"')
html = html.replace('<!-- Dropdown Mock -->', '<div id="country-error" class="hidden text-red-500 text-xs font-bold mt-1 ml-2">Please select a country</div>\n                                <!-- Dropdown Mock -->')

# Update Dropdown Search
old_drop = """                                    <div class="p-2 border-b border-gray-50">
                                        <input type="text" placeholder="Search countries..." class="w-full bg-gray-50 border-none rounded-xl px-4 py-2 text-sm outline-none">
                                    </div>
                                    <div class="space-y-1 pt-2">
                                        <div class="px-4 py-2.5 hover:bg-[#F5F1FF] hover:text-[#8B5CF6] rounded-xl cursor-pointer font-bold text-sm transition-colors">United Kingdom</div>
                                        <div class="px-4 py-2.5 hover:bg-[#F5F1FF] hover:text-[#8B5CF6] rounded-xl cursor-pointer font-bold text-sm transition-colors">United States</div>
                                        <div class="px-4 py-2.5 hover:bg-[#F5F1FF] hover:text-[#8B5CF6] rounded-xl cursor-pointer font-bold text-sm transition-colors">Uzbekistan</div>
                                        <div class="px-4 py-2.5 hover:bg-[#F5F1FF] hover:text-[#8B5CF6] rounded-xl cursor-pointer font-bold text-sm transition-colors">India</div>
                                        <div class="px-4 py-2.5 hover:bg-[#F5F1FF] hover:text-[#8B5CF6] rounded-xl cursor-pointer font-bold text-sm transition-colors">Canada</div>
                                        <div class="px-4 py-2.5 hover:bg-[#F5F1FF] hover:text-[#8B5CF6] rounded-xl cursor-pointer font-bold text-sm transition-colors">Australia</div>
                                    </div>"""

new_drop = """                                    <div class="p-2 border-b border-gray-50">
                                        <input type="text" id="country-search" placeholder="Search countries..." class="w-full bg-gray-50 border-none rounded-xl px-4 py-2 text-sm outline-none">
                                    </div>
                                    <div class="space-y-1 pt-2" id="country-list">
                                        <!-- Javascript Populated -->
                                    </div>"""

html = html.replace(old_drop, new_drop)

# Password eye toggle and error
old_pw = """                                    <button type="button" class="absolute right-5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#8B5CF6]">
                                        <iconify-icon icon="ph:eye-bold" class="text-xl"></iconify-icon>
                                    </button>
                                </div>"""

new_pw = """                                    <button type="button" id="pw-toggle" class="absolute right-5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#8B5CF6]">
                                        <iconify-icon id="pw-icon" icon="ph:eye-bold" class="text-xl"></iconify-icon>
                                    </button>
                                </div>
                                <div id="password-error" class="hidden text-red-500 text-xs font-bold mt-1 ml-2">Password must be at least 8 characters</div>"""

html = html.replace(old_pw, new_pw)

# Terms checkbox and submit button ID
html = html.replace('<input type="checkbox" class="mt-1 w-5 h-5 rounded-lg border-2 border-purple-100 text-[#8B5CF6] focus:ring-[#8B5CF6] transition-all">', '<input type="checkbox" id="terms-checkbox" class="mt-1 w-5 h-5 rounded-lg border-2 border-purple-100 text-[#8B5CF6] focus:ring-[#8B5CF6] transition-all">')
html = html.replace('</label>\n\n                            <button type="submit"', '</label>\n                            <div id="terms-error" class="hidden text-red-500 text-xs font-bold ml-2">You must agree to the Terms</div>\n\n                            <div id="signup-error" class="hidden p-4 rounded-xl bg-red-50 text-red-600 font-bold text-sm text-center"></div>\n                            <button type="submit" id="submit-btn"')

# Javascript
old_js = """        // Handle Signup Form submission to navigate to verify email page
        document.getElementById('signup-form-main').addEventListener('submit', (e) => {
            e.preventDefault();
            window.location.href = './verify-email.html';
        });"""

new_js = """        // Toggle Password Eye
        const pwToggle = document.getElementById('pw-toggle');
        const pwIcon = document.getElementById('pw-icon');
        pwToggle.addEventListener('click', () => {
            if (passwordInput.type === 'password') {
                passwordInput.type = 'text';
                pwIcon.setAttribute('icon', 'ph:eye-slash-bold');
            } else {
                passwordInput.type = 'password';
                pwIcon.setAttribute('icon', 'ph:eye-bold');
            }
        });

        // Live Username Validation
        const usernameInput = document.getElementById('username-input');
        const usernameError = document.getElementById('username-error');
        let unTimer;
        usernameInput.addEventListener('input', () => {
            clearTimeout(unTimer);
            usernameError.classList.add('hidden');
            usernameError.classList.remove('text-green-500', 'text-red-500');
            if(usernameInput.value.trim().length >= 3) {
                unTimer = setTimeout(async () => {
                    try {
                        const res = await fetch(`/api/auth/check-username?username=${encodeURIComponent(usernameInput.value)}`);
                        const data = await res.json();
                        if (!data.available) {
                            usernameError.textContent = data.message || "This username has already been taken";
                            usernameError.classList.remove('hidden', 'text-green-500');
                            usernameError.classList.add('text-red-500');
                        } else {
                            usernameError.textContent = "Username is available!";
                            usernameError.classList.remove('hidden', 'text-red-500');
                            usernameError.classList.add('text-green-500');
                        }
                    } catch (e) {}
                }, 400);
            }
        });

        // Load Countries
        const COUNTRIES = [
          "Afghanistan","Albania","Algeria","Andorra","Angola","Antigua & Barbuda","Argentina","Armenia","Australia","Austria","Azerbaijan",
          "Bahamas","Bahrain","Bangladesh","Barbados","Belarus","Belgium","Belize","Benin","Bhutan","Bolivia","Bosnia & Herz.","Botswana","Brazil","Brunei","Bulgaria","Burkina Faso","Burundi","Cabo Verde","Cambodia","Cameroon","Canada","Central African Rep.","Chad","Chile","China","Colombia","Comoros","Congo","Costa Rica","Croatia","Cuba","Cyprus","Czechia","Denmark","Djibouti","Dominica","Dominican Rep.","East Timor","Ecuador","Egypt","El Salvador","Equatorial Guinea","Eritrea","Estonia","Eswatini","Ethiopia","Fiji","Finland","France","Gabon","Gambia","Georgia","Germany","Ghana","Greece","Grenada","Guatemala","Guinea","Guinea-Bissau","Guyana","Haiti","Honduras","Hungary","Iceland","India","Indonesia","Iran","Iraq","Ireland","Israel","Italy","Jamaica","Japan","Jordan","Kazakhstan","Kenya","Kiribati","North Korea","South Korea","Kosovo","Kuwait","Kyrgyzstan","Laos","Latvia","Lebanon","Lesotho","Liberia","Libya","Liechtenstein","Lithuania","Luxembourg","Madagascar","Malawi","Malaysia","Maldives","Mali","Malta","Marshall Islands","Mauritania","Mauritius","Mexico","Micronesia","Moldova","Monaco","Mongolia","Montenegro","Morocco","Mozambique","Myanmar","Namibia","Nauru","Nepal","Netherlands","New Zealand","Nicaragua","Niger","Nigeria","North Macedonia","Norway","Oman","Pakistan","Palau","Palestine","Panama","Papua New Guinea","Paraguay","Peru","Philippines","Poland","Portugal","Qatar","Romania","Russia","Rwanda","Saint Kitts & Nevis","Saint Lucia","Samoa","San Marino","Sao Tome & Principe","Saudi Arabia","Senegal","Serbia","Seychelles","Sierra Leone","Singapore","Slovakia","Slovenia","Solomon Islands","Somalia","South Africa","South Sudan","Spain","Sri Lanka","Sudan","Suriname","Sweden","Switzerland","Syria","Taiwan","Tajikistan","Tanzania","Thailand","Togo","Tonga","Trinidad & Tobago","Tunisia","Turkey","Turkmenistan","Tuvalu","Uganda","Ukraine","United Arab Emir.","United Kingdom","United States","Uruguay","Uzbekistan","Vanuatu","Vatican City","Venezuela","Vietnam","Yemen","Zambia","Zimbabwe"
        ];
        
        const countryList = document.getElementById('country-list');
        const searchCountry = document.getElementById('country-search');
        
        function populateCountries(filter = '') {
            countryList.innerHTML = '';
            const filtered = COUNTRIES.filter(c => c.toLowerCase().includes(filter.toLowerCase()));
            if (!filtered.length) {
                countryList.innerHTML = '<div class="px-4 py-2 text-sm text-gray-400">No countries found</div>';
                return;
            }
            filtered.forEach(c => {
                const div = document.createElement('div');
                div.className = "px-4 py-2.5 hover:bg-[#F5F1FF] hover:text-[#8B5CF6] rounded-xl cursor-pointer font-bold text-sm transition-colors";
                div.textContent = c;
                div.onclick = (e) => {
                    countryInput.value = c;
                    countryDropdown.classList.add('hidden');
                    document.getElementById('country-error').classList.add('hidden');
                };
                countryList.appendChild(div);
            });
        }
        populateCountries();
        searchCountry.addEventListener('input', (e) => populateCountries(e.target.value));

        // Form Validation & Submit
        document.getElementById('signup-form-main').addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const fullName = document.getElementById('fullname-input').value.trim();
            const username = document.getElementById('username-input').value.trim();
            const email = document.getElementById('email-input').value.trim();
            const password = passwordInput.value;
            const country = countryInput.value;
            const terms = document.getElementById('terms-checkbox').checked;
            
            let isValid = true;
            
            const setErr = (id, valid) => {
                const el = document.getElementById(id);
                if(!valid) { el.classList.remove('hidden'); isValid = false; }
                else { el.classList.add('hidden'); }
            };

            setErr('fullname-error', fullName.length >= 2);
            setErr('username-error', username.length >= 3 && !usernameError.classList.contains('text-red-500'));
            setErr('email-error', /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(email));
            setErr('password-error', password.length >= 8);
            setErr('country-error', country !== '');
            setErr('terms-error', terms);

            if (!isValid) return;

            const submitBtn = document.getElementById('submit-btn');
            submitBtn.disabled = true;
            submitBtn.querySelector('#btn-text').textContent = 'Creating...';
            submitBtn.querySelector('#btn-spinner').classList.remove('hidden');

            try {
                const res = await fetch('/api/auth/signup', {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({
                        full_name: fullName,
                        username: username,
                        email: email,
                        password: password,
                        country: country,
                        role: 'STUDENT'
                    })
                });
                const data = await res.json();
                
                if (res.ok) {
                    localStorage.setItem('pendingEmail', email);
                    window.location.href = './verify-email.html';
                } else {
                    const errBox = document.getElementById('signup-error');
                    errBox.textContent = data.message || 'Registration failed';
                    errBox.classList.remove('hidden');
                }
            } catch (err) {
                const errBox = document.getElementById('signup-error');
                errBox.textContent = 'Network error. Please try again later.';
                errBox.classList.remove('hidden');
            } finally {
                submitBtn.disabled = false;
                submitBtn.querySelector('#btn-text').textContent = 'Create Free Account';
                submitBtn.querySelector('#btn-spinner').classList.add('hidden');
            }
        });"""

html = html.replace(old_js, new_js)

# Delete the mock default dropdown click listeners since I overwrote them dynamically
old_mock_js = """        // Select country mock
        countryDropdown.querySelectorAll('.cursor-pointer').forEach(opt => {
            opt.addEventListener('click', (e) => {
                countryInput.value = e.target.innerText;
                countryDropdown.classList.add('hidden');
            });
        });"""

html = html.replace(old_mock_js, '')

with open(file_path, 'w') as f:
    f.write(html)
print("done")
