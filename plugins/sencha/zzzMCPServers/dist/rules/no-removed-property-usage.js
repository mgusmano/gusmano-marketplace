/**
 * @fileoverview Report the usage of a removed property
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
            description: 'Report the usage of a removed property',
            category: 'Fill me in',
            recommended: false
        },
        fixable: null, // or "code" or "whitespace"
        schema: [
            // fill in your schema
        ]
    },

    create: function (context) {
        function processRemovedProperty (node) {
            const removedProperty = extjs.getRemovedProperty(node);
            const message = 'Usage of removed property \'{{name}}\' found for \'{{className}}\'';

            if (removedProperty) {
                context.report({
                    node,
                    message: message,
                    data: {
                        name: removedProperty.name,
                        className: removedProperty.className
                    }
                });
            }
        }

        return {
            Program () {
                extjs.init(context);
            },
            Property (node) {
                processRemovedProperty(node);
            },
            MemberExpression (node) {
                processRemovedProperty(node);
            }
        };
    }
};
