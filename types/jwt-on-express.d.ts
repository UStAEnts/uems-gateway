declare namespace Express {
    interface Request {
        oidc: {
            isAuthenticated: () => boolean,
            user: {
                /**
                 * The users ID as delivered by the Auth0 query: REQUIRED. Subject Identifier. A locally unique and
                 * never reassigned identifier within the Issuer for the End-User, which is intended to be consumed
                 * by the Client
                 */
                sub: string,
                [key: string]: any,
            },
        }
    }
}
