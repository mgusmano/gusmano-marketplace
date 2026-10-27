/**
 * @fileoverview Report the usage of a private config
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
            description: 'Report the usage of a private config',
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
                const privateConfig = extjs.getPrivateConfig(node);
                const message = 'Usage of private config \'{{name}}\' found for \'{{className}}\'';

                if (privateConfig) {
                    context.report({
                        node,
                        message: message,
                        data: {
                            name: privateConfig.name,
                            className: privateConfig.className
                        }
                    });
                }
            }
        };
    }
};
