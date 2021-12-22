const generate = (code: string, message: string) => ({
    code,
    message,
});

export const ErrorCodes = {
    FAILED: generate('FAILED', 'An unspecified error occurred in the service, please try again later'),
    SERVICE_TIMEOUT: generate('SERVICE_TIMEOUT', 'The service did not respond within the maximum allocated time, please try again later'),
    DEPENDENTS: generate('DEPENDENTS', 'This entity cannot be deleted because other entities are currently depending on it'),
};
