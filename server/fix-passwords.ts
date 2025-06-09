import { storage } from "./storage";
import { scrypt, randomBytes } from "crypto";
import { promisify } from "util";

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function fixUserPasswords() {
  try {
    console.log("Starting password fix process...");
    
    const users = await storage.getAllUsers();
    console.log(`Found ${users.length} users to check`);
    
    let fixedCount = 0;
    
    for (const user of users) {
      // Check if password is in old format (doesn't contain a dot)
      if (!user.password.includes('.')) {
        console.log(`Fixing password for user: ${user.username}`);
        
        // For demo purposes, we'll reset to a default password
        // In production, you'd want to send reset emails instead
        const newHashedPassword = await hashPassword('password123');
        
        await storage.updateUser(user.id, { password: newHashedPassword });
        fixedCount++;
        
        console.log(`✅ Fixed password for ${user.username} - new password: password123`);
      }
    }
    
    console.log(`\n✅ Fixed ${fixedCount} user passwords`);
    console.log("All users with malformed passwords have been reset to 'password123'");
    console.log("Please ask them to change their passwords after logging in.");
    
  } catch (error) {
    console.error("Error fixing passwords:", error);
  }
}

// Only run if this file is executed directly
if (require.main === module) {
  fixUserPasswords().then(() => {
    console.log("Password fix process completed");
    process.exit(0);
  }).catch((error) => {
    console.error("Password fix process failed:", error);
    process.exit(1);
  });
}

export { fixUserPasswords }; 