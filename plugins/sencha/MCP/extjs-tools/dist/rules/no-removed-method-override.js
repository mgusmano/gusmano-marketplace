/**
 * @fileoverview Report the overriding of a removed method
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
            description: 'Report the overriding of a removed method',
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

            Property (node) {
                const removedMethod = extjs.getRemovedMethod(node);
                const message = 'Override of removed method \'{{name}}\' found for \'{{className}}\'';

                if (removedMethod) {
                    context.report({
                        node,
                        message: message,
                        data: {
                            name: removedMethod.name,
                            className: removedMethod.className
                        }
                    });
                }
            }
        };
    }
};
