import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

async function runSeed() {
  try {
    console.log('🌱 Ejecutando seed...');
    const { stdout, stderr } = await execAsync('tsx prisma/seed.ts');
    console.log(stdout);
    if (stderr) console.error(stderr);
  } catch (error: any) {
    console.error('Error ejecutando seed:', error.message);
  }
}

runSeed();
