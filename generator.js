const dotenv = require('dotenv');
const { MongoClient } = require('mongodb'); 
const fs = require('fs').promises; 
const path = require('path'); 

dotenv.config();

const uri = "mongodb://127.0.0.1:27017";
const client = new MongoClient(uri);
const databaseName = process.env.DATABASE_NAME;
const folderArr = ["protocol", "validateCommand", "command", "condition", "mappingResponse", "responseFormat", "responseStatus","resource_profile","resource_token"];
const commonArr = ["command", "condition","responseStatus"];

async function run() {
    try {
      
        await client.connect();
        const db = client.db(databaseName);

   
        for (const element of folderArr) {
            const array = [];
            const collection = db.collection(element);
            const folderPath = path.join(__dirname, element);

            try {
              
                const files = await fs.readdir(folderPath);
                const jsonFiles = files.filter(file => path.extname(file) === '.json');

           
                for (const file of jsonFiles) {
                    try {
                        const filePath = path.join(folderPath, file);
                        const jsonData = await fs.readFile(filePath, 'utf-8');
                        const data = JSON.parse(jsonData);
                        array.push(data);
                        // console.log(`Data from ${file} added to array`);
                    } catch (readError) {
                        console.error(`Error reading file ${file}:`, readError);
                    }
                }

                
                if (array.length > 0) {
                    await collection.deleteMany();
                    await collection.insertMany(array); 
                    console.log(`Inserted data from ${jsonFiles.length} files into ${element}`);
                } else {
                    console.log(`No JSON data to insert in ${element}`);
                }

            } catch (dirError) {
                console.error(`Error reading directory ${element}:`, dirError);
            }
        }


        for (const element of commonArr) {
            const array = [];
            const collection = db.collection(element);
            const folderPath = path.join(__dirname, "ad-commonflow", element);
            
            try {
                const files = await fs.readdir(folderPath);
                const jsonFiles = files.filter(file => path.extname(file) === '.json');
        
                for (const file of jsonFiles) {
                    try {
                        const filePath = path.join(folderPath, file);
                        const jsonData = await fs.readFile(filePath, 'utf-8');
                        const data = JSON.parse(jsonData);
        
           
                        if (data.cm_insertToken || 
                            data.cm_updateToken ||
                             data.cm_getProfile || 
                             data.cm_getToken ||
                            data.cd_commonAuthen ||
                        data.cd_mapModelResponse ||
                    data.re_common) {
                            console.log(`Matched file: ${file}`);
                         
                            array.push(data);
                        }
                    } catch (readError) {
                        console.error(`Error reading file ${file}:`, readError);
                    }
                }
        
                // ลบข้อมูลเฉพาะที่ตรงกับเงื่อนไขใน MongoDB ก่อนทำการ insert ใหม่
                if (array.length > 0) {
                    await collection.deleteMany({
                        $or: [
                            { cm_insertToken: { $exists: true } },
                            { cm_updatetoken: { $exists: true } },
                            {cm_getProfile: {$exists: true}},
                            {cm_getToken: {$exists : true}},
                            {cd_commonAuthen: {$exists:true}},
                            {cd_mapModelResponse: {$exists:true}}
                        ]
                    });
                    
               
                    await collection.insertMany(array);
                    console.log(`Inserted ${array.length} documents into ${element}`);
                } else {
                    console.log(`No matching data to insert in ${element}`);
                }
        
            } catch (dirError) {
                console.error(`Error reading directory ${element}:`, dirError);
            }
        }
        

    } catch (error) {
        console.error("An error occurred:", error);
    } finally {
        await client.close(); 
        console.log("Database connection closed");
    }
}

run();
