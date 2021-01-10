declare namespace Express {
    interface Request {
        uemsJWT: {
            ip: string,
            userID: string,
        },
        oidc: {
            isAuthenticated: () => boolean,
            user: any,
        }
    }
}
