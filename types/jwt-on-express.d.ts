declare namespace Express {
    interface Request {
        uemsJWT: {
            ip: string,
            userID: string,
        }
    }
}
