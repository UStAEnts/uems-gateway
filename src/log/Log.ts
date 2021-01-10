import winston from 'winston';
import util from 'util';
import { has } from '@uems/uemscommlib/build/utilities/ObjectUtilities';
import { basename } from 'path';

/**
 * The current environment simplified to either dev or prod only. If NODE_ENV is not set to dev we are assumed to be in
 * production
 */
const environment = process.env.NODE_ENV === 'dev' ? 'dev' : 'prod';
/**
 * Determines if the file output should be used, if UEMS contains a NO_FILE property, this will be false
 */
const useFile = !(process.env.UEMS && (/^NO_FILE$|^NO_FILE;|;NO_FILE$|;NO_FILE;/i).test(process.env.UEMS));
/**
 * The current date at the time this file is loaded
 */
const now = new Date();
/**
 * The {@link now} value formatted as a Y-M-D string
 */
const nowString = `${now.getUTCFullYear()}-${now.getUTCMonth()}-${now.getUTCDay()}`;

/**
 * The file transport for the default log if enabled
 */
const fileTransport = [new winston.transports.File({
    dirname: 'logs',
    filename: `summary-${environment}.${nowString}.log`,
    // @ts-ignore
    format: winston.format.json(),
})];

// @ts-ignore
const formatter = winston.format.printf(({
    level,
    message,
    ...meta
}) => {
    const timestamp = has(meta, 'timestamp') ? meta.timestamp as string : new Date().toISOString();
    const label = has(meta, 'metadata') && has(meta.metadata, 'label')
        ? (meta.metadata as Record<string, string>).label
        : undefined;

    let result = `${timestamp}`;
    if (label) {
        result = `${result} [${label}] ${level}: ${message}`;
    } else {
        result = `${result} ${level}: ${message}`;
    }

    let attachment = '';
    if (has(meta, 'metadata')) {
        for (const [key, value] of Object.entries(meta.metadata)) {
            if (key === 'label') continue;

            attachment += `\n[${key}]: ${util.inspect(value, false, null)}`;
        }
    }

    attachment = attachment.split('\n')
        .map((line) => `\t${line}`)
        .join('\n');
    if (attachment.trim().length !== 0) {
        result += `${attachment}`;
    }

    return result;
});

export const prettyFormat = winston.format.combine(
    winston.format.colorize(),
    winston.format.metadata(),
    winston.format.timestamp(),
    winston.format.label(),
    formatter,
);

export function setupGlobalLogger() {
    if (useFile) winston.add(fileTransport[0]);
    if (environment === 'dev') {
        winston.add(new winston.transports.Console({
            format: prettyFormat,
            level: 'silly',
        }));
    }

}

/**
 * Constructs a logger either at the info or debug level in the logs folder. If in a development environment, it will
 * add a transport to log to the console.
 */
const logger = winston.createLogger({
    level: environment === 'dev' ? 'silly' : 'info',
    transports: [
        ...(useFile ? fileTransport : []),
        ...(environment === 'prod' ? [] : [
            new winston.transports.Console({
                // @ts-ignore
                format: prettyFormat,
                level: 'silly',
            }),
        ]),
    ],
    handleExceptions: false,
});

/**
 * Constructs a child logger of {@link logger} which attaches the given label
 * @param labels the set of labels to attach to this logger, they will be joined into one single string
 */
const makeLogger = (...labels: string[]): winston.Logger => (logger.child({
    label: labels.join(' | '),
}));

/**
 * Default export is logger described by {@link logger}. This will log to console or file depending on environment with
 * either debug or info level.
 */
export default makeLogger;

/**
 * Wrapper export around {@link makeLogger}
 */
export const _ml = makeLogger;

/**
 * Utility named export, see {@link logger}.
 */
export const __ = logger;

/**
 * Wrapped around {@link makeLogger} calling basename on the parameter
 * @param filename
 */
export const _byFile = (filename: string) => makeLogger(basename(filename));

export const _byFileWithTag = (filename: string, ...labels: string[]) => makeLogger(basename(filename), ...labels);
