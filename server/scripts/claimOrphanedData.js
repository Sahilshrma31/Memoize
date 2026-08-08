/**
 * One-time migration: assign pre-auth records (created before Memoize had
 * user accounts) to a real user account.
 *
 * Any Problem / ReviewCard / ReviewLog without a `userId` is invisible to the
 * app now that every query is scoped by user. This script claims those records
 * for whichever account you name.
 *
 * Usage:
 *   1. Sign in to the app with Google at least once (this creates your User row).
 *   2. node scripts/claimOrphanedData.js you@gmail.com
 *
 * Pass --dry-run to preview without writing.
 */
require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const Problem = require('../models/Problem');
const ReviewCard = require('../models/ReviewCard');
const ReviewLog = require('../models/ReviewLog');

const COLLECTIONS = [
  ['Problem', Problem],
  ['ReviewCard', ReviewCard],
  ['ReviewLog', ReviewLog],
];

async function main() {
  const email = process.argv[2];
  const dryRun = process.argv.includes('--dry-run');

  if (!email) {
    console.error('Usage: node scripts/claimOrphanedData.js <your-email> [--dry-run]');
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGODB_URI);

  const user = await User.findOne({ email });
  if (!user) {
    console.error(
      `No user found with email "${email}".\n` +
        'Sign in to the app with Google first, then re-run this script.'
    );
    await mongoose.disconnect();
    process.exit(1);
  }

  console.log(`Claiming orphaned records for ${user.name} <${user.email}>`);
  if (dryRun) console.log('(dry run — nothing will be written)\n');

  for (const [label, Model] of COLLECTIONS) {
    const filter = { userId: { $exists: false } };
    const count = await Model.countDocuments(filter);

    if (count === 0) {
      console.log(`${label}: nothing to claim`);
      continue;
    }

    if (dryRun) {
      console.log(`${label}: would claim ${count}`);
    } else {
      const result = await Model.updateMany(filter, { $set: { userId: user._id } });
      console.log(`${label}: claimed ${result.modifiedCount}`);
    }
  }

  await mongoose.disconnect();
  console.log('\nDone.');
}

main().catch(async (err) => {
  console.error(err);
  await mongoose.disconnect();
  process.exit(1);
});
