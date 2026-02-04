require('dotenv').config();

const { Worker } = require('bullmq');
const Redis = require('ioredis');
const connection = new Redis({
  host: process.env.REDIS_HOST || '127.0.0.1',
  port: process.env.REDIS_PORT || 6379
});

const worker = new Worker('broadcastQueue', async job => {
  console.log('Processando job:', job.data);
  console.log(`Mensagem processada para ${job.data.name} via ${job.data.channel}`);
}, { connection });

worker.on('completed', job => {
  console.log(`Job ${job.id} finalizado!`);
});

worker.on('failed', (job, err) => {
  console.error(`Job ${job.id} falhou: ${err.message}`);
});
