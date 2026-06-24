const axios = require('axios');

// Base configuration
const API_URL = 'http://localhost:4000';

/**
 * Make a request to the API
 */
async function makeRequest(method, endpoint, data = null) {
  try {
    const config = {
      method,
      url: `${API_URL}${endpoint}`,
      data,
      validateStatus: () => true // Don't throw on error status codes
    };
    const response = await axios(config);
    return { status: response.status, data: response.data };
  } catch (error) {
    return { status: 500, data: { success: false, message: error.message } };
  }
}

/**
 * Make an authorized request to the API
 */
async function makeAuthorizedRequest(method, endpoint, token, data = null) {
  try {
    const config = {
      method,
      url: `${API_URL}${endpoint}`,
      headers: { 'Authorization': `Bearer ${token}` },
      data,
      validateStatus: () => true
    };
    const response = await axios(config);
    return { status: response.status, data: response.data };
  } catch (error) {
    return { status: 500, data: { success: false, message: error.message } };
  }
}

async function test() {
  console.log('🚀 Starting End-to-End Onboarding Flow Test (v1)...');
  console.log('='.repeat(60));

  try {
    // Step 1: Check if server is running
    console.log('\n🔍 Step 1: Checking API health...');
    const healthRes = await makeRequest('GET', '/api/v1/health');
    if (healthRes.status !== 200) {
      console.log('❌ Server not responding at http://localhost:4000. Please start it with "npm run dev" or similar.');
      return;
    }
    console.log(`   ✓ Server is UP (Version: ${healthRes.data.version})`);

    // Step 2: Create a new test user
    const testUsername = `testuser-${Date.now()}`;
    const testEmail = `${testUsername}@test.com`;
    const testPassword = 'TestPass123!';

    console.log(`\n✉️  Step 2: Signup new user (${testEmail})...`);
    const signupRes = await makeRequest('POST', '/api/v1/auth/signup', {
      full_name: 'Test User',
      email: testEmail,
      password: testPassword,
      username: testUsername
    });

    if (signupRes.status === 201 || (signupRes.status === 200 && signupRes.data.success)) {
      console.log('   ✓ Signup successful');

      // Step 3: Get verification code (simulated)
      console.log('\n📧 Step 3: Verifying email...');
      const verificationRes = await makeRequest('POST', '/api/v1/auth/verify', {
        email: testEmail,
        code: '123456' // In a real test, you'd get this from DB/Logs
      });

      if (verificationRes.status === 200 || verificationRes.status === 201) {
        console.log('   ✓ Email verified');

        // Step 4: Login
        console.log(`\n🔐 Step 4: Logging in...`);
        const loginRes = await makeRequest('POST', '/api/v1/auth/login', {
          email: testEmail,
          password: testPassword
        });

        if (loginRes.status === 200 && loginRes.data.success) {
          const token = loginRes.data.token;
          console.log(`   ✓ Login successful`);
          console.log(`   ✓ Token: ${token.substring(0, 20)}...`);

          // Step 5: Get profile to check onboarding status
          console.log(`\n👤 Step 5: Fetching user profile...`);
          const profileRes = await makeAuthorizedRequest('GET', '/api/v1/user/profile', token);

          if (profileRes.status === 200 && profileRes.data.success) {
            const profile = profileRes.data.data;
            console.log(`   ✓ Profile fetched`);
            console.log(`   ✓ Email: ${profile.email}`);
            console.log(`   ✓ Onboarding Complete: ${profile.onboardingComplete}`);

            if (profile.onboardingComplete === false) {
              console.log(`\n   ✓✓✓ PERFECT - User needs onboarding modal!`);

              // Step 6: Submit onboarding data
              console.log(`\n💾 Step 6: Submitting onboarding data...`);
              const onboardingRes = await makeAuthorizedRequest('POST', '/api/v1/user/onboarding', token, {
                examDate: '2024-12-25',
                isExamDateUnsure: false,
                targetBand: '7.5',
                sourceOfExposure: 'Friend'
              });

              if (onboardingRes.status === 200 && onboardingRes.data.success) {
                console.log(`   ✓ Onboarding data submitted`);

                // Step 7: Get profile again to verify save
                console.log(`\n🔄 Step 7: Fetching profile again to verify save...`);
                const profileRes2 = await makeAuthorizedRequest('GET', '/api/v1/user/profile', token);

                if (profileRes2.status === 200 && profileRes2.data.success) {
                  const profile2 = profileRes2.data.data;
                  console.log(`   ✓ Profile re-fetched`);
                  console.log(`   ✓ Onboarding Complete: ${profile2.onboardingComplete}`);
                  console.log(`   ✓ Target Band: ${profile2.targetBand}`);

                  if (profile2.onboardingComplete === true) {
                    console.log(`\n✅ ✅ SUCCESS! Onboarding data saved to database via v1 API!`);
                  } else {
                    console.log(`\n⚠️  WARNING - onboardingComplete still false after save!`);
                  }
                } else {
                  console.log(`   ❌ Failed to fetch profile again: ${profileRes2.status}`);
                }
              } else {
                console.log(`   ❌ Failed to submit onboarding: ${onboardingRes.status}`);
              }
            } else {
              console.log(`\n   ❌ User already has onboarding complete = ${profile.onboardingComplete}`);
            }
          } else {
            console.log(`   ❌ Failed to fetch profile: ${profileRes.status}`);
          }
        } else {
          console.log(`   ❌ Login failed: ${loginRes.status}`);
        }
      } else {
        console.log(`   ❌ Email verification failed: ${verificationRes.status}`);
      }
    } else {
      console.log(`   ❌ Signup failed: ${signupRes.status}`);
      console.log(`   Response:`, signupRes.data);
    }

    console.log('\n' + '='.repeat(60));
    console.log('✨ Test completed!\n');

  } catch (error) {
    console.error('❌ Test error:', error.message);
  }
}

test().catch(console.error);
