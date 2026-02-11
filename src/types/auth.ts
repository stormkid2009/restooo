import { EmployeeResponse } from "../modules/employee/employee.schema";
import { CustomerResponse } from "../modules/customer/customer.schema";

export type EmployeeUser = EmployeeResponse & { kind: 'employee' };
export type CustomerUser = CustomerResponse & { kind: 'customer' };

export type AppUser = EmployeeUser | CustomerUser;
