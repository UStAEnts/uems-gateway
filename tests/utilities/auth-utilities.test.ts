import { Token } from 'keycloak-connect';
import { AuthUtilities } from '../../src/utilities/AuthUtilities';
import orProtect = AuthUtilities.orProtect;

describe('AuthUtilities.ts', () => {
    const fakeToken = (roles: string[]): Token => ({
        hasRole: (role: string) => roles.includes(role),
        isExpired: () => false,
    }) as any;

    describe('orProtect', () => {
        it('should be true when no roles are provided', () => {
            expect(orProtect()(fakeToken([])))
                .toBeTruthy();
        });

        it('should be false when user is missing role', () => {
            expect(orProtect('a')(fakeToken([])))
                .toBeFalsy();
            expect(orProtect('a')(fakeToken(['b'])))
                .toBeFalsy();
        });

        it('should be true when user has role', () => {
            expect(orProtect('a')(fakeToken(['a'])))
                .toBeTruthy();
            expect(orProtect('a')(fakeToken(['a', 'b'])))
                .toBeTruthy();
        });

        it('should be true when user contains only one of the roles', () => {
            expect(orProtect('a', 'b', 'c')(fakeToken(['a'])))
                .toBeTruthy();
            expect(orProtect('a', 'b', 'c')(fakeToken(['b'])))
                .toBeTruthy();
            expect(orProtect('a', 'b', 'c')(fakeToken(['c'])))
                .toBeTruthy();
        });
    });
});
