import express, { json, urlencoded } from "express";
import { S3Client, ListBucketsCommand, ListBucketsCommandInput, ListObjectsV2Command, ListObjectsV2CommandInput, GetObjectCommand, GetObjectCommandInput } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

async function main(){
    const config = {
        host: '0.0.0.0',
        port: 3001
    }
    const client = new S3Client(config);
    
    const app = express()
    app.use(json())
    app.use(urlencoded({extended:true}))

    app.get('/', async (req, res, next) => {
        try {
            const input = {...req.body} as ListBucketsCommandInput;
            const command = new ListBucketsCommand(input);
            const response = await client.send(command);
            console.info(response)

            const viewport:String = ['<table>', ...(response.Buckets?.map((v, i) => {
                return `<tr><td>${i +1}</td><td><a href="/bucket/${v.Name}">${v.Name}</a></td></tr>`
            }) || []),'</table>'].join('')

            res.send(viewport)            
        } catch (error) {
            console.error(error)
            next(error)
        }
    })

    app.get('/bucket/:bucket_name', async (req, res, next) => {
        try {
            const input = {...req.body, Bucket: req.params.bucket_name} as ListObjectsV2CommandInput;
            const command = new ListObjectsV2Command(input);
            const response = await client.send(command);

            const viewport:String = ['<table>', 
            '<tr><th>#</th><th>Key</th><th>size</th><th>modified</th></tr>'
            ,...(response.Contents?.map((v, i) => {
                return `<tr><td>${i +1}</td><td><a href="/bucket/${input.Bucket}/${v.Key}">${v.Key}</a></td><td>${v.Size}</td><td>${v.LastModified?.toISOString()}</td></tr>`
            }) || []),'</table>'].join('')
            
            res.send(viewport)
        } catch (error) {
            console.error(error)
            next(error)
        }
    })

    app.get('/bucket/:bucket_name/:key', async (req, res, next) => {
        try {
            const input = {...req.body, Bucket: req.params.bucket_name, Key:req.params.key} as GetObjectCommandInput;
            const command = new GetObjectCommand(input);
            const url = await getSignedUrl(client, command, { expiresIn: 120 });
            const viewport:String = [
                `<table>`,
                `<tr>`,
                `<th>HTTP</th>`,
                `<td><a href="${url.replace('https://', 'http://')}"> GO </a></td>`,
                `</tr>`,
                `<tr>`,
                `<th>HTTPS</th>`,
                `<td><a href="${url}"> GO </a></td>`,
                `</tr>`,
                `</table>`,
            ].join('')
            res.send(viewport)
        } catch (error) {
            console.error(error)
            next(error)
        }
    })
    app.listen(config.port, config.host, () => console.log(`${new Date()} Starting service on http://${config.host === '0.0.0.0' ? '127.0.0.1' : config.host}:${config.port}`))
}

main()