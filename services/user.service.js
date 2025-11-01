import db from "../db/index.js";
import { userTable } from "../models/user.model.js";
import { eq } from "drizzle-orm";

export async function getUserByEmail(email) {
  const [existingUser] = await db
    .select({
      id: userTable.id,
      email: userTable.email,
      firstname: userTable.firstname,
      lastname: userTable.lastname,
      password: userTable.password,
      salt: userTable.salt,
    })
    .from(userTable)
    .where(eq(userTable.email, email));

  return existingUser;
}

export async function createNewUser(userData) {
  const [user] = await db
    .insert(userTable)
    .values(userData)
    .returning({ id: userTable.id });

  return user;
}
