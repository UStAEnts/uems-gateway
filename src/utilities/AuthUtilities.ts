import { Token } from 'keycloak-connect';

export namespace AuthUtilities {

    export function orProtect(...roles: string[]) {
        return (token: Token) => {
            if (roles.length === 0) return !token.isExpired();
            // This is left intentionally to short circuit and reduce the function overhead and protect from
            // invalid parameters
            // eslint-disable-next-line no-restricted-syntax
            for (const role of roles) {
                if (token.hasRole(role)) return true;
            }

            return false;
        };
    }

}
