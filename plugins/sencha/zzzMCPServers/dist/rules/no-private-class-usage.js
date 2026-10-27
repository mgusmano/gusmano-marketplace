/**
 * @fileoverview Report the usage of a private Class
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
            description: 'Report the usage of a private Class',
            category: 'Fill me in',
            recommended: false
        },
        fixable: null, // or "code" or "whitespace"
        schema: [
            // fill in your schema
        ]
    },

    create: function (context) {
        function processPrivateClass (node) {
            const privateClass = extjs.getPrivateClass(node);
            const message = 'Usage of private Class \'{{name}}\' found. {{privateMessage}}';

            if (privateClass) {
                context.report({
                    node,
                    message: message,
                    data: {
                        name: privateClass.name,
                        privateMessage: privateClass.privateMessage || ''
                    }
                });
            }
        }

        return {
            Program () {
                extjs.init(context);
            },
            Property (node) {
                processPrivateClass(node);
            },
            NewExpression (node) {
                processPrivateClass(node);
            },
            MemberExpression (node) {
                processPrivateClass(node);
            }
        };
    }
};
