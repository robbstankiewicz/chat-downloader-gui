const eslint = require('@eslint/js');
const tseslint = require('typescript-eslint');
const angular = require('angular-eslint');
const eslintConfigPrettier = require('eslint-config-prettier');

module.exports = tseslint.config(
    {
        files: ['**/*.ts'],
        extends: [
            eslint.configs.recommended,
            ...tseslint.configs.recommended,
            ...tseslint.configs.stylistic,
            ...angular.configs.tsRecommended,
            eslintConfigPrettier,
        ],
        processor: angular.processInlineTemplates,
        rules: {
            '@angular-eslint/directive-selector': [
                'error',
                {
                    type: 'attribute',
                    prefix: 'app',
                    style: 'camelCase',
                },
            ],
            '@angular-eslint/component-selector': [
                'error',
                {
                    type: 'element',
                    prefix: 'app',
                    style: 'kebab-case',
                },
            ],
            '@angular-eslint/no-empty-lifecycle-method': 'warn',
            '@angular-eslint/prefer-signals': 'warn',

            '@typescript-eslint/array-type': ['warn'],
            '@typescript-eslint/consistent-indexed-object-style': 'off',
            '@typescript-eslint/consistent-type-assertions': 'warn',
            '@typescript-eslint/consistent-type-definitions': ['warn', 'type'],
            '@typescript-eslint/explicit-function-return-type': 'off',
            '@typescript-eslint/explicit-member-accessibility': [
                'error',
                {
                    accessibility: 'no-public',
                },
            ],
            '@typescript-eslint/naming-convention': [
                'warn',
                {
                    selector: 'variable',
                    format: ['camelCase', 'UPPER_CASE', 'PascalCase'],
                },
            ],
            '@typescript-eslint/no-empty-function': 'warn',
            '@typescript-eslint/no-empty-interface': 'error',
            '@typescript-eslint/no-explicit-any': 'warn',
            '@typescript-eslint/no-inferrable-types': 'warn',
            '@typescript-eslint/no-shadow': 'warn',
            '@typescript-eslint/no-unused-vars': 'warn',
            'no-bitwise': 'error',
            'no-console': 'off',
            'no-new-wrappers': 'error',
            'no-useless-concat': 'error',
            'no-var': 'error',
            'no-restricted-syntax': 'off',
            'no-shadow': 'error',
            'one-var': ['error', 'never'],
            'prefer-arrow-callback': 'error',
            'prefer-const': 'error',
            'sort-imports': [
                'error',
                {
                    ignoreCase: true,
                    ignoreDeclarationSort: true,
                    allowSeparatedGroups: true,
                },
            ],

            'no-eval': 'error',
            'no-implied-eval': 'error',
        },
    },
    {
        files: ['**/*.html'],
        extends: [...angular.configs.templateRecommended, eslintConfigPrettier],
        rules: {
            '@angular-eslint/template/attributes-order': [
                'error',
                {
                    alphabetical: true,
                    order: [
                        'STRUCTURAL_DIRECTIVE',
                        'TEMPLATE_REFERENCE',
                        'ATTRIBUTE_BINDING',
                        'INPUT_BINDING',
                        'TWO_WAY_BINDING',
                        'OUTPUT_BINDING',
                    ],
                },
            ],
            '@angular-eslint/template/button-has-type': 'warn',
            '@angular-eslint/template/cyclomatic-complexity': [
                'warn',
                { maxComplexity: 10 },
            ],
            '@angular-eslint/template/eqeqeq': 'error',
            '@angular-eslint/template/prefer-control-flow': 'error',
            '@angular-eslint/template/prefer-ngsrc': 'warn',
            '@angular-eslint/template/prefer-self-closing-tags': 'warn',
        },
    }
);
