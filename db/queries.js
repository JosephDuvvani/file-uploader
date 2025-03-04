import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const getUserByEmail = async (email) => {
  const user = await prisma.user.findUnique({
    where: {
      email,
    },
  });
  return user;
};

const addUser = async (user) => {
  const { firstname, lastname, email, password } = user;
  const hashedPwd = await bcrypt.hash(password, 10);
  await prisma.user.create({
    data: {
      firstname,
      lastname,
      email,
      password: hashedPwd,
    },
  });
};

export { getUserByEmail, addUser };
