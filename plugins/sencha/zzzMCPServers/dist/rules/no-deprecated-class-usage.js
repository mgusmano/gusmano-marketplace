/**
 * @fileoverview Report the usage of a deprecated Class
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
            description: 'Report the usage of a deprecated Class',
            category: 'Fill me in',
            recommended: false
        },
        fixable: null,
        schema: [
            // fill in your schema
        ]
    },

    create: function (context) {
        function processDeprecatedClass (node) {
            const deprecatedClass = extjs.getDeprecatedClass(node);
            const message = 'Usage of deprecated Class \'{{name}}\' found. {{deprecatedMessage}}';

            if (deprecatedClass) {
                context.report({
                    node,
                    message: message,
                    data: {
                        name: deprecatedClass.name,
                        deprecatedMessage: deprecatedClass.deprecatedMessage || ''
                    }
                });
            }
        }

        return {
            Program () {
                extjs.init(context);
            },
            Property (node) {
                processDeprecatedClass(node);
            },
            NewExpression (node) {
                processDeprecatedClass(node);
            },
            MemberExpression (node) {
                processDeprecatedClass(node);
            }
        };
    }
};
