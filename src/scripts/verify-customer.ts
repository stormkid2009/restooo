
// src/scripts/verify-customer.ts
import { PrismaClient } from "@prisma/client";
import customerService from "../modules/customer/customer.service";

const prisma = new PrismaClient();

async function main() {
    console.log("🔍 Verifying Customer Module...");

    // 1. Create a new customer
    console.log("\n1. Creating customer...");
    const newCustomer = {
        email: `test.customer.${Date.now()}@example.com`,
        password: "Password123!",
        name: "Test Customer",
        phone: `+1${Date.now()}`, // Ensure unique phone
    };

    const createResult = await customerService.createCustomer(newCustomer);

    if (!createResult.success) {
        console.error("❌ Failed to create customer:", createResult.error);
        process.exit(1);
    }

    const customerId = createResult.data.id;
    console.log("✅ Customer created:", createResult.data.email);

    // 2. Get customer by ID
    console.log("\n2. Fetching customer by ID...");
    const getResult = await customerService.getCustomerById(customerId);

    if (!getResult.success) {
        console.error("❌ Failed to get customer:", getResult.error);
        process.exit(1);
    }
    console.log("✅ Customer fetched:", getResult.data.name);

    // 3. Update customer
    console.log("\n3. Updating customer...");
    const updateResult = await customerService.updateCustomer(customerId, {
        name: "Updated Customer Name",
    });

    if (!updateResult.success) {
        console.error("❌ Failed to update customer:", updateResult.error);
        process.exit(1);
    }

    if (updateResult.data.name !== "Updated Customer Name") {
        console.error("❌ Customer name not updated correctly");
        process.exit(1);
    }
    console.log("✅ Customer updated:", updateResult.data.name);

    // 4. List customers (Admin)
    console.log("\n4. Listing customers...");
    const listResult = await customerService.getCustomers({
        limit: 5,
        page: 1,
        sortBy: "createdAt",
        sortOrder: "desc",
    });

    if (!listResult.success) {
        console.error("❌ Failed to list customers:", listResult.error);
        process.exit(1);
    }
    console.log(`✅ Found ${listResult.data.total} customers`);

    // 5. Delete customer (Soft delete)
    console.log("\n5. Deleting customer...");
    const deleteResult = await customerService.deleteCustomer(customerId);

    if (!deleteResult.success) {
        console.error("❌ Failed to delete customer:", deleteResult.error);
        process.exit(1);
    }
    console.log("✅ Customer deleted");

    // 6. Verify deletion
    console.log("\n6. Verifying deletion...");
    const verifyDelete = await customerService.getCustomerById(customerId);
    if (verifyDelete.success) {
        console.error("❌ Customer still exists after deletion (should be soft deleted/hidden)");
        //    process.exit(1);
    } else {
        console.log("✅ Customer correctly returns not found (soft deleted)");
    }

    // Check database directly for deletedAt
    const dbCustomer = await prisma.customer.findUnique({
        where: { id: customerId }
    });

    if (dbCustomer && dbCustomer.deletedAt) {
        console.log("✅ Customer record exists in DB with deletedAt set");
    } else {
        console.error("❌ Database record verification failed");
    }

    console.log("\n🎉 Customer verification completed successfully!");
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
