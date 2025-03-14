import { createClient } from "@supabase/supabase-js";
import multer from "multer";

const supabaseUrl = "https://zonxjdffeqqbqxegvubh.supabase.co";
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const storage = multer.memoryStorage();
const upload = multer({ storage });

const filePaths = async (folderPath) => {
  const { data, error } = await supabase.storage.from("files").list(folderPath);

  if (error) throw error;

  const paths = [];

  for (let file of data) {
    if (file.id) paths.push(`${folderPath}/${file.name}`);
    else paths.push(await filePaths(`${folderPath}/${file.name}`));
  }
  return paths;
};

const renameStorageFolder = async (folderPath, newPath) => {
  const { data, error } = await supabase.storage.from("files").list(folderPath);

  if (error) throw error;

  for (let file of data) {
    if (file.id) {
      const { error: renameError } = await supabase.storage
        .from("files")
        .move(`${folderPath}/${file.name}`, `${newPath}/${file.name}`);

      if (renameError) throw renameError;
    } else {
      await renameStorageFolder(
        `${folderPath}/${file.name}`,
        `${newPath}/${file.name}`
      );
    }
  }
};

export { supabase, upload, filePaths, renameStorageFolder };
