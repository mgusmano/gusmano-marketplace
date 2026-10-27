/**
 * @fileoverview Report the calling of a private method
 * @author Sencha
 */
'use strict';

// ------------------------------------------------------------------------------
// Rule Definition
// ------------------------------------------------------------------------------

const extjs = require('../utils/extjs');

module.exports = {
    meta: {
        docs: {
            description: 'Report the calling of a private method',
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
            Program () {
                extjs.init(context);
            },

            MemberExpression (node) {
                const privateMethod = extjs.getPrivateMethod(node);
                const message = 'Call to private method \'{{name}}\' found for \'{{className}}\'';

                if (privateMethod) {
                    context.report({
                        node,
                        message: message,
                        data: {
                            name: privateMethod.name,
                            className: privateMethod.className
                        }
                    });
                }
            }
        };
    }
};
