import fs from 'fs';
import https from 'https';

const sql = fs.readFileSync('C:/Users/aniek/Downloads/files (3)/skryveai_database_schema.sql', 'utf8');
const body = JSON.stringify({ query: sql });
fs.writeFileSync('C:/Users/aniek/SKRYVEAIP/schema_payload.json', body);
console.log('Payload created, size:', body.length);
