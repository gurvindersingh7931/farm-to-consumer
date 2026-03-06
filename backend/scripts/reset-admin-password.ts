import db from '../src/config/database';
import { User } from '../src/models';

async function run() {
  try {
    await db.sequelize.authenticate();

    const adminEmail = 'admin@farmconnect.com';
    const sourceEmail = 'anil@gmail.com';

    const sourceUser = await User.findOne({ where: { email: sourceEmail.toLowerCase() } });
    if (!sourceUser) {
      console.error(`Source user not found: ${sourceEmail}`);
      process.exit(1);
    }

    const adminUser = await User.findOne({ where: { email: adminEmail.toLowerCase() } });
    if (!adminUser) {
      console.error(`Admin user not found: ${adminEmail}`);
      process.exit(1);
    }

    await adminUser.update({ password: 'Admin@123' });

    console.log(`✅ Admin password for ${adminEmail} has been updated to match ${sourceEmail}.`);
    process.exit(0);
  } catch (error) {
    console.error('❌ Error resetting admin password:', error);
    process.exit(1);
  }
}

run();

