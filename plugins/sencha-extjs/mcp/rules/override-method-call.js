/**
 * @fileoverview Report the calling of the override method
 * @author Sencha
 */
'use strict';

// ------------------------------------------------------------------------------
// Rule Definition
// ------------------------------------------------------------------------------

const utils = require('../utils/utils.js');

module.exports = {
    meta: {
        docs: {
            description: 'Report the calling of the override method',
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
            MemberExpression (node) {
                // if we run into an override() method call, report it
                if (node.property.name === 'override') {
                    context.report({
                        node,
                        message: 'Call to \'{{name}}()\' method found',
                        data: {
                            name: utils.getFullyQualifiedMemberName(node)
                        }
                    });
                }
            }
        };
    }
};
