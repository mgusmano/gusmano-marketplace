/**
 * @fileoverview Report the usage of a removed config
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
            description: 'Report the usage of a removed config',
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
                const removedConfig = extjs.getRemovedConfig(node);
                const message = 'Usage of removed config \'{{name}}\' found for \'{{className}}\'. {{removedMessage}}';

                if (removedConfig) {
                    context.report({
                        node,
                        message: message,
                        data: {
                            name: removedConfig.name,
                            className: removedConfig.className,
                            removedMessage: removedConfig.removedMessage || ''
                        }
                    });
                }
            }
        };
    }
};
