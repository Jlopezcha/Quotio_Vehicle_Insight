import 'dotenv/config';
import fs from 'fs'; 
import mongoose from 'mongoose';
import { connectdb } from '../src/config/db.js';
import RecallDataPre2010 from '../src/models/RecallSchema_PRE2010.js';
import RecallDataPost2010 from '../src/models/RecallSchema_POST2010.js';
import InvData from '../src/models/NHTSA_Investigation.js'
import readline from "node:readline";
import path from "path";
import { fileURLToPath } from "url";

const BATCH_SIZE = 1000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const filePathRecall_Pre2010 = path.join(__dirname, "rag_data", "FLAT_RCL_PRE_2010.txt");
const filePathRecall_Post2010 = path.join(__dirname, "rag_data", "FLAT_RCL_POST_2010.txt");
const filePathINV = path.join(__dirname, "rag_data", "FLAT_INV.txt");


const carMakes = [
  'ACURA', 'AUDI', 'BMW', 'BUICK', 'CADILLAC', 'CHEVROLET',
  'CHRYSLER', 'DODGE', 'FORD', 'GENESIS', 'GMC', 'HONDA',
  'HYUNDAI', 'INFINITI', 'JEEP', 'KIA', 'LEXUS', 'LINCOLN',
  'MAZDA', 'MERCEDES-BENZ', 'MITSUBISHI', 'NISSAN', 'RAM',
  'SUBARU', 'TESLA', 'TOYOTA', 'VOLKSWAGEN', 'VOLVO', 'PORSCHE',
];

await connectdb();

await RecallDataPre2010.deleteMany({});
await RecallDataPost2010.deleteMany({});
await InvData.deleteMany({});


//instantiate recall data first pre 2010 then post 2010 records
const recallFileStream_Pre2010 = fs.createReadStream(filePathRecall_Pre2010)
const readRecall_1 = readline.createInterface({
    input: recallFileStream_Pre2010,
    crlfDelay: Infinity
})

let pre_2010_batch = [];
let pre_2010_count = 0;


for await (const line of readRecall_1){
    if (!line.trim()) continue;

    const cols = line.split("\t");

    if(carMakes.includes(cols[2])){
        //console.log(cols[0] + " " + cols[1] + " " + cols[2] + "true");
        
        pre_2010_batch.push({
            record_id: cols[0],
            campaign_number: cols[1],
            make: cols[2],
            model: cols[3],
            year: cols[4],
            recall_code: cols[5],
            component: cols[6],
            summary: cols[19],
            risk: cols[20],
            remedy: cols[21],
            notes: cols[22]
        });

        if (pre_2010_batch.length >= BATCH_SIZE) {
            await RecallDataPre2010.insertMany(pre_2010_batch, { ordered: false });
            pre_2010_count += pre_2010_batch.length;
            console.log(`Imported ${pre_2010_count}`);
            pre_2010_batch = [];
        }

    }
    
}

if (pre_2010_batch.length) {
        await RecallDataPre2010.insertMany(pre_2010_batch, { ordered: false });
        pre_2010_count += pre_2010_batch.length;
        console.log(`Done. Imported ${pre_2010_count} pre 2010 recall records.`);
}

let post_2010_batch = [];
let post_2010_count = 0;

const recallFileStream_Post2010 = fs.createReadStream(filePathRecall_Post2010)
const readRecall_2 = readline.createInterface({
    input: recallFileStream_Post2010,
    crlfDelay: Infinity
})

for await (const line of readRecall_2){
    if (!line.trim()) continue;

    const cols = line.split("\t");

    if(carMakes.includes(cols[2])){
        //console.log(cols[0] + " " + cols[1] + " " + cols[2] + "true");
        
        post_2010_batch.push({
            record_id: cols[0],
            campaign_number: cols[1],
            make: cols[2],
            model: cols[3],
            year: cols[4],
            recall_code: cols[5],
            component: cols[6],
            summary: cols[19],
            risk: cols[20],
            remedy: cols[21],
            notes: cols[22]
        });

        if (post_2010_batch.length >= BATCH_SIZE) {
            await RecallDataPost2010.insertMany(post_2010_batch, { ordered: false });
            post_2010_count += post_2010_batch.length;
            console.log(`Imported ${post_2010_count}`);
            post_2010_batch = [];
        }

    }
    
}

if (post_2010_batch.length) {
        await RecallDataPost2010.insertMany(post_2010_batch, { ordered: false });
        post_2010_count += post_2010_batch.length;
        console.log(`Done. Imported ${post_2010_count} post 2010 recall records.`);
}

console.log('\n-------------------------------------');
console.log('NHTSA investigation importing...');

//instantiate NHTSA INV data
let inv_batch = [];
let inv_count = 0;

const invFileStream = fs.createReadStream(filePathINV);
const readINVStream = readline.createInterface({
    input: invFileStream,
    crlfDelay: Infinity
})

for await (const line of readINVStream){
    if (!line.trim()) continue;

    const cols = line.split("\t");

    if(carMakes.includes(cols[1])){
        
        inv_batch.push({
            ODI_Number: cols[0],
            make: cols[1],
            model: cols[2],
            year: cols[3],
            component: cols[4],
            manufacturer: cols[5],
            open_date: cols[6],
            close_date: cols[7],
            recall_number: cols[8],
            summary_title: cols[9],
            summary: cols[10]
        });

        if (inv_batch.length >= BATCH_SIZE) {
            await InvData.insertMany(inv_batch, { ordered: false });
            inv_count += inv_batch.length;
            console.log(`Imported ${inv_count}`);
            inv_batch = [];
        }

    }
    
}

if (inv_batch.length) {
        await InvData.insertMany(inv_batch, { ordered: false });
        inv_count += inv_batch.length;
        console.log(`Done. Imported ${inv_count} investigation records.`);
}

await mongoose.disconnect();
console.log('Done.');
