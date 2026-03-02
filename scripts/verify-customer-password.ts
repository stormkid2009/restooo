/// <reference path="../src/types/express/index.d.ts" />
import request from "supertest";
import { PrismaClient } from "@prisma/client";
import app from "../src/app"; // Import the Express app

const prisma = new PrismaClient();

async function runVerification() {
    console.log("Starting Customer Password Change Verification...");

    const testEmail = "test_customer_" + Date.now() + "@example.com";
    const initialPassword = "Password123!";
    const newPassword = "NewPassword456@";
    let token = "";
    let currentToken = "";

    try {
        // 1. Register a new customer
        console.log("\n1. Registering new customer...");
        const registerResponse = await request(app)
            .post("/api/v1/auth/register/customer")
            .send({
                email: testEmail,
                password: initialPassword,
                name: "Test Customer",
                phone: `123456${Math.floor(Math.random() * 10000)}`,
            });

        if (registerResponse.status !== 201) {
            console.error(
                "Registration failed:",
                JSON.stringify(registerResponse.body, null, 2),
            );
            throw new Error("Registration failed");
        }

        console.log("Registration successful.");
        // The response body should include the token if Registration successfully authenticates the user.
        // However, if the registration endpoint only returns user data we might need to login explicitly.
        token = registerResponse.body.data?.token;

        // 2. Login as the newly created customer (ensure we have a token)
        if (!token) {
            console.log("\n2. Logging in as new customer...");
            const loginResponse = await request(app)
                .post("/api/v1/auth/login/customer")
                .send({
                    email: testEmail,
                    password: initialPassword,
                });

            if (loginResponse.status !== 200) {
                console.error("Initial login failed:", JSON.stringify(loginResponse.body, null, 2));
                throw new Error("Initial login failed");
            }
            token = loginResponse.body.data.token;
            console.log("Login successful. Token obtained.");
        }

        // 3. Call PATCH /api/v1/auth/change-password with old and new passwords
        console.log("\n3. Changing password...");
        const changePasswordResponse = await request(app)
            .patch("/api/v1/auth/change-password")
            .set("Authorization", `Bearer ${token}`)
            .send({
                currentPassword: initialPassword,
                newPassword: newPassword,
            });

        if (changePasswordResponse.status !== 200) {
            console.error(
                "Change password failed:",
                JSON.stringify(changePasswordResponse.body, null, 2),
            );
            throw new Error("Change password failed");
        }
        console.log("Password changed successfully.");

        // 4. Attempt to login with the old password (should fail)
        console.log("\n4. Verifying old password no longer works...");
        const oldLoginResponse = await request(app)
            .post("/api/v1/auth/login/customer")
            .send({
                email: testEmail,
                password: initialPassword,
            });

        if (oldLoginResponse.status === 200) {
            throw new Error("Security concern: Login with old password succeeded!");
        }
        console.log("Expected failure: Old password login rejected with status", oldLoginResponse.status);

        // 5. Attempt to login with the new password (should succeed)
        console.log("\n5. Verifying new password works...");
        const newLoginResponse = await request(app)
            .post("/api/v1/auth/login/customer")
            .send({
                email: testEmail,
                password: newPassword,
            });

        if (newLoginResponse.status !== 200) {
            console.error("Login with new password failed:", JSON.stringify(newLoginResponse.body, null, 2));
            throw new Error("Login with new password failed");
        }
        console.log("Login with new password succeeded.");

        console.log("\n✅ Verification Completed Successfully!");
    } catch (error) {
        console.error("\n❌ Verification Failed:", error);
        process.exit(1);
    } finally {
        // Cleanup
        console.log("\nCleaning up test user...");
        await prisma.customer.deleteMany({
            where: { email: testEmail },
        });
        await prisma.$disconnect();
        console.log("Cleanup complete.");
        // Express server often keeps hanging pending connections, so we must exit explicitly. 
        process.exit(0);
    }
}

runVerification();
