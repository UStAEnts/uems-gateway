declare namespace Express {
    import type Grant from 'keycloak-connect';

    interface Request {
        /**
         * This is a custom defined user instance that will be copied into depending on the authentication driver in
         * use. This is designed to provide a consistent place to access that can be swapped out easily.
         */
        uemsUser: {
            userID: string,
            username: string,
            email: string,
            fullName: string,
            profile: string,
        }

        kauth?: {
            grant: Grant,
        }
    }
}
