#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const DATA_DIR = path.join(__dirname, '..', 'src', 'data');
const RUNS_JSON = path.join(DATA_DIR, 'runs.json');
const JOURNEYS_JSON = path.join(DATA_DIR, 'journeys.json');

async function migrate() {
  console.log('🚀 Starting JSON to Database migration...\n');

  try {
    // 1. Migrate Journeys
    if (fs.existsSync(JOURNEYS_JSON)) {
      console.log('📋 Migrating journeys...');
      const journeys = JSON.parse(fs.readFileSync(JOURNEYS_JSON, 'utf8'));
      console.log(`   Found ${journeys.length} journeys`);

      let migratedCount = 0;
      for (const journey of journeys) {
        try {
          await prisma.journey.upsert({
            where: { id: journey.id },
            update: {
              name: journey.name || 'Untitled',
              nodes: journey.nodes || [],
              edges: journey.edges || [],
              status: 'active',
              updatedAt: new Date(journey.updatedAt || Date.now())
            },
            create: {
              id: journey.id,
              name: journey.name || 'Untitled',
              nodes: journey.nodes || [],
              edges: journey.edges || [],
              status: 'active',
              createdAt: new Date(journey.updatedAt || Date.now()),
              updatedAt: new Date(journey.updatedAt || Date.now())
            }
          });
          migratedCount++;
        } catch (error) {
          console.error(`   ❌ Failed to migrate journey ${journey.id}:`, error.message);
        }
      }
      console.log(`   ✅ Migrated ${migratedCount}/${journeys.length} journeys\n`);
    } else {
      console.log('   ⏭️  No journeys.json found\n');
    }

    // 2. Migrate Runs
    if (fs.existsSync(RUNS_JSON)) {
      console.log('📋 Migrating runs...');
      const runs = JSON.parse(fs.readFileSync(RUNS_JSON, 'utf8'));
      console.log(`   Found ${runs.length} runs`);

      let migratedRuns = 0;
      let migratedContacts = 0;

      for (const run of runs) {
        try {
          // Migrate run
          const runData = await prisma.run.upsert({
            where: { id: run.id },
            update: {
              flowId: run.flowId || run.id,
              flowName: run.flowName || run.name || 'Unnamed',
              status: run.status || 'done',
              processed: run.processed || 0,
              total: run.total || 0,
              startedAt: run.startedAt ? new Date(run.startedAt) : null,
              endedAt: run.endedAt ? new Date(run.endedAt) : null,
              error: run.error || null,
              updatedAt: new Date(run.updatedAt || Date.now())
            },
            create: {
              id: run.id,
              flowId: run.flowId || run.id,
              flowName: run.flowName || run.name || 'Unnamed',
              status: run.status || 'done',
              processed: run.processed || 0,
              total: run.total || 0,
              startedAt: run.startedAt ? new Date(run.startedAt) : null,
              endedAt: run.endedAt ? new Date(run.endedAt) : null,
              error: run.error || null,
              createdAt: new Date(run.createdAt || Date.now()),
              updatedAt: new Date(run.updatedAt || Date.now()),
              journeyId: run.flowId || null
            }
          });

          migratedRuns++;

          // Migrate contacts for this run
          if (Array.isArray(run.contacts)) {
            for (const contact of run.contacts) {
              try {
                // Check if contact already exists
                const existingContact = await prisma.contact.findFirst({
                  where: {
                    runId: run.id,
                    phone: contact.phone
                  }
                });

                if (!existingContact) {
                  await prisma.contact.create({
                    data: {
                      runId: run.id,
                      phone: contact.phone || '',
                      vars: contact.vars || {},
                      cursor: contact.cursor || null,
                      state: contact.state || 'done',
                      history: contact.history || [],
                      lastInbound: contact.lastInbound || null,
                      wait: contact.wait || null
                    }
                  });
                  migratedContacts++;
                }
              } catch (error) {
                console.error(`   ⚠️  Failed to migrate contact in run ${run.id}:`, error.message);
              }
            }
          }
        } catch (error) {
          console.error(`   ❌ Failed to migrate run ${run.id}:`, error.message);
        }
      }

      console.log(`   ✅ Migrated ${migratedRuns}/${runs.length} runs`);
      console.log(`   ✅ Migrated ${migratedContacts} contacts\n`);
    } else {
      console.log('   ⏭️  No runs.json found\n');
    }

    console.log('='.repeat(60));
    console.log('✅ Migration completed successfully!');
    console.log('='.repeat(60));

    // Show summary
    const journeyCount = await prisma.journey.count();
    const runCount = await prisma.run.count();
    const contactCount = await prisma.contact.count();

    console.log('\n📊 Database Summary:');
    console.log(`   Journeys: ${journeyCount}`);
    console.log(`   Runs: ${runCount}`);
    console.log(`   Contacts: ${contactCount}`);
    console.log('');

  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run migration if executed directly
if (require.main === module) {
  migrate();
}

module.exports = migrate;
