// S3.js
const { S3Client, DeleteObjectCommand } = require('@aws-sdk/client-s3');

const s3 = new S3Client({
  endpoint: 'https://cellar-c2.services.clever-cloud.com',
  region: 'us-east-1',
  credentials: {
    accessKeyId: 'KJ9SPRHRL34JNQBWXC34',
    secretAccessKey: 'OBUzDlDHxL0aV3G8mGXDVGaGC65r3h9HQlbADGR9',
  },
  forcePathStyle: true,
});


module.exports = s3;