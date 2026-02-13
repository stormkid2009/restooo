
const API_URL = 'http://localhost:3000/api/v1';
const TEST_EMAIL = `test-customer-${Date.now()}@example.com`;
const TEST_PASSWORD = 'password123';

async function verifyAuth() {
    console.log('Running Auth Verification...\n');

    try {
        // 1. Test Customer Registration
        console.log('1. Testing Customer Registration...');
        try {
            const regRes = await fetch(`${API_URL}/auth/register/customer`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: TEST_EMAIL,
                    password: TEST_PASSWORD,
                    name: 'Test Customer',
                    phone: '1234567890'
                })
            });
            const regData = await regRes.json();
            if (regRes.ok && regData.success) {
                console.log('✅ Customer Registration Successful:', regData.success);
            } else {
                console.error('❌ Customer Registration Failed:', regData);
            }
        } catch (error: any) {
            console.error('❌ Customer Registration Error:', error.message);
        }

        // 2. Test Customer Login
        console.log('\n2. Testing Customer Login...');
        try {
            const loginRes = await fetch(`${API_URL}/auth/login/customer`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: TEST_EMAIL,
                    password: TEST_PASSWORD
                })
            });
            const loginData = await loginRes.json();
            if (loginRes.ok && loginData.success) {
                console.log('✅ Customer Login Successful:', loginData.success);
            } else {
                console.error('❌ Customer Login Failed:', loginData);
            }
        } catch (error: any) {
            console.error('❌ Customer Login Error:', error.message);
        }

        // 3. Test Employee Login
        console.log('\n3. Testing Employee Login...');
        try {
            const empLoginRes = await fetch(`${API_URL}/auth/login/employee`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: 'admin@example.com',
                    password: 'password123'
                })
            });
            const empLoginData = await empLoginRes.json();
            if (empLoginRes.ok && empLoginData.success) {
                console.log('✅ Employee Login Successful:', empLoginData.success);
            } else {
                console.warn('⚠️ Employee Login Failed (check if admin exists):', empLoginData);
            }
        } catch (error: any) {
            console.error('⚠️ Employee Login Error:', error.message);
        }

        // 4. Test Old Customer Registration Route
        console.log('\n4. Testing Old Customer Registration Route (Expect Failure)...');
        try {
            const oldRegRes = await fetch(`${API_URL}/customer`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: `fail-${TEST_EMAIL}`,
                    password: TEST_PASSWORD,
                    name: 'Fail Customer',
                    phone: '0000000000'
                })
            });

            if (oldRegRes.status === 404) {
                console.log('✅ Old Route Removed (404 Not Found)');
            } else if (oldRegRes.status === 401) {
                console.log('✅ Old Route Protected/Removed (401 Unauthorized)');
            } else if (!oldRegRes.ok) {
                console.log(`✅ Old Route Failed as expected (${oldRegRes.status})`);
            } else {
                console.error('❌ Old Route Still Active (Unexpected Success)');
            }
        } catch (error: any) {
            console.error('Old Route Error:', error.message);
        }

        // 5. Test Old Login Route
        console.log('\n5. Testing Old Login Route (Expect Failure)...');
        try {
            const oldLoginRes = await fetch(`${API_URL}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: 'admin@example.com',
                    password: 'password123'
                })
            });

            if (oldLoginRes.status === 404) {
                console.log('✅ Old Login Route Removed (404 Not Found)');
            } else if (!oldLoginRes.ok) {
                console.log(`✅ Old Login Route Failed as expected (${oldLoginRes.status})`);
            } else {
                console.error('❌ Old Login Route Still Active (Unexpected Success)');
            }
        } catch (error: any) {
            console.error('Old Login Route Error:', error.message);
        }

    } catch (error) {
        console.error('Unexpected error:', error);
    }
}

verifyAuth();
