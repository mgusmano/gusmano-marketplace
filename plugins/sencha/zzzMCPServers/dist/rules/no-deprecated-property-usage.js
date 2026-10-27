/**
 * @fileoverview Report the usage of a deprecated property
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
            description: 'Report the usage of a deprecated property',
            category: 'Fill me in',
            recommended: false
        },
        fixable: null, // or "code" or "whitespace"
        schema: [
            // fill in your schema
        ]
    },

    create: function (context) {
        function processDeprecatedProperty (node) {
            const deprecatedProperty = extjs.getDeprecatedProperty(node);
            const message = 'Usage of deprecated property \'{{name}}\' found for \'{{className}}\'. {{deprecatedMessage}}';

            if (deprecatedProperty) {
                context.report({
                    node,
                    message: message,
                    data: {
                        name: deprecatedProperty.name,
                        className: deprecatedProperty.className,
                        deprecatedMessage: deprecatedProperty.deprecatedMessage
                    }
                });
            }
        }

        return {
            Program () {
                extjs.init(context);
            },
            Property (node) {
                processDeprecatedProperty(node);
            },
            MemberExpression (node) {
                processDeprecatedProperty(node);
            }
        };
    }
};
