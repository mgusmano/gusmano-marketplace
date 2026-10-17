/**
 * @fileoverview Rule to flag use of Ext.create()
 * @author Nat Burns
 */
'use strict';

// ------------------------------------------------------------------------------
// Rule Definition
// ------------------------------------------------------------------------------

module.exports = {
    meta: {
        docs: {
            description: 'Rule to flag use of Ext.create()',
            category: 'Fill me in',
            recommended: false
        },
        fixable: null, // or "code" or "whitespace"
        schema: [
            // fill in your schema
        ]
    },

    create: function (context) {
        return {
            'CallExpression' (node) {
                const callee = node.callee;
                const arg = node.arguments[0];

                if (
                    callee.type === 'MemberExpression'
                    && callee.object.name === 'Ext'
                    && callee.property.name === 'create'
                    && arg
                    && arg.type === 'Literal'
                    && typeof arg.value === 'string'
                ) {
                    context.report(
                        node,
                        'Use new {{name}}() rather than Ext.create(\'{{name}}\').',
                        {
                            name: arg.value
                        }
                    );
                }
            }
        };
    }

};
