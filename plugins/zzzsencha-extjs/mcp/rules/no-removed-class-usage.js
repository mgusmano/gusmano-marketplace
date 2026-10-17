/**
 * @fileoverview Report the usage of a removed Class
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
            description: 'Report the usage of a removed Class',
            category: 'Fill me in',
            recommended: false
        },
        fixable: null,
        schema: [
            // fill in your schema
        ]
    },

    create: function (context) {
        function processRemovedClass (node) {
            const removedClass = extjs.getRemovedClass(node);
            const message = 'Usage of removed Class \'{{name}}\' found. {{removedMessage}}';

            if (removedClass) {
                context.report({
                    node,
                    message: message,
                    data: {
                        name: removedClass.name,
                        removedMessage: removedClass.removedMessage || ''
                    }
                });
            }
        }

        return {
            Program () {
                extjs.init(context);
            },
            Property (node) {
                processRemovedClass(node);
            },
            NewExpression (node) {
                processRemovedClass(node);
            },
            MemberExpression (node) {
                processRemovedClass(node);
            }
        };
    }
};
