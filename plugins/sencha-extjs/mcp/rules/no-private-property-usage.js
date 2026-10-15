/**
 * @fileoverview Report the usage of a private property
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
            description: 'Report the usage of a private property',
            category: 'Fill me in',
            recommended: false
        },
        fixable: null, // or "code" or "whitespace"
        schema: [
            // fill in your schema
        ]
    },

    create: function (context) {
        function processPrivateProperty (node) {
            const privateProperty = extjs.getPrivateProperty(node);
            const message = 'Usage of private property \'{{name}}\' found for \'{{className}}\'';

            if (privateProperty) {
                context.report({
                    node,
                    message: message,
                    data: {
                        name: privateProperty.name,
                        className: privateProperty.className
                    }
                });
            }
        }

        return {
            Program () {
                extjs.init(context);
            },
            Property (node) {
                processPrivateProperty(node);
            },
            MemberExpression (node) {
                processPrivateProperty(node);
            }
        };
    }
};
