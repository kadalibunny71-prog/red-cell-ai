import 'dotenv/config';
import { applySchema } from '../src/services/schema.js';

try {
  const result = await applySchema();
  console.log(`✓ red cell.ai database schema is ready for project ${result.projectRef}`);
} catch (error) {
  console.error(`Database setup failed: ${error.message}`);
  process.exit(1);
}
