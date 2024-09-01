import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const connectionString = `${process.env["DATABASE_URL"]}`;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);

const prismaClientSingleton = () => {
  return new PrismaClient({ adapter });
};

declare global {
  var prisma: undefined | ReturnType<typeof prismaClientSingleton>;
}

export const prisma = globalThis.prisma ?? prismaClientSingleton();

if (process.env.NODE_ENV !== "production") globalThis.prisma = prisma;

// Function to check and print connection status
export async function checkConnectionStatus() {
  try {
    await prisma.$connect();
    console.log("Database: connected!");
  } catch (error) {
    console.error("Database connection failed");
    console.error("Error:", error);
    console.log("Connection status: Disconnected");
  } finally {
    await prisma.$disconnect();
  }
}

// Call the function to check and print connection status
checkConnectionStatus();
