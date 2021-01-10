// External dependencies.
import fs from 'fs/promises';
import amqp from 'amqplib';
import { ZodError } from 'zod';

// Internal dependencies.
import { GatewayMk2 } from './Gateway';
import { VenueGatewayInterface } from './attachments/attachments/VenueGatewayInterface';
import { EventGatewayAttachment } from './attachments/attachments/EventGatewayAttachment';
import { EntStateGatewayInterface } from './attachments/attachments/EntStateGatewayInterface';
import { UserGatewayInterface } from './attachments/attachments/UserGatewayInterface';
import { EquipmentGatewayInterface } from './attachments/attachments/EquipmentGatewayInterface';
import { StateGatewayInterface } from './attachments/attachments/StateGatewayInterface';
import { SystemGatewayInterface } from './attachments/system/SystemGatewayInterface';
import { TopicGatewayInterface } from './attachments/attachments/TopicGatewayInterface';
import { FileGatewayInterface } from './attachments/attachments/FileGatewayInterface';
import { SignupGatewayInterface } from './attachments/attachments/SignupGatewayInterface';
import { ExpressApplication, ExpressConfiguration, ExpressConfigurationType } from './express/ExpressApplication';
import { EntityResolver } from './resolver/EntityResolver';
import GatewayMessageHandler = GatewayMk2.GatewayMessageHandler;

const RABBIT_MQ_CONFIG: string = 'rabbit-mq-config.json';
const EXPRESS_CONFIG: string = 'express-config.json';

async function main() {
    console.log('Attempting to connect to rabbit-mq...');

    let rabbitMQConfig;
    try {
        const rabbitMQConfigRaw = await fs.readFile(RABBIT_MQ_CONFIG, { encoding: 'utf8' });
        rabbitMQConfig = JSON.parse(rabbitMQConfigRaw);
    } catch (e) {
        console.error(`Failed to load ${RABBIT_MQ_CONFIG}`);
        console.error(e);
        return;
    }

    let expressValidation: { success: false, error: ZodError } | { success: true, data: ExpressConfigurationType };
    try {
        const expressConfigRaw = await fs.readFile(EXPRESS_CONFIG, { encoding: 'utf8' });
        const expressConfig = JSON.parse(expressConfigRaw);
        expressValidation = ExpressConfiguration.safeParse(expressConfig);
    } catch (e) {
        console.error(`Failed to load ${EXPRESS_CONFIG}`);
        console.error(e);
        return;
    }

    if (!expressValidation.success) {
        console.error(`Failed to load ${EXPRESS_CONFIG}`);
        console.error(expressValidation.error);
        return;
    }

    let connection;
    try {
        connection = await amqp.connect(`${rabbitMQConfig.uri}?heartbeat=60`);
    } catch (e) {
        console.error('Failed to connect to the amqplib server');
        console.error(e);
        return;
    }

    // Print out errors in the event of a connection error that is not the connection closing
    connection.on('error', (connectionError: Error) => {
        if (connectionError.message !== 'Connection closing') {
            console.error('[AMQP] conn error', connectionError.message);
        }
    });

    // Print out a warning on the connection being closed
    connection.on('close', () => {
        console.error('[AMQP] connection closed');
    });

    console.log('[AMQP] connected');

    const handler = new GatewayMessageHandler(connection, undefined);
    try {
        await handler.configure();
    } catch (e) {
        console.error('Failed to configure the gateway handler');
        console.error(e);

        // Try and clean up but don't worry too much about errors for the time being
        await connection.close();

        return;
    }

    const resolver = new EntityResolver(handler);

    let expressApp;
    try {
        expressApp = new ExpressApplication(expressValidation.data);
        await expressApp.attach(
            [
                new VenueGatewayInterface(),
                new EventGatewayAttachment(),
                new SystemGatewayInterface(),
                new EntStateGatewayInterface(),
                new StateGatewayInterface(),
                new UserGatewayInterface(),
                new EquipmentGatewayInterface(),
                new TopicGatewayInterface(),
                new FileGatewayInterface(),
                new SignupGatewayInterface(),
            ],
            handler.sendRequest.bind(handler),
            resolver,
        );
    } catch (e) {
        console.error('Failed to setup the express server and initialise the attachments');
        console.error(e);

        // Try and clean up but don't worry too much about errors for the time being
        await connection.close();

        return;
    }

    expressApp.listen();
    console.log(`Server launched on ${expressValidation.data.port ?? 15450}`);
}

main()
    .then(() => {
        console.log('Launch complete');
    })
    .catch((e) => {
        console.error('Launch failed');
        console.error(e);
    });
