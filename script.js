const dotenv = require("dotenv");
const axios = require("axios");
const fs = require("fs");
// read .env with fs
dotenv.config();

function readEnvFile() {
    const file = fs.readFileSync("./.env", "utf-8"); // Read the file content as a string
    const envObject = {};

    // Split the file content by lines and process each line
    file.split(/\r?\n/).forEach((line) => {
        // Skip empty lines or lines starting with a comment
        if (line && !line.startsWith('#')) {
            const [ key, value ] = line.split('=');
            if (key && value) {
                envObject[ key.trim() ] = value.trim();
            }
        }
    });

    return envObject;
}
async function main() {
    const env = readEnvFile();
    console.log(env);
    const options = {
        method: 'GET',
        url: 'https://api.hel.io/v1/webhook/stream/transaction',
        params: {
            apiKey: env.HELIO_PUBLIC_API,
            streamId: "670a6f12cc50d45bfb6e101f",
        }, // << update
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${env.HELIO_SECRET_API}` // << update
        }
    };
    const response = await axios.request(options);
    console.log(response.data.length);
    for (const hook of response.data) {
        const options = {
            method: 'DELETE',
            url: `https://api.hel.io/v1/webhook/stream/transaction/${hook.id}`,
            params: {
                apiKey: env.HELIO_PUBLIC_API,
            }, // << update
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${env.HELIO_SECRET_API}` // << update
            }
        };
        const response = await axios.request(options);
        console.log(response.status);
    }
}

main().then(() => console.log("DONE"));