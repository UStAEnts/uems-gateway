const http = require('http');

http
    .get('http://localhost:7777/healthcheck', (res) => {
        if (res.statusCode !== 200) process.exit(1);

        let c = '';
        res.setEncoding('utf-8')
        res.on('data', (d) => c += d);
        res.on('error', () => process.exit(1));
        res.on('end', () => {
            try{
                const data = JSON.parse(c);
                if (data.status !== 'healthy'){
                    process.exit(1);
                }

                // Exits normally
            }catch (e){
                process.exit(1);
            }
        })
    })
    .on('error', () => process.exit(1))
    .on('abort', () => process.exit(1))
