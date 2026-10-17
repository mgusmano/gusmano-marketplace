/**
 * @fileoverview Report the overriding of a Class
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
            description: 'Report when a Class is overridden',
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
            Property (node) {
                // if we run into an override config under an Ext.define(), report it
                if (node.key.name === 'override' && extjs.isOverriddenExtClass(node)) {
                    context.report({
                        node,
                        message: 'Override of Class \'{{name}}\' found',
                        data: {
                            name: extjs.getOverriddenClassName(node)
                        }
                    });
                }
            }
        };
    }
};
