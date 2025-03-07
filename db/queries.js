import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import fs from "node:fs/promises";

const prisma = new PrismaClient();

//---------- User Queries ----------

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
  const newUser = await prisma.user.create({
    data: {
      firstname,
      lastname,
      email,
      password: hashedPwd,
      folders: {
        create: {
          name: "My Drive",
        },
      },
    },
  });

  const path = `public/data/My-Drive-${newUser.id}`;

  const updateDrive = await prisma.folder.updateMany({
    where: {
      AND: {
        parentId: {
          equals: null,
        },
        ownerId: {
          equals: newUser.id,
        },
      },
    },
    data: {
      path,
    },
  });
  console.log(updateDrive);
  try {
    await fs.mkdir(path);
  } catch (err) {
    console.log("Folder already exists");
  }
};

//---------- File Queries ----------

const saveFile = async (fileInfo) => {
  const { filename, filepath, size, mimetype, folderId, ownerId } = fileInfo;
  try {
    const result = await prisma.file.create({
      data: {
        filename,
        filepath,
        size,
        mimetype,
        folder: {
          connect: {
            id: folderId,
          },
        },
        owner: {
          connect: {
            id: ownerId,
          },
        },
      },
    });
    console.log("File saved to database:", result);
  } catch (err) {
    console.error("Error saving to database:", err);
  }
};

const deleteFile = async (id) => {
  const deleteFile = await prisma.file.delete({
    where: {
      id,
    },
  });
  console.log("File deleted: ", deleteFile);
  return deleteFile;
};

//---------- Folder Queries ----------

const addFolder = async (name, parentId, ownerId, path) => {
  const exists = await prisma.folder.findMany({
    where: {
      name,
      parentId,
    },
  });
  if (exists.length > 0) {
    console.log("Folder already exists!");
  } else {
    await prisma.folder.create({
      data: {
        name,
        parentId,
        ownerId,
        path,
      },
    });
    console.log("Directory added to database!");
  }
};

const getDrive = async (ownerId) => {
  try {
    const drive = prisma.folder.findFirst({
      where: {
        AND: {
          parentId: {
            equals: null,
          },
          ownerId: {
            equals: ownerId,
          },
        },
      },
      include: {
        children: true,
        files: true,
      },
    });
    return drive;
  } catch (err) {
    console.log("Drive not found");
  }
};

const getFolder = async (id, ownerId) => {
  try {
    const folder = prisma.folder.findFirst({
      where: {
        AND: {
          id: {
            equals: +id,
          },
          ownerId: {
            equals: ownerId,
          },
        },
      },
      include: {
        children: true,
        files: true,
      },
    });
    return folder;
  } catch (err) {
    console.log("Folder not found");
  }
};

const getFolderPath = async (id) => {
  const folder = await prisma.folder.findUnique({
    where: {
      id,
    },
    select: {
      path: true,
    },
  });
  return folder.path;
};

const deleteFolder = async (id) => {
  const deleteFolder = await prisma.folder.delete({
    where: {
      id,
    },
  });
  console.log("Folder deleted: ", deleteFolder);
  return deleteFolder;
};

export {
  getUserByEmail,
  addUser,
  saveFile,
  addFolder,
  getDrive,
  getFolder,
  getFolderPath,
  deleteFolder,
  deleteFile,
};
