
import { db } from '../src/db';

async function main() {
    try {
        const result = await db.query.dagets.findFirst();
        if (result) {
            console.log(`SLUG:${result.claimSlug}`);
        } else {
            console.log('SLUG:NOT_FOUND');
        }
    } catch (err) {
        console.error(err);
    }
    process.exit(0);
}

main();
