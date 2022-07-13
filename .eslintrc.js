module.exports = {
    env: {
        browser: true,
        es2020: true,
    },
    extends: [
        'airbnb-typescript',
    ],
    parser: '@typescript-eslint/parser',
    parserOptions: {
        ecmaVersion: 11,
        sourceType: 'module',
        project: './tsconfig.json',
    },
    plugins: [
        '@typescript-eslint',
    ],
    rules: {
        indent: 0,
        '@typescript-eslint/naming-convention': [
            'error',
            {
                selector: 'variableLike',
                format: ['camelCase', 'UPPER_CASE', 'PascalCase'],
                leadingUnderscore: 'allow',
            },
        ],
        '@typescript-eslint/indent': ['error', 4],
        'import/first': ['off'],
        'import/order': ['off'],
        'import/prefer-default-export': ['off'],
        'max-len': ['error', 120],
        'object-curly-newline': ['off'],
        'no-underscore-dangle': ['off'],
        'no-unused-vars': 'off',
        '@typescript-eslint/no-unused-vars': [
            'warn', // or error
            {
                argsIgnorePattern: '^_([0-9]+)?$',
                varsIgnorePattern: '^_([0-9]+)?$',
                caughtErrorsIgnorePattern: '^_([0-9]+)?$',
            },
        ],
        'no-useless-constructor': 0,
        '@typescript-eslint/no-useless-constructor': 0,
    },
};
