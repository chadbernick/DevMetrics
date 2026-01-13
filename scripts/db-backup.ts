import fs from "fs";
import path from "path";

const dbPath = process.env.DATABASE_PATH || path.join(process.cwd(), "data", "dashboard.db");
const backupDir = path.join(process.cwd(), "data", "backups");

function backup() {
  if (!fs.existsSync(dbPath)) {
    console.log("No database found to backup");
    return;
  }

  // Create backup directory if it doesn't exist
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  // Create timestamped backup filename
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupPath = path.join(backupDir, `dashboard-${timestamp}.db`);

  // Copy the database file
  fs.copyFileSync(dbPath, backupPath);
  console.log(`Database backed up to: ${backupPath}`);

  // Clean up old backups (keep last 10)
  const backups = fs.readdirSync(backupDir)
    .filter(f => f.startsWith("dashboard-") && f.endsWith(".db"))
    .sort()
    .reverse();

  if (backups.length > 10) {
    const toDelete = backups.slice(10);
    toDelete.forEach(f => {
      fs.unlinkSync(path.join(backupDir, f));
      console.log(`Removed old backup: ${f}`);
    });
  }
}

backup();
