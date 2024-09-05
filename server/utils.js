import fs from 'fs/promises';

export async function createRequiredDirectories() {
  const dirs = ['uploads', 'logs'];
  for (const dir of dirs) {
    try {
      await fs.access(dir);
    } catch (error) {
      if (error.code === 'ENOENT') {
        await fs.mkdir(dir);
        console.log(`Директория ${dir} создана.`);
      }
    }
  }
}